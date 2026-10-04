package com.gps.tracker;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class BootForegroundService extends Service {
    private static final String TAG = "BootForegroundService";
    private static final int NOTIFICATION_ID = 2002;
    private static final String CHANNEL_ID = "boot_recovery_channel";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i(TAG, "Iniciando BootForegroundService para lanzar MainActivity desde background...");

        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        
        if (intent != null && intent.getExtras() != null) {
            mainIntent.putExtras(intent.getExtras());
        }

        int pendingFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M 
            ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT 
            : PendingIntent.FLAG_UPDATE_CURRENT;
            
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, mainIntent, pendingFlags);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Reanudando Rastreo")
                .setContentText("Inicializando servicios GPS...")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();

        startForeground(NOTIFICATION_ID, notification);

        try {
            // Android 10+ permite iniciar Activities desde el background SI la app
            // tiene un Foreground Service corriendo, así que esto ahora funcionará.
            startActivity(mainIntent);
            Log.i(TAG, "MainActivity lanzada exitosamente desde Foreground Service.");
        } catch (Exception e) {
            Log.e(TAG, "Error lanzando MainActivity desde BootForegroundService: " + e.getMessage(), e);
        }

        // Una vez que MainActivity se lanzó y Capacitor tomó el control del
        // background geolocation plugin, este servicio intermedio ya no es necesario.
        stopSelf();

        return START_NOT_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Reanudación de Servicio",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Notificación temporal usada al arrancar el dispositivo.");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
