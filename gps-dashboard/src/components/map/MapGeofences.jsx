import { useMemo, useState } from 'react';
import { circleToPolygon, featureCollection, polygonFeature, toLngLat } from '../../lib/mapGeo';
import { ensureGeoJsonSource, ensureLayer, scheduleGeoJsonUpdate } from './geoLayer';
import { geofencePopupHtml, sanitizeColorSafe, zoneLabelHtml } from './MapIcons';
import { geofenceStatusText, isGeofenceBreach } from '../../lib/mapLogic';
import { classesOf } from '../../lib/maplibreLoader';
import { useMapEffect } from './MapContext';

const SOURCE = 'gps-geofences';
const FILL_LAYER = 'gps-geofence-fill';
const LINE_LAYER = 'gps-geofence-line';
const PENDING_SOURCE = 'gps-geofence-pending';
const PENDING_LAYER = 'gps-geofence-pending-layer';

const buildFeature = (geo, isBreach) => {
  const color = sanitizeColorSafe(isBreach ? '#ef5c72' : geo.color || '#00E676');
  const properties = {
    id: String(geo.id ?? ''),
    name: geo.name || 'Zona',
    color,
    isPolygon: geo.type === 'polygon' && Array.isArray(geo.positions) && geo.positions.length > 0,
  };

  if (properties.isPolygon) {
    const ring = geo.positions
      .filter((p) => Array.isArray(p) && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1])))
      .map(([lat, lng]) => [Number(lng), Number(lat)]);
    if (ring.length < 3) return null;
    const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring : [...ring, ring[0]];
    const feature = polygonFeature(closed, properties);
    if (feature) feature.properties.detail = `Zona Delimitada Poligonal${geofenceStatusText(geo, isBreach)}`;
    return feature;
  }

  if (!geo.center) return null;
  const ring = circleToPolygon(geo.center, Number(geo.radius || 600));
  if (!ring) return null;
  const feature = polygonFeature(ring, { ...properties, isPolygon: false });
  feature.properties.detail = `Zona Circular - Radio: ${geo.radius || 600}m${geofenceStatusText(geo, isBreach)}`;
  return feature;
};

/**
 * Geocercas como geometría vectorial: circulo y polígono comparten capa y el color se
 * actualiza por propiedad, así que no hay que recrear capas al cambiar de estado.
 */
export const MapGeofences = ({ geofences, selectedVehicle, pendingCenter }) => {
  const [labels] = useState(() => new Map());

  const active = useMemo(
    () => (geofences || []).filter((geo) => geo.active),
    [geofences],
  );

  useMapEffect((map) => {
    ensureGeoJsonSource(map, SOURCE);
    ensureLayer(map, {
      id: FILL_LAYER,
      type: 'fill',
      source: SOURCE,
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.06 },
    });
    ensureLayer(map, {
      id: LINE_LAYER,
      type: 'line',
      source: SOURCE,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 1.8,
        'line-dasharray': [4, 4],
        'line-opacity': 0.85,
      },
    });
  }, []);

  useMapEffect((map) => {
    scheduleGeoJsonUpdate(map, SOURCE, featureCollection(active.map((geo) => buildFeature(geo, isGeofenceBreach(selectedVehicle, geo)))));
  }, [active, selectedVehicle?.position]);

  useMapEffect((map) => {
    ensureGeoJsonSource(map, PENDING_SOURCE);
    ensureLayer(map, {
      id: PENDING_LAYER,
      type: 'fill',
      source: PENDING_SOURCE,
      paint: { 'fill-color': '#38bdf8', 'fill-opacity': 0.15 },
    });
    ensureLayer(map, {
      id: `${PENDING_LAYER}-line`,
      type: 'line',
      source: PENDING_SOURCE,
      paint: { 'line-color': '#38bdf8', 'line-width': 1.6, 'line-dasharray': [4, 4] },
    });
    const ring = pendingCenter ? circleToPolygon(pendingCenter, 300) : null;
    scheduleGeoJsonUpdate(map, PENDING_SOURCE, featureCollection([ring ? polygonFeature(ring, { kind: 'pending' }) : null]));
  }, [pendingCenter]);

  // Popup con el detalle de la zona al tocarla.
  useMapEffect((map) => {
    const openPopup = (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const classes = classesOf(map);
      if (!classes) return;
      const properties = feature.properties || {};
      new classes.Popup({ className: 'gps-popup', maxWidth: '260px', focusAfterOpen: false })
        .setLngLat(event.lngLat)
        .setHTML(geofencePopupHtml({
          name: properties.name,
          color: properties.color,
          detail: properties.detail || '',
          rule: properties.rule || 'Supervision',
        }))
        .addTo(map);
    };

    map.on('click', FILL_LAYER, openPopup);
    map.on('mouseenter', FILL_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', FILL_LAYER, () => { map.getCanvas().style.cursor = ''; });
    return () => {
      map.off('click', FILL_LAYER, openPopup);
    };
  }, []);

  // Etiquetas con el nombre de la zona.
  useMapEffect((map) => {
    const classes = classesOf(map);
    const next = new Map();
    active.forEach((geo) => {
      const center = geo.center || (geo.positions && geo.positions[0]);
      const lngLat = toLngLat(center);
      if (!lngLat) return;
      const isBreach = isGeofenceBreach(selectedVehicle, geo);
      const color = sanitizeColorSafe(isBreach ? '#ef5c72' : geo.color || '#00E676');
      const key = String(geo.id ?? geo.name);
      const signature = `${geo.name}|${color}`;
      next.set(key, { lngLat, signature });

      let entry = labels.get(key);
      if (!entry) {
        const element = document.createElement('div');
        element.className = 'zone-marker';
        entry = { marker: new classes.Marker({ element, anchor: 'center' }).setLngLat(lngLat).addTo(map), element, signature: null };
        labels.set(key, entry);
      }
      if (entry.signature !== signature) {
        entry.signature = signature;
        entry.element.innerHTML = zoneLabelHtml(geo.name, color);
      }
      entry.marker.setLngLat(lngLat);
    });

    labels.forEach((entry, key) => {
      if (next.has(key)) return;
      entry.marker.remove();
      labels.delete(key);
    });
  }, [active, selectedVehicle?.position]);

  return null;
};

export default MapGeofences;