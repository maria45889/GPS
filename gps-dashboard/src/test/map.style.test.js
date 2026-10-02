import { beforeEach, describe, expect, it, vi } from 'vitest';

const createFakeMap = () => {
  const sources = new Map();
  // El estilo base de OpenFreeMap siempre trae una capa `background`.
  const layers = [{ id: 'background', type: 'background', paint: { 'background-color': '#f7f8f7' } }];
  return {
    sources,
    layers,
    getStyle: vi.fn(() => ({ layers: [...layers] })),
    getSource: vi.fn((id) => sources.get(id)),
    getLayer: vi.fn((id) => layers.find((l) => l.id === id)),
    addSource: vi.fn((id, spec) => sources.set(id, spec)),
    removeSource: vi.fn((id) => sources.delete(id)),
    addLayer: vi.fn((layer) => layers.push(layer)),
    removeLayer: vi.fn((id) => {
      const idx = layers.findIndex((l) => l.id === id);
      if (idx >= 0) layers.splice(idx, 1);
    }),
    setPaintProperty: vi.fn(),
    setLayoutProperty: vi.fn(),
    setSky: vi.fn(),
    setTerrain: vi.fn(),
  };
};

let maplibreLoader;

describe('mapStyle', () => {
  let mapStyle;

  beforeEach(async () => {
    vi.resetModules();
    mapStyle = await import('../lib/mapStyle');
  });

  it('prepara relieve, edificios 3D y terreno al cargar el estilo', () => {
    const map = createFakeMap();
    mapStyle.enhanceMapStyle(map, { baseLayer: 'light', is3D: true });

    expect(map.getLayer(mapStyle.BUILDING_LAYER_ID)).toBeTruthy();
    expect(map.getSource(mapStyle.DEM_SOURCE_ID)).toBeTruthy();
    expect(map.setTerrain).toHaveBeenCalledWith(expect.objectContaining({ source: mapStyle.DEM_SOURCE_ID }));
  });

  it('usa sólo propiedades de cielo soportadas por la versión instalada', () => {
    const map = createFakeMap();
    mapStyle.enhanceMapStyle(map, { baseLayer: 'dark', is3D: true });

    const spec = map.setSky.mock.calls[0][0];
    expect(Object.keys(spec)).not.toContain('sky-atmosphere-sun-intensity');
    expect(spec['sky-color']).toBeTruthy();
  });

  it('acepta la variante como argumento posicional o como objeto', () => {
    const map = createFakeMap();
    mapStyle.enhanceMapStyle(map, { baseLayer: 'light', is3D: true });

    mapStyle.applyLayerVariant(map, 'dark', true);
    expect(map.setPaintProperty).toHaveBeenCalledWith('background', 'background-color', '#080d16');

    map.setPaintProperty.mockClear();
    mapStyle.applyLayerVariant(map, { baseLayer: 'light', is3D: true });
    expect(map.setPaintProperty).toHaveBeenCalledWith('background', 'background-color', '#f7f8f7');
  });

  it('inserta el satélite debajo de las etiquetas y lo quita al volver a claro', () => {
    const map = createFakeMap();
    mapStyle.enhanceMapStyle(map, { baseLayer: 'light', is3D: true });
    map.layers.push({ id: 'highway-name', type: 'symbol' });

    mapStyle.applyLayerVariant(map, 'satellite', true);
    expect(map.getLayer(mapStyle.SATELLITE_LAYER_ID)).toBeTruthy();

    mapStyle.applyLayerVariant(map, 'light', true);
    expect(map.getLayer(mapStyle.SATELLITE_LAYER_ID)).toBeFalsy();
    expect(map.getSource(mapStyle.SATELLITE_SOURCE_ID)).toBeFalsy();
  });

  it('apaga relieve y extrusión al pasar a 2D', () => {
    const map = createFakeMap();
    mapStyle.enhanceMapStyle(map, { baseLayer: 'light', is3D: true });
    mapStyle.applyLayerVariant(map, 'light', false);

    expect(map.setTerrain).toHaveBeenLastCalledWith(null);
    expect(map.setLayoutProperty).toHaveBeenCalledWith(mapStyle.BUILDING_LAYER_ID, 'visibility', 'none');
  });
});

describe('maplibreLoader', () => {
  it('registra una URL de worker empaquetada, no la ruta que arma MapLibre en runtime', async () => {
    const setWorkerUrl = vi.fn();
    vi.doMock('maplibre-gl', () => ({ setWorkerUrl }));
    vi.resetModules();

    maplibreLoader = await import('../lib/maplibreLoader');
    const mlgl = await maplibreLoader.loadMapLibre();

    expect(setWorkerUrl).toHaveBeenCalledTimes(1);
    const [workerUrl] = setWorkerUrl.mock.calls[0];
    expect(typeof workerUrl).toBe('string');
    expect(workerUrl).toMatch(/worker/i);
    expect(mlgl).toBeTruthy();
  });

  it('reutiliza la instancia cargada sin volver a importar el motor', async () => {
    const setWorkerUrl = vi.fn();
    vi.doMock('maplibre-gl', () => ({ setWorkerUrl }));
    vi.resetModules();

    maplibreLoader = await import('../lib/maplibreLoader');
    const [first, second] = await Promise.all([
      maplibreLoader.loadMapLibre(),
      maplibreLoader.loadMapLibre(),
    ]);

    expect(first).toBe(second);
    expect(setWorkerUrl).toHaveBeenCalledTimes(1);
  });
});