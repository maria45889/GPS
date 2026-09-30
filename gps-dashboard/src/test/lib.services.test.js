// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fetchDrivingRoute } from '../lib/routing';
import { searchPlaces } from '../lib/geocode';
import { deleteVehicle } from '../lib/vehicleActions';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    }
  },
  withAuthRetry: vi.fn((fn) => fn())
}));

describe('lib services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('routing.js', () => {
    it('returns formatted route data from OSRM response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'Ok',
          routes: [{
            geometry: { coordinates: [[-74.0, 4.6], [-74.1, 4.7]] },
            distance: 1200,
            duration: 360
          }]
        })
      });

      const result = await fetchDrivingRoute([4.6, -74.0], [4.7, -74.1]);
      
      expect(result).not.toBeNull();
      expect(result.distanceM).toBe(1200);
      expect(result.durationS).toBe(360);
      expect(result.coords).toEqual([[4.6, -74.0], [4.7, -74.1]]); // Coordinates flipped to lat, lng
    });

    it('throws error if OSRM returns an error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(fetchDrivingRoute([4.6, -74.0], [4.7, -74.1])).rejects.toThrow('Ruta no disponible (500)');
    });
  });

  describe('geocode.js', () => {
    it('returns array of places from Nominatim response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          {
            place_id: '123',
            display_name: 'Calle 100, Bogotá, Colombia',
            lat: '4.6',
            lon: '-74.0',
            address: { road: 'Calle 100', city: 'Bogotá' }
          }
        ])
      });

      const result = await searchPlaces('Calle 100');
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('123');
      expect(result[0].label).toBe('Calle 100, Bogotá');
      expect(result[0].position).toEqual([4.6, -74.0]);
    });

    it('throws error if fetch fails with non-ok response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 502
      });
      
      await expect(searchPlaces('Bogota')).rejects.toThrow('Búsqueda no disponible (502)');
    });
  });

  describe('vehicleActions.js', () => {
    it('calls delete-device-user Edge Function successfully', async () => {
      supabase.functions.invoke.mockResolvedValueOnce({
        data: { message: 'Deleted' },
        error: null
      });

      const result = await deleteVehicle('dev1', 'device');
      expect(result).toEqual({ remote: true });
      expect(supabase.functions.invoke).toHaveBeenCalledWith('delete-device-user', {
        body: { device_id: 'dev1' }
      });
    });

    it('returns { remote: false, error } and logs error if Edge Function fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      supabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: new Error('Permission denied')
      });

      const result = await deleteVehicle('dev1', 'device');
      expect(result.remote).toBe(false);
      expect(result.error).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });
});
