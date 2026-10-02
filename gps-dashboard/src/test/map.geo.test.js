import { describe, expect, it } from 'vitest';
import {
  boundsFromPositions,
  circleToPolygon,
  featureCollection,
  lineFeature,
  quantize,
  toLatLng,
  toLngLat,
} from '../lib/mapGeo';
import { ATTRIBUTION_ESRI, DEM_SOURCE_ID, MAP_LAYERS, OFM_STYLE_URL } from '../lib/mapStyle';

describe('mapGeo', () => {
  it('swaps between [lat,lng] del panel y [lng,lat] de GeoJSON', () => {
    expect(toLngLat([-0.2797, -78.5396])).toEqual([-78.5396, -0.2797]);
    expect(toLatLng([-78.5396, -0.2797])).toEqual([-0.2797, -78.5396]);
  });

  it('rejects coordinates out of range instead of sending NaN al estilo', () => {
    expect(toLngLat([120, 0])).toBeNull();
    expect(toLngLat(['a', 'b'])).toBeNull();
    expect(toLngLat(null)).toBeNull();
  });

  it('builds a closed ring with the requested radius', () => {
    const ring = circleToPolygon([-0.2797, -78.5396], 500);
    expect(ring).toHaveLength(65);
    expect(ring[0][0]).toBeCloseTo(ring[64][0], 6);
    expect(ring[0][1]).toBeCloseTo(ring[64][1], 6);
    expect(ring[32][0]).toBeCloseTo(-78.5396, 3);
  });

  it('returns null for a non-positive or non-finite radius', () => {
    expect(circleToPolygon([0, 0], 0)).toBeNull();
    expect(circleToPolygon([0, 0], -10)).toBeNull();
    expect(circleToPolygon(['x', 'y'], 100)).toBeNull();
  });

  it('ignores malformed points when building a route line', () => {
    const feature = lineFeature([[-0.1, -78.1], null, ['bad', 'route'], [-0.2, -78.2]]);
    expect(feature.geometry.coordinates).toEqual([[-78.1, -0.1], [-78.2, -0.2]]);
    expect(lineFeature([[-0.1, -78.1]])).toBeNull();
  });

  it('drops empty features from the collection', () => {
    expect(featureCollection([null, lineFeature([[0, 0], [1, 1]])])).toHaveProperty('features.length', 1);
  });

  it('computes bounds in lng/lat order', () => {
    expect(boundsFromPositions([[-0.2, -78.5], [-0.1, -78.3]])).toEqual([-78.5, -0.2, -78.3, -0.1]);
    expect(boundsFromPositions([])).toBeNull();
    expect(boundsFromPositions([['x', 'y']])).toBeNull();
  });

  it('quantizes telemetry noise below one centimeter', () => {
    expect(quantize(-78.539612345)).toBe(-78.539612);
  });
});

describe('mapStyle sin credenciales', () => {
  // Regresión: el panel se quedó en blanco cuando el proveedor base empezó a exigir clave.
  it('no incluye ninguna API key en las fuentes del mapa', () => {
    const urls = [OFM_STYLE_URL, DEM_SOURCE_ID, ATTRIBUTION_ESRI, ...Object.keys(MAP_LAYERS)];
    urls.forEach((value) => {
      expect(String(value)).not.toMatch(/key=|token=|access_token|apikey/i);
    });
  });

  it('expone las tres variantes de capa que usa el panel', () => {
    expect(Object.keys(MAP_LAYERS).sort()).toEqual(['dark', 'light', 'satellite']);
    expect(MAP_LAYERS.light.sky['sky-color']).toMatch(/^#/);
  });
});