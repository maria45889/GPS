package com.gps.tracker;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.SystemClock;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action) && !"android.intent.action.USER_UNLOCKED".equals(action) && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            Log.w(TAG, "Omitiendo broadcast no reconocido en BootReceiver: " + action);
            return;
        }

        if (intent.getPackage() != null && !context.getPackageName().equals(intent.getPackage())) {
            Log.w(TAG, "Omitiendo intent en BootReceiver dirigido a paquete no autorizado: " + intent.getPackage());
            return;
        }

        Context safeContext = context;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            safeContext = context.createDeviceProtectedStorageContext();
        }
        SharedPreferences bootPrefs = safeContext.getSharedPreferences("gps_boot_prefs", Context.MODE_PRIVATE);
        long lastHandled = bootPrefs.getLong("last_boot_handled_ms", 0L);
        long now = System.currentTimeMillis();
        if (now - lastHandled < 10_000L) {
            Log.d(TAG, "Omitiendo evento de arranque/desbloqueo duplicado en ventana de 10s: " + action);
            return;
        }
        bootPrefs.edit().putLong("last_boot_handled_ms", now).commit();


        Log.i(TAG, "Reinicio o desbloqueo detectado (" + action + "); validando sesión y permisos antes de arrancar servicio.");
        try {
            DeviceAuthManager authManager = new DeviceAuthManager(context);
            if (!authManager.hasCredentials() || authManager.isRevoked()) {
                Log.w(TAG, "Dispositivo sin credenciales o revocado. Se pospone arranque automático del servicio.");
                return;
            }

            if (!authManager.isProvisioned()) {
                long nextRetrySec = authManager.getNextAuthRetrySeconds();
                long nowSec = System.currentTimeMillis() / 1000;
                long delayMs = Math.max(1000L, (nextRetrySec - nowSec) * 1000L);
                Log.w(TAG, "Dispositivo en ventana de reintento de autenticación. Programando alarma de recuperación en " + (delayMs / 1000) + "s.");
                scheduleServiceStartAlarm(context, delayMs);
                return;
            }

            if (!PermissionUtils.hasRequiredTrackingPermissions(context)) {
                Log.w(TAG, "Permisos de ubicación o notificación no concedidos tras el arranque. Se pospone servicio.");
                return;
            }

            Intent serviceIntent = new Intent(context, LocationService.class);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && e instanceof android.app.ForegroundServiceStartNotAllowedException) {
                Log.w(TAG, "Inicio de Foreground Service denegado tras reinicio por política Android 12+: ForegroundServiceStartNotAllowedException. Programando alarma de recuperación en 10s.", e);
                scheduleServiceStartAlarm(context, 10_000L);
            } else {
                Log.e(TAG, "Excepción de arranque foreground en BootReceiver: " + e.getMessage(), e);
            }
        }
    }

    private void scheduleServiceStartAlarm(Context context, long delayMs) {
        try {
            Intent recoveryIntent = new Intent(context, AlarmRecoveryReceiver.class);
            recoveryIntent.setAction(AlarmRecoveryReceiver.ACTION_RECOVER_SERVICE);
            recoveryIntent.setPackage(context.getPackageName());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context, 42, recoveryIntent,
                    PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                long triggerAt = SystemClock.elapsedRealtime() + delayMs;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent);
                } else {
                    alarmManager.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error programando alarma de recuperación tras fallo de autenticación", e);
        }
    }
}
