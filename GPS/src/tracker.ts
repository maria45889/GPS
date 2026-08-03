import BackgroundService from 'react-native-background-actions';
import Geolocation from '@react-native-community/geolocation';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';
import {sendLocation, LocationPayload, initApiBase, syncOfflineLocations} from './api';
import {
  getToken,
  getDeviceId,
  getDeviceName,
  setToken,
  setDeviceId,
  setDeviceName,
  setTrackingEnabled,
  isTrackingEnabled,
  getPendingLocations,
  savePendingLocations,
  savePendingLocation,
} from './storage';
import {registerDevice} from './api';

// El intervalo base será de 30 segundos en vez de 10
const BASE_UPDATE_INTERVAL_MS = 30000;

const notificationConfig = {
  taskName: 'Rastreo GPS',
  taskTitle: 'GPS Tracker',
  taskDesc: 'Enviando ubicación en segundo plano...',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#e94560',
  linkingURI: undefined,
  parameters: {
    delay: 1000,
  },
  progressBar: {
    max: 100,
    value: 0,
    indeterminate: true,
  },
};

let trackingTimer: ReturnType<typeof setTimeout> | null = null;

function getCurrentPosition(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number | null;
}> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos => {
        const {coords} = pos;
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy ?? null,
        });
      },
      err => reject(err),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      },
    );
  });
}

async function getBatteryLevel(): Promise<number | null> {
  try {
    const level = await DeviceInfo.getBatteryLevel();
    return level != null ? Math.round(level * 100) : null;
  } catch {
    return null;
  }
}

async function ensureDeviceRegistered(): Promise<string> {
  let token = await getToken();
  if (!token) {
    const deviceId = await getDeviceId();
    const deviceName =
      (await getDeviceName()) || `Android-${deviceId || Date.now()}`;
    try {
      const result = await registerDevice(deviceName);
      await setToken(result.token);
      await setDeviceId(result.id);
      await setDeviceName(result.name);
      token = result.token;
    } catch (error) {
      console.error('Error registrando dispositivo:', error);
      throw new Error('No se pudo registrar el dispositivo');
    }
  }
  return token;
}

async function trackingTask(taskData?: {delay?: number}) {
  try {
    await initApiBase();
    const token = await ensureDeviceRegistered();

    if (trackingTimer) {
      clearTimeout(trackingTimer);
    }

  // Función para sincronizar ubicaciones pendientes
  const syncPending = async () => {
    const pending = await getPendingLocations();
    if (pending.length === 0) return;

    try {
      const result = await syncOfflineLocations(token, pending);
      if ('status' in result && result.status === 'ok') {
        console.log(`Sincronizadas ${result.inserted} ubicaciones offline`);
        await savePendingLocations([]);
      } else {
        console.warn('Error al sincronizar ubicaciones offline:', result);
      }
    } catch (err) {
      console.warn('Error de red al sincronizar:', err);
    }
  };

  // Listener de conexión para sincronizar automáticamente
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      syncPending();
    }
  });

  const tick = async () => {
    try {
      const pos = await getCurrentPosition();
      const battery = await getBatteryLevel();
      const isConnected = await NetInfo.fetch().then(state => state.isConnected);

      const payload: LocationPayload = {
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        battery,
      };

      if (isConnected) {
        // Primero intentar sincronizar ubicaciones pendientes
        await syncPending();

        // Enviar ubicación actual
        try {
          const result = await sendLocation(token, payload);
          if ('error' in result && result.error) {
            console.warn('Error al enviar ubicación:', result.error);
            await savePendingLocation(payload);
          }
        } catch (netErr) {
          console.warn('Error de red, guardando en cola offline...', netErr);
          await savePendingLocation(payload);
        }
      } else {
        // Sin conexión - guardar localmente
        console.log('Sin conexión, guardando ubicación localmente');
        await savePendingLocation(payload);
      }

      // Adaptar el intervalo si la batería es baja (< 20%)
      const nextInterval = (battery !== null && battery < 20)
        ? BASE_UPDATE_INTERVAL_MS * 2
        : BASE_UPDATE_INTERVAL_MS;

      trackingTimer = setTimeout(tick, nextInterval);

    } catch (err) {
      console.warn('Error en ciclo de rastreo:', err);
      trackingTimer = setTimeout(tick, BASE_UPDATE_INTERVAL_MS);
    }
  };

  if (taskData?.delay) {
    await new Promise(r => setTimeout(r, taskData.delay));
  }

  await tick();
  } catch (error) {
    console.error('Error fatal en trackingTask:', error);
    await stopTracking();
  }
}

export async function startTracking(): Promise<void> {
  if (await isTrackingEnabled()) return;
  await setTrackingEnabled(true);

  await BackgroundService.start(trackingTask, {
    ...notificationConfig,
    progressBar: {
      max: 100,
      value: 0,
      indeterminate: true,
    },
  });
}

export async function stopTracking(): Promise<void> {
  await setTrackingEnabled(false);
  if (trackingTimer) {
    clearTimeout(trackingTimer);
    trackingTimer = null;
  }
  await BackgroundService.stop();
}

export async function isRunning(): Promise<boolean> {
  return BackgroundService.isRunning();
}

export {trackingTask};
