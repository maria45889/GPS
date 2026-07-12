import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  DEVICE_TOKEN: '@gps_tracker/token',
  DEVICE_ID: '@gps_tracker/device_id',
  DEVICE_NAME: '@gps_tracker/device_name',
  TRACKING_ENABLED: '@gps_tracker/tracking_enabled',
  PENDING_LOCATIONS: '@gps_tracker/pending_locations',
  SERVER_URL: '@gps_tracker/server_url',
};

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.DEVICE_TOKEN);
}

export async function setToken(token: string): Promise<void> {
  return AsyncStorage.setItem(KEYS.DEVICE_TOKEN, token);
}

export async function saveToken(token: string): Promise<void> {
  return setToken(token);
}

export async function getDeviceId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.DEVICE_ID);
}

export async function setDeviceId(id: number): Promise<void> {
  return AsyncStorage.setItem(KEYS.DEVICE_ID, String(id));
}

export async function getDeviceName(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.DEVICE_NAME);
}

export async function setDeviceName(name: string): Promise<void> {
  return AsyncStorage.setItem(KEYS.DEVICE_NAME, name);
}

export async function isTrackingEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.TRACKING_ENABLED);
  return val === 'true';
}

export async function setTrackingEnabled(enabled: boolean): Promise<void> {
  return AsyncStorage.setItem(KEYS.TRACKING_ENABLED, String(enabled));
}

export async function clearAll(): Promise<void> {
  return AsyncStorage.multiRemove(Object.values(KEYS));
}

export async function getPendingLocations(): Promise<any[]> {
  const data = await AsyncStorage.getItem(KEYS.PENDING_LOCATIONS);
  return data ? JSON.parse(data) : [];
}

export async function savePendingLocations(locations: any[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.PENDING_LOCATIONS, JSON.stringify(locations));
}

export async function getServerUrl(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.SERVER_URL);
}

export async function setServerUrl(url: string): Promise<void> {
  return AsyncStorage.setItem(KEYS.SERVER_URL, url);
}
