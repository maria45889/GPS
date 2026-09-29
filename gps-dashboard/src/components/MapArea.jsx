import React, { useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, Minus, Crosshair, Navigation, Share2, Maximize, Layers } from 'lucide-react';
import { routeColorForSpeed, routeAhead, projectedPath } from '../lib/mapLogic';
import { sanitizeRoute } from '../lib/queries';
import { formatNavDistance, formatNavDuration } from '../lib/routing';
import { MapController, MapFlyToHandler, AlertFocusHandler, RouteFocusHandler, MapClickHandler, UserLocationTracker } from './map/MapControllers';
import { createUserLocationIcon, createOriginIcon } from './map/MapIcons';
import { MapGeofences } from './map/MapGeofences';
import { MapNavigationLayer } from './map/MapNavigationLayer';
import { MapRoutesLayer } from './map/MapRoutesLayer';
import { MapFleetLayer } from './map/MapFleetLayer';

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
  const [navState, setNavState] = useState({ navRoute: [], navMeta: null, navError: false });
  const baseLayer = baseLayerProp ?? internalBaseLayer;
  
  const changeBaseLayer = (next) => {
    setInternalBaseLayer(next);
    if (onBaseLayerChange) onBaseLayerChange(next);
  };

  const defaultCenter = [4.6097, -74.0817];
  const currentPinPosition = selectedVehicle?.position || defaultCenter;

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
  const activeRoute = selectedVehicle?.route ? sanitizeRoute(selectedVehicle.route) : [];
  
  const sourcePos = origin?.position || userLocation?.position;
  
  const followRoute = isFollowingRoute && selectedVehicle?.position
    ? (activeRoute.length >= 2
        ? routeAhead(selectedVehicle.position, activeRoute)
        : projectedPath(selectedVehicle.position, selectedVehicle.bearing || 0))
    : [];

  return (
    <div className="relative h-full min-h-0 min-w-0 w-full overflow-hidden rounded-[10px] bg-[#162126] select-none">
      <MapContainer 
        ref={mapRef}
        center={currentPinPosition} 
        zoom={15} 
        zoomControl={false}
        className={baseLayer === 'dark' ? 'w-full h-full z-0 cyber-tiles dark-mode' : 'w-full h-full z-0 cyber-tiles'}
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
        
        <TileLayer
          url={baseLayer === 'satellite'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
          attribution={baseLayer === 'satellite'
            ? '&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
          maxZoom={19}
          maxNativeZoom={19}
          subdomains="abc"
        />

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

        {origin?.position && !(userLocation && userLocation.position[0] === origin.position[0] && userLocation.position[1] === origin.position[1]) && (
          <Marker position={origin.position} icon={createOriginIcon()}>
            <Popup>
              <div className="font-bold">Punto de partida</div>
              <div className="text-[10px] text-slate-500">{origin.label}</div>
            </Popup>
          </Marker>
        )}

        <MapGeofences 
          geofences={geofences} 
          selectedVehicle={selectedVehicle} 
          pendingCenter={pendingCenter} 
        />

        <MapNavigationLayer 
          isFollowingRoute={isFollowingRoute}
          originPosition={sourcePos}
          targetPosition={selectedVehicle?.position}
          followRoute={followRoute}
          onNavStateChange={setNavState}
        />

        <MapRoutesLayer 
          activeRoute={activeRoute}
          routeColor={routeColor}
        />

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

        {isFollowingRoute && (navState.navRoute.length >= 2 || navState.navError) && (
          <div className="absolute left-4 top-4 pointer-events-auto bg-[#0D1424]/90 backdrop-blur-xl rounded-xl border border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.25)] px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold uppercase tracking-wide">
              <Navigation size={13} />
              Ruta de navegación
            </div>
            {navState.navError && navState.navRoute.length < 2 && (
              <div className="mt-1 text-[11px] text-red-300">
                No se pudo trazar la ruta aquí. Intenta con otra ubicación de partida.
              </div>
            )}
            {navState.navMeta && (
              <div className="flex gap-3 mt-1 text-[11px] text-slate-200">
                <span>{formatNavDistance(navState.navMeta.distanceM)}</span>
                <span>·</span>
                <span>{formatNavDuration(navState.navMeta.durationS)}</span>
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

        <div className="flex justify-between items-end pointer-events-auto">
          <div />
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
