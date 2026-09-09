import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MotoInfoCard from './MotoInfoCard';
import AlertsPanel from './AlertsPanel';

// Component to handle map resize
const MapResizeHandler = () => {
  const map = useMap();
  
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    // Initial resize
    handleResize();
    
    // Resize on window resize
    window.addEventListener('resize', handleResize);
    
    // Resize on orientation change (mobile)
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [map]);

  return null;
};

// Moto icon
const motoIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj4KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0icmdiYSgwLCAyMjksIDI1NSwgMC4yKSIgLz4KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxMiIgZmlsbD0iIzAwRTVGRiIgLz4KPC9zdmc+',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Start point icon
const startIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIj4KICA8Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI4IiBmaWxsPSIjRkYzMzY2IiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIgLz4KPC9zdmc+',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});


const MapArea = () => {
  // Center roughly in San Francisco for the tech look
  const center = [37.7749, -122.4194];
  
  const routePositions = [
    [37.7649, -122.4294],
    [37.7689, -122.4204],
    [37.7710, -122.4150],
    [37.7749, -122.4194],
  ];

  return (
    <div className="absolute inset-0 bg-[#0B0F19] w-full h-full">
      <MapContainer 
        center={center} 
        zoom={14} 
        zoomControl={false}
        className="w-full h-full z-0"
        style={{ height: '100%', width: '100%' }}
      >
        <MapResizeHandler />
        
        {/* Dark map tiles (CartoDB Dark Matter) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {/* Custom Zoom Control position */}
        <ZoomControl position="bottomright" />

        {/* The Route */}
        <Polyline 
          positions={routePositions} 
          pathOptions={{ color: '#00E5FF', weight: 4, opacity: 0.8 }} 
        />
        
        {/* Glow effect route */}
        <Polyline 
          positions={routePositions} 
          pathOptions={{ color: '#00E5FF', weight: 12, opacity: 0.2 }} 
        />

        {/* Start Point Marker */}
        <Marker position={routePositions[0]} icon={startIcon}>
          <Popup className="dark-popup">Inicio de recorrido</Popup>
        </Marker>

        {/* Current Moto Position */}
        <Marker position={center} icon={motoIcon}>
          <Popup className="dark-popup">
            <div className="font-bold">Yamaha R1</div>
            <div>Velocidad: 84 km/h</div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Floating UI Elements - Adjusted for mobile */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {/* MotoInfoCard - Adjusted positioning for mobile */}
        <div className="absolute top-20 left-4 md:top-24 md:left-8 pointer-events-auto">
          <MotoInfoCard />
        </div>

        {/* AlertsPanel - Adjusted positioning for mobile */}
        <div className="absolute top-20 right-4 md:top-24 md:right-8 pointer-events-auto">
          <AlertsPanel />
        </div>
        
        {/* Bottom Right Controls / Info - Adjusted for mobile */}
        <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 pointer-events-auto">
          <div className="bg-surface backdrop-blur-md border border-surfaceBorder rounded-xl p-3 flex items-center gap-3 shadow-lg cursor-pointer hover:bg-white/5 transition-colors">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
            <span className="text-sm font-medium text-white">Conectado en tiempo real</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapArea;
