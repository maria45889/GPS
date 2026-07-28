package com.gpstracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * BootReceiver: se activa cuando el dispositivo enciende (BOOT_COMPLETED)
 * y al recibir la señal de START_TRACKING desde MainActivity.
 * Lanza el foreground service de react-native-background-actions para
 * que el rastreo GPS se reanude automáticamente.
 */
public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "BootReceiver";
    private static final String ACTION_START_TRACKING = "com.gpstracker.START_TRACKING";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        Log.d(TAG, "onReceive: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)
                || ACTION_START_TRACKING.equals(action)) {

            // Inicia la React Native app con el headless JS task.
            // react-native-background-actions necesita que JS esté cargado.
            Intent activityIntent = new Intent(context, MainActivity.class);
            activityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(activityIntent);
        }
    }
}
