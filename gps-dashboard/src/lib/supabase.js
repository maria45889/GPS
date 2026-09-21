import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co'
);

export const getNativeDeviceAuth = () => {
  try {
    if (typeof window !== 'undefined' && window.CapacitorDeviceAuth?.getDeviceAuthJson) {
      const raw = window.CapacitorDeviceAuth.getDeviceAuthJson();
      if (raw && typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        if (parsed.access_token) return parsed;
      }
    }
  } catch (e) {
    console.warn('Error leyendo autenticación nativa de Capacitor:', e);
  }
  return null;
};

export const getDeviceId = () => {
  const nativeAuth = getNativeDeviceAuth();
  if (nativeAuth?.device_id) {
    localStorage.setItem('gps_device_id', nativeAuth.device_id);
    return nativeAuth.device_id;
  }

  let deviceId = localStorage.getItem('gps_device_id');

  if (!deviceId) {
    const randomId = globalThis.crypto?.randomUUID?.() || Date.now();
    deviceId = `device-${randomId}`;
    localStorage.setItem('gps_device_id', deviceId);
  }

  return deviceId;
};

export const getStoredDeviceId = () => {
  const nativeAuth = getNativeDeviceAuth();
  if (nativeAuth?.device_id) return nativeAuth.device_id;
  return localStorage.getItem('gps_device_id');
};

const nativeAuth = getNativeDeviceAuth();

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: nativeAuth?.access_token ? {
        headers: {
          Authorization: `Bearer ${nativeAuth.access_token}`,
        },
      } : undefined,
    })
  : null;

if (supabase && nativeAuth?.access_token) {
  supabase.auth.setSession({
    access_token: nativeAuth.access_token,
    refresh_token: '',
  }).catch((err) => console.warn('No se pudo establecer la sesión Supabase nativa:', err));
}

if (!hasSupabaseConfig) {
  console.warn('Supabase no configurado. La app usará modo local/fallback.');
}