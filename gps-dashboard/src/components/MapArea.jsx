import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, Circle, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, Minus, Crosshair, MapPin } from 'lucide-react';

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
      map.flyTo(targetPosition, 16, {
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
        <div style="font-size: 12px; font-weight: 800; color: #ffffff; line-height: 1.2; text-shadow: 0 0 10px rgba(0,240,255,0.5);">${name}</div>
        <div style="font-size: 9px; color: #475569; font-family: monospace; letter-spacing: 0.5px;">ID: ${id}</div>
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
});

// Subtle Secondary Fleet Pins for unselected bikes
const createFleetPinIcon = (status) => {
  const color = status === 'active' ? '#00E676' : status === 'stopped' ? '#F59E0B' : '#64748B';
  const glowColor = status === 'active' ? 'rgba(0,230,118,0.3)' : status === 'stopped' ? 'rgba(245,158,11,0.3)' : 'rgba(100,116,139,0.2)';
  return new L.DivIcon({
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
  });
};

// Route Start (A) and End (B) badges
const createWaypointIcon = (label, color = '#00E676') => new L.DivIcon({
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
});

// Zone label badge
const createZoneLabel = (name, color = '#00E676') => new L.DivIcon({
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
      ${name}
    </div>
  `,
  iconSize: [90, 28],
  iconAnchor: [45, 14],
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
          ${isCritical ? 'ðŸš¨' : 'âš ï¸'}
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
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

  // Default fallback center - Bogotá coordinates
  const defaultCenter = [4.6097, -74.0817];

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const handleRecenter = () => {
    if (mapRef.current && selectedVehicle?.position) {
      mapRef.current.flyTo(selectedVehicle.position, 16, { animate: true, duration: 1 });
    }
  };

  // Active route to render
  const activeRoute = selectedVehicle?.route && selectedVehicle.route.length > 0
    ? selectedVehicle.route
    : [];

  const currentPinPosition = selectedVehicle?.position || defaultCenter;

  return (
    <div className="relative w-full h-full bg-[#060911] overflow-hidden select-none">
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
          targetPosition={selectedVehicle?.position} 
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
          const geoColor = geo.color || '#00E676';

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
                      <div className="mt-2 text-[10px] text-[#00E676] font-mono">Regla: {geo.rule || 'SupervisiÃ³n'}</div>
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
                      <p className="text-[11px] text-[#94A3B8]">Zona Circular â€¢ Radio: {geo.radius || 600}m</p>
                      <div className="mt-2 text-[10px] text-[#00E676] font-mono">Regla: {geo.rule || 'SupervisiÃ³n'}</div>
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
              pathOptions={{ color: '#00E676', weight: 14, opacity: 0.35 }} 
            />
            <Polyline 
              positions={activeRoute} 
              pathOptions={{ color: '#00E676', weight: 3.5, opacity: 1 }} 
            />

            {/* Waypoint A (Start) and B (End) */}
            <Marker position={activeRoute[0]} icon={createWaypointIcon('A', '#00E676')} />
            <Marker position={activeRoute[activeRoute.length - 1]} icon={createWaypointIcon('B', '#FF3366')} />
          </>
        )}

        {/* 3. Fleet Vehicle Pins */}
        {vehicles.map((v) => {
          const isSelected = selectedVehicle?.id === v.id;

          return (
            <Marker 
              key={v.id} 
              position={v.position} 
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
                    <p>BaterÃ­a GPS: <strong className="text-white font-mono">{v.battery}%</strong></p>
                    <p>Conductor: <span className="text-white">{v.driver}</span></p>
                    <p>Placa: <span className="text-[#00E676] font-mono">{v.plate}</span></p>
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
                  <span className="text-base">{alert.severity === 'critical' ? 'ðŸš¨' : 'âš ï¸'}</span>
                  <div>
                    <span className="font-bold text-white text-xs block leading-tight">{alert.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{alert.timestamp}</span>
                  </div>
                </div>
                <p className="text-[11px] text-[#94A3B8] my-1 leading-snug">{alert.description}</p>
                <div className="text-[10px] text-[#00E676] font-mono mt-1 mb-2">
                  Moto: {alert.vehicleName} â€¢ {alert.speed} km/h
                </div>
                <button
                  onClick={() => onSelectAlert && onSelectAlert(alert)}
                  className="w-full py-1.5 px-2 rounded-lg bg-[#00E676]/15 hover:bg-[#00E676]/25 border border-[#00E676]/40 text-[#00E676] text-[11px] font-bold transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                >
                  ðŸ” Ver AnÃ¡lisis Forense
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Simplified Floating UI Overlays */}
      <div className="absolute inset-0 pointer-events-none z-10 p-4 flex flex-col justify-between">
        {/* Zoom Controls */}
        <div className="flex justify-end pointer-events-auto">
          <div className="bg-[#0D1424]/90 backdrop-blur-xl rounded-xl border border-cyan-500/30 shadow-xl flex flex-col">
            <button
              onClick={handleZoomIn}
              className="w-10 h-10 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 transition-colors border-b border-cyan-500/20"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 transition-colors"
            >
              <Minus size={18} />
            </button>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="flex justify-between items-end pointer-events-auto">
          <div className="bg-[#0D1424]/90 backdrop-blur-xl rounded-xl border border-cyan-500/30 shadow-xl p-2">
            <button
              onClick={handleRecenter}
              className="w-10 h-10 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 transition-colors"
            >
              <Crosshair size={18} />
            </button>
          </div>
          
          {/* Map attribution */}
          <div className="text-gray-500 text-xs">
            <span>© </span>
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">OpenStreetMap</a>
            <span> contributors</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapArea;
