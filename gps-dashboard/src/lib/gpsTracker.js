import { supabase, getDeviceId } from './supabase';
import { Capacitor, registerPlugin } from '@capacitor/core';

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

const getCacheKey = (deviceId = getDeviceId()) => (deviceId ? `gps_tracker_cache_${deviceId}` : 'gps_tracker_cache');

// B10: Generador de event_id estable a partir de los campos de la posición.
// Permite idempotencia: reintentos con el mismo evento no crean duplicados en Supabase
// si existe la restricción única ON (device_id, event_id).
function generateEventId(deviceId, timestamp, latitude, longitude) {
  // Bug #11: Usar UUID v4 en vez de FNV-1a de 32 bits que generaba colisiones
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback si crypto no está disponible
  return 'evt-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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

// Tope de la cola offline. Sin esto, un device sin red durante horas acumula miles
// de posiciones en localStorage (~5 MB en navegador): al superarla, el setItem lanza
// QuotaExceededError, la caché se corrompe y se pierde TODO el historial offline.
// Al truncar, se conservan las muestras más recientes (las que importan para la
// trayectoria) descartando las más antiguas.
export const MAX_CACHED_LOCATIONS = 1000;

export const cacheLocation = (location, deviceId = getDeviceId()) => {
  const current = getCachedLocations(deviceId);
  current.push({
    ...location,
    cachedAt: new Date().toISOString(),
  });
  if (current.length > MAX_CACHED_LOCATIONS) {
    current.splice(0, current.length - MAX_CACHED_LOCATIONS);
    console.warn(
      `GPSTracker: cola offline truncada a ${MAX_CACHED_LOCATIONS} entradas ` +
      `(localStorage no tiene espacio infinito). Se descartó el historial más antiguo.`
    );
  }
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
      // Mismos clamps que en sendCurrentLocation: la cola puede contener entradas
      // cacheadas antes de que existieran los CHECK constraints.
      speed: Math.min(400, Math.max(0, Number(item.speed) || 0)),
      accuracy: Number.isFinite(Number(item.accuracy)) ? Math.max(0, Number(item.accuracy)) : null,
      bearing: Number.isFinite(Number(item.bearing)) ? Math.min(360, Math.max(0, Number(item.bearing))) : null,
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

    if (typeof window !== 'undefined') {
      window.addEventListener('appRestored', () => {
        if (this.isRunning) {
          this.nativeHeartbeat();
        } else {
          this.start(this.intervalMs);
        }
      });
    }

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

    // Los clamps de abajo son obligatorios, no cosméticos: la migración
    // 20260930231939 añade CHECK constraints (speed 0-400 km/h, bearing 0-360,
    // accuracy >= 0). Si un device reporta basura, sin clamp el INSERT falla con
    // 'violates check constraint' y la posición se pierde.
    const rawSpeedKmh = speed ? speed * 3.6 : 0;
    const clampedSpeed = Number.isFinite(rawSpeedKmh) ? Math.min(400, Math.max(0, rawSpeedKmh)) : 0;
    const rawAccuracy = Number(accuracy);
    const clampedAccuracy = Number.isFinite(rawAccuracy) ? Math.max(0, rawAccuracy) : null;
    const rawBearing = Number(heading);
    const clampedBearing = Number.isFinite(rawBearing) ? Math.min(360, Math.max(0, rawBearing)) : null;

    const locationData = {
      latitude,
      longitude,
      speed: clampedSpeed,
      accuracy: clampedAccuracy,
      bearing: clampedBearing,
      // Usar el timestamp real del fix GPS, no la hora de procesamiento. Con una
      // cola offline, `new Date()` mentía: al vaciar la cola todas las posiciones
      // salían con la hora del flush y la velocidad calculada en el mapa era falsa.
      timestamp: position.timestamp
        ? new Date(position.timestamp).toISOString()
        : new Date().toISOString(),
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
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      const user = session?.user;
      if (authError || !user) {
         throw new Error(authError?.message || 'Usuario no autenticado (sesión ausente o caída)');
      }

      currentDeviceId = user?.app_metadata?.device_id || user?.user_metadata?.device_id;

      // Si el usuario es un operador web sin claim de device_id provisionado, no intentamos registrarlo como dispositivo físico en la DB
      if (!currentDeviceId) {
        if (import.meta.env?.DEV || (typeof window !== 'undefined' && window.location?.hostname === 'localhost')) {
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
              try {
                if (runId === this.currentRunId) {
                  await this.sendCurrentLocation(pos);
                }
              } catch (e) {
                console.error('Error in sendCurrentLocation', e);
              } finally {
                resolve();
              }
            },
            async () => {
              try {
                if (runId === this.currentRunId) {
                  const deviceId = getDeviceId();
                  await flushCachedLocations(deviceId);
                }
              } catch (e) {
                console.error('Error in flushCachedLocations', e);
              } finally {
                resolve();
              }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
          );
        });
      } else {
        try {
          if (runId === this.currentRunId) {
            const deviceId = getDeviceId();
            await flushCachedLocations(deviceId);
          }
        } catch (e) {
          console.error('Error in flushCachedLocations offline', e);
        }
      }
    } finally {
      if (runId === this.currentRunId) {
        this.isRunning = false;
      }
    }
  }

  async start(intervalMs = 30000) {
    // El guard va DESPUÉS de stop(): stop() limpia watcherId, así que comprobarlo
    // antes solo detectaba watchers de otra instancia/vista, no de esta.
    this.stop();

    this.intervalMs = intervalMs;
    this.currentRunId++;
    const runId = this.currentRunId;
    this.isRunning = true;

    if (Capacitor.isNativePlatform()) {
      let attempts = 0;
      let success = false;
      while (attempts < 3 && !success) {
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
                this.nativeHeartbeat();
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
          this.nativeSetTrackingEnabled(true);
  
          // Bucle de liveness: El distanceFilter impide que el plugin emita posiciones si el
          // vehiculo esta estacionado. Esto asegura que el watchdog no nos mate por falta de latidos.
          this.livenessTimer = setInterval(() => {
            this.nativeHeartbeat();
          }, 10 * 60 * 1000); // 10 minutos (menor a STALE_AFTER_MS = 25m)
  
          success = true;
        } catch (err) {
          attempts++;
          console.error(`Error starting BackgroundGeolocation (intento ${attempts}):`, err);
          if (attempts >= 3) {
            // Clean up on failure to avoid inconsistent state
            this.stop();
          } else {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
    } else {
      this.requestWakeLock();
      this.tick(runId);
      this.intervalId = setInterval(() => this.tick(runId), this.intervalMs);
    }
  }

  nativeSetTrackingEnabled(enabled) {
    try {
      window.CapacitorTracking?.setTrackingEnabled?.(enabled);
    } catch (err) {
      console.warn('[GPS] No se pudo notificar el estado de seguimiento al watchdog nativo:', err);
    }
  }

  nativeHeartbeat() {
    try {
      window.CapacitorTracking?.heartbeat?.();
    } catch (err) {
      console.warn('[GPS] No se pudo enviar heartbeat al watchdog nativo:', err);
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
    if (this.livenessTimer) {
      clearInterval(this.livenessTimer);
      this.livenessTimer = null;
    }
    this.releaseWakeLock();
    this.currentRunId++;
    this.isRunning = false;
    this.nativeSetTrackingEnabled(false);
  }
}

export const gpsTracker = new GPSTracker();
