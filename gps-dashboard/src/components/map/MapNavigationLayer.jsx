import { useEffect, useRef, useState } from 'react';
import { featureCollection, lineFeature } from '../../lib/mapGeo';
import { fetchDrivingRoute } from '../../lib/routing';
import { ensureGeoJsonSource, ensureLayer, scheduleGeoJsonUpdate } from './geoLayer';
import { useMapEffect } from './MapContext';

const SOURCE = 'gps-nav-route';
const GLOW_LAYER = 'gps-nav-glow';
const LINE_LAYER = 'gps-nav-line';
const RECALC_MS = 8000;

/**
 * Ruta de navegación hacia el dispositivo. La lógica de consulta (OSRM, sin key) queda
 * igual; sólo cambia el desenho de la línea, que pasa a ser vectorial con capa propia.
 */
export const MapNavigationLayer = ({
  isFollowingRoute,
  originPosition,
  targetPosition,
  followRoute = [],
  onNavStateChange,
}) => {
  const [navRoute, setNavRoute] = useState([]);
  const latestOriginRef = useRef(originPosition);
  const latestTargetRef = useRef(targetPosition);
  const onNavStateChangeRef = useRef(onNavStateChange);

  useEffect(() => {
    latestOriginRef.current = originPosition;
    latestTargetRef.current = targetPosition;
    onNavStateChangeRef.current = onNavStateChange;
  }, [originPosition, targetPosition, onNavStateChange]);

  useEffect(() => {
    if (!isFollowingRoute) {
      setNavRoute([]);
      return undefined;
    }

    let active = true;
    let controller = null;

    const loadRoute = async () => {
      const origin = latestOriginRef.current;
      const destination = latestTargetRef.current;
      if (!origin || !destination) return;

      controller?.abort();
      const ctrl = new AbortController();
      controller = ctrl;
      try {
        const result = await fetchDrivingRoute(origin, destination, { signal: ctrl.signal });
        if (!active) return;
        if (result) {
          setNavRoute(result.coords);
          onNavStateChangeRef.current?.({
            navRoute: result.coords,
            navMeta: { distanceM: result.distanceM, durationS: result.durationS },
            navError: false,
          });
        } else {
          setNavRoute([]);
          onNavStateChangeRef.current?.({ navRoute: [], navMeta: null, navError: true });
        }
      } catch (err) {
        if (!active || err?.name === 'AbortError') return;
        setNavRoute([]);
        onNavStateChangeRef.current?.({ navRoute: [], navMeta: null, navError: true });
      }
    };

    loadRoute();
    const interval = setInterval(loadRoute, RECALC_MS);

    return () => {
      active = false;
      controller?.abort();
      clearInterval(interval);
    };
  }, [isFollowingRoute]);

  const positions = navRoute.length >= 2 ? navRoute : followRoute;

  useMapEffect((map) => {
    ensureGeoJsonSource(map, SOURCE);
    ensureLayer(map, {
      id: GLOW_LAYER,
      type: 'line',
      source: SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#22d3ee', 'line-width': 11, 'line-opacity': 0.18 },
    });
    ensureLayer(map, {
      id: LINE_LAYER,
      type: 'line',
      source: SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#22d3ee',
        'line-width': 4.5,
        'line-opacity': 0.95,
        'line-dasharray': [3, 2],
      },
    });

    scheduleGeoJsonUpdate(
      map,
      SOURCE,
      featureCollection([isFollowingRoute && positions?.length >= 2 ? lineFeature(positions) : null]),
    );
  }, [isFollowingRoute, positions]);

  return null;
};

export default MapNavigationLayer;