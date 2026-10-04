package com.gps.tracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;


/**
 * Receptor de transmisión dedicado para alarmas de recuperación (Doze / reinicios).
 *
 * A partir de la migración a @capacitor-community/background-geolocation, el tracking
 * ya no depende de LocationService.java. Este receiver simplemente lanza MainActivity
 * en modo background-friendly para que el plugin de Capacitor retome el seguimiento.
 *
 * En Android 12+ (API 31+), iniciar un servicio Foreground desde PendingIntent.getService()
 * puede causar ForegroundServiceStartNotAllowedException. Usar un BroadcastReceiver dedicado
 * con PendingIntent.getBroadcast() permite iniciar la Activity dentro de la ventana
 * de ejecución permitida del broadcast.
 */
public class AlarmRecoveryReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmRecoveryReceiver";
    public static final String ACTION_RECOVER_SERVICE = "com.gps.tracker.ACTION_RECOVER_SERVICE";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (TrackingWatchdog.ACTION_WATCHDOG_CHECK.equals(action)) {
            handleWatchdogCheck(context);
            return;
        }
        if (!ACTION_RECOVER_SERVICE.equals(action)) return;
        Log.i(TAG, "Alarma de recuperación activada. Validando credenciales antes de reiniciar tracking.");
        try {
            android.os.UserManager userManager = (android.os.UserManager) context.getSystemService(Context.USER_SERVICE);
            if (userManager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && !userManager.isUserUnlocked()) {
                Log.w(TAG, "Dispositivo bloqueado (Direct Boot). No se pueden leer credenciales desde alarma.");
                return;
            }

            DeviceAuthManager authManager = new DeviceAuthManager(context);
            if (!authManager.hasCredentials() || authManager.isRevoked()) {
                Log.w(TAG, "Dispositivo no provisionado o revocado. Abortando arranque desde alarma de recuperación.");
                return;
            }
            if (!PermissionUtils.hasRequiredTrackingPermissions(context)) {
                Log.w(TAG, "Permisos de ubicación insuficientes. Marcando pending_perm_prompt=true.");
                context.getSharedPreferences("gps_app_prefs", Context.MODE_PRIVATE)
                        .edit().putBoolean("pending_perm_prompt", true).commit();
                return;
            }

            // El tracking background ahora lo gestiona el plugin @capacitor-community/background-geolocation.
            // Lanzar BootForegroundService para que inicie la MainActivity correctamente.
            Intent serviceIntent = new Intent(context, BootForegroundService.class);
            serviceIntent.putExtra("recovery_launch", true);
            androidx.core.content.ContextCompat.startForegroundService(context, serviceIntent);
            Log.i(TAG, "BootForegroundService lanzado para que Capacitor BG Geolocation retome el tracking.");
        } catch (Exception e) {
            Log.e(TAG, "Fallo al lanzar MainActivity desde AlarmRecoveryReceiver: " + e.getMessage(), e);
        }
    }

    /**
     * Comprobación periódica de salud del foreground service de geolocalización.
     *
     * Si el proceso murió con el servicio, no hay heartbeat reciente y hay que
     * relanzar MainActivity para que el plugin se vuelva a registrar. Si el servicio
     * sigue vivo, no se hace nada.
     */
    private void handleWatchdogCheck(Context context) {
        try {
            // Re-armar primero: setExactAndAllowWhileIdle es de un solo disparo, y
            // un fallo posterior no debe dejar el watchdog desarmado para siempre.
            if (TrackingWatchdog.isTrackingEnabled(context)) {
                TrackingWatchdog.schedule(context);
            }

            if (TrackingWatchdog.isAlive(context)) {
                Log.d(TAG, "Watchdog: seguimiento vivo (heartbeat reciente). Sin acción.");
                return;
            }

            Log.w(TAG, "Watchdog: sin heartbeat reciente. El servicio de foreground murió; relanzando MainActivity.");
            relaunchMainActivity(context, "watchdog_launch");
        } catch (Exception e) {
            Log.e(TAG, "Watchdog: fallo comprobando salud del seguimiento: " + e.getMessage(), e);
        }
    }

    private void relaunchMainActivity(Context context, String extraKey) {
        android.os.UserManager userManager =
                (android.os.UserManager) context.getSystemService(Context.USER_SERVICE);
        if (userManager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && !userManager.isUserUnlocked()) {
            Log.w(TAG, "Dispositivo bloqueado (Direct Boot). El watchdog esperará al próximo ciclo.");
            return;
        }

        DeviceAuthManager authManager = new DeviceAuthManager(context);
        if (!authManager.hasCredentials() || authManager.isRevoked()) {
            Log.w(TAG, "Dispositivo no provisionado o revocado. Watchdog sin acción.");
            return;
        }
        if (!PermissionUtils.hasRequiredTrackingPermissions(context)) {
            Log.w(TAG, "Permisos de ubicación insuficientes. Marcando pending_perm_prompt=true.");
            context.getSharedPreferences("gps_app_prefs", Context.MODE_PRIVATE)
                    .edit().putBoolean("pending_perm_prompt", true).commit();
            return;
        }

        Intent serviceIntent = new Intent(context, BootForegroundService.class);
        serviceIntent.putExtra(extraKey, true);
        androidx.core.content.ContextCompat.startForegroundService(context, serviceIntent);
        Log.i(TAG, "BootForegroundService relanzado por el watchdog para re-registrar el watcher.");
    }
}
