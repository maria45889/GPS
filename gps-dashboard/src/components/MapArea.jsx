import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, Circle, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Plus, Minus, Crosshair, MapPin, X, History, Shield, AlertOctagon } from 'lucide-react';
import MotoInfoCard from './MotoInfoCard';
import AlertsPanel from './AlertsPanel';
import { RouteHistoryPlayer } from './routes/RouteHistoryPlayer';

// Component to handle map resize
const MapController = () => {
  const map = useMap();
  
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
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
      map.flyTo(targetPosition, 15, {
        animate: true,
        duration: 1.2,
      });
    }
  }, [targetPosition, flyToTrigger, map]);

  return null;
};

// Component to handle map clicks for placing geofences
const MapClickHandler = ({ isPlacingOnMap, onMapClick }) => {
  useMapEvents({
    click(e) {
      if (isPlacingOnMap && onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
};

// Selected Vehicle Hero Pin matching the mockup
const createHeroPinIcon = (name, id) => new L.DivIcon({
  className: 'custom-vehicle-pin',
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <!-- Vehicle Name Badge -->
      <div style="
        background: rgba(16, 23, 38, 0.95);
        border: 1px solid rgba(0, 240, 255, 0.5);
        padding: 4px 10px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.7), 0 0 10px rgba(0, 240, 255, 0.2);
        text-align: center;
        margin-bottom: 6px;
        white-space: nowrap;
      ">
        <div style="font-size: 11px; font-weight: 700; color: #ffffff; line-height: 1.2;">${name}</div>
        <div style="font-size: 9px; color: #64748B; font-family: monospace;">ID: ${id}</div>
      </div>

      <!-- Glowing Cyan Pin with bike -->
      <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(0, 240, 255, 0.2);
          box-shadow: 0 0 20px #00F0FF;
          animation: pulse 2s infinite;
        "></div>

        <div style="
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #00F0FF, #0099FF);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 0 16px rgba(0, 240, 255, 0.8);
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg style="transform: rotate(45deg); width: 16px; height: 16px; fill: none; stroke: #0B0F19; stroke-width: 2.5;" viewBox="0 0 24 24">
            <circle cx="18.5" cy="17.5" r="3.5" />
            <circle cx="5.5" cy="17.5" r="3.5" />
            <circle cx="15" cy="5" r="1" />
            <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
          </svg>
        </div>
      </div>
    </div>
  `,
  iconSize: [110, 85],
  iconAnchor: [55, 75],
});

// Subtle Secondary Fleet Pins for unselected bikes
const createFleetPinIcon = (status) => {
  const color = status === 'active' ? '#00E676' : status === 'stopped' ? '#F59E0B' : '#64748B';
  return new L.DivIcon({
    className: 'mini-vehicle-pin',
    html: `
      <div style="
        position: relative;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <div style="
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${color}20;
          border: 1px solid ${color}60;
        "></div>
        <div style="
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid #ffffff;
          box-shadow: 0 0 8px ${color};
        "></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Route Start (A) and End (B) badges
const createWaypointIcon = (label, color = '#00F0FF') => new L.DivIcon({
  className: 'route-waypoint-pin',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #0D1424;
      border: 2px solid ${color};
      color: ${color};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
      box-shadow: 0 0 10px ${color};
    ">
      ${label}
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Zone label badge
const createZoneLabel = (name, color = '#00F0FF') => new L.DivIcon({
  className: 'zone-label-icon',
  html: `
    <div style="
      background: rgba(16, 23, 38, 0.9);
      border: 1px dashed ${color};
      color: ${color};
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 0 10px ${color}30;
    ">
      ${name}
    </div>
  `,
  iconSize: [80, 24],
  iconAnchor: [40, 12],
});

// Active Incident Alarm Pin on Map with Neon Glow
const createAlertIncidentIcon = (severity) => {
  const isCritical = severity === 'critical';
  const color = isCritical ? '#FF3366' : '#F59E0B';
  return new L.DivIcon({
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
          ${isCritical ? '🚨' : '⚠️'}
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
};

const MapArea = ({ 
  vehicles = [], 
  selectedVehicle, 
  onSelectVehicle, 
  alerts = [],
  onSelectAlert,
  geofences = [],
  isPlacingOnMap = false,
  pendingCenter = null,
  onMapClick,
  onOpenGeofences,
  flyToTrigger,
  showAlerts = true, 
  onCloseAlerts 
}) => {
  const mapRef = useRef(null);

  // Default fallback center
  const defaultCenter = [37.7730, -122.4120];

  const [showLocationData, setShowLocationData] = useState(true);
  const [showHistoryPlayer, setShowHistoryPlayer] = useState(false);
  const [playbackPos, setPlaybackPos] = useState(null);
  const [playbackData, setPlaybackData] = useState(null);
  const [isTheftMode, setIsTheftMode] = useState(false);

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const handleRecenter = () => {
    if (mapRef.current && (playbackPos || selectedVehicle?.position)) {
      mapRef.current.flyTo(playbackPos || selectedVehicle.position, 15, { animate: true, duration: 1 });
    }
  };

  // Active route to render
  const activeRoute = selectedVehicle?.route && selectedVehicle.route.length > 0
    ? selectedVehicle.route
    : [];

  const currentPinPosition = playbackPos || selectedVehicle?.position || defaultCenter;

  const currentDisplayVehicle = playbackData ? {
    ...selectedVehicle,
    speed: playbackData.speed,
    lastUpdate: playbackData.timeStr,
  } : selectedVehicle;

  return (
    <div className="relative w-full h-full bg-[#060911] overflow-hidden select-none">
      <MapContainer 
        ref={mapRef}
        center={currentPinPosition} 
        zoom={13} 
        zoomControl={false}
        className="w-full h-full z-0 cyber-tiles"
        style={{ height: '100%', width: '100%' }}
      >
        <MapController />
        <MapFlyToHandler 
          targetPosition={playbackPos || selectedVehicle?.position} 
          flyToTrigger={flyToTrigger} 
        />
        
        {/* Dark GIS Basemap */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          maxZoom={16}
        />

        {/* Click listener for placing new geofence */}
        <MapClickHandler isPlacingOnMap={isPlacingOnMap} onMapClick={onMapClick} />

        {/* 1. Dynamic Geofences with Glass styling */}
        {geofences.filter(geo => geo.active).map((geo) => {
          const isPolygon = geo.type === 'polygon' && geo.positions && geo.positions.length > 0;
          const geoColor = geo.color || '#00F0FF';

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
                      <p className="text-[11px] text-[#94A3B8]">Zona Delimitada Poligonal</p>
                      <div className="mt-2 text-[10px] text-[#00F0FF] font-mono">Regla: {geo.rule || 'Supervisión'}</div>
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
                      <p className="text-[11px] text-[#94A3B8]">Zona Circular • Radio: {geo.radius || 600}m</p>
                      <div className="mt-2 text-[10px] text-[#00F0FF] font-mono">Regla: {geo.rule || 'Supervisión'}</div>
                    </div>
                  </Popup>
                </Circle>
                <Marker position={geo.center} icon={createZoneLabel(geo.name, geoColor)} />
              </React.Fragment>
            );
          }
          return null;
        })}

        {/* Temporary Ghost Circle when placing geofence */}
        {isPlacingOnMap && pendingCenter && (
          <Circle 
            center={pendingCenter}
            radius={600}
            pathOptions={{
              color: '#F59E0B',
              fillColor: '#F59E0B',
              fillOpacity: 0.12,
              weight: 2,
              dashArray: '4, 4',
            }}
          />
        )}

        {/* 2. Active Vehicle Glowing Route */}
        {activeRoute.length > 0 && (
          <>
            <Polyline 
              positions={activeRoute} 
              pathOptions={{ color: '#00F0FF', weight: 14, opacity: 0.35 }} 
            />
            <Polyline 
              positions={activeRoute} 
              pathOptions={{ color: '#00F0FF', weight: 3.5, opacity: 1 }} 
            />

            {/* Waypoint A (Start) and B (End) */}
            <Marker position={activeRoute[0]} icon={createWaypointIcon('A', '#00F0FF')} />
            <Marker position={activeRoute[activeRoute.length - 1]} icon={createWaypointIcon('B', '#FF3366')} />
          </>
        )}

        {/* 3. Fleet Vehicle Pins */}
        {vehicles.map((v) => {
          const isSelected = selectedVehicle?.id === v.id;
          const pos = isSelected && playbackPos ? playbackPos : v.position;

          return (
            <Marker 
              key={v.id} 
              position={pos} 
              icon={isSelected ? createHeroPinIcon(v.name, v.id) : createFleetPinIcon(v.status)}
              eventHandlers={{
                click: () => onSelectVehicle && onSelectVehicle(v),
              }}
            >
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
                    <p>Batería GPS: <strong className="text-white font-mono">{v.battery}%</strong></p>
                    <p>Conductor: <span className="text-white">{v.driver}</span></p>
                    <p>Placa: <span className="text-[#00F0FF] font-mono">{v.plate}</span></p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 4. Active Incident Alarms on Map */}
        {alerts.filter(a => a.status !== 'resolved' && a.lat && a.lng).map((alert) => (
          <Marker
            key={alert.id}
            position={[alert.lat, alert.lng]}
            icon={createAlertIncidentIcon(alert.severity)}
            eventHandlers={{
              click: () => onSelectAlert && onSelectAlert(alert),
            }}
          >
            <Popup className="dark-popup">
              <div className="text-xs min-w-[190px]">
                <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-white/10">
                  <span className="text-base">{alert.severity === 'critical' ? '🚨' : '⚠️'}</span>
                  <div>
                    <span className="font-bold text-white text-xs block leading-tight">{alert.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{alert.timestamp}</span>
                  </div>
                </div>
                <p className="text-[11px] text-[#94A3B8] my-1 leading-snug">{alert.description}</p>
                <div className="text-[10px] text-[#00F0FF] font-mono mt-1 mb-2">
                  Moto: {alert.vehicleName} • {alert.speed} km/h
                </div>
                <button
                  onClick={() => onSelectAlert && onSelectAlert(alert)}
                  className="w-full py-1.5 px-2 rounded-lg bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/40 text-[#00F0FF] text-[11px] font-bold transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                >
                  🔍 Ver Análisis Forense
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating UI Overlays */}
      <div className="absolute inset-0 pointer-events-none z-10 p-3 sm:p-5 flex flex-col justify-between">
        {/* Banner for geofence map placement */}
        {isPlacingOnMap && (
          <div className="self-center z-30 bg-[#0D1424]/95 border border-amber-400/60 text-amber-300 px-4 py-2 rounded-xl backdrop-blur-md shadow-2xl flex items-center gap-2 text-xs font-semibold animate-pulse pointer-events-auto mb-2">
            <MapPin size={15} />
            <span>Haz clic en cualquier punto del mapa para fijar el centro de la nueva geocerca</span>
          </div>
        )}

        {/* Top Cards: Selected Vehicle Status on Left, Active Alerts on Right */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <MotoInfoCard vehicle={currentDisplayVehicle} />
          {showAlerts && (
            <AlertsPanel 
              alerts={alerts}
              onSelectAlert={onSelectAlert}
              onClose={onCloseAlerts} 
            />
          )}
        </div>

        {/* Bottom Section: RouteHistoryPlayer (when active) OR Quick Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 pointer-events-none">
          {/* Left/Center: Route Player OR Quick Action Buttons */}
          <div className="w-full sm:w-auto flex justify-center sm:justify-start">
            {showHistoryPlayer && activeRoute.length > 0 ? (
              <RouteHistoryPlayer 
                routePoints={activeRoute}
                onProgressChange={(point, idx, data) => {
                  setPlaybackPos(point);
                  setPlaybackData(data);
                }}
                onClose={() => {
                  setShowHistoryPlayer(false);
                  setPlaybackPos(null);
                  setPlaybackData(null);
                }}
              />
            ) : (
              /* Floating Quick Action Buttons (matching user's panel image) */
              <div className="flex items-center gap-2 pointer-events-auto bg-[#0D1424]/90 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-xl">
                <button
                  onClick={() => setShowHistoryPlayer(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-white/5 hover:bg-[#00F0FF]/15 hover:text-[#00F0FF] border border-white/5 hover:border-[#00F0FF]/30 transition-all"
                >
                  <History size={14} className="text-[#00F0FF]" />
                  <span>Ver Historial</span>
                </button>

                <button
                  onClick={onOpenGeofences}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-white/5 hover:bg-[#00F0FF]/15 hover:text-[#00F0FF] border border-white/5 hover:border-[#00F0FF]/30 transition-all"
                >
                  <Shield size={14} className="text-[#00F0FF]" />
                  <span>Establecer Geovalla</span>
                </button>

                <button
                  onClick={() => setIsTheftMode(!isTheftMode)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isTheftMode 
                      ? 'bg-danger text-white border border-danger shadow-[0_0_15px_#FF3366] animate-pulse' 
                      : 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20'
                  }`}
                >
                  <AlertOctagon size={14} />
                  <span>{isTheftMode ? 'Alarma Activa' : 'Reportar Robo'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Map Controls Stack + Location Data Pill */}
          <div className="flex flex-col items-end gap-3 pointer-events-auto shrink-0">
            <div className="flex flex-col gap-2">
              <button
                className="w-8 h-8 rounded-lg bg-[#101726]/90 hover:bg-[#1E293B] border border-white/10 flex items-center justify-center text-[#94A3B8] hover:text-white shadow-lg transition-colors"
                title="Layers"
              >
                <Layers size={16} />
              </button>

              <div className="flex flex-col bg-[#101726]/90 border border-white/10 rounded-lg shadow-lg overflow-hidden">
                <button
                  onClick={handleZoomIn}
                  className="w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-white/5 border-b border-white/10 transition-colors"
                  title="Zoom In"
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-white/5 transition-colors"
                  title="Zoom Out"
                >
                  <Minus size={16} />
                </button>
              </div>

              <button
                onClick={handleRecenter}
                className="w-8 h-8 rounded-lg bg-[#101726]/90 hover:bg-[#1E293B] border border-white/10 flex items-center justify-center text-[#94A3B8] hover:text-white shadow-lg transition-colors"
                title="Centrar en vehículo seleccionado"
              >
                <Crosshair size={16} />
              </button>
            </div>

            {showLocationData && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#101726]/90 backdrop-blur-md border border-white/10 text-xs text-[#94A3B8] shadow-lg">
                <MapPin size={13} className="text-[#00F0FF]" />
                <span className="font-medium text-white">{selectedVehicle?.plate || 'Location Data'}</span>
                <button 
                  onClick={() => setShowLocationData(false)}
                  className="text-[#64748B] hover:text-white ml-1 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapArea;