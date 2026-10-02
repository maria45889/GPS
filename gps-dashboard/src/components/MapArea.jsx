import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Plus, Minus, Crosshair, Navigation, Share2, Maximize, Layers, Box } from 'lucide-react';
import { routeColorForSpeed, routeAhead, projectedPath } from '../lib/mapLogic';
import { sanitizeRoute } from '../lib/queries';
import { formatNavDistance, formatNavDuration } from '../lib/routing';
import { DEFAULT_MAP_LAYER } from '../lib/mapStyle';
import { boundsFromPositions, toLngLat } from '../lib/mapGeo';
import {
  AlertFocusHandler,
  MapFlyToHandler,
  RouteFocusHandler,
  UserLocationTracker,
  UserLocationVisual,
} from './map/MapControllers';
import MapCanvas from './map/MapCanvas';
import MapFleetLayer from './map/MapFleetLayer';
import MapGeofences from './map/MapGeofences';
import MapNavigationLayer from './map/MapNavigationLayer';
import MapRoutesLayer from './map/MapRoutesLayer';
import { classesOf } from '../lib/maplibreLoader';
import { useMapEffect } from './map/MapContext';
import { originHtml } from './map/MapIcons';

const DEFAULT_CENTER = [-0.279758, -78.539656]; // Quicentro Sur, Quito, Ecuador

const OriginMarker = ({ origin, hidden }) => {
  const markerRef = useRef(null);
  const lngLat = useMemo(() => toLngLat(origin?.position), [origin?.position]);
  const label = origin?.label || '';

  useMapEffect((map) => {
    const classes = classesOf(map);
    if (!classes || !lngLat || hidden) {
      markerRef.current?.remove();
      markerRef.current = null;
      return undefined;
    }

    if (!markerRef.current) {
      const element = document.createElement('div');
      element.className = 'origin-marker';
      element.innerHTML = originHtml();
      markerRef.current = new classes.Marker({ element, anchor: 'bottom' })
        .setLngLat(lngLat)
        .setPopup(new classes.Popup({ offset: 26, className: 'gps-popup' }).setHTML(
          `<div class="popup-card"><div class="popup-head"><span class="popup-title">Punto de partida</span></div><div class="popup-meta">${label}</div></div>`,
        ))
        .addTo(map);
    } else {
      markerRef.current.setLngLat(lngLat);
    }

    return undefined;
  }, [lngLat?.[0], lngLat?.[1], hidden, label]);

  useMapEffect(() => () => {
    markerRef.current?.remove();
    markerRef.current = null;
  }, []);

  return null;
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
  const alertMarkerRefs = useRef({});
  const mapRef = useRef(null);
  const [internalBaseLayer, setInternalBaseLayer] = useState(DEFAULT_MAP_LAYER);
  const [is3D, setIs3D] = useState(true);
  const [tileError, setTileError] = useState(null);
  const [navState, setNavState] = useState({ navRoute: [], navMeta: null, navError: false });
  const baseLayer = baseLayerProp ?? internalBaseLayer;

  const changeBaseLayer = useCallback((next) => {
    setInternalBaseLayer(next);
    onBaseLayerChange?.(next);
  }, [onBaseLayerChange]);

  const currentPinPosition = selectedVehicle?.position || userLocation?.position || DEFAULT_CENTER;

  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const target = selectedVehicle?.position || userLocation?.position;
    if (!target) return;
    map.flyTo({ center: toLngLat(target), zoom: 16.5, duration: 900, essential: true });
  }, [selectedVehicle?.position, userLocation?.position]);

  const handleFitFleet = useCallback(() => {
    const map = mapRef.current;
    const bounds = boundsFromPositions(vehicles.map((vehicle) => vehicle.position).filter(Boolean));
    if (!map || !bounds) return;
    map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 64, maxZoom: 15.5, duration: 800 });
  }, [vehicles]);

  const handleZoom = useCallback((direction) => {
    const map = mapRef.current;
    if (!map) return;
    if (direction > 0) map.zoomIn({ duration: 240 });
    else map.zoomOut({ duration: 240 });
  }, []);

  const originLngLat = useMemo(() => toLngLat(origin?.position), [origin?.position]);
  const isOriginSameAsUser = Boolean(
    userLocation?.position && origin?.position
      && userLocation.position[0] === origin.position[0]
      && userLocation.position[1] === origin.position[1],
  );

  const handleMapReady = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const handleToggle3D = useCallback(() => setIs3D((prev) => !prev), []);

  const routeColor = routeColorForSpeed(selectedVehicle?.speed);
  const activeRoute = selectedVehicle?.route ? sanitizeRoute(selectedVehicle.route) : [];
  const sourcePos = origin?.position || userLocation?.position;

  const followRoute = isFollowingRoute && selectedVehicle?.position
    ? (activeRoute.length >= 2
        ? routeAhead(selectedVehicle.position, activeRoute)
        : projectedPath(selectedVehicle.position, selectedVehicle.bearing || 0))
    : [];

  return (
    <div className="relative h-full min-h-0 min-w-0 w-full overflow-hidden rounded-[10px] bg-[#eef1f4]">
      <MapCanvas
        center={toLngLat(currentPinPosition) || [DEFAULT_CENTER[1], DEFAULT_CENTER[0]]}
        zoom={15}
        is3D={is3D}
        baseLayer={baseLayer}
        onMapClick={onMapClick}
        onMapHover={onMapHover}
        isPlacingOnMap={isPlacingOnMap}
        onReady={handleMapReady}
        onTileFailure={setTileError}
      >
        <MapFlyToHandler targetPosition={isFollowingRoute ? selectedVehicle?.position : null} flyToTrigger={flyToTrigger} />
        <AlertFocusHandler focusTrigger={focusTrigger} markerRefs={alertMarkerRefs} />
        <RouteFocusHandler routeFocusTrigger={routeFocusTrigger} />
        <UserLocationTracker locateUserTrigger={locateUserTrigger} onLocationChange={onLocationChange} />
        <UserLocationVisual userLocation={userLocation} />
        <OriginMarker origin={origin} hidden={isOriginSameAsUser || !originLngLat} />

        <MapGeofences geofences={geofences} selectedVehicle={selectedVehicle} pendingCenter={pendingCenter} />
        <MapNavigationLayer
          isFollowingRoute={isFollowingRoute}
          originPosition={sourcePos}
          targetPosition={selectedVehicle?.position}
          followRoute={followRoute}
          onNavStateChange={setNavState}
        />
        <MapRoutesLayer activeRoute={activeRoute} routeColor={routeColor} />
        <MapFleetLayer
          vehicles={vehicles}
          category={category}
          selectedVehicle={selectedVehicle}
          onSelectVehicle={onSelectVehicle}
          alerts={alerts}
          onSelectAlert={onSelectAlert}
          onToggleRouteFollow={onToggleRouteFollow}
          isFollowingRoute={isFollowingRoute}
          onShareRoute={onShareRoute}
          routeColor={routeColor}
          alertMarkerRefs={alertMarkerRefs}
        />
      </MapCanvas>

      {tileError && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-xl border border-amber-400/40 bg-[#0b1221]/92 px-4 py-2 text-[11px] font-semibold text-amber-200 shadow-lg backdrop-blur">
          {tileError}. El resto del panel sigue funcionando.
        </div>
      )}

      {selectedVehicle && !isVehicleDetailOpen && !hideSelectionBar && (
        <div className="absolute bottom-6 left-1/2 z-20 w-[90%] max-w-[400px] -translate-x-1/2 rounded-2xl border border-cyan-500/30 bg-[#0b1221]/95 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full shadow-[0_0_10px_currentColor] ${selectedVehicle.status === 'active' ? 'bg-green-400 text-green-400' : selectedVehicle.status === 'stopped' ? 'bg-yellow-400 text-yellow-400' : 'bg-gray-400 text-gray-400'}`} />
              <div>
                <strong className="mb-1 block text-base leading-none text-white">{selectedVehicle.name}</strong>
                <span className="font-mono text-xs text-cyan-300">{selectedVehicle.plate || selectedVehicle.id} · {selectedVehicle.speed || 0} km/h</span>
              </div>
            </div>
          </div>
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={onToggleRouteFollow}
              disabled={!selectedVehicle?.position}
              className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all ${isFollowingRoute && selectedVehicle?.position ? 'border border-cyan-500/50 bg-cyan-500/20 text-cyan-300' : 'border border-gray-600/50 bg-[#162133] text-gray-300 hover:bg-[#1f2d44]'} ${!selectedVehicle?.position ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <Navigation size={16} />
              {isFollowingRoute && selectedVehicle?.position ? 'Siguiendo' : 'Seguir'}
            </button>
            <button
              type="button"
              onClick={onShareRoute}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-gray-600/50 bg-[#162133] text-sm font-bold text-gray-300 transition-all hover:bg-[#1f2d44]"
            >
              <Share2 size={16} />
              Compartir
            </button>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-10 p-4">
        {!hideControls && (
          <div className="pointer-events-auto absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-4">
            <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1221]/90 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <button onClick={() => handleZoom(1)} aria-label="Acercar mapa" className="flex h-12 w-12 items-center justify-center border-b border-white/10 text-white transition-colors hover:bg-white/10 active:bg-white/20 sm:h-10 sm:w-10">
                <Plus size={24} />
              </button>
              <button onClick={() => handleZoom(-1)} aria-label="Alejar mapa" className="flex h-12 w-12 items-center justify-center border-b border-white/10 text-white transition-colors hover:bg-white/10 active:bg-white/20 sm:h-10 sm:w-10">
                <Minus size={24} />
              </button>
            </div>

            <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1221]/90 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <button onClick={handleRecenter} title="Centrar vehículo activo" className="flex h-12 w-12 items-center justify-center border-b border-white/10 text-cyan-400 transition-colors hover:bg-white/10 active:bg-white/20 sm:h-10 sm:w-10"><Crosshair size={20} /></button>
              <button onClick={handleFitFleet} title="Ver toda la flota" className="flex h-12 w-12 items-center justify-center border-b border-white/10 text-cyan-400 transition-colors hover:bg-white/10 active:bg-white/20 sm:h-10 sm:w-10"><Maximize size={20} /></button>
              <button
                onClick={handleToggle3D}
                title={is3D ? 'Vista plana (2D)' : 'Vista 3D con relieve'}
                aria-pressed={is3D}
                className={`flex h-12 w-12 items-center justify-center border-b border-white/10 transition-colors hover:bg-white/10 active:bg-white/20 sm:h-10 sm:w-10 ${is3D ? 'text-emerald-300' : 'text-cyan-400/70'}`}
              >
                <Box size={20} />
              </button>
              <button
                onClick={() => changeBaseLayer(baseLayer === 'light' ? 'dark' : 'light')}
                title={baseLayer === 'dark' ? 'Mapa claro' : 'Mapa oscuro'}
                className="flex h-12 w-12 items-center justify-center text-cyan-400 transition-colors hover:bg-white/10 active:bg-white/20 sm:h-10 sm:w-10"
              >
                <Layers size={20} />
              </button>
            </div>
          </div>
        )}

        {isFollowingRoute && (navState.navRoute.length >= 2 || navState.navError) && (
          <div className="pointer-events-auto absolute left-4 top-4 max-w-[280px] rounded-2xl border border-cyan-500/40 bg-[#0b1221]/95 px-4 py-3 shadow-[0_0_30px_rgba(34,211,238,0.15)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <Navigation size={14} />
              Ruta activa
            </div>
            {navState.navError && navState.navRoute.length < 2 && (
              <div className="mt-2 text-xs leading-tight text-red-400">
                No se pudo trazar la ruta. Intenta con otra posición.
              </div>
            )}
            {navState.navMeta && (
              <div className="mt-2 flex flex-col gap-1 text-sm text-slate-200">
                <div className="text-lg font-bold text-white">{formatNavDuration(navState.navMeta.durationS)}</div>
                <div className="text-cyan-200/70">{formatNavDistance(navState.navMeta.distanceM)}</div>
              </div>
            )}
          </div>
        )}

        <div className="pointer-events-auto absolute bottom-2 right-4 text-right text-[10px] leading-tight text-slate-500">
          <div>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">OpenStreetMap</a> · OpenFreeMap</div>
          {baseLayer === 'satellite' && <div>Imágenes © <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">Esri</a></div>}
        </div>
      </div>
    </div>
  );
};

export default MapArea;