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
let currentNativeToken = nativeAuth?.access_token || null;

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: currentNativeToken ? {
        headers: {
          Authorization: `Bearer ${currentNativeToken}`,
        },
      } : undefined,
    })
  : null;

export const refreshNativeSession = async () => {
  if (!supabase) return null;
  const freshNative = getNativeDeviceAuth();
  if (freshNative?.access_token) {
    currentNativeToken = freshNative.access_token;
    
    // Configurar inmediatamente los headers globales de REST y Realtime
    if (supabase.rest?.headers) {
      supabase.rest.headers['Authorization'] = `Bearer ${freshNative.access_token}`;
    }
    if (supabase.realtime) {
      try { supabase.realtime.setAuth(freshNative.access_token); } catch {}
    }

    // Solo invocar setSession si se dispone de un refresh_token válido para evitar excepciones del cliente Supabase JS
    if (freshNative.refresh_token && typeof freshNative.refresh_token === 'string' && freshNative.refresh_token.trim() !== '') {
      try {
        await supabase.auth.setSession({
          access_token: freshNative.access_token,
          refresh_token: freshNative.refresh_token,
        });
      } catch (err) {
        console.warn('Error al actualizar la sesión de Supabase con refresh_token:', err);
      }
    }
    return freshNative.access_token;
  }
  return null;
};


export const withAuthRetry = async (queryFn) => {
  try {
    const res = await queryFn();
    if (res?.error && (res.error.status === 401 || String(res.error.message || '').includes('JWT'))) {
      const newToken = await refreshNativeSession();
      if (newToken) {
        return await queryFn();
      }
    }
    return res;
  } catch (err) {
    if (err?.status === 401 || String(err?.message || '').includes('JWT')) {
      const newToken = await refreshNativeSession();
      if (newToken) {
        return await queryFn();
      }
    }
    throw err;
  }
};

if (supabase && nativeAuth?.access_token) {
  refreshNativeSession().catch((err) => console.warn('No se pudo establecer la sesión Supabase nativa inicial:', err));

  if (typeof window !== 'undefined') {
    // Sincronizar token nativo periódicamente (cada 5 min) o al recuperar el foco
    window.setInterval(() => {
      refreshNativeSession();
    }, 5 * 60 * 1000);

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        refreshNativeSession();
      }
    });
  }
}

if (!hasSupabaseConfig) {
  console.warn('Supabase no configurado. La app usará modo local/fallback.');
}