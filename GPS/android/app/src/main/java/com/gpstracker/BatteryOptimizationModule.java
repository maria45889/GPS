package com.gpstracker;

import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.provider.Settings;
import android.net.Uri;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class BatteryOptimizationModule extends ReactContextBaseJavaModule {

    BatteryOptimizationModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "BatteryOptimizationModule";
    }

    @ReactMethod
    public void isIgnoringBatteryOptimizations(Promise promise) {
        try {
            PowerManager pm = (PowerManager) getReactApplicationContext()
                    .getSystemService(Context.POWER_SERVICE);
            String packageName = getReactApplicationContext().getPackageName();
            promise.resolve(pm.isIgnoringBatteryOptimizations(packageName));
        } catch (Exception e) {
            promise.reject("BATTERY_OPT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void requestIgnoreBatteryOptimizations() {
        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
        intent.setData(Uri.parse("package:" + getReactApplicationContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getReactApplicationContext().startActivity(intent);
    }
}
