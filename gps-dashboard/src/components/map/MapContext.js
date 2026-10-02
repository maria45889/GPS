import { createContext, useContext, useEffect, useRef } from 'react';

/**
 * Contexto propio para MapLibre. Sustituye a `useMap` de react-leaflet y expone la
 * instancia del mapa a las capas sin renderizar React por cada dato de telemetría.
 */
export const MapContext = createContext(null);

export const useMapLibre = () => useContext(MapContext);

/**
 * Ejecuta un callback imperativo sobre el mapa cuando está disponible.
 * Las capas se actualizan por efectos, no por render, para no bloque el hilo principal.
 */
export const useMapEffect = (callback, deps = []) => {
  const map = useMapLibre();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!map) return undefined;
    return callbackRef.current(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ...deps]);
};