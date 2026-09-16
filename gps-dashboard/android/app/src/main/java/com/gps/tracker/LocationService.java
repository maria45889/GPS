package com.gps.tracker;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Criteria;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;
import android.text.TextUtils;

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
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class LocationService extends Service implements LocationListener {
    private static final String CHANNEL_ID = "gps_tracking";
    private static final int NOTIFICATION_ID = 1001;
    private static final long UPDATE_INTERVAL_MS = 30_000L;
    private static final float UPDATE_DISTANCE_METERS = 0f;

    private LocationManager locationManager;
    private final ExecutorService uploadExecutor = Executors.newSingleThreadExecutor();
    private DeviceAuthManager authManager;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, buildNotification("Esperando ubicación GPS"));
        authManager = new DeviceAuthManager(this);
        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        requestLocationUpdates();
    }

    private void requestLocationUpdates() {
        if (locationManager == null || ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            stopSelf();
            return;
        }

        try {
            Criteria criteria = new Criteria();
            criteria.setAccuracy(Criteria.ACCURACY_FINE);
            criteria.setPowerRequirement(Criteria.POWER_HIGH);
            String provider = locationManager.getBestProvider(criteria, true);
            if (provider != null) {
                locationManager.requestLocationUpdates(provider, UPDATE_INTERVAL_MS, UPDATE_DISTANCE_METERS, this);
            }
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, UPDATE_INTERVAL_MS, UPDATE_DISTANCE_METERS, this);
            }
        } catch (SecurityException ignored) {
            stopSelf();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onLocationChanged(Location location) {
        updateNotification("Última ubicación: " + location.getLatitude() + ", " + location.getLongitude());
        uploadLocation(location);
    }

    private void uploadLocation(Location location) {
        uploadExecutor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                String token = authManager.getAccessToken();
                if (token == null) {
                    updateNotification("Dispositivo sin autenticar");
                    return;
                }

                String baseUrl = getString(R.string.supabase_url);
                String deviceId = authManager.getDeviceId();
                String timestamp = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new Date());

                upsertDevice(deviceId, timestamp);
                pollCommands(deviceId, timestamp);

                JSONObject body = new JSONObject();
                body.put("device_id", deviceId);
                body.put("latitude", location.getLatitude());
                body.put("longitude", location.getLongitude());
                body.put("speed", Math.max(0, location.getSpeed() * 3.6));
                body.put("accuracy", location.getAccuracy());
                body.put("altitude", location.hasAltitude() ? location.getAltitude() : JSONObject.NULL);
                body.put("bearing", location.hasBearing() ? location.getBearing() : JSONObject.NULL);
                body.put("timestamp", timestamp);

                URL url = new URL(baseUrl + "/rest/v1/gps_locations");
                connection = (HttpURLConnection) url.openConnection();
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
                if (responseCode < 200 || responseCode >= 300) {
                    updateNotification("Error Supabase HTTP " + responseCode);
                }
            } catch (Exception error) {
                updateNotification("Sin conexión, reintentando GPS");
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    private void upsertDevice(String deviceId, String timestamp) {
        uploadExecutor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                String token = authManager.getAccessToken();
                if (token == null) return;

                JSONObject body = new JSONObject();
                body.put("id", deviceId);
                body.put("auth_user_id", authManager.getUserId());
                body.put("status", "online");
                body.put("last_seen", timestamp);
                body.put("updated_at", timestamp);
                body.put("platform", "android");
                body.put("model", Build.MODEL);
                body.put("app_version", authManager.getAppVersion());
                body.put("battery", JSONObject.NULL);

                URL url = new URL(getString(R.string.supabase_url) + "/rest/v1/devices?on_conflict=id");
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setRequestProperty("apikey", getString(R.string.supabase_publishable_key));
                connection.setRequestProperty("Authorization", "Bearer " + token);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Prefer", "resolution=merge-duplicates,return=minimal");
                connection.setDoOutput(true);

                byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(payload);
                }

                connection.getResponseCode();
            } catch (Exception ignored) {
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    private void pollCommands(String deviceId, String timestamp) {
        uploadExecutor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                String token = authManager.getAccessToken();
                if (token == null) return;

                String query = getString(R.string.supabase_url)
                        + "/rest/v1/vehicle_commands?select=id,command&status=eq.pending&device_id=eq."
                        + URLEncoder.encode(deviceId, StandardCharsets.UTF_8.name());

                URL url = new URL(query);
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("GET");
                connection.setRequestProperty("apikey", getString(R.string.supabase_publishable_key));
                connection.setRequestProperty("Authorization", "Bearer " + token);
                connection.setRequestProperty("Accept", "application/json");

                int responseCode = connection.getResponseCode();
                if (responseCode < 200 || responseCode >= 300) return;

                StringBuilder body = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) body.append(line);
                }

                JSONArray rows = new JSONArray(body.toString());
                if (rows.length() == 0) return;

                List<String> ids = new ArrayList<>();
                for (int i = 0; i < rows.length(); i += 1) {
                    ids.add(rows.getJSONObject(i).getString("id"));
                }

                ackCommands(token, timestamp, ids);
                updateNotification("Comando recibido (" + ids.size() + ")");
            } catch (Exception ignored) {
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    private void ackCommands(String token, String timestamp, List<String> ids) {
        HttpURLConnection connection = null;
        try {
            String idFilter = "in.(" + TextUtils.join(",", ids) + ")";

            JSONObject body = new JSONObject();
            body.put("status", "received");
            body.put("acknowledged_at", timestamp);

            URL url = new URL(getString(R.string.supabase_url) + "/rest/v1/vehicle_commands?id=" + URLEncoder.encode(idFilter, StandardCharsets.UTF_8.name()));
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("PATCH");
            connection.setRequestProperty("apikey", getString(R.string.supabase_publishable_key));
            connection.setRequestProperty("Authorization", "Bearer " + token);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Prefer", "return=minimal");
            connection.setDoOutput(true);

            byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(payload);
            }

            connection.getResponseCode();
        } catch (Exception ignored) {
        } finally {
            if (connection != null) connection.disconnect();
        }
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
        if (locationManager != null) locationManager.removeUpdates(this);
        uploadExecutor.shutdownNow();
        super.onDestroy();
    }

    @Override
    public void onProviderEnabled(String provider) {}

    @Override
    public void onProviderDisabled(String provider) {}

    @Override
    public void onStatusChanged(String provider, int status, android.os.Bundle extras) {}

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
