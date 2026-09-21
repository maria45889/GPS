package com.gps.tracker;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Autenticacion del dispositivo contra Supabase.
 *
 * Flujo:
 *  1. En la primera ejecucion aprovisiona el dispositivo con la Edge Function
 *     provision-device, que crea su cuenta Auth y guarda auth_user_id.
 *  2. Inicia sesion con email/password para obtener un access_token (JWT) cuyo
 *     app_metadata device_id es usado por las politicas RLS.
 *  3. Renueva el token con el refresh_token cuando expira.
 *
 * Las credenciales y tokens se guardan en SharedPreferences privado de la app.
 * Si se borran los datos de la app, el servidor no reemite el password; en ese
 * caso el dispositivo queda sin autenticar hasta un re-registro manual.
 */
public class DeviceAuthManager {
    private static final String PREFS = "device_auth";
    private static final String KEY_EMAIL = "email";
    private static final String KEY_PASSWORD = "password";
    private static final String KEY_ACCESS_TOKEN = "access_token";
    private static final String KEY_REFRESH_TOKEN = "refresh_token";
    private static final String KEY_EXPIRES_AT = "expires_at";
    private static final String KEY_USER_ID = "user_id";

    private final Context context;
    private final SecurePreferences prefs;

    public DeviceAuthManager(Context context) {
        this.context = context.getApplicationContext();
        this.prefs = new SecurePreferences(this.context, PREFS, "GpsTrackerAuthKey");
    }

    private static final String KEY_DEVICE_REVOKED = "device_revoked";

    public boolean isProvisioned() {
        if (!hasCredentials()) return false;
        if ("true".equals(prefs.getString(KEY_DEVICE_REVOKED, "false"))) return false;
        long nextRetry = prefs.getLong(KEY_NEXT_AUTH_RETRY, 0);
        long now = System.currentTimeMillis() / 1000;
        return now >= nextRetry;
    }

    public boolean isRevoked() {
        return "true".equals(prefs.getString(KEY_DEVICE_REVOKED, "false"));
    }

    public long getNextAuthRetrySeconds() {
        return prefs.getLong(KEY_NEXT_AUTH_RETRY, 0);
    }

    public void markDeviceRevoked() {
        prefs.putString(KEY_DEVICE_REVOKED, "true");
        clearAccessToken();
    }

    public void clearDeviceRevoked() {
        prefs.remove(KEY_DEVICE_REVOKED);
    }

    public String getDeviceId() {
        String id = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ANDROID_ID);
        if (id == null || id.isEmpty() || "android-device".equals(id) || "9774d56d682e549c".equals(id)) {
            id = prefs.getString("fallback_device_uuid", null);
            if (id == null) {
                id = "android-uuid-" + java.util.UUID.randomUUID().toString();
                prefs.putString("fallback_device_uuid", id);
            }
        }
        return id;
    }

    public String getUserId() {
        return prefs.getString(KEY_USER_ID, null);
    }

    public String getAppVersion() {
        try {
            return context.getPackageManager().getPackageInfo(context.getPackageName(), 0).versionName;
        } catch (Exception e) {
            return null;
        }
    }

    private static final String KEY_NEXT_AUTH_RETRY = "next_auth_retry";
    private static final String KEY_AUTH_FAIL_COUNT = "auth_fail_count";

    private static final Object GLOBAL_AUTH_LOCK = new Object();

    /** Devuelve un access_token valido, aprovisionando o renovando si hace falta. */
    public String getAccessToken() {
        synchronized (GLOBAL_AUTH_LOCK) {
            long expiresAt = prefs.getLong(KEY_EXPIRES_AT, 0);
            String token = prefs.getString(KEY_ACCESS_TOKEN, null);
            long now = System.currentTimeMillis() / 1000;
            if (token != null && now < expiresAt - 60) return token;

            long nextRetry = prefs.getLong(KEY_NEXT_AUTH_RETRY, 0);
            if (now < nextRetry) {
                return null;
            }

            String refresh = prefs.getString(KEY_REFRESH_TOKEN, null);
            if (refresh != null && refreshToken(refresh)) {
                return prefs.getString(KEY_ACCESS_TOKEN, null);
            }

            if (hasCredentials()) {
                if (signIn()) return prefs.getString(KEY_ACCESS_TOKEN, null);
                recordAuthFailure(now);
                return null;
            }

            if (provision()) {
                if (signIn()) return prefs.getString(KEY_ACCESS_TOKEN, null);
            }
            recordAuthFailure(now);
            return null;
        }
    }


    private void recordAuthFailure(long now) {
        long failCount = prefs.getLong(KEY_AUTH_FAIL_COUNT, 0) + 1;
        long delaySec = Math.min(3600, (long) Math.pow(2, Math.min(failCount, 8)) * 15);
        prefs.putLong(KEY_AUTH_FAIL_COUNT, failCount);
        prefs.putLong(KEY_NEXT_AUTH_RETRY, now + delaySec);
    }

    public boolean hasCredentials() {
        return prefs.getString(KEY_EMAIL, null) != null && prefs.getString(KEY_PASSWORD, null) != null;
    }

    public void clearAccessToken() {
        prefs.remove(KEY_ACCESS_TOKEN);
        prefs.remove(KEY_EXPIRES_AT);
    }

    public void clearAuthRetryBackoff() {
        prefs.remove(KEY_NEXT_AUTH_RETRY);
        prefs.remove(KEY_AUTH_FAIL_COUNT);
    }

    private static final String KEY_ACTIVATION_CODE = "activation_code";

    public void setActivationCode(String code) {
        if (code != null && !code.trim().isEmpty()) {
            prefs.putString(KEY_ACTIVATION_CODE, code.trim());
            clearAuthRetryBackoff();
        }
    }

    public String getActivationCode() {
        return prefs.getString(KEY_ACTIVATION_CODE, null);
    }

    public void clearActivationCode() {
        prefs.remove(KEY_ACTIVATION_CODE);
    }

    private boolean provision() {
        try {
            String activationCode = getActivationCode();
            if (activationCode == null || activationCode.trim().isEmpty()) {
                android.util.Log.w("DeviceAuthManager", "Código de activación no disponible. Se pospone el aprovisionamiento.");
                return false;
            }

            JSONObject body = new JSONObject();
            body.put("deviceId", getDeviceId());
            body.put("activationCode", activationCode);
            body.put("platform", "android");
            body.put("model", Build.MODEL);
            body.put("app_version", getAppVersion());
            body.put("battery", JSONObject.NULL);

            JSONObject res = post(baseUrl() + "/functions/v1/provision-device", body);
            if (res == null) return false;

            String email = res.optString("email", null);
            String password = res.optString("password", null);
            if (email != null && password != null && !email.isEmpty() && !password.isEmpty()) {
                prefs.putString(KEY_EMAIL, email);
                prefs.putString(KEY_PASSWORD, password);
                clearDeviceRevoked();
                clearActivationCode();
                return true;
            }
            return false;
        } catch (Exception e) {

            return false;
        }
    }

    private boolean signIn() {
        String email = prefs.getString(KEY_EMAIL, null);
        String password = prefs.getString(KEY_PASSWORD, null);
        if (email == null || password == null) return false;
        try {
            JSONObject body = new JSONObject();
            body.put("email", email);
            body.put("password", password);
            return storeSession(post(baseUrl() + "/auth/v1/token?grant_type=password", body));
        } catch (Exception e) {
            return false;
        }
    }

    private boolean refreshToken(String refresh) {
        try {
            JSONObject body = new JSONObject();
            body.put("refresh_token", refresh);
            return storeSession(post(baseUrl() + "/auth/v1/token?grant_type=refresh_token", body));
        } catch (Exception e) {
            return false;
        }
    }

    private boolean storeSession(JSONObject res) {
        if (res == null || res.optString("access_token", null) == null) return false;
        long expiresIn = res.optLong("expires_in", 3600);
        long expiresAt = System.currentTimeMillis() / 1000 + expiresIn;

        prefs.remove(KEY_AUTH_FAIL_COUNT);
        prefs.remove(KEY_NEXT_AUTH_RETRY);

        prefs.putString(KEY_ACCESS_TOKEN, res.optString("access_token", null));
        prefs.putLong(KEY_EXPIRES_AT, expiresAt);

        String refresh = res.optString("refresh_token", null);
        if (refresh != null && !refresh.isEmpty()) prefs.putString(KEY_REFRESH_TOKEN, refresh);

        JSONObject user = res.optJSONObject("user");
        if (user != null && user.optString("id", null) != null) {
            prefs.putString(KEY_USER_ID, user.optString("id", null));
        }
        return true;
    }

    private JSONObject post(String urlStr, JSONObject body, String... extraHeaders) {
        if (Thread.currentThread().isInterrupted()) {
            return null;
        }
        HttpURLConnection connection = null;
        try {
            URL url = new URL(urlStr);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("apikey", apiKey());
            connection.setRequestProperty("Authorization", "Bearer " + apiKey());
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(8000);
            connection.setDoOutput(true);

            for (int i = 0; i + 1 < extraHeaders.length; i += 2) {
                connection.setRequestProperty(extraHeaders[i], extraHeaders[i + 1]);
            }

            if (Thread.currentThread().isInterrupted()) {
                connection.disconnect();
                return null;
            }

            byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(payload);
            }

            if (Thread.currentThread().isInterrupted()) {
                connection.disconnect();
                return null;
            }

            int code = connection.getResponseCode();
            InputStream stream = code >= 200 && code < 300 ? connection.getInputStream() : connection.getErrorStream();
            if (stream == null || Thread.currentThread().isInterrupted()) return null;
            return new JSONObject(readStream(stream));
        } catch (Exception e) {
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private String readStream(InputStream stream) throws Exception {
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) builder.append(line);
        }
        return builder.toString();
    }

    private String baseUrl() {
        return context.getString(R.string.supabase_url);
    }

    private String apiKey() {
        return context.getString(R.string.supabase_publishable_key);
    }
}
