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

/**
 * Se registra para BOOT_COMPLETED, USER_UNLOCKED y MY_PACKAGE_REPLACED.
 *
 * Con la migración a @capacitor-community/background-geolocation, este receiver
 * ya NO inicia LocationService (eliminado). En cambio, lanza MainActivity para
 * que el plugin de Capacitor reanude el tracking en background.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
                && !"android.intent.action.USER_UNLOCKED".equals(action)
                && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            Log.w(TAG, "Omitiendo broadcast no reconocido en BootReceiver: " + action);
            return;
        }

        if (intent.getPackage() != null && !context.getPackageName().equals(intent.getPackage())) {
            Log.w(TAG, "Omitiendo intent en BootReceiver dirigido a paquete no autorizado: " + intent.getPackage());
            return;
        }

        // Deduplicación: ignorar eventos duplicados en ventana de 10s
        Context safeContext = context;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            safeContext = context.createDeviceProtectedStorageContext();
        }
        SharedPreferences bootPrefs = safeContext.getSharedPreferences("gps_boot_prefs", Context.MODE_PRIVATE);
        long lastHandled = bootPrefs.getLong("last_boot_handled_ms", 0L);
        long now = System.currentTimeMillis();
        if (now - lastHandled < 10_000L) {
            Log.d(TAG, "Omitiendo evento de arranque duplicado en ventana de 10s: " + action);
            return;
        }
        bootPrefs.edit().putLong("last_boot_handled_ms", now).commit();

        Log.i(TAG, "Reinicio o desbloqueo detectado (" + action + "); validando credenciales.");
        try {
            android.os.UserManager userManager = (android.os.UserManager) context.getSystemService(Context.USER_SERVICE);
            if (userManager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && !userManager.isUserUnlocked()) {
                Log.w(TAG, "Dispositivo bloqueado (Direct Boot). Esperando ACTION_USER_UNLOCKED para leer credenciales.");
                return;
            }

            DeviceAuthManager authManager = new DeviceAuthManager(context);
            if (!authManager.hasCredentials() || authManager.isRevoked()) {
                Log.w(TAG, "Dispositivo sin credenciales o revocado. Se pospone arranque automático.");
                return;
            }

            if (!authManager.isProvisioned()) {
                long nextRetrySec = authManager.getNextAuthRetrySeconds();
                long nowSec = System.currentTimeMillis() / 1000;
                long delayMs = Math.max(1000L, (nextRetrySec - nowSec) * 1000L);
                Log.w(TAG, "Dispositivo en ventana de reintento de autenticación. Programando alarma de recuperación en " + (delayMs / 1000) + "s.");
                scheduleRecoveryAlarm(context, delayMs);
                return;
            }

            if (!PermissionUtils.hasRequiredTrackingPermissions(context)) {
                Log.w(TAG, "Permisos de ubicación insuficientes tras el arranque. Marcando pending_perm_prompt=true.");
                context.getSharedPreferences("gps_app_prefs", Context.MODE_PRIVATE)
                        .edit().putBoolean("pending_perm_prompt", true).commit();
                return;
            }

            // El tracking background es gestionado por el plugin Capacitor.
            // Lanzar MainActivity para que el plugin retome el seguimiento.
            Intent mainIntent = new Intent(context, MainActivity.class);
            mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            mainIntent.putExtra("boot_launch", true);
            context.startActivity(mainIntent);
            Log.i(TAG, "MainActivity lanzada tras reinicio para que Capacitor BG Geolocation retome el tracking.");

        } catch (Exception e) {
            Log.e(TAG, "Excepción en BootReceiver al lanzar MainActivity: " + e.getMessage(), e);
            // Programar reintento en 30s si hubo un error inesperado
            scheduleRecoveryAlarm(context, 30_000L);
        }

    }

    private void scheduleRecoveryAlarm(Context context, long delayMs) {
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
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    // Android 12+: usar AlarmClock para poder iniciar Activity desde alarma
                    long triggerAtRtc = System.currentTimeMillis() + delayMs;
                    AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(triggerAtRtc, null);
                    alarmManager.setAlarmClock(info, pendingIntent);
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    // La alarma de recuperacion debe ser exacta: setAndAllowWhileIdle es
                    // inexacto y Doze puede diferirla minutos, defeating el proposito del
                    // reintento. setExactAndAllowWhileIdle es exacta en Doze y es la que
                    // justifica android.permission.SCHEDULE_EXACT_ALARM en el manifest.
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent);
                } else {
                    alarmManager.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error programando alarma de recuperación desde BootReceiver", e);
        }
    }
}
