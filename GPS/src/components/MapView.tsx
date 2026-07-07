import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, radius } from '../theme';

interface MapViewProps {
  latitude: number;
  longitude: number;
  locations?: Array<{ latitude: number; longitude: number }>;
  height?: number;
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
  .marker { width: 20px; height: 20px; background: #4ecca3; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 12px rgba(78,204,163,0.8); }
  .pulse { width: 40px; height: 40px; background: rgba(78,204,163,0.3); border-radius: 50%; position: absolute; top: -10px; left: -10px; animation: radar 2s ease-out infinite; }
  @keyframes radar { 0% { transform: scale(0.5); opacity: 0.8; } 100% { transform: scale(2); opacity: 0; } }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = null;
  var marker = null;
  var trailSourceAdded = false;
  var pendingUpdate = null;

  function doUpdate(data) {
    if (!map || !map.loaded()) { pendingUpdate = data; return; }
    if (!marker) {
      var el = document.createElement('div');
      el.innerHTML = '<div class="pulse"></div><div class="marker"></div>';
      marker = new maplibregl.Marker({ element: el.firstElementChild || el })
        .setLngLat([data.lng, data.lat])
        .addTo(map);
    } else {
      marker.setLngLat([data.lng, data.lat]);
    }
    map.flyTo({ center: [data.lng, data.lat], zoom: 15, duration: 1000 });

    if (data.trail && data.trail.length > 1) {
      var coords = data.trail.map(function(p) { return [p.lng, p.lat]; });
      if (!trailSourceAdded) {
        map.addSource('trail', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }
        });
        map.addLayer({ id: 'trail-glow', type: 'line', source: 'trail',
          paint: { 'line-color': '#4ecca3', 'line-width': 8, 'line-blur': 6, 'line-opacity': 0.3 } });
        map.addLayer({ id: 'trail', type: 'line', source: 'trail',
          paint: { 'line-color': '#4ecca3', 'line-width': 3, 'line-opacity': 0.9 } });
        trailSourceAdded = true;
      } else {
        map.getSource('trail').setData({
          type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords }
        });
      }
    }
  }

  map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center: [-78.512, -0.22],
    zoom: 15,
    attributionControl: false
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }));
  map.on('load', function() {
    if (pendingUpdate) { doUpdate(pendingUpdate); pendingUpdate = null; }
  });

  document.addEventListener('message', function(e) {
    try {
      var data = JSON.parse(e.data);
      if (data.type === 'update') doUpdate(data);
    } catch(ex) {}
  });
</script>
</body>
</html>`;
}

export default function MapView({ latitude, longitude, locations, height }: MapViewProps) {
  const webRef = useRef<WebView>(null);
  const html = useMemo(() => generateBaseMapHTML(), []);
  const dataRef = useRef({ latitude, longitude, locations });
  dataRef.current = { latitude, longitude, locations };

  const sendUpdate = useCallback(() => {
    const d = dataRef.current;
    const trail = d.locations && d.locations.length > 1
      ? d.locations.map(l => ({ lat: l.latitude, lng: l.longitude }))
      : null;
    try { webRef.current?.postMessage(JSON.stringify({ type: 'update', lat: d.latitude, lng: d.longitude, trail })); } catch {}
  }, []);

  useEffect(() => { sendUpdate(); }, [latitude, longitude, locations, sendUpdate]);

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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: radius.lg, overflow: 'hidden' },
  webview: { backgroundColor: colors.bg, flex: 1 },
});
