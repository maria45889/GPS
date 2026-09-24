package com.gps.tracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.core.content.ContextCompat;

/**
 * Receptor de transmisión dedicado para alarmas de recuperación (Doze / reinicios).
 * En Android 12+ (API 31+), iniciar un servicio Foreground desde PendingIntent.getService()
 * puede causar ForegroundServiceStartNotAllowedException. Usar un BroadcastReceiver dedicado
 * para recibir el PendingIntent.getBroadcast() permite iniciar el servicio dentro de la
 * ventana de ejecución permitida del broadcast.
 */
public class AlarmRecoveryReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmRecoveryReceiver";
    public static final String ACTION_RECOVER_SERVICE = "com.gps.tracker.ACTION_RECOVER_SERVICE";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION_RECOVER_SERVICE.equals(intent.getAction())) return;
        Log.i(TAG, "Alarma de recuperación activada. Validando credenciales y arrancando servicio.");
        try {
            DeviceAuthManager authManager = new DeviceAuthManager(context);
            if (!authManager.hasCredentials() || authManager.isRevoked()) {
                Log.w(TAG, "Dispositivo no provisionado o revocado. Abortando arranque desde alarma de recuperación.");
                return;
            }
            if (!PermissionUtils.hasRequiredTrackingPermissions(context)) {
                Log.w(TAG, "Permisos de ubicación o notificación insuficientes. Marcando pending_perm_prompt=true para guiado al abrir la app.");
                context.getSharedPreferences("gps_app_prefs", Context.MODE_PRIVATE)
                        .edit().putBoolean("pending_perm_prompt", true).commit();
                return;
            }

            Intent serviceIntent = new Intent(context, LocationService.class);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Fallo al iniciar LocationService desde AlarmRecoveryReceiver: " + e.getMessage(), e);
        }
    }
}
