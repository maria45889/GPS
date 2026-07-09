import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function MapView({ 
  latitude, 
  longitude, 
  bearing, 
  path = [], 
  zoom = 14,
  showControls = true,
  onMapClick
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const markerElRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (mapRef.current) return; // already initialized

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [longitude || -78.5, latitude || -0.2],
      zoom: zoom,
      attributionControl: false
    });

    if (showControls) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    }

    map.on('click', (e) => {
      if (onMapClick) {
        onMapClick({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
      }
    });

    mapRef.current = map;

    // Add trail layers when style loaded
    map.on('load', () => {
      addTrailSourceAndLayers(map, path);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update center when lat/lng changes
  useEffect(() => {
    if (!mapRef.current || !latitude || !longitude) return;

    // Check if the marker is too far from current center to snap, otherwise slide smoothly
    const center = mapRef.current.getCenter();
    const distance = Math.sqrt(Math.pow(center.lat - latitude, 2) + Math.pow(center.lng - longitude, 2));

    if (distance > 0.05) {
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom: mapRef.current.getZoom(),
        duration: 1200
      });
    } else {
      mapRef.current.easeTo({
        center: [longitude, latitude],
        duration: 800
      });
    }
  }, [latitude, longitude]);

  // Update Marker
  useEffect(() => {
    if (!mapRef.current || !latitude || !longitude) return;

    if (!markerRef.current) {
      // Create HTML element for custom glowing marker
      const el = document.createElement('div');
      el.className = 'relative w-[50px] h-[50px] flex items-center justify-center select-none pointer-events-none';
      el.innerHTML = `
        <!-- Radar Pulse -->
        <div class="absolute inset-0 m-auto w-[40px] h-[40px] rounded-full bg-teal-400/35 radar-anim"></div>
        <!-- Inner Core -->
        <div class="relative z-10 w-4 h-4 rounded-full bg-teal-400 border-2 border-white shadow-[0_0_12px_#00f5d4] transition-all flex items-center justify-center">
          <div class="w-1 h-1 rounded-full bg-slate-900"></div>
        </div>
        <!-- Heading Indicator -->
        <div id="heading-indicator" class="absolute top-[2px] left-[50%] -translate-x-[50%] w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[9px] border-b-teal-400 drop-shadow-[0_0_4px_rgba(20,184,166,0.8)] opacity-0 transition-all duration-300"></div>
      `;

      markerElRef.current = el;

      const marker = new maplibregl.Marker({
        element: el,
        rotationAlignment: 'map'
      })
        .setLngLat([longitude, latitude])
        .addTo(mapRef.current);

      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat([longitude, latitude]);
    }

    // Apply bearing angle if present
    const headingEl = markerElRef.current?.querySelector('#heading-indicator');
    if (headingEl) {
      if (bearing != null && bearing !== undefined) {
        headingEl.style.opacity = '1';
        headingEl.style.transform = `translateX(-50%) rotate(${bearing}deg)`;
      } else {
        headingEl.style.opacity = '0';
      }
    }
  }, [latitude, longitude, bearing]);

  // Update Trail Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('trail');
    if (source) {
      const coords = path.map(p => [p.longitude, p.latitude]);
      const geojson = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coords
        }
      };
      source.setData(geojson);
    } else {
      addTrailSourceAndLayers(map, path);
    }
  }, [path]);

  const addTrailSourceAndLayers = (map, coordinates) => {
    if (map.getSource('trail')) return;

    const coords = coordinates.map(p => [p.longitude, p.latitude]);
    const geojson = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coords
      }
    };

    map.addSource('trail', {
      type: 'geojson',
      data: geojson,
      lineMetrics: true
    });

    // Outer glow under line
    map.addLayer({
      id: 'trail-glow',
      type: 'line',
      source: 'trail',
      paint: {
        'line-color': '#00f5d4',
        'line-width': 10,
        'line-blur': 6,
        'line-opacity': 0.2
      }
    });

    // Solid core line
    map.addLayer({
      id: 'trail-layer',
      type: 'line',
      source: 'trail',
      paint: {
        'line-gradient': [
          'interpolate', ['linear'], ['line-progress'],
          0, '#0f3460',
          1, '#00f5d4'
        ],
        'line-width': 3.5,
        'line-opacity': 0.85
      }
    });
  };

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="absolute inset-0 bg-[#080a14]" />
    </div>
  );
}
