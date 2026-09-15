import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { getDeviceId, hasSupabaseConfig, supabase } from './supabase';

const fallbackKey = 'gps_tracker_cache';

const normalizePosition = (coords, extra = {}) => ({
  latitude: coords?.latitude ?? 0,
  longitude: coords?.longitude ?? 0,
  speed: coords?.speed ?? 0,
  accuracy: coords?.accuracy ?? 0,
  altitude: coords?.altitude ?? null,
  heading: coords?.heading ?? null,
  battery: extra.battery ?? 0,
  timestamp: new Date().toISOString(),
});

const persistFallback = (payload) => {
  try {
    const previous = JSON.parse(localStorage.getItem(fallbackKey) || '[]');
    const next = [...previous, payload].slice(-50);
    localStorage.setItem(fallbackKey, JSON.stringify(next));
  } catch (error) {
    console.warn('Unable to persist GPS fallback payload:', error);
  }
};

export const submitLocationToSupabase = async (payload) => {
  if (!hasSupabaseConfig || !supabase) {
    persistFallback(payload);
    return { ok: false, reason: 'Supabase no configurado' };
  }

  try {
    const deviceId = getDeviceId();

    const { error: deviceError } = await supabase.from('devices').upsert(
      {
        id: deviceId,
        status: 'online',
        last_seen: payload.timestamp,
        updated_at: payload.timestamp,
      },
      { onConflict: 'id' }
    );
    if (deviceError) throw deviceError;

    const { error } = await supabase.from('gps_locations').insert([
      {
        device_id: deviceId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        speed: payload.speed,
        accuracy: payload.accuracy,
        altitude: payload.altitude,
        bearing: payload.heading,
        timestamp: payload.timestamp,
      },
    ]);

    if (error) throw error;

    return { ok: true };
  } catch (error) {
    console.error('GPS sync failed:', error);
    persistFallback(payload);
    return { ok: false, reason: error?.message || 'Error al sincronizar GPS' };
  }
};

export const startGpsTracking = ({ onUpdate, onError } = {}) => {
  const safeOnUpdate = onUpdate || (() => {});
  const safeOnError = onError || (() => {});

  const handlePosition = async (coords, extra = {}) => {
    const payload = normalizePosition(coords, extra);
    safeOnUpdate(payload);
    await submitLocationToSupabase(payload);
  };

  const nativeTracker = async () => {
    try {
      if (typeof window !== 'undefined' && window.Capacitor) {
        await Geolocation.requestPermissions();
        const result = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 30000,
        });
        const battery = await Device.getBatteryInfo();

        await handlePosition(result.coords, { battery: Math.round((battery.batteryLevel || 0) * 100) });
        return;
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => handlePosition(position.coords),
          (error) => {
            console.error('GPS permission error:', error);
            safeOnError(error);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 15000,
            timeout: 30000,
          }
        );
      }
    } catch (error) {
      console.error('Unable to start GPS tracking:', error);
      safeOnError(error);
    }
  };

  nativeTracker();

  const intervalId = setInterval(() => {
    nativeTracker();
  }, 30000);

  return () => {
    clearInterval(intervalId);
  };
};
