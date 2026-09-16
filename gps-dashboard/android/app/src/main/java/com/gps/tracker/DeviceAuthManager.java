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
    private final SharedPreferences prefs;

    public DeviceAuthManager(Context context) {
        this.context = context.getApplicationContext();
        this.prefs = this.context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public String getDeviceId() {
        String id = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ANDROID_ID);
        return id == null || id.isEmpty() ? "android-device" : id;
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

    /** Devuelve un access_token valido, aprovisionando o renovando si hace falta. */
    public synchronized String getAccessToken() {
        long expiresAt = prefs.getLong(KEY_EXPIRES_AT, 0);
        String token = prefs.getString(KEY_ACCESS_TOKEN, null);
        long now = System.currentTimeMillis() / 1000;
        if (token != null && now < expiresAt - 60) return token;

        String refresh = prefs.getString(KEY_REFRESH_TOKEN, null);
        if (refresh != null && refreshToken(refresh)) {
            return prefs.getString(KEY_ACCESS_TOKEN, null);
        }

        if (!hasCredentials() && !provision()) return null;
        if (signIn()) return prefs.getString(KEY_ACCESS_TOKEN, null);
        return null;
    }

    private boolean hasCredentials() {
        return prefs.getString(KEY_EMAIL, null) != null && prefs.getString(KEY_PASSWORD, null) != null;
    }

    private boolean provision() {
        try {
            JSONObject body = new JSONObject();
            body.put("deviceId", getDeviceId());
            body.put("platform", "android");
            body.put("model", Build.MODEL);
            body.put("app_version", getAppVersion());
            body.put("battery", JSONObject.NULL);

            String secret = context.getString(R.string.provision_secret);
            JSONObject res = post(baseUrl() + "/functions/v1/provision-device", body,
                "x-provision-secret", secret);
            if (res == null) return false;

            String email = res.optString("email", null);
            String password = res.optString("password", null);
            if (email != null && password != null && !email.isEmpty() && !password.isEmpty()) {
                prefs.edit().putString(KEY_EMAIL, email).putString(KEY_PASSWORD, password).apply();
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

        SharedPreferences.Editor editor = prefs.edit()
                .putString(KEY_ACCESS_TOKEN, res.optString("access_token", null))
                .putLong(KEY_EXPIRES_AT, expiresAt);

        String refresh = res.optString("refresh_token", null);
        if (refresh != null && !refresh.isEmpty()) editor.putString(KEY_REFRESH_TOKEN, refresh);

        JSONObject user = res.optJSONObject("user");
        if (user != null && user.optString("id", null) != null) {
            editor.putString(KEY_USER_ID, user.optString("id", null));
        }
        editor.apply();
        return true;
    }

    private JSONObject post(String urlStr, JSONObject body, String... extraHeaders) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(urlStr);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("apikey", apiKey());
            connection.setRequestProperty("Authorization", "Bearer " + apiKey());
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(15000);
            connection.setDoOutput(true);

            for (int i = 0; i + 1 < extraHeaders.length; i += 2) {
                connection.setRequestProperty(extraHeaders[i], extraHeaders[i + 1]);
            }

            byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(payload);
            }

            int code = connection.getResponseCode();
            InputStream stream = code >= 200 && code < 300 ? connection.getInputStream() : connection.getErrorStream();
            if (stream == null) return null;
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
