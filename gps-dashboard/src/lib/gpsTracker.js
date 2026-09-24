import { supabase, getDeviceId } from './supabase';
import { Capacitor, registerPlugin } from '@capacitor/core';

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

const getCacheKey = (deviceId = getDeviceId()) => (deviceId ? `gps_tracker_cache_${deviceId}` : 'gps_tracker_cache');

// B10: Generador de event_id estable a partir de los campos de la posición.
// Permite idempotencia: reintentos con el mismo evento no crean duplicados en Supabase
// si existe la restricción única ON (device_id, event_id).
function generateEventId(deviceId, timestamp, latitude, longitude) {
  const raw = `${deviceId}|${timestamp}|${latitude}|${longitude}`;
  // Hash FNV-1a de 32 bits → cadena hexadecimal estable (sin crypto, sin dependencias externas)
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return `evt-${h.toString(16).padStart(8, '0')}`;
}

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

// B13: Inserción por lotes de 50 eventos en lugar de uno por uno.
// Usa upsert con onConflict: 'event_id' para que reintentos sean idempotentes.
// Reduce el tiempo de sincronización de O(n) roundtrips a O(n/50).
const FLUSH_BATCH_SIZE = 50;

export const flushCachedLocations = async (deviceId = getDeviceId()) => {
  if (!supabase || !deviceId) return;
  const cached = getCachedLocations(deviceId);
  if (cached.length === 0) return;

  const remaining = [];

  for (let i = 0; i < cached.length; i += FLUSH_BATCH_SIZE) {
    const batch = cached.slice(i, i + FLUSH_BATCH_SIZE);
    const payloads = batch.map((item) => ({
      device_id: deviceId,
      latitude: item.latitude,
      longitude: item.longitude,
      speed: item.speed || 0,
      accuracy: (item.accuracy !== null && item.accuracy !== undefined && Number.isFinite(Number(item.accuracy))) ? Number(item.accuracy) : null,
      bearing: item.bearing || null,
      timestamp: item.timestamp || new Date().toISOString(),
      // B10: Preservar el event_id de la cola; generarlo si no existe (datos anteriores sin él).
      event_id: item.event_id || generateEventId(deviceId, item.timestamp || '', item.latitude, item.longitude),
    }));

    // C1: onConflict compuesto ['device_id', 'event_id'] requerido por Postgres.
    const { error } = await supabase
      .from('gps_locations')
      .upsert(payloads, { onConflict: 'device_id,event_id', ignoreDuplicates: true });

    if (error) {
      // Si el lote falla, conservar todos los ítems del lote para reintento.
      remaining.push(...batch);
    }
  }

  saveCachedLocations(remaining, deviceId);
};

class GPSTracker {
  constructor() {
    this.intervalId = null;
    this.watcherId = null;
    this.isRunning = false;
    this.intervalMs = 30000;
    this.currentRunId = 0;
    this.wakeLock = null;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', async () => {
        if (this.intervalId && document.visibilityState === 'visible') {
          await this.requestWakeLock();
        }
      });
    }
  }

  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    }
  }

  releaseWakeLock() {
    if (this.wakeLock !== null) {
      this.wakeLock.release().catch(console.warn);
      this.wakeLock = null;
    }
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

    // B1 CRÍTICO: Declarar currentDeviceId ANTES del try para que el catch pueda accederlo.
    // Si se declara dentro del try con const, el catch lanza ReferenceError y la posición se pierde.
    let currentDeviceId = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      currentDeviceId = user?.app_metadata?.device_id || user?.user_metadata?.device_id;

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

      // B10: Generar event_id estable antes del insert.
      // Reintento de red con mismo evento → mismo event_id → upsert lo ignora.
      const eventId = generateEventId(currentDeviceId, locationData.timestamp, latitude, longitude);

      const { error } = await supabase.from('gps_locations').upsert({
        device_id: currentDeviceId,
        latitude,
        longitude,
        speed: locationData.speed,
        accuracy: locationData.accuracy,
        bearing: locationData.bearing,
        timestamp: locationData.timestamp,
        event_id: eventId,
      }, { onConflict: 'device_id,event_id', ignoreDuplicates: true });

      if (error) {
        // Incluir el event_id en el ítem cacheado para que el flush lo reutilice idénticamente.
        cacheLocation({ ...locationData, event_id: eventId }, currentDeviceId);
      } else {
        // Al enviar con éxito, intenta reenviar posiciones previamente cacheadas
        await flushCachedLocations(currentDeviceId);
      }
    } catch {
      // B1: currentDeviceId fue declarado antes del try — siempre accesible aquí aunque falle auth.
      // Si aún es null (error ocurrió antes de resolver auth), usar getDeviceId() como último recurso.
      const fallbackId = currentDeviceId || getDeviceId();
      if (fallbackId) {
        cacheLocation(locationData, fallbackId);
      }
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

  async start(intervalMs = 30000) {
    this.intervalMs = intervalMs;
    this.stop();
    this.currentRunId++;
    const runId = this.currentRunId;

    if (Capacitor.isNativePlatform()) {
      try {
        this.watcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: 'Cancel to prevent battery drain.',
            backgroundTitle: 'Rastreo GPS Activo',
            requestPermissions: true,
            stale: false,
            distanceFilter: 5
          },
          async (location, error) => {
            if (error) {
              if (error.code === 'NOT_AUTHORIZED' && window.confirm('Esta app necesita permiso de ubicación en segundo plano. ¿Ir a ajustes?')) {
                BackgroundGeolocation.openSettings();
              }
              return console.error('Background Geolocation Error:', error);
            }
            if (location) {
              const pos = {
                coords: {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  speed: location.speed,
                  accuracy: location.accuracy,
                  heading: location.bearing
                }
              };
              await this.sendCurrentLocation(pos);
            }
          }
        );
      } catch (err) {
        console.error('Error starting BackgroundGeolocation:', err);
      }
    } else {
      this.requestWakeLock();
      this.tick(runId);
      this.intervalId = setInterval(() => this.tick(runId), this.intervalMs);
    }
  }

  stop() {
    if (this.watcherId) {
      BackgroundGeolocation.removeWatcher({ id: this.watcherId });
      this.watcherId = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.releaseWakeLock();
    this.currentRunId++;
    this.isRunning = false;
  }
}

export const gpsTracker = new GPSTracker();
