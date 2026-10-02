import { useEffect, useMemo, useRef, useState } from 'react';
import { circleFeature, featureCollection, quantize, toLngLat } from '../../lib/mapGeo';
import { ensureGeoJsonSource, ensureLayer, scheduleGeoJsonUpdate } from './geoLayer';
import {
  alertIncidentHtml,
  alertPopupHtml,
  fleetPinHtml,
  headingHtml,
  heroPinHtml,
  vehiclePopupHtml,
} from './MapIcons';
import { classesOf } from '../../lib/maplibreLoader';
import { useMapEffect } from './MapContext';

const ACCURACY_SOURCE = 'gps-fleet-accuracy';
const ACCURACY_FILL = 'gps-fleet-accuracy-fill';
const ACCURACY_LINE = 'gps-fleet-accuracy-line';

const buildElement = (className, html) => {
  const element = document.createElement('div');
  element.className = className;
  element.innerHTML = html;
  return element;
};

const samePosition = (a, b) => a && b && quantize(a[1]) === quantize(b[1]) && quantize(a[0]) === quantize(b[0]);

/**
 * Marcadores de la flota como nodos DOM reciclados. Sólo se toca lo que cambia
 * (posición redondeada, estado, rumbo) y el resto del mapa no se repinta.
 */
export const MapFleetLayer = ({
  vehicles,
  category,
  selectedVehicle,
  onSelectVehicle,
  alerts,
  onSelectAlert,
  onToggleRouteFollow,
  isFollowingRoute,
  onShareRoute,
  routeColor,
  alertMarkerRefs,
}) => {
  // Almacén perezoso de marcadores: se crea una vez y se reutiliza entre renders.
  const [store] = useState(() => ({ entries: new Map(), vehicles: new Map(), alerts: new Map() }));
  const callbacksRef = useRef({});

  useEffect(() => {
    callbacksRef.current = { onSelectVehicle, onSelectAlert, onToggleRouteFollow, onShareRoute };
  }, [onSelectVehicle, onSelectAlert, onToggleRouteFollow, onShareRoute]);

  const visible = useMemo(
    () => (vehicles || []).filter((v) => v.position || v.historicalPosition),
    [vehicles],
  );
  const activeAlerts = useMemo(
    () => (alerts || []).filter(
      (alert) => alert.status !== 'resolved' && Number.isFinite(Number(alert.lat)) && Number.isFinite(Number(alert.lng)),
    ),
    [alerts],
  );
  const selectedPosition = selectedVehicle?.position || null;

  // Halo de precisión del vehículo seleccionado.
  useMapEffect((map) => {
    ensureGeoJsonSource(map, ACCURACY_SOURCE);
    ensureLayer(map, {
      id: ACCURACY_FILL,
      type: 'fill',
      source: ACCURACY_SOURCE,
      paint: { 'fill-color': ['coalesce', ['get', 'color'], '#00E676'], 'fill-opacity': 0.1 },
    });
    ensureLayer(map, {
      id: ACCURACY_LINE,
      type: 'line',
      source: ACCURACY_SOURCE,
      paint: {
        'line-color': ['coalesce', ['get', 'color'], '#00E676'],
        'line-width': 1.6,
        'line-dasharray': [3, 3],
        'line-opacity': 0.85,
      },
    });
    scheduleGeoJsonUpdate(
      map,
      ACCURACY_SOURCE,
      featureCollection([selectedPosition ? circleFeature(selectedPosition, 80, { color: routeColor }) : null]),
    );
  }, [selectedPosition, routeColor]);

  // Botones de los popups por delegación: un listener en vez de uno por marcador.
  useMapEffect((map) => {
    const container = map.getContainer?.();
    if (!container) return undefined;

    const onPopupClick = (event) => {
      const button = event.target.closest?.('[data-action]');
      if (!button) return;
      const card = button.closest('[data-vehicle-id],[data-alert-id]');
      if (!card) return;
      event.stopPropagation();

      const action = button.getAttribute('data-action');
      if (action === 'alert') {
        const alert = store.alerts.get(card.getAttribute('data-alert-id'));
        if (alert) callbacksRef.current.onSelectAlert?.(alert);
        return;
      }

      const vehicle = store.vehicles.get(card.getAttribute('data-vehicle-id'));
      if (!vehicle) return;
      if (action === 'select') callbacksRef.current.onSelectVehicle?.(vehicle);
      if (action === 'follow') callbacksRef.current.onToggleRouteFollow?.();
      if (action === 'share') callbacksRef.current.onShareRoute?.();
    };

    container.addEventListener('click', onPopupClick);
    return () => container.removeEventListener('click', onPopupClick);
  }, []);

  // Marcadores de dispositivos, motos y alertas.
  useMapEffect((map) => {
    const classes = classesOf(map);
    const liveVehicles = new Map();
    const liveAlerts = new Map();

    visible.forEach((vehicle) => {
      const position = vehicle.position || vehicle.historicalPosition;
      const lngLat = toLngLat(position);
      if (!lngLat) return;

      const isSelected = selectedVehicle?.id === vehicle.id;
      const isOffline = !vehicle.position;
      const status = isOffline ? 'offline' : vehicle.status;
      const signature = [
        vehicle.id,
        isSelected ? 'hero' : 'fleet',
        status,
        Math.round(Number(vehicle.bearing) || 0),
        isSelected ? vehicle.name : '',
      ].join('|');

      liveVehicles.set(vehicle.id, vehicle);

      let entry = store.entries.get(vehicle.id);
      if (!entry) {
        const element = buildElement('fleet-marker');
        const marker = new classes.Marker({ element, anchor: 'center', pitchAlignment: 'map', rotationAlignment: 'map' })
          .setLngLat(lngLat)
          .addTo(map);
        const headingElement = buildElement('fleet-heading', headingHtml(vehicle.bearing));
        const headingMarker = new classes.Marker({
          element: headingElement,
          anchor: 'center',
          pitchAlignment: 'map',
          rotationAlignment: 'map',
        })
          .setLngLat(lngLat)
          .addTo(map);
        entry = { marker, headingMarker, headingElement, signature: null, position: null };
        store.entries.set(vehicle.id, entry);
      }

      if (entry.signature !== signature) {
        entry.signature = signature;
        entry.marker.getElement().innerHTML = isSelected ? heroPinHtml(vehicle.name, vehicle.id) : fleetPinHtml(status);
        entry.headingElement.innerHTML = headingHtml(vehicle.bearing);
        entry.marker.setPopup(
          new classes.Popup({
            offset: isSelected ? 44 : 16,
            className: 'gps-popup',
            maxWidth: '280px',
            focusAfterOpen: false,
          }).setHTML(vehiclePopupHtml(vehicle, { category, isSelected, isOffline, isFollowingRoute })),
        );
      }

      if (!samePosition(entry.position, lngLat)) {
        entry.position = lngLat;
        entry.marker.setLngLat(lngLat);
        entry.headingMarker.setLngLat(lngLat);
      }

      entry.headingElement.style.display = !isOffline && !isSelected && vehicle.bearing !== undefined ? '' : 'none';
    });

    activeAlerts.forEach((alert) => {
      const key = `alert::${alert.id}`;
      const severity = alert.severity || 'warning';
      const signature = `${key}|${severity}`;
      const lngLat = [Number(alert.lng), Number(alert.lat)];

      liveAlerts.set(alert.id, alert);

      let entry = store.entries.get(key);
      if (!entry) {
        const element = buildElement('alert-marker');
        const marker = new classes.Marker({ element, anchor: 'center' })
          .setLngLat(lngLat)
          .addTo(map);
        entry = { marker, signature: null };
        store.entries.set(key, entry);
      }

      if (entry.signature !== signature) {
        entry.signature = signature;
        entry.marker.getElement().innerHTML = alertIncidentHtml(severity);
        entry.marker.setPopup(
          new classes.Popup({ offset: 18, className: 'gps-popup', maxWidth: '280px', focusAfterOpen: false })
            .setHTML(alertPopupHtml(alert, category)),
        );
      }

      if (!samePosition(entry.position, lngLat)) {
        entry.position = lngLat;
        entry.marker.setLngLat(lngLat);
      }

      if (alertMarkerRefs?.current) alertMarkerRefs.current[alert.id] = entry.marker;
    });

    store.entries.forEach((entry, key) => {
      if (liveVehicles.has(key) || liveAlerts.has(key.split('::').slice(1).join('::'))) return;
      if (key.startsWith('alert::') && liveAlerts.has(key.slice(7))) return;
      entry.marker.remove();
      entry.headingMarker?.remove();
      store.entries.delete(key);
    });

    liveVehicles.forEach((value, key) => store.vehicles.set(key, value));
    liveAlerts.forEach((value, key) => store.alerts.set(key, value));

    return () => {
      /* los marcadores viven más que este efecto: se limpian al desmontar el mapa */
    };
  }, [visible, selectedVehicle?.id, activeAlerts, category, isFollowingRoute]);

  // Limpieza al desmontar.
  useMapEffect(() => () => {
    store.entries.forEach((entry) => {
      entry.marker?.remove();
      entry.headingMarker?.remove();
    });
    store.entries.clear();
  }, []);

  return null;
};

export default MapFleetLayer;