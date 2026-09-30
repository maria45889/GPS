import React, { useEffect, useRef, useState } from 'react';
import { Polyline } from 'react-leaflet';
import { fetchDrivingRoute } from '../../lib/routing';

export const MapNavigationLayer = ({
  isFollowingRoute,
  originPosition, // origin.position or userLocation.position
  targetPosition, // selectedVehicle.position
  followRoute = [], // active route ahead or projected path
  onNavStateChange,
}) => {
  const [navRoute, setNavRoute] = useState([]);

  const latestOriginRef = useRef(originPosition);
  const latestTargetRef = useRef(targetPosition);
  const onNavStateChangeRef = useRef(onNavStateChange);

  // Keep refs updated to avoid re-triggering the interval effect
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
      const originPos = latestOriginRef.current;
      const destination = latestTargetRef.current;
      if (!originPos || !destination) return;

      if (controller) {
        controller.abort();
      }
      
      const ctrl = new AbortController();
      controller = ctrl;
      try {
        const result = await fetchDrivingRoute(originPos, destination, { signal: ctrl.signal });
        if (!active) return;
        if (result) {
          setNavRoute(result.coords);
          if (onNavStateChangeRef.current) onNavStateChangeRef.current({ navRoute: result.coords, navMeta: { distanceM: result.distanceM, durationS: result.durationS }, navError: false });
        } else {
          setNavRoute([]);
          if (onNavStateChangeRef.current) onNavStateChangeRef.current({ navRoute: [], navMeta: null, navError: true });
        }
      } catch (err) {
        if (!active) return;
        if (err.name === 'AbortError') return;
        setNavRoute([]);
        if (onNavStateChangeRef.current) onNavStateChangeRef.current({ navRoute: [], navMeta: null, navError: true });
      }
    };

    // Initial load
    loadRoute();

    // Recalcular conforme el dispositivo avanza (cada 8s en modo seguimiento).
    const interval = setInterval(loadRoute, 8000);
    
    return () => {
      active = false;
      if (controller) controller.abort();
      clearInterval(interval);
    };
  }, [isFollowingRoute]); // We ONLY depend on isFollowingRoute now!

  return (
    <>
      {isFollowingRoute && navRoute.length >= 2 && (
        <>
          <Polyline
            positions={navRoute}
            className="route-follow"
            pathOptions={{ color: '#22d3ee', weight: 4.5, opacity: 0.95, dashArray: '8 12', lineCap: 'round', lineJoin: 'round' }}
          />
          <Polyline
            positions={navRoute}
            pathOptions={{ color: '#22d3ee', weight: 11, opacity: 0.18 }}
          />
        </>
      )}

      {isFollowingRoute && navRoute.length < 2 && followRoute.length >= 2 && (
        <>
          <Polyline
            positions={followRoute}
            className="route-follow"
            pathOptions={{ color: '#22d3ee', weight: 4.5, opacity: 0.95, dashArray: '8 12', lineCap: 'round', lineJoin: 'round' }}
          />
          <Polyline
            positions={followRoute}
            pathOptions={{ color: '#22d3ee', weight: 11, opacity: 0.18 }}
          />
        </>
      )}
    </>
  );
};
