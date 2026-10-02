// Estilos de mapa sin API key: OpenFreeMap (vectorial, esquema OpenMapTiles) y relieve
// público de AWS. Se reemplazó el mosaico raster de Esri porque sin suscripción Esri
// limita el tráfico y el panel se quedaba en blanco.

export const OFM_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
export const OFM_TILEJSON_URL = 'https://tiles.openfreemap.org/planet';
export const OFM_DEM_TILES = 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png';
export const ESRI_IMAGERY_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export const ATTRIBUTION_OSM =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &middot; &copy; OpenFreeMap';
export const ATTRIBUTION_ESRI =
  '&copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>';

export const MAP_LAYERS = {
  light: {
    id: 'light',
    label: 'Claro',
    sky: {
      'sky-color': '#a9cdf0',
      'horizon-color': '#ffffff',
      'fog-color': '#ffffff',
      'fog-ground-blend': 0.65,
      'horizon-fog-blend': 0.55,
      'sky-horizon-blend': 0.6,
    },
  },
  dark: {
    id: 'dark',
    label: 'Oscuro',
    sky: {
      'sky-color': '#070c16',
      'horizon-color': '#0d1728',
      'fog-color': '#070c16',
      'fog-ground-blend': 0.7,
      'horizon-fog-blend': 0.6,
      'sky-horizon-blend': 0.7,
    },
  },
  satellite: {
    id: 'satellite',
    label: 'Satélite',
    sky: {
      'sky-color': '#7ea9d4',
      'horizon-color': '#e3edf5',
      'fog-color': '#e3edf5',
      'fog-ground-blend': 0.7,
      'horizon-fog-blend': 0.6,
      'sky-horizon-blend': 0.6,
    },
  },
};

export const DEFAULT_MAP_LAYER = 'light';

export const DEM_SOURCE_ID = 'gps-terrain-dem';
export const SATELLITE_SOURCE_ID = 'gps-satellite';
export const SATELLITE_LAYER_ID = 'gps-satellite-base';
export const BUILDING_LAYER_ID = 'gps-buildings-3d';

// Capas del estilo base que se apagan en oscuro para que el agua no quede gris claro.
const DARK_HIDDEN_SOURCES = new Set(['landcover', 'landuse', 'aeroway', 'water', 'waterway']);
const COLOR_PAINT_KEYS = ['fill-color', 'line-color', 'text-color', 'background-color', 'fill-extrusion-color'];

const toHex = (value) => {
  if (typeof value !== 'string' || !value.startsWith('#')) return null;
  if (value.length === 4) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return value.length >= 7 ? value.slice(0, 7) : null;
};

const invertHex = (value) => {
  const hex = toHex(value);
  if (!hex) return null;
  const num = parseInt(hex.slice(1), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum < 0.08) return null;
  const mix = (channel) => Math.round(255 - channel * 0.84);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};

const addTerrain = (map) => {
  if (map.getSource(DEM_SOURCE_ID)) return;
  map.addSource(DEM_SOURCE_ID, {
    type: 'raster-dem',
    tiles: [OFM_DEM_TILES],
    encoding: 'terrarium',
    tileSize: 256,
    maxzoom: 13,
    attribution: 'Relieve: AWS Terrain Tiles',
  });
};

const addBuildings3D = (map) => {
  if (map.getLayer(BUILDING_LAYER_ID)) return;
  addTerrain(map);
  map.addLayer({
    id: BUILDING_LAYER_ID,
    type: 'fill-extrusion',
    source: 'openmaptiles',
    'source-layer': 'building',
    minzoom: 13.5,
    filter: ['!=', ['get', 'hide_3d'], 'true'],
    paint: {
      'fill-extrusion-color': '#d5dbe2',
      'fill-extrusion-height': ['max', ['coalesce', ['to-number', ['get', 'render_height'], 0], 0], 4],
      'fill-extrusion-base': ['coalesce', ['to-number', ['get', 'render_min_height'], 0], 0],
      'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 15, 0.55, 17, 0.8],
    },
  });
};

const addSatellite = (map) => {
  if (map.getSource(SATELLITE_SOURCE_ID)) return;
  map.addSource(SATELLITE_SOURCE_ID, {
    type: 'raster',
    tiles: [ESRI_IMAGERY_TILES],
    tileSize: 256,
    maxzoom: 19,
    attribution: ATTRIBUTION_ESRI,
  });
  // Va debajo de las etiquetas para que los nombres de calles sigan legibles.
  const firstLabel = (map.getStyle()?.layers || []).find((l) => l.type === 'symbol' || l.type === 'line');
  map.addLayer(
    {
      id: SATELLITE_LAYER_ID,
      type: 'raster',
      source: SATELLITE_SOURCE_ID,
      paint: {
        'raster-saturation': -0.2,
        'raster-contrast': 0.08,
        'raster-brightness-min': 0.02,
        'raster-brightness-max': 0.95,
      },
    },
    firstLabel?.id,
  );
};

// `setSky` rechaza propiedades que esta versión de MapLibre no conoce y emite un error
// por cada llamada, así que filtramos el cielo antes de aplicarlo.
const SKY_SUPPORTED = new Set([
  'sky-color',
  'sky-horizon-blend',
  'horizon-color',
  'horizon-fog-blend',
  'fog-color',
  'fog-ground-blend',
  'atmosphere-blend',
]);

const setSkyVariant = (map, baseLayer, isDark) => {
  if (typeof map.setSky !== 'function') return;
  const sky = MAP_LAYERS[baseLayer]?.sky || MAP_LAYERS.light.sky;
  const spec = Object.fromEntries(Object.entries({ ...sky, 'atmosphere-blend': isDark ? 0 : 0.8 }).filter(([key]) => SKY_SUPPORTED.has(key)));
  map.setSky(spec);
};

/**
 * Deja el mapa listo tras cargar el estilo base: relieve, edificios 3D, imagen satelital
 * y variante clara/oscura. No recrea el mapa, así que cambiar de capa no vuelve a "colgar".
 */
export const enhanceMapStyle = (map, options = {}) => {
  if (!map || typeof map.addLayer !== 'function') return;
  const { baseLayer = DEFAULT_MAP_LAYER, is3D = true } = options;

  if (is3D) {
    addTerrain(map);
    addBuildings3D(map);
  }

  applyLayerVariant(map, baseLayer, is3D);
};

/**
 * Pinta la variante clara/oscura reusando el mismo estilo vectorial. Guarda los colores
 * originales una sola vez para poder restaurarlos sin volver a descargar el estilo.
 * Acepta `applyLayerVariant(map, 'dark', true)` o `applyLayerVariant(map, { baseLayer, is3D })`.
 */
export const applyLayerVariant = (map, baseLayer, is3D = true) => {
  if (!map || typeof map.getStyle !== 'function') return;
  const options = typeof baseLayer === 'object' && baseLayer !== null ? baseLayer : { baseLayer, is3D };
  const variant = options.baseLayer ?? DEFAULT_MAP_LAYER;
  const wants3D = options.is3D ?? is3D ?? true;
  const style = map.getStyle?.();
  if (!style) return;

  const isDark = variant === 'dark';
  const original = map.__gpsOriginalPaint || (map.__gpsOriginalPaint = new Map());

  (style.layers || []).forEach((layer) => {
    if (!layer?.id || layer.id === 'background' || layer.id === BUILDING_LAYER_ID) return;
    if (!map.getLayer(layer.id)) return;

    COLOR_PAINT_KEYS.forEach((key) => {
      const current = layer.paint?.[key];
      const hex = toHex(current);
      if (!hex) return;
      const cacheKey = `${layer.id}::${key}`;
      if (!original.has(cacheKey)) original.set(cacheKey, hex);
      const base = original.get(cacheKey);
      const next = isDark ? (invertHex(base) || base) : base;
      if (next !== current) map.setPaintProperty(layer.id, key, next);
    });

    if (DARK_HIDDEN_SOURCES.has(layer['source-layer'])) {
      map.setLayoutProperty(layer.id, 'visibility', isDark ? 'none' : 'visible');
    }
  });

  if (map.getLayer('background')) {
    map.setPaintProperty('background', 'background-color', isDark ? '#080d16' : '#f7f8f7');
  }

  if (map.getLayer(BUILDING_LAYER_ID)) {
    map.setLayoutProperty(BUILDING_LAYER_ID, 'visibility', wants3D ? 'visible' : 'none');
    map.setPaintProperty(BUILDING_LAYER_ID, 'fill-extrusion-color', isDark ? '#1d2a3d' : '#d5dbe2');
  }

  const wantsSatellite = variant === 'satellite';
  if (wantsSatellite && !map.getSource(SATELLITE_SOURCE_ID)) addSatellite(map);
  if (!wantsSatellite && map.getLayer(SATELLITE_LAYER_ID)) {
    map.removeLayer(SATELLITE_LAYER_ID);
    if (map.getSource(SATELLITE_SOURCE_ID)) map.removeSource(SATELLITE_SOURCE_ID);
  }
  if (map.getLayer(SATELLITE_LAYER_ID)) map.setLayoutProperty(SATELLITE_LAYER_ID, 'visibility', 'visible');

  setSkyVariant(map, variant, isDark);

  if (typeof map.setTerrain === 'function') {
    if (wants3D && !map.getSource(DEM_SOURCE_ID)) addTerrain(map);
    map.setTerrain(wants3D ? { source: DEM_SOURCE_ID, exaggeration: 1 } : null);
  }

  // Mejora contraste de etiquetas
  map.getStyle?.()?.layers?.forEach((layer) => {
    if (layer.type === 'symbol' && /label|name|place|road|highway|text/i.test(layer.id)) {
      const isDark = variant === 'dark' || baseLayer === 'dark';
      try {
        map.setPaintProperty(layer.id, 'text-halo-color', isDark ? '#0b1221' : '#ffffff');
        map.setPaintProperty(layer.id, 'text-halo-width', 1.25);
        map.setPaintProperty(layer.id, 'text-halo-blur', 0.25);
      } catch {}
    }
  });
};
