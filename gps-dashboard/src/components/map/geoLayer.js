import { EMPTY_GEOJSON } from '../../lib/mapGeo';

// Un solo `setData` por frame como máximo: con telemetría llegando cada pocos segundos por
// dispositivo, las actualizaciones por evento saturaban el hilo principal y el mapa se trababa.

const pending = new WeakMap();

export const scheduleGeoJsonUpdate = (map, sourceId, data) => {
  if (!map || !sourceId) return;
  let state = pending.get(map);
  if (!state) {
    state = { frames: new Map(), queued: false };
    pending.set(map, state);
  }
  state.frames.set(sourceId, data || EMPTY_GEOJSON);
  if (state.queued) return;

  state.queued = true;
  const flush = () => {
    state.queued = false;
    state.frames.forEach((value, id) => {
      const source = map.getSource?.(id);
      if (source?.setData) source.setData(value);
    });
    state.frames.clear();
  };

  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(flush);
  else setTimeout(flush, 16);
};

export const ensureGeoJsonSource = (map, sourceId) => {
  if (!map || map.getSource(sourceId)) return false;
  if (!map.isStyleLoaded?.()) return false;
  map.addSource(sourceId, { type: 'geojson', data: EMPTY_GEOJSON });
  return true;
};

export const ensureLayer = (map, spec, beforeId) => {
  if (!map || !spec?.id) return false;
  if (map.getLayer(spec.id)) return false;
  if (spec.source && !map.getSource(spec.source)) return false;
  map.addLayer(spec, beforeId);
  return true;
};

export const removeLayerIfPresent = (map, layerId) => {
  if (map?.getLayer?.(layerId)) map.removeLayer(layerId);
};