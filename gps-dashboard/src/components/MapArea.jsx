import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, Circle, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, Minus, Crosshair, Navigation, Share2, Maximize, Layers } from 'lucide-react';
import { isVehicleInsideCircle, isVehicleInsidePolygon, routeColorForSpeed, routeAhead, projectedPath } from '../lib/mapLogic';
import { normalizeBattery, sanitizeAccuracy, sanitizeRoute } from '../lib/queries';
import { fetchDrivingRoute, formatNavDistance, formatNavDuration } from '../lib/routing';

// Component to handle map resize
const MapController = () => {
  const map = useMap();
  
  useEffect(() => {
    let lastWidth = 0;
    let lastHeight = 0;
    let frameId = null;

    const handleResize = () => {
      const container = map.getContainer();
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width === lastWidth && height === lastHeight) return;

      lastWidth = width;
      lastHeight = height;
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        map.invalidateSize({ animate: false, pan: false });
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(map.getContainer());
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      resizeObserver.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [map]);

  return null;
};

// Component to handle smooth cinematic flyTo on vehicle selection or alert focus
const MapFlyToHandler = ({ targetPosition, flyToTrigger }) => {
  const map = useMap();

  useEffect(() => {
    if (flyToTrigger && flyToTrigger.coords) {
      map.flyTo(flyToTrigger.coords, flyToTrigger.zoom || 16, {
        animate: true,
        duration: 1.5,
      });
    } else if (targetPosition) {
      map.flyTo(targetPosition, 16, {
        animate: true,
        duration: 1.2,
      });
    }
  }, [targetPosition, flyToTrigger, map]);

  return null;
};

const AlertFocusHandler = ({ focusTrigger, markerRefs }) => {
  const map = useMap();

  useEffect(() => {
    if (!focusTrigger?.coords) return;
    map.flyTo(focusTrigger.coords, focusTrigger.zoom || 16, { animate: true, duration: 1 });
    const marker = markerRefs.current[focusTrigger.id];
    if (marker) window.setTimeout(() => marker.openPopup(), 700);
  }, [focusTrigger, map, markerRefs]);

  return null;
};

// Encuadra el mapa al recorrido del historial de una entidad seleccionada
const RouteFocusHandler = ({ routeFocusTrigger }) => {
  const map = useMap();

  useEffect(() => {
    if (!routeFocusTrigger?.route || routeFocusTrigger.route.length < 2) return;
    const points = routeFocusTrigger.route.filter((p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1])));
    if (points.length < 2) return;
    const bounds = L.latLngBounds(points.map(([lat, lng]) => [Number(lat), Number(lng)]));
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 16 });
  }, [routeFocusTrigger, map]);

  return null;
};

// Component to handle map clicks and movement for placing geofences
const MapClickHandler = ({ isPlacingOnMap, onMapClick, onMapHover }) => {
  const lastHoverRef = useRef(0);

  useMapEvents({
    click(e) {
      if (isPlacingOnMap && onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    },
    mousemove(e) {
      if (isPlacingOnMap && onMapHover) {
        const now = Date.now();
        if (now - lastHoverRef.current > 40) {
          lastHoverRef.current = now;
          onMapHover([e.latlng.lat, e.latlng.lng]);
        }
      }
    },
  });
  return null;
};

const iconCache = new Map();

const getCachedIcon = (key, factory) => {
  if (!iconCache.has(key)) {
    iconCache.set(key, factory());
  }
  return iconCache.get(key);
};

const createUserLocationIcon = () => getCachedIcon('user-location', () => new L.DivIcon({
  className: 'user-location-pin',
  html: '<div class="user-location-dot"><span></span></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
}));

const createOriginIcon = () => getCachedIcon('origin-pin', () => new L.DivIcon({
  className: 'origin-pin',
  html: '<div class="origin-flag"><span></span></div>',
  iconSize: [26, 34],
  iconAnchor: [13, 32],
}));


const UserLocationTracker = ({ locateUserTrigger, onLocationChange }) => {
  const watchIdRef = useRef(null);

  useEffect(() => {
    // Si la ubicación del operador no ha sido solicitada explícitamente, mantener el GPS apagado
    if (!locateUserTrigger) return undefined;

    if (!navigator.geolocation) {
      onLocationChange?.({ error: 'Geolocalización no soportada en este navegador', code: 0 });
      return undefined;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onLocationChange?.({
          position: [coords.latitude, coords.longitude],
          accuracy: coords.accuracy,
          speed: coords.speed,
        });
      },
      (error) => {
        let errorMsg = 'No se pudo obtener la ubicación GPS';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Permiso de ubicación denegado. Por favor concédelo en los ajustes.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Señal GPS no disponible. Verifica que la ubicación esté activada.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Tiempo de espera agotado buscando señal GPS.';
        }
        onLocationChange?.({ error: errorMsg, code: error.code });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 },
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        onLocationChange?.({
          position: [coords.latitude, coords.longitude],
          accuracy: coords.accuracy,
          speed: coords.speed,
        });
      },
      (error) => {
        let errorMsg = 'No se pudo obtener la ubicación GPS';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Permiso de ubicación denegado. Por favor concédelo en los ajustes.';
        }
        onLocationChange?.({ error: errorMsg, code: error.code });
      },
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

const escapeHtml = (str) => {
  if (typeof str !== 'string') return String(str || '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};

// Selected Vehicle Hero Pin matching the mockup
const createHeroPinIcon = (name, id) => getCachedIcon(`hero-${id}-${name}`, () => new L.DivIcon({
  className: 'custom-vehicle-pin',
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <!-- Vehicle Name Badge -->
      <div style="
        background: linear-gradient(135deg, rgba(16, 23, 38, 0.98) 0%, rgba(10, 15, 26, 0.95) 100%);
        border: 1px solid rgba(0, 240, 255, 0.6);
        padding: 5px 12px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.8), 0 0 15px rgba(0, 240, 255, 0.3), 0 0 30px rgba(0,230,118,0.15);
        text-align: center;
        margin-bottom: 8px;
        white-space: nowrap;
        backdrop-filter: blur(10px);
      ">
        <div style="font-size: 12px; font-weight: 800; color: #ffffff; line-height: 1.2; text-shadow: 0 0 10px rgba(0,240,255,0.5);">${escapeHtml(name)}</div>
        <div style="font-size: 9px; color: #475569; font-family: monospace; letter-spacing: 0.5px;">ID: ${escapeHtml(id)}</div>
      </div>

      <!-- Glowing Cyan Pin with bike -->
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <!-- Outer glow ring -->
        <div style="
          position: absolute;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 240, 255, 0.25) 0%, rgba(0,230,118, 0.1) 70%, transparent 100%);
          box-shadow: 0 0 25px rgba(0,230,118,0.4), 0 0 50px rgba(0,240,255,0.2);
          animation: pulse 2s infinite;
        "></div>

        <!-- Middle glow ring -->
        <div style="
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(0, 240, 255, 0.15);
          box-shadow: 0 0 20px rgba(0,240,255,0.3);
          animation: pulse 2s infinite 0.5s;
        "></div>

        <!-- Main pin -->
        <div style="
          width: 34px;
          height: 34px;
          background: linear-gradient(135deg, #00E676 0%, #00B4D8 50%, #0096C9 100%);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.9), 0 0 40px rgba(0,230,118,0.4);
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          <!-- Inner shine effect -->
          <div style="
            position: absolute;
            inset: 0;
            border-radius: 50% 50% 50% 0;
            background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%);
            transform: rotate(-45deg);
          "></div>
          
          <svg style="transform: rotate(45deg); width: 18px; height: 18px; fill: none; stroke: #0A0F1A; stroke-width: 2.5;" viewBox="0 0 24 24">
            <circle cx="18.5" cy="17.5" r="3.5" />
            <circle cx="5.5" cy="17.5" r="3.5" />
            <circle cx="15" cy="5" r="1" />
            <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
          </svg>
        </div>
      </div>
    </div>
  `,
  iconSize: [120, 95],
  iconAnchor: [60, 85],
}));

// Subtle Secondary Fleet Pins for unselected bikes
const createFleetPinIcon = (status) => {
  const color = status === 'active' ? '#00E676' : status === 'stopped' ? '#F59E0B' : '#64748B';
  const glowColor = status === 'active' ? 'rgba(0,230,118,0.3)' : status === 'stopped' ? 'rgba(245,158,11,0.3)' : 'rgba(100,116,139,0.2)';
  return getCachedIcon(`fleet-${status}`, () => new L.DivIcon({
    className: 'mini-vehicle-pin',
    html: `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <!-- Outer glow ring -->
        <div style="
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: radial-gradient(circle, ${glowColor} 0%, transparent 70%);
          box-shadow: 0 0 15px ${glowColor};
          animation: pulse 3s infinite;
        "></div>
        
        <!-- Middle ring -->
        <div style="
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${color}25;
          border: 1px solid ${color}70;
        "></div>
        
        <!-- Inner dot -->
        <div style="
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${color} 0%, ${color}CC 100%);
          border: 2px solid #ffffff;
          box-shadow: 0 0 12px ${color}, 0 0 24px ${glowColor};
          position: relative;
        ">
          <!-- Inner shine -->
          <div style="
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 70%);
          "></div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  }));
};

// Route Start (A) and End (B) badges
const createWaypointIcon = (label, color = '#00E676') => getCachedIcon(`waypoint-${label}-${color}`, () => new L.DivIcon({
  className: 'route-waypoint-pin',
  html: `
    <div style="
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0D1424 0%, #0A0F1A 100%);
      border: 2px solid ${color};
      color: ${color};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
      box-shadow: 0 0 15px ${color}, 0 0 30px ${color}40;
      position: relative;
    ">
      <!-- Inner glow -->
      <div style="
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: radial-gradient(circle, ${color}20 0%, transparent 70%);
      "></div>
      <span style="position: relative; z-index: 1; text-shadow: 0 0 10px ${color};">${label}</span>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
}));

const createHeadingIcon = (bearing = 0) => {
  const roundedBearing = Math.round(Number(bearing) || 0);
  return getCachedIcon(`heading-${roundedBearing}`, () => new L.DivIcon({
    className: 'heading-arrow-pin',
    html: `<div class="heading-arrow" style="transform: rotate(${roundedBearing}deg)">▲</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  }));
};

const isInsideGeofence = (vehicle, geofence) => {
  if (!vehicle?.position || !geofence) return false;
  if (geofence.type === 'polygon') {
    const positions = geofence.positions || geofence.coordinates || [];
    return isVehicleInsidePolygon(vehicle.position, positions);
  }
  if (!geofence?.center) return false;
  return isVehicleInsideCircle(vehicle.position, geofence.center, Number(geofence.radius || 600));
};

const getGeofenceType = (geofence) => {
  if (geofence.mode) return geofence.mode;
  if (geofence.zoneType) return geofence.zoneType;
  const ruleStr = String(geofence.rule || '').toLowerCase();
  if (ruleStr.includes('prohibid') || ruleStr.includes('inside') || ruleStr.includes('ingreso no autoriz')) return 'forbidden';
  if (ruleStr.includes('entrada') || ruleStr.includes('ingreso')) return 'entry';
  if (ruleStr.includes('salida') || ruleStr.includes('egreso')) return 'exit';
  return 'allowed'; // Zona permitida por defecto
};

// Devuelve true si hay violación/alerta de la geocerca según su regla.
// Devuelve false si no hay un vehículo o posición válida para evaluar.
const isGeofenceBreach = (vehicle, geofence) => {
  if (!vehicle?.position || !geofence) return false;
  const inside = isInsideGeofence(vehicle, geofence);
  const type = getGeofenceType(geofence);

  switch (type) {
    case 'forbidden':
      return inside; // Intrusión: vehículo dentro de zona prohibida
    case 'entry':
      return inside; // Evento/Alerta de entrada esperada
    case 'exit':
      return !inside; // Evento/Alerta de salida esperada
    case 'allowed':
    default:
      return !inside; // Intrusión: vehículo fuera de zona permitida
  }
};

const getGeofenceStatusText = (geo, isBreach) => {
  if (!isBreach) return '';
  const type = getGeofenceType(geo);
  switch (type) {
    case 'forbidden':
      return ' · Intrusión: vehículo en zona prohibida';
    case 'entry':
      return ' · Entrada registrada';
    case 'exit':
      return ' · Salida registrada';
    case 'allowed':
    default:
      return ' · Intrusión: vehículo fuera de zona permitida';
  }
};

const sanitizeColor = (color) => {
  if (typeof color !== 'string') return '#00E676';
  const trimmed = color.trim();
  if (/^#([0-9a-fA-F]{3}){1,2}$/.test(trimmed) || /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$/.test(trimmed)) {
    return trimmed;
  }
  return '#00E676';
};

// Zone label badge
const createZoneLabel = (name, rawColor = '#00E676') => {
  const color = sanitizeColor(rawColor);
  return getCachedIcon(`zone-${name}-${color}`, () => new L.DivIcon({
    className: 'zone-label-icon',
    html: `
      <div style="
        background: linear-gradient(135deg, rgba(16, 23, 38, 0.95) 0%, rgba(10, 15, 26, 0.9) 100%);
        border: 1px dashed ${color};
        color: ${color};
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 700;
        white-space: nowrap;
        box-shadow: 0 0 15px ${color}40, 0 0 30px ${color}20;
        backdrop-filter: blur(8px);
        letter-spacing: 0.5px;
      ">
        ${escapeHtml(name)}
      </div>
    `,
    iconSize: [90, 28],
    iconAnchor: [45, 14],
  }));
};

// Active Incident Alarm Pin on Map with Neon Glow
const createAlertIncidentIcon = (severity) => {
  const isCritical = severity === 'critical';
  const color = isCritical ? '#FF3366' : '#F59E0B';
  return getCachedIcon(`alert-${severity}`, () => new L.DivIcon({
    className: 'alert-incident-pin',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="
          position: absolute;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: ${color}35;
          box-shadow: 0 0 16px ${color};
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #0D1424;
          border: 2px solid ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 12px ${color};
          font-size: 11px;
        ">
          ${isCritical ? '!' : 'ALERTA'}
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  }));
};


const MapArea = ({ 
  category = 'devices', 
  vehicles = [], 
  selectedVehicle, 
  onSelectVehicle, 
  alerts = [],
  onSelectAlert,
  focusTrigger,
  geofences = [],
  isPlacingOnMap = false,
  pendingCenter = null,
  onMapClick,
  onMapHover,
  flyToTrigger,
  isFollowingRoute = false,
  onToggleRouteFollow,
  onShareRoute,
  isVehicleDetailOpen = false,
  userLocation = null,
  onLocationChange,
  locateUserTrigger,
  origin = null,
  baseLayer: baseLayerProp,
  onBaseLayerChange,
  hideControls = false,
  hideSelectionBar = false,
  routeFocusTrigger = null,
}) => {
  const mapRef = useRef(null);
  const alertMarkerRefs = useRef({});
  const [internalBaseLayer, setInternalBaseLayer] = useState('dark');
  const [navRoute, setNavRoute] = useState([]);
  const [navMeta, setNavMeta] = useState(null);
  const [navError, setNavError] = useState(false);
  const baseLayer = baseLayerProp ?? internalBaseLayer;
  const changeBaseLayer = (next) => {
    setInternalBaseLayer(next);
    if (onBaseLayerChange) onBaseLayerChange(next);
  };

  // Ruta de navegación por calles (OSRM) desde el punto de partida
  // (manual por tarjeta, o GPS si no hay manual) hasta el dispositivo.
  useEffect(() => {
    const source = origin?.position || userLocation?.position
    if (!isFollowingRoute) {
      setNavRoute([]);
      setNavMeta(null);
      setNavError(false);
      return undefined;
    }
    if (!source || !selectedVehicle?.position) {
      setNavRoute([]);
      setNavMeta(null);
      setNavError(false);
      return undefined;
    }

    let active = true;
    let controller = null;

    const loadRoute = async () => {
      const originPos = source;
      const destination = selectedVehicle.position;
      if (!originPos || !destination) return;

      const ctrl = new AbortController();
      controller = ctrl;
      try {
        const result = await fetchDrivingRoute(originPos, destination, { signal: ctrl.signal });
        if (!active) return;
        if (result) {
          setNavRoute(result.coords);
          setNavMeta({ distanceM: result.distanceM, durationS: result.durationS });
          setNavError(false);
        } else {
          setNavRoute([]);
          setNavMeta(null);
          setNavError(true);
        }
      } catch (err) {
        if (!active) return;
        if (err.name === 'AbortError') return;
        setNavRoute([]);
        setNavMeta(null);
        setNavError(true);
      }
    };

    loadRoute();
    // Recalcular conforme el dispositivo avanza (cada 8s en modo seguimiento).
    const interval = setInterval(loadRoute, 8000);
    return () => {
      active = false;
      if (controller) controller.abort();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFollowingRoute, origin?.position, userLocation?.position, selectedVehicle?.position]);

  // Default fallback center - Bogotá coordinates
  const defaultCenter = [4.6097, -74.0817];

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const handleRecenter = () => {
    if (mapRef.current && userLocation?.position) {
      mapRef.current.flyTo(userLocation.position, 16, { animate: true, duration: 1 });
    } else if (mapRef.current && selectedVehicle?.position) {
      mapRef.current.flyTo(selectedVehicle.position, 16, { animate: true, duration: 1 });
    }
  };

  const handleFitFleet = () => {
    const positions = vehicles.filter((vehicle) => vehicle.position).map((vehicle) => vehicle.position);
    if (mapRef.current && positions.length > 0) mapRef.current.fitBounds(L.latLngBounds(positions), { padding: [36, 36], maxZoom: 15 });
  };

  const routeColor = routeColorForSpeed(selectedVehicle?.speed);

  // Active route to render (sanitized for safe Leaflet rendering)
  const activeRoute = selectedVehicle?.route ? sanitizeRoute(selectedVehicle.route) : [];

  // Ruta "por donde ir" al estar en modo seguimiento: se enruta desde el
  // punto de partida (manual o GPS) hasta la posición actual del dispositivo.
  const sourcePos = origin?.position || userLocation?.position;
  const guidanceLine = isFollowingRoute && selectedVehicle?.position && sourcePos
    ? [selectedVehicle.position, sourcePos]
    : null;

  const followRoute = isFollowingRoute && selectedVehicle?.position
    ? (activeRoute.length >= 2
        ? routeAhead(selectedVehicle.position, activeRoute)
        : projectedPath(selectedVehicle.position, selectedVehicle.bearing || 0))
    : [];

  const currentPinPosition = selectedVehicle?.position || defaultCenter;

  return (
    <div className="relative h-full min-h-0 min-w-0 w-full overflow-hidden rounded-[10px] bg-[#162126] select-none">
      <MapContainer 
        ref={mapRef}
        center={currentPinPosition} 
        zoom={15} 
        zoomControl={false}
        className="w-full h-full z-0 cyber-tiles"
        style={{ height: '100%', width: '100%' }}
      >
        <MapController />
        <MapFlyToHandler 
          targetPosition={isFollowingRoute ? selectedVehicle?.position : null}
          flyToTrigger={flyToTrigger} 
        />
        <AlertFocusHandler focusTrigger={focusTrigger} markerRefs={alertMarkerRefs} />
        <RouteFocusHandler routeFocusTrigger={routeFocusTrigger} />
        <UserLocationTracker locateUserTrigger={locateUserTrigger} onLocationChange={onLocationChange} />
        {locateUserTrigger && userLocation?.position && (
          <MapFlyToHandler targetPosition={userLocation.position} flyToTrigger={locateUserTrigger} />
        )}
        
        {/* Dark GIS Basemap */}
        <TileLayer
          url={baseLayer === 'satellite'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'}
          attribution={baseLayer === 'satellite'
            ? '&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
            : '&copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'}
          maxZoom={18}
        />


        {/* Click listener for placing new geofence */}
        <MapClickHandler isPlacingOnMap={isPlacingOnMap} onMapClick={onMapClick} onMapHover={onMapHover} />

        {userLocation?.position && (
          <>
            <Circle
              center={userLocation.position}
              radius={userLocation.accuracy || 35}
              pathOptions={{ color: '#168ca4', fillColor: '#5ad6e7', fillOpacity: 0.14, weight: 1.5 }}
            />
            <Marker position={userLocation.position} icon={createUserLocationIcon()}>
              <Popup>Tu ubicación actual</Popup>
            </Marker>
          </>
        )}

        {/* Punto de partida manual (tarjeta "desde dónde parto") */}
        {origin?.position && !(userLocation && userLocation.position[0] === origin.position[0] && userLocation.position[1] === origin.position[1]) && (
          <Marker position={origin.position} icon={createOriginIcon()}>
            <Popup>
              <div className="font-bold">Punto de partida</div>
              <div className="text-[10px] text-slate-500">{origin.label}</div>
            </Popup>
          </Marker>
        )}

        {/* 1. Dynamic Geofences with Glass styling */}
        {geofences.filter(geo => geo.active).map((geo) => {
          const isPolygon = geo.type === 'polygon' && geo.positions && geo.positions.length > 0;
          const isBreach = isGeofenceBreach(selectedVehicle, geo);
          const geoColor = sanitizeColor(isBreach ? '#ef5c72' : geo.color || '#00E676');

          if (isPolygon) {
            return (
              <React.Fragment key={geo.id}>
                <Polygon 
                  positions={geo.positions} 
                  className="geofence-polygon"
                  pathOptions={{
                    color: geoColor,
                    fillColor: geoColor,
                    fillOpacity: 0.035,
                    weight: 1.2,
                    dashArray: '5, 7',
                    opacity: 0.75,
                  }}
                >
                  <Popup className="dark-popup">
                    <div className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: geoColor, boxShadow: `0 0 8px ${geoColor}` }}></span>
                        <span className="font-bold text-white">{geo.name}</span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8]">Zona Delimitada Poligonal{getGeofenceStatusText(geo, isBreach)}</p>
                      <div className="mt-2 text-[10px] text-[#00E676] font-mono">Regla: {geo.rule || 'Supervision'}</div>
                    </div>
                  </Popup>
                </Polygon>
                {geo.center && (
                  <Marker position={geo.center} icon={createZoneLabel(geo.name, geoColor)} />
                )}
              </React.Fragment>
            );
          } else if (geo.center) {
            return (
              <React.Fragment key={geo.id}>
                <Circle 
                  center={geo.center}
                  radius={geo.radius || 600}
                  pathOptions={{
                    color: geoColor,
                    fillColor: geoColor,
                    fillOpacity: 0.045,
                    weight: 1.5,
                    dashArray: '5, 6',
                    opacity: 0.8,
                  }}
                >
                  <Popup className="dark-popup">
                    <div className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: geoColor, boxShadow: `0 0 8px ${geoColor}` }}></span>
                        <span className="font-bold text-white">{geo.name}</span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8]">Zona Circular - Radio: {geo.radius || 600}m{getGeofenceStatusText(geo, isBreach)}</p>
                      <div className="mt-2 text-[10px] text-[#00E676] font-mono">Regla: {geo.rule || 'Supervision'}</div>
                    </div>
                  </Popup>
                </Circle>
                <Marker position={geo.center} icon={createZoneLabel(geo.name, geoColor)} />
              </React.Fragment>
            );
          }
          return null;
        })}

        {/* Temporary Ghost Circle when placing or confirming geofence */}
        {pendingCenter && (
          <Circle 
            center={pendingCenter}
            radius={300}
            pathOptions={{
              color: '#38bdf8',
              fillColor: '#0284c7',
              fillOpacity: 0.15,
              weight: 1.5,
              dashArray: '4, 4',
            }}
          />
        )}

        {/* Selected Primary Vehicle Pulsing Target Halo */}
        {selectedVehicle?.position && (
          <Circle 
            center={selectedVehicle.position}
            radius={80}
            pathOptions={{
              color: routeColor,
              fillColor: routeColor,
              fillOpacity: 0.12,
              weight: 1.5,
              dashArray: '4, 4',
            }}
          />
        )}


        {/* 2. Active Vehicle Glowing Route */}
        {guidanceLine && (
          <Polyline
            positions={guidanceLine}
            pathOptions={{ color: '#8be9fd', weight: 3, opacity: 0.9, dashArray: '10 12' }}
          />
        )}

        {/* Ruta a seguir (modo seguimiento): navegación por calles desde tu posición
            hasta el dispositivo en movimiento, con dash animado. Si OSRM falla o aún
            no hay ruta, se usa la ruta histórica/proyección del vehículo. */}
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

        {activeRoute.length > 0 && (
          <>
            <Polyline
              positions={activeRoute}
              pathOptions={{ color: routeColor, weight: 14, opacity: 0.25 }}
            />
            <Polyline
              positions={activeRoute}
              pathOptions={{ color: routeColor, weight: 3.5, opacity: 1 }}
            />

            {/* Waypoint A (Start) and B (End) */}
            <Marker position={activeRoute[0]} icon={createWaypointIcon('A', '#00E676')} />
            <Marker position={activeRoute[activeRoute.length - 1]} icon={createWaypointIcon('B', '#FF3366')} />
          </>
        )}

        {/* 3. Fleet Vehicle Pins */}
        {vehicles.filter((v) => v.position).map((v) => {
          const isSelected = selectedVehicle?.id === v.id;

          return (
            <React.Fragment key={v.id}>
              {v.bearing !== undefined && (
                <Marker position={v.position} icon={createHeadingIcon(v.bearing)} interactive={false} />
              )}
              <Marker
                position={v.position}
                icon={isSelected ? createHeroPinIcon(v.name, v.id) : createFleetPinIcon(v.status)}
                eventHandlers={{
                  click: () => onSelectVehicle && onSelectVehicle(v),
                }}
              >
              <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
                <span>{v.speed || 0} km/h · precisión {sanitizeAccuracy(v.accuracy) !== null ? `${sanitizeAccuracy(v.accuracy)} m` : '--'} · {v.lastUpdate || 'sin reporte'}</span>
              </Tooltip>
              <Popup className="dark-popup">
                <div className="text-xs min-w-[170px]">
                  <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-white/10">
                    <span className="font-bold text-white text-sm">{v.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      v.status === 'active' ? 'bg-[#00E676]/15 text-[#00E676]' : 
                      v.status === 'stopped' ? 'bg-amber-400/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'
                    }`}>
                      {v.status === 'active' ? 'En ruta' : v.status === 'stopped' ? 'Detenido' : 'Offline'}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-[#94A3B8]">
                    <p>Velocidad: <strong className="text-white font-mono">{v.speed} km/h</strong></p>
                    <p>Batería: <strong className="text-white font-mono">{normalizeBattery(v.battery)}%</strong></p>
                    {v.driver && <p>Conductor: <span className="text-white">{v.driver}</span></p>}
                    <p>{category === 'vehicles' ? 'Placa:' : 'ID:'} <span className="text-[#00E676] font-mono">{v.plate}</span></p>
                  </div>
                  {!isSelected ? (
                    <button
                      type="button"
                      onClick={() => onSelectVehicle?.(v)}
                      aria-label={`Seleccionar ${v.name || v.plate || v.id}`}
                      className="mt-3 w-full py-1.5 px-2 rounded-md bg-[#00E676]/20 hover:bg-[#00E676]/30 border border-[#00E676]/40 text-[#00E676] text-[10px] font-bold transition-colors"
                    >
                      Seleccionar {category === 'vehicles' ? 'moto' : 'dispositivo'}
                    </button>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleRouteFollow?.()}
                        aria-label={isFollowingRoute ? 'Dejar de seguir la ruta' : 'Seguir la ruta del dispositivo'}
                        className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1.5 text-[10px] font-bold text-cyan-200"
                      >
                        {isFollowingRoute ? 'Siguiendo' : 'Seguir ruta'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onShareRoute?.()}
                        aria-label="Compartir ubicación y ruta"
                        className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-1.5 text-[10px] font-bold text-emerald-200"
                      >
                        Compartir
                      </button>
                    </div>
                  )}

                </div>
              </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* 4. Active Incident Alarms on Map */}
        {alerts.filter(a => a.status !== 'resolved' && Number.isFinite(a.lat) && Number.isFinite(a.lng)).map((alert) => (
          <Marker
            key={alert.id}
            ref={(marker) => { if (marker) alertMarkerRefs.current[alert.id] = marker; }}
            position={[alert.lat, alert.lng]}
            icon={createAlertIncidentIcon(alert.severity)}
            eventHandlers={{
              click: () => onSelectAlert && onSelectAlert(alert),
            }}
          >
            <Popup className="dark-popup">
              <div className="text-xs min-w-[190px]">
                <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-white/10">
                  <span className="text-base">{alert.severity === 'critical' ? '!' : 'ALERTA'}</span>
                  <div>
                    <span className="font-bold text-white text-xs block leading-tight">{alert.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{alert.timestamp}</span>
                  </div>
                </div>
                <p className="text-[11px] text-[#94A3B8] my-1 leading-snug">{alert.description}</p>
                <div className="text-[10px] text-[#00E676] font-mono mt-1 mb-2">
                  {category === 'devices' ? 'Dispositivo' : 'Moto'}: {alert.vehicleName} - {alert.speed} km/h
                </div>
                <button
                  onClick={() => onSelectAlert && onSelectAlert(alert)}
                  aria-label={`Ver alerta: ${alert.title}`}
                  className="w-full py-1.5 px-2 rounded-lg bg-[#00E676]/15 hover:bg-[#00E676]/25 border border-[#00E676]/40 text-[#00E676] text-[11px] font-bold transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                >
                  Ver alerta
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {selectedVehicle && !isVehicleDetailOpen && !hideSelectionBar && (
        <div className="map-selection-bar" aria-label={`Acciones para ${selectedVehicle.name}`}>
          <div className="map-selection-identity">
            <span className={`map-selection-dot ${selectedVehicle.status}`} />
            <div>
              <strong>{selectedVehicle.name}</strong>
              <span>{selectedVehicle.plate || selectedVehicle.id} · {selectedVehicle.speed || 0} km/h</span>
            </div>
          </div>
          <div className="map-selection-actions">
            <button
              type="button"
              onClick={onToggleRouteFollow}
              disabled={!selectedVehicle?.position}
              aria-label={isFollowingRoute && selectedVehicle?.position ? 'Dejar de seguir vehículo' : 'Seguir vehículo en el mapa'}
              title={!selectedVehicle?.position ? 'Sin posición GPS para seguir' : 'Seguir vehículo en el mapa'}
              className={`${isFollowingRoute && selectedVehicle?.position ? 'is-active' : ''} ${!selectedVehicle?.position ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Navigation size={15} />
              <span>{isFollowingRoute && selectedVehicle?.position ? 'Siguiendo' : 'Seguir'}</span>
            </button>
            <button type="button" onClick={onShareRoute} aria-label="Compartir ubicación y ruta" title="Compartir ubicación y ruta">
              <Share2 size={15} />
              <span>Compartir</span>
            </button>
          </div>
        </div>
      )}

      {/* Simplified Floating UI Overlays */}
      <div className="absolute inset-0 pointer-events-none z-10 p-4 flex flex-col justify-between">
        {/* Zoom Controls */}
        {!hideControls && (
          <div className="flex justify-end pointer-events-auto">
            <div className="map-control-stack bg-[#0D1424]/90 backdrop-blur-xl rounded-xl border border-cyan-500/30 shadow-xl flex flex-col">
              <button
                onClick={handleZoomIn}
                aria-label="Acercar mapa"
                className="w-10 h-10 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 transition-colors border-b border-cyan-500/20"
              >
                <Plus size={18} />
              </button>
              <button
                onClick={handleZoomOut}
                aria-label="Alejar mapa"
                className="w-10 h-10 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 transition-colors"
              >
                <Minus size={18} />
              </button>
            </div>
          </div>
        )}

        {isFollowingRoute && (navRoute.length >= 2 || navError) && (
          <div className="absolute left-4 top-4 pointer-events-auto bg-[#0D1424]/90 backdrop-blur-xl rounded-xl border border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.25)] px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold uppercase tracking-wide">
              <Navigation size={13} />
              Ruta de navegación
            </div>
            {navError && navRoute.length < 2 && (
              <div className="mt-1 text-[11px] text-red-300">
                No se pudo trazar la ruta aquí. Intenta con otra ubicación de partida.
              </div>
            )}
            {navMeta && (
              <div className="flex gap-3 mt-1 text-[11px] text-slate-200">
                <span>{formatNavDistance(navMeta.distanceM)}</span>
                <span>·</span>
                <span>{formatNavDuration(navMeta.durationS)}</span>
              </div>
            )}
          </div>
        )}

        {!hideControls && (
          <div className="map-secondary-controls pointer-events-auto">
            <button aria-label="Centrar vehículo activo" onClick={handleRecenter} title="Centrar vehículo activo"><Crosshair size={16} /></button>
            <button aria-label="Ver toda la flota" onClick={handleFitFleet} title="Ver toda la flota"><Maximize size={16} /></button>
            <button aria-label="Cambiar capa del mapa" onClick={() => changeBaseLayer(baseLayer === 'dark' ? 'satellite' : 'dark')} title="Cambiar capa del mapa"><Layers size={16} /><span>{baseLayer === 'dark' ? 'Satélite' : 'Oscuro'}</span></button>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="flex justify-between items-end pointer-events-auto">
          <div />
          {/* Map attribution */}
          <div className="text-gray-500 text-xs">
            <span>© Esri / </span>
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">OpenStreetMap</a>
            <span> contributors</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MapArea;
