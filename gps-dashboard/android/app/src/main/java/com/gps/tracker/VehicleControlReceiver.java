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
        if (intent == null) return;
        String action = intent.getAction();
        if (!ACTION_VEHICLE_CONTROL.equals(action)) {
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
        Log.i(TAG, "Receptor físico de vehículos validó comando: " + command + " (ID: " + commandId + "). Delegando a HardwareRelayReceiver.");

        executor.execute(() -> {
            try {
                Intent execIntent = new Intent("com.gps.tracker.EXECUTE_HARDWARE_COMMAND");
                execIntent.setPackage(context.getPackageName());
                execIntent.putExtra("command_id", commandId);
                execIntent.putExtra("command", command);
                execIntent.putExtra("created_at_ms", createdAt);
                context.sendBroadcast(execIntent);
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

}
