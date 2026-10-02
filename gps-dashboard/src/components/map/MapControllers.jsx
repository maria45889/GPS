import { useEffect, useRef } from 'react';
import { boundsFromPositions, circleFeature, featureCollection, toLngLat } from '../../lib/mapGeo';
import { ensureGeoJsonSource, ensureLayer, scheduleGeoJsonUpdate } from './geoLayer';
import { classesOf } from '../../lib/maplibreLoader';
import { useMapEffect, useMapLibre } from './MapContext';
import { userLocationHtml } from './MapIcons';

const USER_SOURCE = 'gps-user-accuracy';
const USER_FILL_LAYER = 'gps-user-accuracy-fill';
const USER_LINE_LAYER = 'gps-user-accuracy-line';

const toCenter = (coords) => (Array.isArray(coords) ? [Number(coords[1]), Number(coords[0])] : null);

/** Ya no hay `invalidateSize`: el redimensionado vive en MapCanvas con ResizeObserver. */
export const MapController = () => null;

export const MapFlyToHandler = ({ targetPosition, flyToTrigger }) => {
  const map = useMapLibre();

  useEffect(() => {
    if (!map) return;
    if (flyToTrigger?.coords) {
      const center = toCenter(flyToTrigger.coords);
      if (center) {
        map.flyTo({
          center,
          zoom: flyToTrigger.zoom || 16,
          duration: 1500,
          essential: true,
        });
      }
      return;
    }
    if (targetPosition) {
      const center = toCenter(targetPosition);
      if (center) map.flyTo({ center, zoom: 16, duration: 1200, essential: true });
    }
  }, [targetPosition, flyToTrigger, map]);

  return null;
};

export const AlertFocusHandler = ({ focusTrigger, markerRefs }) => {
  const map = useMapLibre();

  useEffect(() => {
    if (!map || !focusTrigger?.coords) return;
    const center = toCenter(focusTrigger.coords);
    if (center) map.flyTo({ center, zoom: focusTrigger.zoom || 16, duration: 1000, essential: true });

    const marker = markerRefs?.current?.[focusTrigger.id];
    if (!marker) return;
    const timer = window.setTimeout(() => {
      try {
        marker.togglePopup?.();
      } catch {
        /* el marcador pudo desmontarse durante el vuelo */
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [focusTrigger, map, markerRefs]);

  return null;
};

export const RouteFocusHandler = ({ routeFocusTrigger }) => {
  const map = useMapLibre();

  useEffect(() => {
    if (!map || !Array.isArray(routeFocusTrigger?.route) || routeFocusTrigger.route.length < 2) return;
    const bounds = boundsFromPositions(routeFocusTrigger.route);
    if (!bounds) return;
    map.fitBounds(
      [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
      { padding: 72, maxZoom: 16, duration: 900, pitch: map.getPitch() },
    );
  }, [routeFocusTrigger, map]);

  return null;
};

/** El clic y el hover ya se atienden en MapCanvas para no duplicar listeners. */
export const MapClickHandler = () => null;

export const UserLocationTracker = ({ locateUserTrigger, onLocationChange }) => {
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!locateUserTrigger) return undefined;

    if (!navigator.geolocation) {
      onLocationChange?.({ error: 'Geolocalización no soportada en este navegador', code: 0 });
      return undefined;
    }

    const toPayload = ({ coords }) => ({
      position: [coords.latitude, coords.longitude],
      accuracy: coords.accuracy,
      speed: coords.speed,
    });

    const toError = (error) => {
      let message = 'No se pudo obtener la ubicación GPS';
      if (error.code === error.PERMISSION_DENIED) {
        message = 'Permiso de ubicación denegado. Por favor concédelo en los ajustes.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        message = 'Señal GPS no disponible. Verifica que la ubicación esté activada.';
      } else if (error.code === error.TIMEOUT) {
        message = 'Tiempo de espera agotado buscando señal GPS.';
      }
      onLocationChange?.({ error: message, code: error.code });
    };

    navigator.geolocation.getCurrentPosition(
      (position) => onLocationChange?.(toPayload(position)),
      toError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 },
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => onLocationChange?.(toPayload(position)),
      toError,
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 },
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [locateUserTrigger, onLocationChange]);

  return null;
};

/** Círculo de precisión y pin azul de la ubicación del usuario. */
export const UserLocationVisual = ({ userLocation }) => {
  const markerRef = useRef(null);
  const position = userLocation?.position;
  const lngLat = toLngLat(position);

  useMapEffect((map) => {
    const classes = classesOf(map);
    ensureGeoJsonSource(map, USER_SOURCE);
    ensureLayer(map, {
      id: USER_FILL_LAYER,
      type: 'fill',
      source: USER_SOURCE,
      paint: { 'fill-color': '#5ad6e7', 'fill-opacity': 0.14 },
    });
    ensureLayer(map, {
      id: USER_LINE_LAYER,
      type: 'line',
      source: USER_SOURCE,
      paint: { 'line-color': '#168ca4', 'line-width': 1.5, 'line-opacity': 0.9 },
    });

    scheduleGeoJsonUpdate(
      map,
      USER_SOURCE,
      featureCollection([lngLat ? circleFeature(position, userLocation?.accuracy || 35) : null]),
    );

    if (!lngLat) {
      markerRef.current?.remove();
      markerRef.current = null;
      return undefined;
    }

    if (!markerRef.current) {
      const element = document.createElement('div');
      element.className = 'user-location-marker';
      element.innerHTML = userLocationHtml();
      markerRef.current = new classes.Marker({ element, anchor: 'center' })
        .setLngLat(lngLat)
        .setPopup(new classes.Popup({ offset: 12, className: 'gps-popup' }).setHTML('<b>Tu ubicación actual</b>'))
        .addTo(map);
    } else {
      markerRef.current.setLngLat(lngLat);
    }

    return undefined;
  }, [lngLat?.[0], lngLat?.[1], userLocation?.accuracy]);

  useMapEffect(() => () => {
    markerRef.current?.remove();
    markerRef.current = null;
  }, []);

  return null;
};

export default MapController;