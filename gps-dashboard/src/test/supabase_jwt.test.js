// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { getNativeDeviceAuth, refreshNativeSession, withAuthRetry } from '../lib/supabase';

describe('Supabase Native JWT Renewal & Auto-retry', () => {
  it('obtiene las credenciales nativas desde el bridge de Capacitor', () => {
    window.CapacitorDeviceAuth = {
      getDeviceAuthJson: () => JSON.stringify({ access_token: 'test-native-jwt', device_id: 'device-123' }),
    };

    const nativeAuth = getNativeDeviceAuth();
    expect(nativeAuth).toEqual({ access_token: 'test-native-jwt', device_id: 'device-123' });
  });

  it('actualiza la sesión nativa con el token del dispositivo de Capacitor', async () => {
    window.CapacitorDeviceAuth = {
      getDeviceAuthJson: () => JSON.stringify({ access_token: 'valid-session-token', device_id: 'device-456' }),
    };
    const token = await refreshNativeSession();
    expect(token).toBe('valid-session-token');
  });

  it('reintenta la consulta cuando se recibe un error 401 usando el token nativo renovado', async () => {

    let attempts = 0;
    window.CapacitorDeviceAuth = {
      getDeviceAuthJson: () => JSON.stringify({ access_token: 'fresh-renewed-token', device_id: 'device-123' }),
    };

    const mockQuery = vi.fn(async () => {
      attempts++;
      if (attempts === 1) {
        return { error: { status: 401, message: 'JWT expired' }, data: null };
      }
      return { error: null, data: [{ id: 1, name: 'Moto 1' }] };
    });

    const result = await withAuthRetry(mockQuery);

    expect(attempts).toBe(2);
    expect(result.data).toEqual([{ id: 1, name: 'Moto 1' }]);
  });
});
