package com.gps.tracker;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Criteria;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.text.TextUtils;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import java.util.TimeZone;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

public class LocationService extends Service implements LocationListener {
    private static final String TAG = "LocationService";
    public static volatile boolean isServiceRunning = false;
    private static final String CHANNEL_ID = "gps_tracking";
    private static final int NOTIFICATION_ID = 1001;
    private static final long UPDATE_INTERVAL_MS = 30_000L;
    private static final float UPDATE_DISTANCE_METERS = 0f;
    private static final int MAX_OFFLINE_QUEUE_SIZE = 3000;
    private static final long MAX_OFFLINE_QUEUE_AGE_MS = 24 * 60 * 60 * 1000L; // 24 horas (política de retención para telemetría offline continua de 30s)
    private static final int MAX_PROCESSED_COMMAND_IDS_SIZE = 1000;
    private static final String QUEUE_PREFS_KEY = "offline_gps_queue_json";
    private static final String COMMANDS_PREFS_KEY = "processed_command_ids_json";
    private static final String EXEC_HARDWARE_PREFS_KEY = "executed_hardware_ids_json";

    private LocationManager locationManager;
    private final ExecutorService locationExecutor = Executors.newSingleThreadExecutor();
    private final ExecutorService commandExecutor = Executors.newSingleThreadExecutor();
    private final ExecutorService offlineFlushExecutor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean isFlushingOfflineQueue = new AtomicBoolean(false);
    private ConnectivityManager.NetworkCallback networkCallback;

    private DeviceAuthManager authManager;
    private final ConcurrentLinkedQueue<JSONObject> offlineQueue = new ConcurrentLinkedQueue<>();
    private final AtomicLong droppedLocationsCount = new AtomicLong(0);
    private final Set<String> processedCommandIds = Collections.synchronizedSet(new LinkedHashSet<>());
    private final Set<String> executedHardwareCommandIds = Collections.synchronizedSet(new LinkedHashSet<>());
    private final Set<String> activeExecutingCommandIds = ConcurrentHashMap.newKeySet();

    private Location lastReportedLocation = null;
    private long lastReportedTimeMs = 0L;
    private static volatile long serviceStartTimeElapsedMs = 0L;
    private static volatile long lastOfflineFlushAttemptElapsedMs = 0L;
    private static volatile long offlineFlushBackoffMs = 15_000L;

    public static boolean isServiceActuallyRunning(Context context) {
        if (!isServiceRunning) return false;
        if (context == null) return isServiceRunning;
        try {
            SharedPreferences prefs = context.getSharedPreferences("gps_service_prefs", Context.MODE_PRIVATE);
            long lastHeartbeat = prefs.getLong("service_last_heartbeat_elapsed_ms", 0L);
            long nowElapsed = SystemClock.elapsedRealtime();

            if (lastHeartbeat == 0L) {
                long uptime = serviceStartTimeElapsedMs > 0 ? (nowElapsed - serviceStartTimeElapsedMs) : 0L;
                if (uptime > 45_000L) {
                    Log.w(TAG, "Latido no inicializado transcurridos 45s de arranque; marcando servicio como no saludable.");
                    isServiceRunning = false;
                    return false;
                }
                return isServiceRunning;
            }

            if (nowElapsed < lastHeartbeat || (nowElapsed - lastHeartbeat > 90_000L)) {
                Log.w(TAG, "Latido de servicio desactualizado (" + (nowElapsed - lastHeartbeat) + "ms); restableciendo isServiceRunning a false.");
                isServiceRunning = false;
                return false;
            }
        } catch (Exception ignored) {}
        return isServiceRunning;
    }

    private void updateServiceHeartbeat() {
        try {
            SharedPreferences prefs = getSharedPreferences("gps_service_prefs", MODE_PRIVATE);
            prefs.edit().putLong("service_last_heartbeat_elapsed_ms", SystemClock.elapsedRealtime()).apply();
        } catch (Exception ignored) {}
    }

    private void triggerAsyncOfflineFlush() {
        if (!isServiceRunning || offlineQueue.isEmpty()) return;

        long nowElapsed = SystemClock.elapsedRealtime();
        if (nowElapsed - lastOfflineFlushAttemptElapsedMs < offlineFlushBackoffMs) {
            return;
        }

        if (!isFlushingOfflineQueue.compareAndSet(false, true)) {
            return;
        }

        lastOfflineFlushAttemptElapsedMs = nowElapsed;

        try {
            offlineFlushExecutor.submit(() -> {
                if (!isServiceRunning) {
                    isFlushingOfflineQueue.set(false);
                    return;
                }
                FlushResult result = FlushResult.FAILED;
                try {
                    String token = authManager != null ? authManager.getAccessToken() : null;
                    if (token != null) {
                        String baseUrl = getString(R.string.supabase_url);
                        result = flushOfflineQueue(token, baseUrl);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error durante vaciado asíncrono de cola offline", e);
                } finally {
                    if (result == FlushResult.SUCCESS_EMPTY) {
                        offlineFlushBackoffMs = 15_000L;
                    } else if (result == FlushResult.SUCCESS_PARTIAL) {
                        offlineFlushBackoffMs = 0L;
                    } else {
                        offlineFlushBackoffMs = Math.min(300_000L, offlineFlushBackoffMs * 2);
                    }
                    isFlushingOfflineQueue.set(false);
                }
            });
        } catch (java.util.concurrent.RejectedExecutionException e) {
            Log.w(TAG, "Omitiendo vaciado offline; ejecutor cerrado por finalización de servicio.");
            isFlushingOfflineQueue.set(false);
        } catch (Exception e) {
            Log.e(TAG, "Error al enviar tarea de vaciado offline al ejecutor", e);
            isFlushingOfflineQueue.set(false);
        }
    }

    private void registerNetworkCallback() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                networkCallback = new ConnectivityManager.NetworkCallback() {
                    @Override
                    public void onAvailable(Network network) {
                        Log.i(TAG, "Conexión a red detectada (NetworkCallback). Desencadenando vaciado asíncrono de cola offline.");
                        triggerAsyncOfflineFlush();
                    }
                };
                cm.registerDefaultNetworkCallback(networkCallback);
            }
        } catch (Exception e) {
            Log.w(TAG, "Fallo registrando NetworkCallback para conectividad: " + e.getMessage());
        }
    }

    private void unregisterNetworkCallback() {
        if (networkCallback != null) {
            try {
                ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                if (cm != null) {
                    cm.unregisterNetworkCallback(networkCallback);
                }
            } catch (Exception ignored) {}
            networkCallback = null;
        }
    }

    private final Handler commandHandler = new Handler(Looper.getMainLooper());
    private final Runnable commandRunnable = new Runnable() {
        @Override
        public void run() {
            updateServiceHeartbeat();
            pollCommands();
            triggerAsyncOfflineFlush();
            commandHandler.postDelayed(this, 15000);
        }
    };

    private final BroadcastReceiver hardwareResultReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null || !"com.gps.tracker.ACTION_VEHICLE_CONTROL_RESULT".equals(intent.getAction())) return;
            if (intent.getPackage() != null && !getPackageName().equals(intent.getPackage())) {
                Log.w(TAG, "Rechazando broadcast de control de vehículo con paquete no coincidente: " + intent.getPackage());
                return;
            }
            String commandId = intent.getStringExtra("command_id");
            String command = intent.getStringExtra("command");
            boolean success = intent.getBooleanExtra("success", false);
            long createdAtMillis = intent.getLongExtra("created_at_ms", -1);
            if (commandId == null) return;

            long now = System.currentTimeMillis();
            if (createdAtMillis <= 0) {
                Log.w(TAG, "Rechazando resultado de hardware para comando " + commandId + ": timestamp created_at_ms inexistente o inválido (<= 0).");
                return;
            }

            if (createdAtMillis > now + 300_000L || (now - createdAtMillis > 300_000L)) {
                Log.w(TAG, "Omitiendo resultado de hardware para comando " + commandId + ": timestamp de creación inválido u obsoleto (> 5 min o futuro).");
                return;
            }

            try {
                commandExecutor.submit(() -> {
                    String cmdId = commandId;
                    try {
                        String token = authManager != null ? authManager.getAccessToken() : null;
                        if (token == null) return;
                        SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                        formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
                        String timestamp = formatter.format(new Date());

                        if (success) {
                            executedHardwareCommandIds.add(cmdId);
                            persistExecutedHardwareCommandIds();
                        }

                        String finalStatus = success ? "done" : "failed";
                        boolean acked = ackCommandStatus(token, timestamp, cmdId, finalStatus);
                        if (acked) {
                            executedHardwareCommandIds.remove(cmdId);
                            persistExecutedHardwareCommandIds();
                            processedCommandIds.add(cmdId);
                            persistProcessedCommandIds();
                            removePendingHardwareResult(cmdId);
                        }
                        updateNotification("Comando " + cmdId + ": " + (success ? "Ejecutado (done)" : "Fallo físico (failed)"));
                    } finally {
                        activeExecutingCommandIds.remove(cmdId);
                    }
                });
            } catch (java.util.concurrent.RejectedExecutionException e) {
                Log.w(TAG, "Omitiendo procesamiento de resultado hardware para " + commandId + "; ejecutor cerrado por finalización de servicio.");
            } catch (Exception e) {
                Log.e(TAG, "Error enviando tarea de resultado hardware al ejecutor para " + commandId, e);
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        serviceStartTimeElapsedMs = SystemClock.elapsedRealtime();
        cancelRecoveryAlarm(this);
        createNotificationChannel();

        try {
            Notification notification = buildNotification("Esperando ubicación GPS");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
            isServiceRunning = true;
        } catch (Exception e) {
            Log.e(TAG, "Fallo crítico al iniciar servicio en primer plano con startForeground(): " + e.getMessage(), e);
            isServiceRunning = false;
            stopSelf();
            return;
        }

        updateServiceHeartbeat();
        registerNetworkCallback();
        authManager = new DeviceAuthManager(this);
        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        loadOfflineQueueFromStorage();
        loadProcessedCommandIds();
        loadExecutedHardwareCommandIds();
        flushPendingHardwareResults();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(hardwareResultReceiver, new IntentFilter("com.gps.tracker.ACTION_VEHICLE_CONTROL_RESULT"), Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(hardwareResultReceiver, new IntentFilter("com.gps.tracker.ACTION_VEHICLE_CONTROL_RESULT"));
            }
        } catch (Exception e) {
            Log.w(TAG, "Receptor hardwareResultReceiver ya registrado o fallo al registrar: " + e.getMessage());
        }

        requestLocationUpdates();
        commandHandler.removeCallbacks(commandRunnable);
        commandHandler.post(commandRunnable);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        cancelRecoveryAlarm(this);
        if (locationManager != null && authManager != null) {
            requestLocationUpdates();
            commandHandler.removeCallbacks(commandRunnable);
            commandHandler.post(commandRunnable);
        }
        return START_STICKY;
    }

    public static void cancelRecoveryAlarm(Context context) {
        if (context == null) return;
        try {
            Intent recoveryIntent = new Intent(context, AlarmRecoveryReceiver.class);
            recoveryIntent.setAction(AlarmRecoveryReceiver.ACTION_RECOVER_SERVICE);
            recoveryIntent.setPackage(context.getPackageName());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context, 1, recoveryIntent,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
            if (pendingIntent != null) {
                AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                if (alarmManager != null) {
                    alarmManager.cancel(pendingIntent);
                }
                pendingIntent.cancel();
            }
        } catch (Exception e) {
            Log.w(TAG, "Error cancelando alarma de recuperación activa: " + e.getMessage());
        }
    }

    private String activeLocationProvider = null;

    private boolean hasLocationPermission() {
        return PermissionUtils.hasAnyLocationPermission(this);
    }

    private void requestLocationUpdates() {
        if (locationManager == null) return;

        if (!hasLocationPermission()) {
            try {
                locationManager.removeUpdates(this);
            } catch (Exception ignored) {}
            activeLocationProvider = null;
            updateNotification("Permiso de ubicación no concedido - Servicio suspendido");
            isServiceRunning = false;
            stopSelf();
            return;
        }

        boolean gpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
        boolean networkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);

        if (!gpsEnabled && !networkEnabled) {
            try {
                locationManager.removeUpdates(this);
            } catch (Exception ignored) {}
            activeLocationProvider = null;
            Log.w(TAG, "Proveedores GPS y Red desactivados en Ajustes.");
            updateNotification("Proveedores GPS y Red desactivados");
            isServiceRunning = false;
            return;
        }

        String targetProvider = (gpsEnabled ? "GPS" : "") + (networkEnabled ? "+NETWORK" : "");
        if (targetProvider.equals(activeLocationProvider)) {
            Log.d(TAG, "Proveedores (" + targetProvider + ") ya activos; omitiendo re-registro redundante.");
            isServiceRunning = true;
            return;
        }

        try {
            locationManager.removeUpdates(this);
        } catch (Exception e) {
            Log.w(TAG, "Error removiendo listeners de ubicación previos", e);
        }

        boolean registeredAny = false;
        if (gpsEnabled) {
            try {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, UPDATE_INTERVAL_MS, UPDATE_DISTANCE_METERS, this);
                registeredAny = true;
                Log.i(TAG, "Solicitando lecturas de ubicación del proveedor principal: GPS_PROVIDER");
            } catch (Exception e) {
                Log.e(TAG, "Error registrando GPS_PROVIDER", e);
            }
        }

        if (networkEnabled) {
            try {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, UPDATE_INTERVAL_MS, UPDATE_DISTANCE_METERS, this);
                registeredAny = true;
                Log.i(TAG, "Escuchando actualizaciones de NETWORK_PROVIDER");
            } catch (Exception e) {
                Log.e(TAG, "Error registrando NETWORK_PROVIDER", e);
            }
        }

        if (registeredAny) {
            activeLocationProvider = targetProvider;
            isServiceRunning = true;
        } else {
            activeLocationProvider = null;
            isServiceRunning = false;
            updateNotification("Error de proveedor de ubicación: " + targetProvider);
        }
    }

    @Override
    public void onLocationChanged(Location location) {
        if (!hasLocationPermission()) {
            Log.w(TAG, "Permiso de ubicación revocado en tiempo de ejecución. Deteniendo servicio.");
            updateNotification("Permisos de ubicación revocados en Ajustes");
            isServiceRunning = false;
            if (locationManager != null) locationManager.removeUpdates(this);
            stopSelf();
            return;
        }
        if (location == null) return;
        if (!isValidLocation(location)) {
            Log.w(TAG, "Lectura GPS anómala/corrupta detectada. Ignorando punto de ubicación.");
            return;
        }
        if (isMockLocation(location)) {
            Log.w(TAG, "Ubicación simulada (Mock/Spoofed) detectada. Reportando estado MOCK_DETECTED al backend.");
            updateNotification("GPS Simulado (Mock) detectado - Ubicación omitida");
            sendLocationStatusTelemetry("MOCK_DETECTED");
            return;
        }

        long nowMs = System.currentTimeMillis();
        if (lastReportedLocation != null && (nowMs - lastReportedTimeMs < 10_000L)) {
            String currentProvider = location.getProvider();
            String lastProvider = lastReportedLocation.getProvider();
            boolean sameProvider = (currentProvider != null && currentProvider.equals(lastProvider));
            boolean stationary = (!location.hasSpeed() || location.getSpeed() < 0.5f);
            boolean goodAccuracy = (location.hasAccuracy() && location.getAccuracy() < 30f);
            float dist = location.distanceTo(lastReportedLocation);

            if (sameProvider && stationary && goodAccuracy && dist < 3.0f) {
                Log.d(TAG, "Deduplicando muestra de ubicación redundante (< 10s, < 3m, estacionario)");
                return;
            }
        }
        lastReportedLocation = location;
        lastReportedTimeMs = nowMs;

        sendLocation(location);
    }

    private boolean isValidLocation(Location location) {
        if (location == null) return false;
        double lat = location.getLatitude();
        double lon = location.getLongitude();
        if (Double.isNaN(lat) || Double.isNaN(lon) || Double.isInfinite(lat) || Double.isInfinite(lon)) {
            return false;
        }
        if (lat < -90.0 || lat > 90.0 || lon < -180.0 || lon > 180.0) {
            return false;
        }
        if (lat == 0.0 && lon == 0.0) {
            return false;
        }
        if (location.hasAccuracy() && (location.getAccuracy() <= 0f || location.getAccuracy() > 500f)) {
            return false;
        }
        if (location.hasSpeed() && (location.getSpeed() < 0f || location.getSpeed() * 3.6f > 350f)) {
            return false;
        }
        return true;
    }

    private boolean isMockLocation(Location location) {
        if (location == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (location.isMock()) return true;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
            if (location.isFromMockProvider()) return true;
        }
        if (location.getExtras() != null && location.getExtras().getBoolean("mockLocation", false)) {
            return true;
        }
        return false;
    }

    private void sendLocationStatusTelemetry(String locationStatus) {
        locationExecutor.execute(() -> {
            try {
                String token = authManager.getAccessToken();
                String deviceId = authManager.getDeviceId();
                if (token == null || deviceId == null) return;
                SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
                String timestamp = formatter.format(new Date());
                upsertDeviceDirectly(token, deviceId, timestamp, locationStatus);
            } catch (Exception e) {
                Log.e(TAG, "Error enviando telemetría de estado de ubicación: " + locationStatus, e);
            }
        });
    }

    private void sendLocation(Location location) {
        locationExecutor.execute(() -> {
            HttpURLConnection connection = null;
            JSONObject body = null;
            try {
                String baseUrl = getString(R.string.supabase_url);
                String deviceId = authManager.getDeviceId();
                SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
                long locationTime = getValidLocationTime(location);
                String timestamp = formatter.format(new Date(locationTime));

                // Identificador estable y determinista por muestra GPS para prevenir duplicados en reconexiones
                String seed = deviceId + ":" + timestamp + ":" + location.getLatitude() + ":" + location.getLongitude();
                String eventId = UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8)).toString();

                body = new JSONObject();
                body.put("event_id", eventId);
                body.put("device_id", deviceId);
                body.put("latitude", location.getLatitude());
                body.put("longitude", location.getLongitude());
                body.put("speed", Math.max(0, location.getSpeed() * 3.6));
                body.put("accuracy", location.getAccuracy());
                body.put("altitude", location.hasAltitude() ? location.getAltitude() : JSONObject.NULL);
                body.put("bearing", location.hasBearing() ? location.getBearing() : JSONObject.NULL);
                body.put("timestamp", timestamp);

                String token = authManager.getAccessToken();
                if (token == null) {
                    Log.w(TAG, "Sin access token al capturar ubicación. Guardando punto GPS en cola offline.");
                    enqueueOfflineLocation(body);
                    updateNotification("Sin token - Ubicación guardada en cola offline (" + offlineQueue.size() + ")");
                    return;
                }

                boolean deviceRegistered = upsertDeviceDirectly(token, deviceId, timestamp, "OK");
                if (!deviceRegistered) {
                    Log.w(TAG, "Heartbeat de dispositivo no verificado (telemetría secundaria). Continuando envío de ubicación.");
                }

                URL url = new URL(baseUrl + "/rest/v1/gps_locations");
                connection = (HttpURLConnection) url.openConnection();
                configureConnectionTimeouts(connection);
                connection.setRequestMethod("POST");
                connection.setRequestProperty("apikey", getString(R.string.supabase_publishable_key));
                connection.setRequestProperty("Authorization", "Bearer " + token);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Prefer", "return=minimal");
                connection.setDoOutput(true);

                byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(payload);
                }

                int responseCode = connection.getResponseCode();
                if (responseCode >= 200 && responseCode < 300) {
                    triggerAsyncOfflineFlush();
                } else if (responseCode == 401) {
                    Log.w(TAG, "Access token expirado (HTTP 401) al enviar ubicación. Limpiando token local.");
                    authManager.clearAccessToken();
                    enqueueOfflineLocation(body);
                    updateNotification("Token expirado (HTTP 401) - Renovando sesión");
                } else if (responseCode == 403) {
                    handleForbiddenError(connection, "enviando ubicación");
                    enqueueOfflineLocation(body);
                } else {
                    enqueueOfflineLocation(body);
                    updateNotification("Error Supabase HTTP " + responseCode + " (en cola: " + offlineQueue.size() + ")");
                }
            } catch (Exception error) {
                Log.e(TAG, "Error enviando ubicación en vivo; guardando en cola offline", error);
                if (body != null) {
                    enqueueOfflineLocation(body);
                } else {
                    try {
                        String devId = authManager != null ? authManager.getDeviceId() : "unknown-device";
                        SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                        formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
                        long locationTime = getValidLocationTime(location);
                        String timestamp = formatter.format(new Date(locationTime));
                        String seed = devId + ":" + timestamp + ":" + location.getLatitude() + ":" + location.getLongitude();
                        String eventId = UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8)).toString();

                        JSONObject fallbackBody = new JSONObject();
                        fallbackBody.put("event_id", eventId);
                        fallbackBody.put("device_id", devId);
                        fallbackBody.put("latitude", location.getLatitude());
                        fallbackBody.put("longitude", location.getLongitude());
                        fallbackBody.put("speed", Math.max(0, location.getSpeed() * 3.6));
                        fallbackBody.put("accuracy", location.getAccuracy());
                        fallbackBody.put("altitude", location.hasAltitude() ? location.getAltitude() : JSONObject.NULL);
                        fallbackBody.put("bearing", location.hasBearing() ? location.getBearing() : JSONObject.NULL);
                        fallbackBody.put("timestamp", timestamp);
                        enqueueOfflineLocation(fallbackBody);
                    } catch (Exception e) {
                        Log.e(TAG, "Error serializando ubicación offline fallback", e);
                    }
                }
                updateNotification("Sin conexión, guardado en cola (" + offlineQueue.size() + ")");
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    private int getBatteryLevel() {
        try {
            IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = registerReceiver(null, filter);
            if (batteryStatus != null) {
                int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                if (level >= 0 && scale > 0) {
                    return Math.round((level / (float) scale) * 100);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error obteniendo nivel de batería", e);
        }
        return -1;
    }

    public enum FlushResult {
        SUCCESS_EMPTY,
        SUCCESS_PARTIAL,
        FAILED
    }

    private FlushResult flushOfflineQueue(String token, String baseUrl) {
        int count = 0;
        boolean batchSuccess = true;
        while (!offlineQueue.isEmpty() && count < 50) {
            count++;
            JSONObject body = offlineQueue.peek();
            if (body == null) break;
            if (isLocationStale(body)) {
                Log.w(TAG, "Desechando punto GPS offline obsoleto con antigüedad mayor a 24 horas");
                synchronized (offlineQueue) {
                    offlineQueue.poll();
                    persistOfflineQueue();
                }
                continue;
            }
            HttpURLConnection connection = null;
            try {
                URL url = new URL(baseUrl + "/rest/v1/gps_locations");
                connection = (HttpURLConnection) url.openConnection();
                configureConnectionTimeouts(connection);
                connection.setRequestMethod("POST");
                connection.setRequestProperty("apikey", getString(R.string.supabase_publishable_key));
                connection.setRequestProperty("Authorization", "Bearer " + token);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Prefer", "return=minimal");
                connection.setDoOutput(true);

                byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(payload);
                }

                int responseCode = connection.getResponseCode();
                // HTTP 200..299 o HTTP 409 Conflict (event_id duplicado resuelto en servidor)
                if ((responseCode >= 200 && responseCode < 300) || responseCode == 409) {
                    synchronized (offlineQueue) {
                        offlineQueue.poll();
                        persistOfflineQueue();
                    }
                } else if (responseCode == 401) {
                    Log.w(TAG, "Access token expirado (HTTP 401) al vaciar cola offline. Limpiando token local.");
                    authManager.clearAccessToken();
                    updateNotification("Token expirado (HTTP 401) - Renovando sesión");
                    batchSuccess = false;
                    break;
                } else if (responseCode == 403) {
                    handleForbiddenError(connection, "vaciando cola offline");
                    batchSuccess = false;
                    break;
                } else if (responseCode == 400 || responseCode == 422) {
                    Log.w(TAG, "Punto GPS rechazado con HTTP " + responseCode + " irrecuperable. Desechando registro.");
                    synchronized (offlineQueue) {
                        offlineQueue.poll();
                        persistOfflineQueue();
                    }
                } else {
                    batchSuccess = false;
                    break;
                }
            } catch (Exception e) {
                Log.e(TAG, "Error vaciando cola offline de ubicaciones", e);
                batchSuccess = false;
                break;
            } finally {
                if (connection != null) connection.disconnect();
            }
        }

        if (!batchSuccess) {
            Log.w(TAG, "Vaciado de cola offline fallido; restan " + offlineQueue.size() + " ubicaciones pendientes.");
            return FlushResult.FAILED;
        }

        if (offlineQueue.isEmpty()) {
            Log.i(TAG, "Cola offline completamente vaciada con éxito.");
            return FlushResult.SUCCESS_EMPTY;
        } else {
            Log.i(TAG, "Vaciado parcial de cola offline exitoso (lote de 50 enviado); restan " + offlineQueue.size() + " ubicaciones pendientes.");
            updateNotification("Cola offline parcial enviada (quedan " + offlineQueue.size() + " pendientes)");
            return FlushResult.SUCCESS_PARTIAL;
        }
    }

    private boolean isDeviceRevocationResponse(HttpURLConnection connection) {
        if (connection == null) return false;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getErrorStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            String errStr = sb.toString().toLowerCase(Locale.ROOT);
            return errStr.contains("device_revoked") || errStr.contains("revocado") || errStr.contains("dispositivo_revocado") || errStr.contains("account_disabled");
        } catch (Exception e) {
            return false;
        }
    }

    private void handleForbiddenError(HttpURLConnection connection, String contextMessage) {
        if (isDeviceRevocationResponse(connection)) {
            Log.w(TAG, "Dispositivo verificado como revocado por backend (" + contextMessage + ").");
            authManager.markDeviceRevoked();
            updateNotification("Sesión revocada por administrador (HTTP 403)");
        } else {
            Log.w(TAG, "HTTP 403 en " + contextMessage + " por permisos/RLS. Limpiando token sin revocar dispositivo.");
            authManager.clearAccessToken();
            updateNotification("Permiso denegado (HTTP 403)");
        }
    }

    private boolean upsertDeviceDirectly(String token, String deviceId, String timestamp) {
        return upsertDeviceDirectly(token, deviceId, timestamp, null);
    }

    private boolean upsertDeviceDirectly(String token, String deviceId, String timestamp, String locationStatus) {
        HttpURLConnection connection = null;
        try {
            if (token == null || deviceId == null) return false;

            int batteryPct = getBatteryLevel();
            JSONObject body = new JSONObject();
            body.put("p_device_id", deviceId);
            body.put("p_battery", batteryPct >= 0 ? batteryPct : JSONObject.NULL);
            body.put("p_model", Build.MODEL);
            body.put("p_platform", "android");
            body.put("p_app_version", authManager.getAppVersion());
            if (locationStatus != null) {
                body.put("p_location_status", locationStatus);
            }

            URL url = new URL(getString(R.string.supabase_url) + "/rest/v1/rpc/update_device_telemetry");
            connection = (HttpURLConnection) url.openConnection();
            configureConnectionTimeouts(connection);
            connection.setRequestMethod("POST");
            connection.setRequestProperty("apikey", getString(R.string.supabase_publishable_key));
            connection.setRequestProperty("Authorization", "Bearer " + token);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setDoOutput(true);

            byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(payload);
            }

            int responseCode = connection.getResponseCode();
            if (responseCode == 401) {
                Log.w(TAG, "HTTP 401 en update_device_telemetry. Limpiando access token.");
                authManager.clearAccessToken();
            } else if (responseCode == 403) {
                handleForbiddenError(connection, "update_device_telemetry");
            }
            return responseCode >= 200 && responseCode < 300;
        } catch (Exception e) {
            Log.e(TAG, "Error enviando telemetría de dispositivo", e);
            return false;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private void pollCommands() {
        try {
            commandExecutor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                String token = authManager.getAccessToken();
                String deviceId = authManager.getDeviceId();
                if (token == null || deviceId == null) return;

                SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
                String timestamp = formatter.format(new Date());

                String query = getString(R.string.supabase_url)
                        + "/rest/v1/vehicle_commands?select=id,command,status,created_at&status=in.(pending,received)&device_id=eq."
                        + URLEncoder.encode(deviceId, StandardCharsets.UTF_8.name())
                        + "&order=created_at.asc&limit=5";

                URL url = new URL(query);
                connection = (HttpURLConnection) url.openConnection();
                configureConnectionTimeouts(connection);
                connection.setRequestMethod("GET");
                connection.setRequestProperty("apikey", getString(R.string.supabase_publishable_key));
                connection.setRequestProperty("Authorization", "Bearer " + token);
                connection.setRequestProperty("Accept", "application/json");

                int responseCode = connection.getResponseCode();
                if (responseCode == 401) {
                    Log.w(TAG, "HTTP 401 durante polling de comandos. Limpiando access token.");
                    authManager.clearAccessToken();
                    return;
                } else if (responseCode == 403) {
                    handleForbiddenError(connection, "polling de comandos");
                    return;
                } else if (responseCode < 200 || responseCode >= 300) {
                    return;
                }

                StringBuilder body = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) body.append(line);
                }

                JSONArray rows = new JSONArray(body.toString());
                if (rows.length() == 0) return;

                for (int i = 0; i < rows.length(); i++) {
                    JSONObject obj = rows.getJSONObject(i);
                    String cmdId = obj.getString("id");
                    String cmdName = obj.optString("command", "");
                    String cmdStatus = obj.optString("status", "pending");
                    String createdAtStr = obj.optString("created_at", null);

                    if (processedCommandIds.contains(cmdId) || activeExecutingCommandIds.contains(cmdId)) continue;

                    // Si el relé físico ya se ejecutó pero falló el acuse RPC anterior por red, reintentamos únicamente el RPC ack
                    if (executedHardwareCommandIds.contains(cmdId)) {
                        activeExecutingCommandIds.add(cmdId);
                        boolean acked = ackCommandStatus(token, timestamp, cmdId, "done");
                        if (acked) {
                            executedHardwareCommandIds.remove(cmdId);
                            persistExecutedHardwareCommandIds();
                            processedCommandIds.add(cmdId);
                            persistProcessedCommandIds();
                            removePendingHardwareResult(cmdId);
                        }
                        activeExecutingCommandIds.remove(cmdId);
                        continue;
                    }

                    long createdAtMillis = parseIsoCreatedAt(createdAtStr, cmdId);
                    long now = System.currentTimeMillis();
                    if (createdAtMillis <= 0 || createdAtMillis > now + 300_000L || (now - createdAtMillis > 300_000L)) {
                        Log.e(TAG, "Comando " + cmdId + " rechazado: timestamp created_at inválido, futuro o expirado (> 5 min) (" + createdAtStr + ").");
                        ackCommandStatus(token, timestamp, cmdId, "failed");
                        processedCommandIds.add(cmdId);
                        persistProcessedCommandIds();
                        continue;
                    }

                    activeExecutingCommandIds.add(cmdId);

                    if ("pending".equalsIgnoreCase(cmdStatus)) {
                        boolean receivedAcked = ackCommandStatus(token, timestamp, cmdId, "received");
                        if (!receivedAcked) {
                            Log.w(TAG, "No se pudo confirmar ACK received en servidor para comando " + cmdId + ". Abortando ejecución física en este ciclo.");
                            activeExecutingCommandIds.remove(cmdId);
                            continue;
                        }
                    } else {
                        Log.i(TAG, "Recuperando comando en estado '" + cmdStatus + "' para reintento de ejecución física: " + cmdId);
                    }

                    // Paso 2: Ejecutar acción física en hardware/relé
                    executeCommandAction(cmdId, cmdName, createdAtMillis, token, timestamp);
                }

                updateNotification("Comandos procesados (" + rows.length() + ")");
            } catch (Exception e) {
                Log.e(TAG, "Error durante polling de comandos", e);
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
        } catch (java.util.concurrent.RejectedExecutionException e) {
            Log.w(TAG, "Omitiendo polling de comandos; ejecutor cerrado por finalización de servicio.");
        } catch (Exception e) {
            Log.e(TAG, "Error enviando tarea de polling de comandos al ejecutor", e);
        }
    }

    private void executeCommandAction(String cmdId, String command, long createdAtMillis, String token, String timestamp) {
        Log.i(TAG, "Ejecutando comando físico en vehículo: " + command + " (ID: " + cmdId + ")");
        try {
            Intent intent = new Intent("com.gps.tracker.ACTION_VEHICLE_CONTROL");
            intent.setPackage(getPackageName());
            intent.putExtra("command_id", cmdId);
            intent.putExtra("command", command);
            intent.putExtra("created_at", createdAtMillis);
            intent.putExtra("created_at_ms", createdAtMillis);
            intent.putExtra("timestamp", System.currentTimeMillis());
            sendBroadcast(intent);
        } catch (Exception e) {
            Log.e(TAG, "Error enviando broadcast de control de vehículo para " + cmdId, e);
            activeExecutingCommandIds.remove(cmdId);
            boolean acked = ackCommandStatus(token, timestamp, cmdId, "failed");
            if (acked) {
                processedCommandIds.add(cmdId);
                persistProcessedCommandIds();
            }
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        Log.w(TAG, "Tarea eliminada desde aplicaciones recientes. Programando reinicio resiliente vía AlarmRecoveryReceiver.");
        try {
            Intent recoveryIntent = new Intent(getApplicationContext(), AlarmRecoveryReceiver.class);
            recoveryIntent.setAction(AlarmRecoveryReceiver.ACTION_RECOVER_SERVICE);
            recoveryIntent.setPackage(getPackageName());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    getApplicationContext(), 1, recoveryIntent,
                    PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager alarmService = (AlarmManager) getApplicationContext().getSystemService(Context.ALARM_SERVICE);
            if (alarmService != null) {
                long triggerAt = SystemClock.elapsedRealtime() + 2000;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmService.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME, triggerAt, pendingIntent);
                } else {
                    alarmService.set(AlarmManager.ELAPSED_REALTIME, triggerAt, pendingIntent);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error en onTaskRemoved programando reinicio de servicio", e);
        }
    }

    private boolean ackCommandStatus(String token, String timestamp, String id, String status) {
        HttpURLConnection connection = null;
        try {
            JSONObject body = new JSONObject();
            try {
                body.put("p_command_id", Long.parseLong(id));
            } catch (Exception e) {
                body.put("p_command_id", id);
            }
            body.put("p_status", status);
            body.put("p_acknowledged_at", timestamp);

            URL url = new URL(getString(R.string.supabase_url) + "/rest/v1/rpc/ack_vehicle_command");
            connection = (HttpURLConnection) url.openConnection();
            configureConnectionTimeouts(connection);
            connection.setRequestMethod("POST");
            connection.setRequestProperty("apikey", getString(R.string.supabase_publishable_key));
            connection.setRequestProperty("Authorization", "Bearer " + token);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setDoOutput(true);

            byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(payload);
            }

            int responseCode = connection.getResponseCode();
            return responseCode >= 200 && responseCode < 300;
        } catch (Exception e) {
            Log.e(TAG, "Error enviando acuse RPC ack_vehicle_command (ID: " + id + ", Status: " + status + ")", e);
            return false;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private void enqueueOfflineLocation(JSONObject locationBody) {
        synchronized (offlineQueue) {
            if (offlineQueue.size() >= MAX_OFFLINE_QUEUE_SIZE) {
                offlineQueue.poll();
                long totalDropped = droppedLocationsCount.incrementAndGet();
                Log.w(TAG, "⚠️ Cola offline llena (" + MAX_OFFLINE_QUEUE_SIZE + " elementos). Se descartó la ubicación más antigua. Total descartadas: " + totalDropped);
                updateNotification("Cola offline llena - descartada ubicación (" + totalDropped + " perdidas)");
            }
            offlineQueue.add(locationBody);
            boolean saved = persistOfflineQueue();
            if (!saved) {
                Log.e(TAG, "ERROR CRÍTICO: Falló la persistencia cifrada de la cola offline en storage. Reintentando guardado.");
                updateNotification("ERROR CRÍTICO: Fallo al guardar almacenamiento cifrado");
                saved = persistOfflineQueue();
                if (!saved) {
                    Log.e(TAG, "ERROR CRÍTICO: Reintento de persistencia cifrada de cola offline también falló.");
                }
            }
        }
    }

    private boolean isLocationStale(JSONObject locationObj) {
        if (locationObj == null) return true;
        try {
            String tsStr = locationObj.optString("timestamp", null);
            if (tsStr == null || tsStr.trim().isEmpty()) {
                Log.w(TAG, "Desechando punto GPS offline sin timestamp válido.");
                return true;
            }
            long timeMillis = parseIsoCreatedAt(tsStr, "offline-location");
            if (timeMillis <= 0) {
                Log.w(TAG, "Desechando punto GPS offline con timestamp irrecuperable: '" + tsStr + "'");
                return true;
            }
            long now = System.currentTimeMillis();
            long age = now - timeMillis;
            if (age > MAX_OFFLINE_QUEUE_AGE_MS || timeMillis > now + 300_000L) {
                Log.w(TAG, "Desechando punto GPS offline obsoleto (>24h) o futuro: " + tsStr);
                return true;
            }
            return false;
        } catch (Exception e) {
            Log.w(TAG, "Error evaluando timestamp de punto GPS offline; clasificando como inválido.", e);
            return true;
        }
    }

    private boolean persistOfflineQueue() {
        try {
            SecurePreferences securePrefs = new SecurePreferences(this, "gps_service_prefs", "GpsTrackerQueueKey");
            JSONArray array = new JSONArray();
            for (JSONObject item : offlineQueue) {
                array.put(item);
            }
            return securePrefs.putString(QUEUE_PREFS_KEY, array.toString());
        } catch (Exception e) {
            Log.e(TAG, "Error al persistir cola de ubicaciones offline cifrada", e);
            return false;
        }
    }

    private void loadOfflineQueueFromStorage() {
        try {
            SecurePreferences securePrefs = new SecurePreferences(this, "gps_service_prefs", "GpsTrackerQueueKey");
            String rawJson = securePrefs.getString(QUEUE_PREFS_KEY, null);
            if (!TextUtils.isEmpty(rawJson)) {
                JSONArray array = new JSONArray(rawJson);
                offlineQueue.clear();
                for (int i = 0; i < array.length(); i++) {
                    try {
                        JSONObject obj = array.getJSONObject(i);
                        if (!isLocationStale(obj)) {
                            offlineQueue.add(obj);
                        }
                    } catch (Exception itemErr) {
                        Log.w(TAG, "Omitiendo elemento corrupto en cola offline", itemErr);
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error al cargar cola de ubicaciones offline cifrada desde storage; desechando cola corrupta.", e);
            try {
                SecurePreferences securePrefs = new SecurePreferences(this, "gps_service_prefs", "GpsTrackerQueueKey");
                securePrefs.remove(QUEUE_PREFS_KEY);
                offlineQueue.clear();
            } catch (Exception ignored) {}
        }
    }


    private String getDeviceIdPrefsKey(String baseKey) {
        String devId = authManager != null ? authManager.getDeviceId() : null;
        return devId != null ? baseKey + "_" + devId : baseKey;
    }

    private void persistProcessedCommandIds() {
        try {
            SecurePreferences securePrefs = new SecurePreferences(this, "gps_service_prefs", "GpsTrackerCommandKey");
            JSONArray array = new JSONArray();
            List<String> list;
            synchronized (processedCommandIds) {
                list = new ArrayList<>(processedCommandIds);
                if (list.size() > MAX_PROCESSED_COMMAND_IDS_SIZE) {
                    List<String> trimmed = list.subList(list.size() - MAX_PROCESSED_COMMAND_IDS_SIZE, list.size());
                    processedCommandIds.clear();
                    processedCommandIds.addAll(trimmed);
                    list = trimmed;
                }
            }
            for (String id : list) {
                array.put(id);
            }
            securePrefs.putString(getDeviceIdPrefsKey(COMMANDS_PREFS_KEY), array.toString());
        } catch (Exception e) {
            Log.e(TAG, "Error al persistir IDs de comandos procesados cifrados", e);
        }
    }

    private void loadProcessedCommandIds() {
        try {
            SecurePreferences securePrefs = new SecurePreferences(this, "gps_service_prefs", "GpsTrackerCommandKey");
            String rawJson = securePrefs.getString(getDeviceIdPrefsKey(COMMANDS_PREFS_KEY), null);
            if (!TextUtils.isEmpty(rawJson)) {
                JSONArray array = new JSONArray(rawJson);
                processedCommandIds.clear();
                for (int i = 0; i < array.length(); i++) {
                    processedCommandIds.add(array.getString(i));
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error al cargar IDs de comandos procesados cifrados desde storage", e);
        }
    }

    private void persistExecutedHardwareCommandIds() {
        try {
            SecurePreferences securePrefs = new SecurePreferences(this, "gps_service_prefs", "GpsTrackerCommandKey");
            JSONArray array = new JSONArray();
            List<String> list;
            synchronized (executedHardwareCommandIds) {
                list = new ArrayList<>(executedHardwareCommandIds);
            }
            for (String id : list) {
                array.put(id);
            }
            securePrefs.putString(getDeviceIdPrefsKey(EXEC_HARDWARE_PREFS_KEY), array.toString());
        } catch (Exception e) {
            Log.e(TAG, "Error al persistir IDs de comandos ejecutados en hardware cifrados", e);
        }
    }

    private void loadExecutedHardwareCommandIds() {
        try {
            SecurePreferences securePrefs = new SecurePreferences(this, "gps_service_prefs", "GpsTrackerCommandKey");
            String rawJson = securePrefs.getString(getDeviceIdPrefsKey(EXEC_HARDWARE_PREFS_KEY), null);
            if (!TextUtils.isEmpty(rawJson)) {
                JSONArray array = new JSONArray(rawJson);
                executedHardwareCommandIds.clear();
                for (int i = 0; i < array.length(); i++) {
                    executedHardwareCommandIds.add(array.getString(i));
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error al cargar IDs de comandos ejecutados en hardware cifrados desde storage", e);
        }
    }

    private static final long MAX_HARDWARE_RESULT_AGE_MS = 86_400_000L; // 24 horas

    private void flushPendingHardwareResults() {
        try {
            String token = authManager != null ? authManager.getAccessToken() : null;
            if (token == null) return;

            SecurePreferences securePrefs = new SecurePreferences(this, "gps_service_prefs", "GpsTrackerCommandKey");
            String rawJson = securePrefs.getString("pending_hardware_results_json", null);

            SharedPreferences fallback = getSharedPreferences("vehicle_control_fallback_prefs", MODE_PRIVATE);
            String fallbackJson = fallback.getString("pending_hardware_results_json", null);
            if (rawJson == null && fallbackJson != null) {
                rawJson = fallbackJson;
            }

            SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
            String timestamp = formatter.format(new Date());
            long now = System.currentTimeMillis();

            if (!TextUtils.isEmpty(rawJson) && !"[]".equals(rawJson)) {
                JSONArray array = null;
                try {
                    array = new JSONArray(rawJson);
                } catch (Exception e) {
                    Log.e(TAG, "JSON de resultados de hardware corrupto; moviendo a clave de cuarentena antes de descartar.", e);
                    long quarantineTime = System.currentTimeMillis();
                    fallback.edit().putString("corrupt_hardware_results_quarantine_" + quarantineTime, rawJson).commit();
                    securePrefs.remove("pending_hardware_results_json");
                    fallback.edit().remove("pending_hardware_results_json").commit();
                }

                if (array != null) {
                    JSONArray remaining = new JSONArray();
                    for (int i = 0; i < array.length(); i++) {
                        try {
                            JSONObject obj = array.getJSONObject(i);
                            String cmdId = obj.optString("command_id", null);
                            boolean success = obj.optBoolean("success", false);
                            long ts = obj.optLong("timestamp", 0);
                            int retryCount = obj.optInt("retry_count", 0);

                            if (cmdId == null) continue;
                            if (now - ts > MAX_HARDWARE_RESULT_AGE_MS || ts > now + 300_000L) {
                                Log.w(TAG, "Desechando resultado de hardware no válido o expirado para comando: " + cmdId);
                                continue;
                            }

                            if (processedCommandIds.contains(cmdId)) {
                                fallback.edit().remove("pending_hardware_result_" + cmdId).commit();
                                continue;
                            }

                            if (retryCount >= 5) {
                                Log.w(TAG, "Resultado de hardware en JSON cifrado excedió el límite máximo de reintentos (5) para comando: " + cmdId + ". Eliminando de cola.");
                                fallback.edit().remove("pending_hardware_result_" + cmdId).commit();
                                continue;
                            }

                            String finalStatus = success ? "done" : "failed";
                            boolean acked = ackCommandStatus(token, timestamp, cmdId, finalStatus);
                            if (acked) {
                                executedHardwareCommandIds.remove(cmdId);
                                persistExecutedHardwareCommandIds();
                                processedCommandIds.add(cmdId);
                                persistProcessedCommandIds();
                                fallback.edit().remove("pending_hardware_result_" + cmdId).commit();
                            } else {
                                obj.put("retry_count", retryCount + 1);
                                obj.put("last_attempt_at", now);
                                remaining.put(obj);
                                Log.w(TAG, "Fallo ACK en servidor para comando " + cmdId + " en JSON cifrado (intento " + (retryCount + 1) + "/5).");
                            }
                        } catch (Exception e) {
                            Log.e(TAG, "Error procesando elemento individual de resultado de hardware en JSON", e);
                        }
                    }
                    String remainingStr = remaining.toString();
                    boolean saved = securePrefs.putString("pending_hardware_results_json", remainingStr);
                    if (saved && fallbackJson != null) {
                        String verified = securePrefs.getString("pending_hardware_results_json", null);
                        if (verified != null) {
                            fallback.edit().remove("pending_hardware_results_json").commit();
                        } else {
                            Log.w(TAG, "No se pudo verificar la re-lectura cifrada de pending_hardware_results_json. Conservando fallback no cifrado.");
                        }
                    }
                }
            }

            Map<String, ?> allFallback = fallback.getAll();
            if (allFallback != null && !allFallback.isEmpty()) {
                for (Map.Entry<String, ?> entry : allFallback.entrySet()) {
                    String key = entry.getKey();
                    if (key != null && key.startsWith("pending_hardware_result_")) {
                        Object val = entry.getValue();
                        if (val instanceof String) {
                            try {
                                String strVal = (String) val;
                                JSONObject obj;
                                if (strVal.startsWith("{")) {
                                    obj = new JSONObject(strVal);
                                } else {
                                    String[] parts = strVal.split(":");
                                    obj = new JSONObject();
                                    obj.put("command_id", parts.length > 0 ? parts[0] : key.substring("pending_hardware_result_".length()));
                                    obj.put("command", parts.length > 1 ? parts[1] : "unknown");
                                    obj.put("success", parts.length > 2 && "true".equalsIgnoreCase(parts[2]));
                                    obj.put("timestamp", 0); // Omitir fecha simulada 'now' para no tratar comando antiguo como reciente
                                }
                                String cmdId = obj.optString("command_id", null);
                                boolean success = obj.optBoolean("success", false);
                                long ts = obj.optLong("timestamp", 0);
                                int retryCount = obj.optInt("retry_count", 0);
                                boolean isExpired = (ts <= 0 || (now - ts > MAX_HARDWARE_RESULT_AGE_MS) || (ts > now + 300_000L));

                                if (cmdId != null && processedCommandIds.contains(cmdId)) {
                                    Log.i(TAG, "Resultado fallback para " + cmdId + " ya fue procesado previamente. Eliminando copia fallback.");
                                    fallback.edit().remove(key).commit();
                                    continue;
                                }

                                if (retryCount >= 5) {
                                    Log.w(TAG, "Resultado fallback excedió el límite máximo de reintentos (5) para comando: " + cmdId + ". Eliminando de almacenamiento local.");
                                    fallback.edit().remove(key).commit();
                                    continue;
                                }

                                if (cmdId != null && !isExpired) {
                                    String finalStatus = success ? "done" : "failed";
                                    boolean acked = ackCommandStatus(token, timestamp, cmdId, finalStatus);
                                    if (acked) {
                                        processedCommandIds.add(cmdId);
                                        persistProcessedCommandIds();
                                        fallback.edit().remove(key).commit();
                                    } else {
                                        obj.put("retry_count", retryCount + 1);
                                        obj.put("last_attempt_at", now);
                                        fallback.edit().putString(key, obj.toString()).commit();
                                        Log.w(TAG, "Fallo ACK en servidor para resultado fallback " + cmdId + " (intento " + (retryCount + 1) + "/5). Registrando estado de reintento.");
                                    }
                                } else {
                                    Log.w(TAG, "Resultado fallback sin timestamp o expirado (>24h) para comando: " + cmdId + ". Desechando entrada.");
                                    fallback.edit().remove(key).commit();
                                }
                            } catch (Exception e) {
                                Log.e(TAG, "Fallo al procesar resultado fallback para clave " + key + "; entrada corrupta. Eliminando entrada de cuarentena.", e);
                                fallback.edit().remove(key).commit();
                            }
                        }
                    }
                }
            }

        } catch (Exception e) {
            Log.e(TAG, "Error procesando resultados de hardware pendientes guardados", e);
        }
    }




    private long parseIsoCreatedAt(String createdAtStr, String commandId) {
        if (createdAtStr == null || createdAtStr.trim().isEmpty() || "null".equalsIgnoreCase(createdAtStr)) {
            Log.w(TAG, "Fecha created_at nula o vacía para comando: " + commandId);
            return -1;
        }
        String str = createdAtStr.trim();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                return java.time.Instant.parse(str).toEpochMilli();
            } catch (Exception ignored) {}
            try {
                return java.time.OffsetDateTime.parse(str).toInstant().toEpochMilli();
            } catch (Exception ignored) {}
        }
        String[] patterns = new String[] {
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss.SSSX",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd'T'HH:mm:ssX",
            "yyyy-MM-dd'T'HH:mm:ss"
        };
        String norm = str;
        if (norm.contains(".")) {
            int dotIdx = norm.indexOf('.');
            int endIdx = dotIdx + 1;
            while (endIdx < norm.length() && Character.isDigit(norm.charAt(endIdx))) {
                endIdx++;
            }
            if (endIdx - (dotIdx + 1) > 3) {
                norm = norm.substring(0, dotIdx + 4) + norm.substring(endIdx);
            }
        }
        for (String pattern : patterns) {
            try {
                SimpleDateFormat parser = new SimpleDateFormat(pattern, Locale.US);
                parser.setTimeZone(TimeZone.getTimeZone("UTC"));
                Date d = parser.parse(norm);
                if (d != null) return d.getTime();
            } catch (Exception ignored) {}
        }
        Log.w(TAG, "No se pudo interpretar el formato de fecha created_at '" + createdAtStr + "' para comando: " + commandId + ". Marcando comando como inválido.");
        return -1;
    }

    private boolean removePendingHardwareResult(String commandId) {
        if (commandId == null) return false;
        try {
            SecurePreferences securePrefs = new SecurePreferences(this, "gps_service_prefs", "GpsTrackerCommandKey");
            String rawJson = securePrefs.getString("pending_hardware_results_json", null);
            boolean encryptedUpdated = true;

            if (!TextUtils.isEmpty(rawJson) && !"[]".equals(rawJson)) {
                JSONArray array = new JSONArray(rawJson);
                JSONArray remaining = new JSONArray();
                boolean found = false;
                for (int i = 0; i < array.length(); i++) {
                    JSONObject obj = array.getJSONObject(i);
                    if (!commandId.equals(obj.optString("command_id", null))) {
                        remaining.put(obj);
                    } else {
                        found = true;
                    }
                }
                if (found) {
                    encryptedUpdated = securePrefs.putString("pending_hardware_results_json", remaining.toString());
                    if (!encryptedUpdated) {
                        Log.w(TAG, "No se confirmó la eliminación cifrada durable para comando " + commandId + " en JSON cifrado. Conservando copia de respaldo fallback.");
                        return false;
                    }
                }
            }

            // Eliminar copia fallback de respaldo solo tras verificar actualización durable del JSON cifrado
            SharedPreferences fallback = getSharedPreferences("vehicle_control_fallback_prefs", MODE_PRIVATE);
            boolean fallbackCommitted = fallback.edit().remove("pending_hardware_result_" + commandId).commit();
            if (!fallbackCommitted) {
                Log.w(TAG, "Advertencia: El commit() de eliminación fallback para " + commandId + " no fue confirmado en disco.");
            }
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error al remover resultado de hardware pendiente para " + commandId, e);
            return false;
        }
    }

    private long getValidLocationTime(Location location) {
        long now = System.currentTimeMillis();
        if (location != null && location.getTime() > 0) {
            long locTime = location.getTime();
            long diff = locTime - now;
            if (diff > 3600000L || diff < -86400000L) {
                Log.w(TAG, "Marca satelital fuera de tolerancia (" + locTime + "). Usando reloj del sistema.");
                return now;
            }
            return locTime;
        }
        return now;
    }

    private void configureConnectionTimeouts(HttpURLConnection connection) {
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(10000);
    }

    private Notification buildNotification(String message) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(getString(R.string.app_name))
                .setContentText(message)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void updateNotification(String message) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(NOTIFICATION_ID, buildNotification(message));
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Seguimiento GPS", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Indica que el seguimiento GPS está activo");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    @Override
    public void onDestroy() {
        isServiceRunning = false;
        unregisterNetworkCallback();
        if (locationManager != null) locationManager.removeUpdates(this);
        try {
            unregisterReceiver(hardwareResultReceiver);
        } catch (Exception e) {
            Log.e(TAG, "Error desregistrando hardwareResultReceiver", e);
        }
        commandHandler.removeCallbacks(commandRunnable);
        locationExecutor.shutdownNow();
        commandExecutor.shutdownNow();
        offlineFlushExecutor.shutdownNow();
        super.onDestroy();
    }

    @Override
    public void onProviderEnabled(String provider) {
        Log.i(TAG, "Proveedor de ubicación activado: " + provider);
        updateNotification("Proveedor GPS reactivado (" + provider + ")");
        isServiceRunning = true;
        updateServiceHeartbeat();
        requestLocationUpdates();
    }

    @Override
    public void onProviderDisabled(String provider) {
        Log.w(TAG, "Proveedor de ubicación desactivado: " + provider);
        if (LocationManager.GPS_PROVIDER.equals(provider)) {
            updateNotification("GPS desactivado en el dispositivo - Reintentando con red");
        }
        requestLocationUpdates();
        if (!hasLocationPermission()) {
            updateNotification("Permiso de ubicación denegado en Ajustes");
        }
    }

    @Override
    public void onStatusChanged(String provider, int status, android.os.Bundle extras) {}

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
