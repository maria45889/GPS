import { supabase, getDeviceId } from './supabase';

const getCacheKey = (deviceId = getDeviceId()) => (deviceId ? `gps_tracker_cache_${deviceId}` : 'gps_tracker_cache');

export const getCachedLocations = (deviceId = getDeviceId()) => {
  try {
    const raw = localStorage.getItem(getCacheKey(deviceId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCachedLocations = (locations, deviceId = getDeviceId()) => {
  try {
    localStorage.setItem(getCacheKey(deviceId), JSON.stringify(locations));
  } catch (err) {
    console.error('Error al guardar caché de ubicación GPS:', err);
  }
};

export const cacheLocation = (location, deviceId = getDeviceId()) => {
  const current = getCachedLocations(deviceId);
  current.push({
    ...location,
    cachedAt: new Date().toISOString(),
  });
  saveCachedLocations(current, deviceId);
};

export const clearCache = (deviceId = getDeviceId()) => {
  try {
    localStorage.removeItem(getCacheKey(deviceId));
  } catch (err) {
    console.error('Error al limpiar caché de ubicación GPS:', err);
  }
};

export const clearAllGpsCaches = () => {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('gps_tracker_cache')) {
        localStorage.removeItem(key);
      }
    }
  } catch (err) {
    console.error('Error al limpiar todos los cachés GPS:', err);
  }
};

export const flushCachedLocations = async (deviceId = getDeviceId()) => {
  if (!supabase || !deviceId) return;
  const cached = getCachedLocations(deviceId);
  if (cached.length === 0) return;

  const remaining = [];

  for (const item of cached) {
    const payload = {
      device_id: deviceId,
      latitude: item.latitude,
      longitude: item.longitude,
      speed: item.speed || 0,
      accuracy: (item.accuracy !== null && item.accuracy !== undefined && Number.isFinite(Number(item.accuracy))) ? Number(item.accuracy) : null,
      bearing: item.bearing || null,
      timestamp: item.timestamp || new Date().toISOString(),
    };

    const { error } = await supabase.from('gps_locations').insert(payload);
    if (error) {
      remaining.push(item);
    }
  }

  saveCachedLocations(remaining, deviceId);
};

class GPSTracker {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.intervalMs = 30000;
    this.currentRunId = 0;
  }

  async sendCurrentLocation(position) {
    if (!position || !position.coords) return;
    const { latitude, longitude, speed, accuracy, heading } = position.coords;
    const locationData = {
      latitude,
      longitude,
      speed: speed ? Math.max(0, speed * 3.6) : 0,
      accuracy: (accuracy !== null && accuracy !== undefined && Number.isFinite(Number(accuracy))) ? Number(accuracy) : null,
      bearing: heading || null,
      timestamp: new Date().toISOString(),
    };

    if (!supabase) {
      const deviceId = getDeviceId();
      cacheLocation(locationData, deviceId);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentDeviceId = user?.app_metadata?.device_id || user?.user_metadata?.device_id;

      // Si el usuario es un operador web sin claim de device_id provisionado, no intentamos registrarlo como dispositivo físico en la DB
      if (!currentDeviceId) {
        if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location?.hostname === 'localhost')) {
          console.warn('GPSTracker: El usuario autenticado es un operador web sin device_id asignado. Omite envío de posición.');
        }
        return {
          success: false,
          reason: 'NO_DEVICE_ID',
          message: 'El usuario en sesión es un operador web sin un dispositivo GPS asociado.',
        };
      }

      const { error } = await supabase.from('gps_locations').insert({
        device_id: currentDeviceId,
        latitude,
        longitude,
        speed: locationData.speed,
        accuracy: locationData.accuracy,
        bearing: locationData.bearing,
        timestamp: locationData.timestamp,
      });

      if (error) {
        cacheLocation(locationData, currentDeviceId);
      } else {
        // Al enviar con éxito, intenta reenviar posiciones previamente cacheadas
        await flushCachedLocations(currentDeviceId);
      }
    } catch {
      const deviceId = getDeviceId();
      cacheLocation(locationData, deviceId);
    }
  }

  async tick(runId = this.currentRunId) {
    if (runId !== this.currentRunId) return;
    // Evita la ejecución solapada dentro de la misma carrera
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              if (runId === this.currentRunId) {
                await this.sendCurrentLocation(pos);
              }
              resolve();
            },
            async () => {
              if (runId === this.currentRunId) {
                const deviceId = getDeviceId();
                await flushCachedLocations(deviceId);
              }
              resolve();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
          );
        });
      } else {
        if (runId === this.currentRunId) {
          const deviceId = getDeviceId();
          await flushCachedLocations(deviceId);
        }
      }
    } finally {
      if (runId === this.currentRunId) {
        this.isRunning = false;
      }
    }
  }

  start(intervalMs = 30000) {
    this.intervalMs = intervalMs;
    this.stop();
    this.currentRunId++;
    const runId = this.currentRunId;
    this.tick(runId);
    this.intervalId = setInterval(() => this.tick(runId), this.intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentRunId++;
    this.isRunning = false;
  }
}

export const gpsTracker = new GPSTracker();
