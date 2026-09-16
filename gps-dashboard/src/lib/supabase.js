import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co'
);

export const getDeviceId = () => {
  let deviceId = localStorage.getItem('gps_device_id');

  if (!deviceId) {
    const randomId = globalThis.crypto?.randomUUID?.() || Date.now();
    deviceId = `device-${randomId}`;
    localStorage.setItem('gps_device_id', deviceId);
  }

  return deviceId;
};

export const getStoredDeviceId = () => localStorage.getItem('gps_device_id');

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

if (!hasSupabaseConfig) {
  console.warn('Supabase no configurado. La app usará modo local/fallback.');
}