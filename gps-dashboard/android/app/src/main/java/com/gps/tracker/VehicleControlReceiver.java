package com.gps.tracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.text.TextUtils;
import android.util.Log;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class VehicleControlReceiver extends BroadcastReceiver {
    private static final String TAG = "VehicleControlReceiver";
    public static final String ACTION_VEHICLE_CONTROL = "com.gps.tracker.ACTION_VEHICLE_CONTROL";
    public static final String ACTION_VEHICLE_CONTROL_RESULT = "com.gps.tracker.ACTION_VEHICLE_CONTROL_RESULT";

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();

    // Whitelist de comandos soportados para accionamiento del relé físico
    private static final Set<String> ALLOWED_COMMANDS = new HashSet<>(Arrays.asList("activate", "stop", "immobilize"));

    // GPIO sysfs candidate paths for hardware relay output (pin 17 default, pin 18, pin 4)
    private static final String[] GPIO_RELAY_CANDIDATE_PATHS = new String[] {
        "/sys/class/gpio/gpio17/value",
        "/sys/class/gpio/gpio18/value",
        "/sys/class/gpio/gpio4/value"
    };

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION_VEHICLE_CONTROL.equals(intent.getAction())) return;
        if (context == null || intent.getPackage() == null || !context.getPackageName().equals(intent.getPackage())) {
            Log.w(TAG, "Rechazando broadcast de control de vehículo sin destino explícito de paquete.");
            return;
        }

        final String commandId = intent.getStringExtra("command_id");
        final String command = intent.getStringExtra("command");
        final long createdAt = intent.getLongExtra("created_at", intent.getLongExtra("created_at_ms", intent.getLongExtra("timestamp", 0L)));

        if (TextUtils.isEmpty(commandId) || commandId.trim().isEmpty()) {
            Log.w(TAG, "Rechazando comando de vehículo sin command_id válido.");
            return;
        }

        DeviceAuthManager authManager = new DeviceAuthManager(context);
        if (!authManager.isProvisioned()) {
            Log.w(TAG, "Comando ignorado y notificado como fallido: dispositivo no aprovisionado o sin sesión activa");
            sendResultBroadcast(context, commandId, command, false, createdAt);
            return;
        }

        long now = System.currentTimeMillis();
        if (createdAt <= 0 || createdAt > now + 300_000L || now - createdAt > 300_000L) {
            Log.w(TAG, "Comando " + commandId + " rechazado y notificado como fallido por timestamp created_at inexistente o expirado (<=0, >5 min o futuro)");
            sendResultBroadcast(context, commandId, command, false, createdAt);
            return;
        }

        final PendingResult pendingResult = goAsync();
        Log.i(TAG, "Receptor físico de vehículos procesando comando: " + command + " (ID: " + commandId + ")");

        executor.execute(() -> {
            try {
                boolean success = performPhysicalRelaySwitch(context, command);
                sendResultBroadcast(context, commandId, command, success, createdAt);
            } finally {
                pendingResult.finish();
            }
        });
    }

    private void sendResultBroadcast(Context context, String commandId, String command, boolean success, long createdAtMs) {
        if (context == null || TextUtils.isEmpty(commandId)) return;
        boolean persisted = persistPendingHardwareResult(context, commandId, command, success);
        if (!persisted) {
            Log.e(TAG, "ERROR CRÍTICO: Falló la persistencia cifrada local del resultado de comando " + commandId + ". Reintentando persistencia antes de emitir broadcast.");
            persisted = persistPendingHardwareResult(context, commandId, command, success);
            if (!persisted) {
                Log.e(TAG, "ERROR CRÍTICO: Reintento de persistencia cifrada falló para " + commandId + ". Abortando emisión de ACK para evitar confirmaciones sin durabilidad local.");
                return;
            }
        }
        try {
            Intent resultIntent = new Intent(ACTION_VEHICLE_CONTROL_RESULT);
            resultIntent.setPackage(context.getPackageName());
            resultIntent.putExtra("command_id", commandId);
            resultIntent.putExtra("command", command);
            resultIntent.putExtra("success", success);
            resultIntent.putExtra("created_at_ms", createdAtMs);
            context.sendBroadcast(resultIntent);
        } catch (Exception e) {
            Log.e(TAG, "Error enviando broadcast de resultado de control de vehículo", e);
        }
    }

    private static final int MAX_PENDING_HARDWARE_RESULTS = 100;
    private static final long MAX_HARDWARE_RESULT_AGE_MS = 86_400_000L; // 24 horas
    private static final Object HARDWARE_RESULT_LOCK = new Object();

    private boolean persistPendingHardwareResult(Context context, String commandId, String command, boolean success) {
        if (context == null || commandId == null) return false;
        synchronized (HARDWARE_RESULT_LOCK) {
            long now = System.currentTimeMillis();
            try {
                SecurePreferences securePrefs = new SecurePreferences(context, "gps_service_prefs", "GpsTrackerCommandKey");
                String rawJson = securePrefs.getString("pending_hardware_results_json", "[]");
                org.json.JSONArray array;
                try {
                    array = new org.json.JSONArray(rawJson);
                } catch (Exception e) {
                    array = new org.json.JSONArray();
                }

                org.json.JSONArray updated = new org.json.JSONArray();
                for (int i = 0; i < array.length(); i++) {
                    try {
                        org.json.JSONObject existing = array.getJSONObject(i);
                        long ts = existing.optLong("timestamp", 0);
                        if (now - ts > MAX_HARDWARE_RESULT_AGE_MS) {
                            continue; // Descartar resultado expirado por antigüedad (> 24 horas)
                        }
                        if (!commandId.equals(existing.optString("command_id", null))) {
                            updated.put(existing);
                        }
                    } catch (Exception ignored) {}
                }

                org.json.JSONObject obj = new org.json.JSONObject();
                obj.put("command_id", commandId);
                obj.put("command", command);
                obj.put("success", success);
                obj.put("timestamp", now);
                updated.put(obj);

                if (updated.length() > MAX_PENDING_HARDWARE_RESULTS) {
                    org.json.JSONArray trimmed = new org.json.JSONArray();
                    for (int i = updated.length() - MAX_PENDING_HARDWARE_RESULTS; i < updated.length(); i++) {
                        trimmed.put(updated.get(i));
                    }
                    updated = trimmed;
                }

                boolean ok = securePrefs.putString("pending_hardware_results_json", updated.toString());
                if (!ok) {
                    // Fallback a SharedPreferences estándar si falla la escritura cifrada por límites
                    SharedPreferences fallback = context.getSharedPreferences("vehicle_control_fallback_prefs", Context.MODE_PRIVATE);
                    fallback.edit().putString("pending_hardware_results_json", updated.toString()).commit();
                    return true;
                }
                return true;
            } catch (Exception e) {
                Log.e(TAG, "Error al persistir resultado de hardware pendiente. Aplicando fallback de SharedPreferences.", e);
                try {
                    SharedPreferences fallback = context.getSharedPreferences("vehicle_control_fallback_prefs", Context.MODE_PRIVATE);
                    org.json.JSONObject obj = new org.json.JSONObject();
                    obj.put("command_id", commandId);
                    obj.put("command", command);
                    obj.put("success", success);
                    obj.put("timestamp", now);
                    fallback.edit().putString("pending_hardware_result_" + commandId, obj.toString()).commit();
                    return true;
                } catch (Exception ignored) {
                    return false;
                }
            }
        }
    }




    private boolean performPhysicalRelaySwitch(Context context, String command) {
        if (command == null || !ALLOWED_COMMANDS.contains(command.toLowerCase(Locale.ROOT))) {
            Log.w(TAG, "Comando invalido o no permitido en la whitelist: " + command);
            return false;
        }

        boolean immobilize = "stop".equalsIgnoreCase(command) || "immobilize".equalsIgnoreCase(command);
        String pinValue = immobilize ? "0" : "1";

        SharedPreferences prefs = context != null ? context.getSharedPreferences("vehicle_control_prefs", Context.MODE_PRIVATE) : null;
        String prefPath = prefs != null ? prefs.getString("gpio_path", null) : null;

        String sysPropPath = System.getProperty("gps.relay.gpio_path", null);
        String customPath = (sysPropPath != null && !sysPropPath.trim().isEmpty()) ? sysPropPath : prefPath;
        boolean isDebug = false;
        if (context != null) {
            try {
                isDebug = (context.getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            } catch (Exception ignored) {}
        }
        boolean isSimulation = isDebug && "true".equalsIgnoreCase(System.getProperty("gps.relay.simulation", "false"));

        try {
            File gpioFile = null;
            if (customPath != null && !customPath.trim().isEmpty()) {
                gpioFile = new File(customPath);
            } else {
                for (String candidate : GPIO_RELAY_CANDIDATE_PATHS) {
                    File f = new File(candidate);
                    if (f.exists()) {
                        gpioFile = f;
                        break;
                    }
                }
                if (gpioFile == null) {
                    gpioFile = new File(GPIO_RELAY_CANDIDATE_PATHS[0]);
                }
            }

            if (gpioFile.exists()) {
                // Comprobación de idempotencia: si el relé ya está en el estado deseado, omitir reescritura
                try (FileInputStream fis = new FileInputStream(gpioFile)) {
                    byte[] buf = new byte[16];
                    int readBytes = fis.read(buf);
                    if (readBytes > 0) {
                        String currentVal = new String(buf, 0, readBytes, StandardCharsets.UTF_8).trim();
                        if (pinValue.equals(currentVal)) {
                            Log.i(TAG, "Estado físico GPIO ya coincide (" + pinValue + ") en " + gpioFile.getAbsolutePath() + ". Operación idempotente confirmada.");
                            return true;
                        }
                    }
                } catch (Exception ignored) {}

                if (gpioFile.canWrite()) {
                    try (FileOutputStream fos = new FileOutputStream(gpioFile)) {
                        fos.write(pinValue.getBytes(StandardCharsets.UTF_8));
                        fos.flush();
                    }
                    Log.i(TAG, "GPIO escrito exitosamente (" + pinValue + ") en " + gpioFile.getAbsolutePath());
                    return true;
                }
            }

            // Emitir broadcast del sistema alternativo para dispositivos/kernels con demonios de relé personalizados
            if (context != null) {
                try {
                    Intent relayIntent = new Intent("com.gps.tracker.HARDWARE_RELAY_SWITCH");
                    relayIntent.setPackage(context.getPackageName());
                    relayIntent.putExtra("command", command);
                    relayIntent.putExtra("pin_value", pinValue);
                    relayIntent.putExtra("immobilize", immobilize);
                    context.sendBroadcast(relayIntent);
                    Log.i(TAG, "Broadcast alternativo de hardware emitido: com.gps.tracker.HARDWARE_RELAY_SWITCH (" + command + ")");
                } catch (Exception ex) {
                    Log.w(TAG, "Error emitiendo broadcast alternativo de hardware", ex);
                }
            }

            if (isSimulation) {
                Log.i(TAG, "Modo simulación explícito activado; conmutación ficticia exitosa: " + command);
                return true;
            } else {
                Log.w(TAG, "Hardware GPIO no disponible ni permisos de escritura en ruta sysfs: " + (gpioFile != null ? gpioFile.getAbsolutePath() : "ninguna"));
                return false;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error al conmutar relé físico GPIO: " + e.getMessage(), e);
            return false;
        }
    }
}
