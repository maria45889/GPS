package com.gps.tracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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

public class HardwareRelayReceiver extends BroadcastReceiver {
    private static final String TAG = "HardwareRelayReceiver";
    public static final String ACTION_EXECUTE_COMMAND = "com.gps.tracker.EXECUTE_HARDWARE_COMMAND";

    private static final Set<String> ALLOWED_COMMANDS = new HashSet<>(Arrays.asList("activate", "stop", "immobilize"));
    private static final String[] GPIO_RELAY_CANDIDATE_PATHS = new String[] {
        "/sys/class/gpio/gpio17/value",
        "/sys/class/gpio/gpio18/value",
        "/sys/class/gpio/gpio4/value"
    };

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION_EXECUTE_COMMAND.equals(intent.getAction())) return;
        
        final String commandId = intent.getStringExtra("command_id");
        final String command = intent.getStringExtra("command");
        final long createdAt = intent.getLongExtra("created_at_ms", 0L);

        executor.execute(() -> {
            boolean success = performPhysicalRelaySwitch(context, command);
            Intent resultIntent = new Intent(VehicleControlReceiver.ACTION_VEHICLE_CONTROL_RESULT);
            resultIntent.setPackage(context.getPackageName());
            resultIntent.putExtra("command_id", commandId);
            resultIntent.putExtra("command", command);
            resultIntent.putExtra("success", success);
            resultIntent.putExtra("created_at_ms", createdAt);
            context.sendBroadcast(resultIntent);
        });
    }

    private boolean performPhysicalRelaySwitch(Context context, String command) {
        if (command == null || !ALLOWED_COMMANDS.contains(command.toLowerCase(Locale.ROOT))) {
            Log.w(TAG, "Comando invalido o no permitido en la whitelist: " + command);
            return false;
        }

        SharedPreferences prefs = context != null ? context.getSharedPreferences("vehicle_control_prefs", Context.MODE_PRIVATE) : null;
        boolean activeLow = prefs != null && prefs.getBoolean("gpio_active_low", "true".equalsIgnoreCase(System.getProperty("gps.relay.active_low", "false")));
        boolean immobilize = "stop".equalsIgnoreCase(command) || "immobilize".equalsIgnoreCase(command);
        String pinValue = immobilize ? (activeLow ? "1" : "0") : (activeLow ? "0" : "1");

        String prefPath = prefs != null ? prefs.getString("gpio_path", null) : null;
        String sysPropPath = System.getProperty("gps.relay.gpio_path", null);
        String customPath = (sysPropPath != null && !sysPropPath.trim().isEmpty()) ? sysPropPath : prefPath;
        boolean isDebug = false;
        if (context != null) {
            try {
                isDebug = (context.getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            } catch (Exception ignored) {}
        }
        boolean isSimulation = isDebug && "true".equalsIgnoreCase(System.getProperty("gps.relay.simulation", "false"));

        try {
            File gpioFile = null;
            if (customPath != null && !customPath.trim().isEmpty()) {
                gpioFile = new File(customPath);
            } else {
                for (String candidate : GPIO_RELAY_CANDIDATE_PATHS) {
                    File f = new File(candidate);
                    if (f.exists()) {
                        gpioFile = f;
                        break;
                    }
                }
                if (gpioFile == null) {
                    gpioFile = new File(GPIO_RELAY_CANDIDATE_PATHS[0]);
                }
            }

            if (gpioFile.exists()) {
                try (FileInputStream fis = new FileInputStream(gpioFile)) {
                    byte[] buf = new byte[16];
                    int readBytes = fis.read(buf);
                    if (readBytes > 0) {
                        String currentVal = new String(buf, 0, readBytes, StandardCharsets.UTF_8).trim();
                        if (pinValue.equals(currentVal)) {
                            Log.i(TAG, "Relé físico ya se encuentra en el estado deseado (" + pinValue + ")");
                            return true;
                        }
                    }
                }
                if (!isSimulation) {
                    try (FileOutputStream fos = new FileOutputStream(gpioFile)) {
                        fos.write(pinValue.getBytes(StandardCharsets.UTF_8));
                        fos.flush();
                        Log.i(TAG, "Escritura GPIO exitosa: valor " + pinValue + " escrito en " + gpioFile.getAbsolutePath());
                    }
                } else {
                    Log.i(TAG, "Simulando escritura GPIO exitosa: valor " + pinValue + " simulado para " + gpioFile.getAbsolutePath());
                }
                return true;
            } else {
                if (isSimulation) {
                    Log.i(TAG, "Simulando ejecución sin hardware presente (isSimulation=true). Valor " + pinValue + " aceptado.");
                    return true;
                } else {
                    Log.w(TAG, "No se encontró archivo GPIO sysfs en " + gpioFile.getAbsolutePath() + " para relé. Abortando. Ejecución simulada solo permitida en modo debug con gps.relay.simulation=true");
                    return false;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Excepción crítica durante escritura de hardware GPIO. Posible falta de permisos root/system o path sysfs incorrecto.", e);
            if (isSimulation) {
                Log.w(TAG, "Recuperando de excepción GPIO y reportando éxito por modo de simulación.", e);
                return true;
            }
            return false;
        }
    }
}
