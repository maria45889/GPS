import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, radius, spacing } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export interface Device {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  color?: string;
  battery?: number;
  speed?: number;
}

export interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  color?: string;
}

interface MapViewProps {
  latitude: number;
  longitude: number;
  locations?: Array<{ latitude: number; longitude: number }>;
  height?: number;
  devices?: Device[];
  geofences?: Geofence[];
  mapStyle?: 'dark' | 'light' | 'satellite' | 'hybrid';
  showTraffic?: boolean;
  showWeather?: boolean;
  onDevicePress?: (device: Device) => void;
}

function generateBaseMapHTML(): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>
  * { margin: 0; padding: 0; }
  body { background: #0a0a1a; }
  #map { width: 100vw; height: 100vh; }
  
  .marker-container { position: relative; width: 40px; height: 40px; }
  .marker-pulse { width: 40px; height: 40px; background: rgba(78,204,163,0.4); border-radius: 50%; position: absolute; animation: pulse-ring 2s ease-out infinite; }
  .marker-inner { width: 24px; height: 24px; background: #4ecca3; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.3); position: absolute; top: 8px; left: 8px; }
  .marker-icon { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #fff; font-size: 12px; }
  .marker-label { position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; white-space: nowrap; }
  
  @keyframes pulse-ring { 0% { transform: scale(0.5); opacity: 0.8; } 100% { transform: scale(2); opacity: 0; } }
  
  .style-selector { position: absolute; top: 10px; left: 10px; z-index: 1000; background: rgba(18,18,42,0.9); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 5px; display: flex; gap: 5px; }
  .style-btn { padding: 6px 12px; background: transparent; border: none; color: #fff; border-radius: 4px; cursor: pointer; font-size: 11px; }
  .style-btn.active { background: #4ecca3; }
  
  .map-controls { position: absolute; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; gap: 5px; }
  .control-btn { width: 36px; height: 36px; background: rgba(18,18,42,0.9); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; }
  
  .info-panel { position: absolute; bottom: 20px; left: 10px; right: 10px; background: rgba(18,18,42,0.95); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; padding: 15px; z-index: 1000; display: none; }
  .info-panel.visible { display: block; }
  .info-title { color: #4ecca3; font-weight: bold; margin-bottom: 8px; }
  .info-row { display: flex; justify-content: space-between; color: #fff; font-size: 12px; margin-bottom: 4px; }
</style>
</head>
<body>
<div id="map"></div>

<div class="style-selector">
  <button class="style-btn active" data-style="dark" onclick="changeStyle('dark')">Oscuro</button>
  <button class="style-btn" data-style="light" onclick="changeStyle('light')">Claro</button>
  <button class="style-btn" data-style="satellite" onclick="changeStyle('satellite')">Satélite</button>
</div>

<div class="map-controls">
  <button class="control-btn" onclick="zoomIn()">+</button>
  <button class="control-btn" onclick="zoomOut()">-</button>
  <button class="control-btn" onclick="centerMap()">⌖</button>
</div>

<div class="info-panel" id="infoPanel">
  <div class="info-title" id="infoTitle">Dispositivo</div>
  <div class="info-row"><span>Velocidad:</span><span id="infoSpeed">--</span></div>
  <div class="info-row"><span>Batería:</span><span id="infoBattery">--</span></div>
  <div class="info-row"><span>Coordenadas:</span><span id="infoCoords">--</span></div>
</div>

<script>
  var map = null;
  var markers = {};
  var trailSourceAdded = false;
  var pendingUpdate = null;
  var currentStyle = 'dark';
  var geofenceLayers = [];

  const mapStyles = {
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    satellite: 'https://basemaps.cartocdn.com/gl/rastertiles/voyager_gl-style/style.json'
  };

  function changeStyle(style) {
    currentStyle = style;
    map.setStyle(mapStyles[style]);
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.style === style);
    });
  }

  function zoomIn() { map.zoomIn(); }
  function zoomOut() { map.zoomOut(); }
  function centerMap() { 
    if (pendingUpdate) {
      map.flyTo({ center: [pendingUpdate.lng, pendingUpdate.lat], zoom: 16, duration: 1000 });
    }
  }

  function createMarker(device) {
    const el = document.createElement('div');
    el.className = 'marker-container';
    const color = device.color || '#4ecca3';
    el.innerHTML = 
      '<div class="marker-pulse" style="background: ' + color + '40"></div>' +
      '<div class="marker-inner" style="background: ' + color + '">' +
      '<span class="marker-icon">📍</span>' +
      '</div>' +
      '<div class="marker-label">' + (device.name || 'Dispositivo') + '</div>';
    
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([device.longitude, device.latitude])
      .addTo(map);
    
    el.addEventListener('click', () => showDeviceInfo(device));
    return marker;
  }

  function showDeviceInfo(device) {
    const panel = document.getElementById('infoPanel');
    document.getElementById('infoTitle').textContent = device.name || 'Dispositivo';
    document.getElementById('infoSpeed').textContent = device.speed ? (device.speed * 3.6).toFixed(1) + ' km/h' : '--';
    document.getElementById('infoBattery').textContent = device.battery ? device.battery + '%' : '--';
    document.getElementById('infoCoords').textContent = device.latitude.toFixed(4) + ', ' + device.longitude.toFixed(4);
    panel.classList.add('visible');
    
    setTimeout(() => panel.classList.remove('visible'), 5000);
  }

  function addGeofence(geofence) {
    const id = 'geofence-' + geofence.id;
    if (map.getSource(id)) return;
    
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: { name: geofence.name },
        geometry: {
          type: 'Point',
          coordinates: [geofence.longitude, geofence.latitude]
        }
      }
    });
    
    map.addLayer({
      id: id + '-circle',
      type: 'circle',
      source: id,
      paint: {
        'circle-radius': geofence.radius / 1000,
        'circle-color': geofence.color || '#ff6b6b',
        'circle-opacity': 0.2,
        'circle-stroke-width': 2,
        'circle-stroke-color': geofence.color || '#ff6b6b'
      }
    });
    
    geofenceLayers.push(id);
  }

  function doUpdate(data) {
    if (!map || !map.loaded()) { pendingUpdate = data; return; }
    
    if (!markers['main']) {
      markers['main'] = createMarker({
        id: 'main',
        name: 'Mi Ubicación',
        latitude: data.lat,
        longitude: data.lng,
        color: '#4ecca3'
      });
    } else {
      markers['main'].setLngLat([data.lng, data.lat]);
    }
    
    if (data.devices) {
      data.devices.forEach(device => {
        if (!markers[device.id]) {
          markers[device.id] = createMarker(device);
        } else {
          markers[device.id].setLngLat([device.longitude, device.latitude]);
        }
      });
    }
    
    if (data.geofences) {
      data.geofences.forEach(addGeofence);
    }
    
    if (data.trail && data.trail.length > 1) {
      const coords = data.trail.map(p => [p.lng, p.lat]);
      if (!trailSourceAdded) {
        map.addSource('trail', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }
        });
        
        map.addLayer({ 
          id: 'trail-glow', 
          type: 'line', 
          source: 'trail',
          paint: { 
            'line-color': '#4ecca3', 
            'line-width': 12, 
            'line-blur': 8, 
            'line-opacity': 0.4 
          } 
        });
        
        map.addLayer({ 
          id: 'trail', 
          type: 'line', 
          source: 'trail',
          paint: { 
            'line-color': '#4ecca3', 
            'line-width': 4, 
            'line-opacity': 0.9
          } 
        });
        
        trailSourceAdded = true;
      } else {
        map.getSource('trail').setData({
          type: 'Feature', 
          properties: {}, 
          geometry: { type: 'LineString', coordinates: coords }
        });
      }
    }
    
    map.flyTo({ center: [data.lng, data.lat], zoom: 15, duration: 1000 });
  }

  map = new maplibregl.Map({
    container: 'map',
    style: mapStyles[currentStyle],
    center: [-78.512, -0.22],
    zoom: 15,
    attributionControl: false
  });
  
  map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: false }));
  
  map.on('load', function() {
    if (pendingUpdate) { doUpdate(pendingUpdate); pendingUpdate = null; }
  });

  document.addEventListener('message', function(e) {
    try {
      var data = JSON.parse(e.data);
      if (data.type === 'update') doUpdate(data);
      if (data.type === 'changeStyle') changeStyle(data.style);
    } catch(ex) {}
  });
</script>
</body>
</html>`;
}

export default function MapView({ 
  latitude, 
  longitude, 
  locations, 
  height, 
  devices, 
  geofences, 
  mapStyle = 'dark',
  showTraffic = false,
  showWeather = false,
  onDevicePress 
}: MapViewProps) {
  const webRef = useRef<WebView>(null);
  const html = useMemo(() => generateBaseMapHTML(), []);
  const dataRef = useRef({ latitude, longitude, locations, devices, geofences, mapStyle });
  dataRef.current = { latitude, longitude, locations, devices, geofences, mapStyle };

  const sendUpdate = useCallback(() => {
    const d = dataRef.current;
    const trail = d.locations && d.locations.length > 1
      ? d.locations.map(l => ({ lat: l.latitude, lng: l.longitude }))
      : null;
    try { 
      webRef.current?.postMessage(JSON.stringify({ 
        type: 'update', 
        lat: d.latitude, 
        lng: d.longitude, 
        trail,
        devices: d.devices || [],
        geofences: d.geofences || []
      })); 
    } catch {}
  }, []);

  const changeMapStyle = useCallback((style: string) => {
    try {
      webRef.current?.postMessage(JSON.stringify({ type: 'changeStyle', style }));
    } catch {}
  }, []);

  useEffect(() => { sendUpdate(); }, [latitude, longitude, locations, devices, geofences, sendUpdate]);
  useEffect(() => { changeMapStyle(mapStyle); }, [mapStyle, changeMapStyle]);

  return (
    <View style={[styles.container, height ? { height } : undefined]}>
      <WebView
        ref={webRef}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        onLoad={sendUpdate}
        cacheEnabled={true}
        androidLayerType="hardware"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: radius.lg, overflow: 'hidden' },
  webview: { backgroundColor: colors.bg, flex: 1 },
  styleSelector: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xs,
    zIndex: 10,
  },
  styleButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.bgInput,
  },
  styleButtonActive: {
    backgroundColor: colors.primary,
  },
  styleButtonText: {
    fontSize: 10,
    color: colors.text,
    fontWeight: '600',
  },
});
