import { getServerUrl } from './storage';

let API_BASE = 'http://192.168.100.176:3000';

// Función para actualizar la URL base del API
export function setApiBase(url: string) {
  API_BASE = url;
}

// Función para obtener la URL base actual
export function getApiBase(): string {
  return API_BASE;
}

// Inicializar la URL desde el almacenamiento
export async function initApiBase() {
  const url = await getServerUrl();
  if (url) {
    API_BASE = url;
  }
}

export interface LocationPayload {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery: number | null;
}

export interface RegisterResponse {
  id: number;
  name: string;
  token: string;
}

export interface DeviceInfo {
  id: number;
  name: string;
  token: string;
  created_at: string;
  latest?: LocationData;
}

export interface LocationData {
  id?: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  bearing?: number;
  battery?: number;
  timestamp: string;
}

export async function registerDevice(name: string): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE}/api/devices/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function sendLocation(
  token: string,
  loc: LocationPayload | LocationPayload[],
): Promise<{ status: string } | { error: string }> {
  const res = await fetch(`${API_BASE}/api/location`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Token': token,
    },
    body: JSON.stringify(Array.isArray(loc) ? loc : [loc]),
  });
  return res.json();
}

export async function fetchDevices(token: string): Promise<DeviceInfo[]> {
  const res = await fetch(`${API_BASE}/api/devices`, {
    headers: { 'X-Device-Token': token },
  });
  return res.json();
}

export async function fetchLatestLocation(token: string): Promise<LocationData | null> {
  const res = await fetch(`${API_BASE}/api/location/latest`, {
    headers: { 'X-Device-Token': token },
  });
  const data = await res.json();
  return data.error ? null : data;
}

export async function fetchLocationHistory(token: string, limit = 500): Promise<LocationData[]> {
  const res = await fetch(`${API_BASE}/api/location/history?limit=${limit}`, {
    headers: { 'X-Device-Token': token },
  });
  return res.json();
}
