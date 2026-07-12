// API Client for GPS Tracker

export function getLocalToken() {
  return localStorage.getItem('deviceToken');
}

export function getLocalDeviceId() {
  return localStorage.getItem('deviceId');
}

export function getLocalDeviceName() {
  return localStorage.getItem('deviceName') || 'Mi Dispositivo';
}

export function getLocalServerUrl() {
  const storedUrl = localStorage.getItem('serverUrl');
  if (storedUrl) return storedUrl;

  return import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
}

function normalizeServerUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, '');
  return `http://${trimmed}`;
}

function getApiBaseUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000';
  }

  const configured = normalizeServerUrl(getLocalServerUrl());
  if (configured) return configured;

  return window.location.origin || 'http://localhost:3000';
}

function buildApiUrl(path) {
  if (!path) return getApiBaseUrl();
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBaseUrl();
  return new URL(path.startsWith('/') ? path : `/${path}`, base).toString();
}

export function getLocalSendInterval() {
  return parseInt(localStorage.getItem('sendInterval')) || 5;
}

export function getLocalSendOnlyMoving() {
  return localStorage.getItem('sendOnlyMoving') !== 'false'; // default true
}

export function getLocalSendBackground() {
  return localStorage.getItem('sendBackground') === 'true'; // default false
}

export function saveLocalSettings({ token, deviceId, name, serverUrl, sendInterval, sendOnlyMoving, sendBackground }) {
  if (token !== undefined) {
    if (token) localStorage.setItem('deviceToken', token);
    else localStorage.removeItem('deviceToken');
  }
  if (deviceId !== undefined) {
    if (deviceId) localStorage.setItem('deviceId', deviceId);
    else localStorage.removeItem('deviceId');
  }
  if (name !== undefined) localStorage.setItem('deviceName', name);
  if (serverUrl !== undefined) localStorage.setItem('serverUrl', serverUrl);
  if (sendInterval !== undefined) localStorage.setItem('sendInterval', sendInterval.toString());
  if (sendOnlyMoving !== undefined) localStorage.setItem('sendOnlyMoving', sendOnlyMoving.toString());
  if (sendBackground !== undefined) localStorage.setItem('sendBackground', sendBackground.toString());
}

async function request(path, options = {}) {
  const token = getLocalToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'X-Device-Token': token })
  };

  const url = buildApiUrl(path);

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers }
    });
  } catch (err) {
    throw new Error(`Failed to reach backend at ${url}: ${err.message}`);
  }

  if (!response.ok) {
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch {
      // ignore
    }
    if (response.status === 401) {
      localStorage.removeItem('deviceToken');
      localStorage.removeItem('deviceId');
      window.dispatchEvent(new CustomEvent('auth:invalid'));
    }
    throw new Error(`HTTP ${response.status}${errorBody ? `: ${errorBody}` : ''}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  return response.json();
}

export const api = {
  // Register a new device
  async registerDevice(name) {
    return request('/api/devices/register', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  },

  // Get all devices
  async getDevices() {
    return request('/api/devices');
  },

  // Get specific device details
  async getDevice(id) {
    return request(`/api/devices/${id}`);
  },

  // Delete a device
  async deleteDevice(id) {
    return request(`/api/devices/${id}`, {
      method: 'DELETE'
    });
  },

  // Get latest location of the active device
  async getLatestLocation() {
    return request('/api/location/latest');
  },

  // Get latest location from ANY device (for dashboard)
  async getLatestLocationAny() {
    return request('/api/location/latest-any');
  },

  // Get location history of the active device
  async getLocationHistory(limit = 200) {
    return request(`/api/location/history?limit=${limit}`);
  },

  // Send a location fix
  async sendLocation(location) {
    return request('/api/location', {
      method: 'POST',
      body: JSON.stringify(location)
    });
  }
};
