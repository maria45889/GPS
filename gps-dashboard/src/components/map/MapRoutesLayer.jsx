import { useState } from 'react';
import { featureCollection, lineFeature, toLngLat } from '../../lib/mapGeo';
import { ensureGeoJsonSource, ensureLayer, scheduleGeoJsonUpdate } from './geoLayer';
import { waypointHtml } from './MapIcons';
import { classesOf } from '../../lib/maplibreLoader';
import { useMapEffect } from './MapContext';

const SOURCE = 'gps-route-history';
const HALO_LAYER = 'gps-route-halo';
const LINE_LAYER = 'gps-route-line';

export const MapRoutesLayer = ({ activeRoute, routeColor }) => {
  const [waypoints] = useState(() => new Map());

  useMapEffect((map) => {
    ensureGeoJsonSource(map, SOURCE);
    ensureLayer(map, {
      id: HALO_LAYER,
      type: 'line',
      source: SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': routeColor || '#58e6b0', 'line-width': 12, 'line-opacity': 0.22 },
    });
    ensureLayer(map, {
      id: LINE_LAYER,
      type: 'line',
      source: SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': routeColor || '#58e6b0', 'line-width': 3.5, 'line-opacity': 0.95 },
    });

    scheduleGeoJsonUpdate(
      map,
      SOURCE,
      featureCollection([activeRoute?.length > 1 ? lineFeature(activeRoute) : null]),
    );

    // El color depende de la velocidad, así que se repinta sin rehacer la fuente.
    map.setPaintProperty(HALO_LAYER, 'line-color', routeColor || '#58e6b0');
    map.setPaintProperty(LINE_LAYER, 'line-color', routeColor || '#58e6b0');
  }, [activeRoute, routeColor]);

  // Waypoints A/B del recorrido.
  useMapEffect((map) => {
    const classes = classesOf(map);
    const next = new Map();
    if (Array.isArray(activeRoute) && activeRoute.length >= 2) {
      const start = toLngLat(activeRoute[0]);
      const end = toLngLat(activeRoute[activeRoute.length - 1]);
      if (start) next.set('A', { lngLat: start, color: '#00E676', label: 'A' });
      if (end) next.set('B', { lngLat: end, color: '#FF3366', label: 'B' });
    }

    next.forEach(({ lngLat, color, label }, key) => {
      let entry = waypoints.get(key);
      if (!entry) {
        const element = document.createElement('div');
        element.className = 'waypoint-marker';
        entry = { marker: new classes.Marker({ element, anchor: 'center' }).setLngLat(lngLat).addTo(map), element, signature: null };
        waypoints.set(key, entry);
      }
      const signature = `${label}|${color}`;
      if (entry.signature !== signature) {
        entry.signature = signature;
        entry.element.innerHTML = waypointHtml(label, color);
      }
      entry.marker.setLngLat(lngLat);
    });

    waypoints.forEach((entry, key) => {
      if (next.has(key)) return;
      entry.marker.remove();
      waypoints.delete(key);
    });
  }, [activeRoute]);

  return null;
};

export default MapRoutesLayer;