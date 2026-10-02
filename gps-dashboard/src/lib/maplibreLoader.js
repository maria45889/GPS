// MapLibre pesa ~800 kB. Se carga en un chunk aparte para que el shell del dashboard
// (login, cabecera, paneles) aparezca antes y sólo se descargue el motor WebGL al
// entrar al mapa.

import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

let cache = null;

export const loadMapLibre = () => {
  if (!cache) {
    cache = (async () => {
      await import('maplibre-gl/dist/maplibre-gl.css');
      const mlgl = await import('maplibre-gl');
      // MapLibre arma la URL del worker con `import.meta.url` en tiempo de ejecución,
      // así que el empaquetador no lo detecta: sin esto el worker da 404 y el mapa se
      // queda en blanco (el síntoma clásico del panel).
      mlgl.setWorkerUrl?.(maplibreWorkerUrl);
      return mlgl;
    })();
  }
  return cache;
};

export const MLGL = Symbol.for('gps.maplibre');

/** Clases de MapLibre ya cargadas, colgadas de la instancia del mapa. */
export const classesOf = (map) => map?.[MLGL];