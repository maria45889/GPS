// Utilidades geodésicas para MapLibre (que usa [lng, lat], al revés que Leaflet).

export const EMPTY_GEOJSON = { type: 'FeatureCollection', features: [] };

export const isValidLngLat = (value) => {
  if (!Array.isArray(value) || value.length < 2) return false;
  const lng = Number(value[1]);
  const lat = Number(value[0]);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
};

/** Convierte [lat, lng] (convención del panel) a [lng, lat] de GeoJSON. */
export const toLngLat = (position) => (isValidLngLat(position) ? [Number(position[1]), Number(position[0])] : null);

/** Convierte [lng, lat] de GeoJSON a [lat, lng] del panel. */
export const toLatLng = (position) => (isValidLngLat(position) ? [Number(position[1]), Number(position[0])] : null);

export const sanitizePositions = (positions = []) =>
  (Array.isArray(positions) ? positions : [])
    .map((p) => (Array.isArray(p) && p.length >= 2 ? [Number(p[0]), Number(p[1])] : null))
    .filter((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));

/**
 * Aproximación de círculo geodesésico con 64 lados: suficiente para geocercas de flota
 * y mucho más barato que trazar arcos exactos en cada actualización.
 */
export const circleToPolygon = (center, radiusMeters, steps = 64) => {
  const lat = Number(center?.[0]);
  const lng = Number(center?.[1]);
  const radius = Number(radiusMeters);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius) || radius <= 0) return null;

  const earthRadius = 6371008.8;
  const angular = radius / earthRadius;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const ring = [];

  for (let i = 0; i <= steps; i += 1) {
    const bearing = (i / steps) * Math.PI * 2;
    const pointLat = Math.asin(
      Math.sin(latRad) * Math.cos(angular) + Math.cos(latRad) * Math.sin(angular) * Math.cos(bearing),
    );
    const pointLng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(latRad),
        Math.cos(angular) - Math.sin(latRad) * Math.sin(pointLat),
      );
    ring.push([(pointLng * 180) / Math.PI, (pointLat * 180) / Math.PI]);
  }

  return ring;
};

export const polygonFeature = (ring, properties = {}) =>
  ring ? { type: 'Feature', properties, geometry: { type: 'Polygon', coordinates: [ring] } } : null;

export const circleFeature = (center, radiusMeters, properties = {}) =>
  polygonFeature(circleToPolygon(center, radiusMeters), { ...properties, kind: 'circle' });

export const lineFeature = (positions = [], properties = {}) => {
  const coords = sanitizePositions(positions).map(([lat, lng]) => [lng, lat]);
  if (coords.length < 2) return null;
  return { type: 'Feature', properties, geometry: { type: 'LineString', coordinates: coords } };
};

export const featureCollection = (features = []) => ({
  type: 'FeatureCollection',
  features: features.filter(Boolean),
});

/** Límites [minLng, minLat, maxLng, maxLat] o null si no hay puntos válidos. */
export const boundsFromPositions = (positions = []) => {
  const points = sanitizePositions(positions);
  if (points.length === 0) return null;
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  points.forEach(([lat, lng]) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  });
  return [minLng, minLat, maxLng, maxLat];
};

/** Posición redondeada para evitar repintados por decimales de telemetría. */
export const quantize = (value, precision = 6) => Number(Number(value).toFixed(precision));