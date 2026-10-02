import { useEffect, useRef, useState } from 'react';
import { DEFAULT_MAP_LAYER, OFM_STYLE_URL, applyLayerVariant, enhanceMapStyle } from '../../lib/mapStyle';
import { MLGL, loadMapLibre } from '../../lib/maplibreLoader';
import { MapContext } from './MapContext';

const HOVER_THROTTLE_MS = 40;

/**
 * Dueño de la instancia de MapLibre. El mapa se crea una sola vez y la variante de capa
 * se repinta en caliente: recrear el estilo en cada cambio era lo que dejaba el panel en
 * blanco y lo que reiniciaba el watcher de posición.
 */
const MapCanvas = ({
  center,
  zoom = 15,
  is3D = true,
  baseLayer = DEFAULT_MAP_LAYER,
  onMapClick,
  onMapHover,
  isPlacingOnMap = false,
  onReady,
  onTileFailure,
  children,
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [ready, setReady] = useState(false);
  const handlersRef = useRef({ onMapClick, onMapHover, isPlacingOnMap });

  handlersRef.current = { onMapClick, onMapHover, isPlacingOnMap };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return undefined;

    let disposed = false;
    let maplibreMap = null;
    let detach = () => {};

    loadMapLibre()
      .then((mlgl) => {
        if (disposed) return;

        try {
          maplibreMap = new mlgl.Map({
            container,
            style: OFM_STYLE_URL,
            center,
            zoom,
            pitch: is3D ? 52 : 0,
            bearing: is3D ? -12 : 0,
            maxPitch: 75,
            attributionControl: false,
            antialias: true,
            fadeDuration: 120,
            // Descarga antes los mosaicos del área donde está la flota.
            prefetchZoomDelta: is3D ? 4 : 3,
            maxParallelImageRequests: 12,
            trackResize: false,
            dragRotate: true,
            touchPitch: true,
          });
        } catch {
          onTileFailure?.('WebGL no disponible en este navegador o dispositivo');
          return;
        }

        maplibreMap[MLGL] = mlgl;
        mapRef.current = maplibreMap;

        let failures = 0;
        const onError = (event) => {
          if (!event?.error) return;
          failures += 1;
          if (failures === 6) onTileFailure?.('El proveedor de mapas no responde');
        };

        let lastHover = 0;
        const onClick = (event) => {
          const { onMapClick: handleClick, isPlacingOnMap: placing } = handlersRef.current;
          if (!placing || !handleClick) return;
          handleClick([event.lngLat.lat, event.lngLat.lng]);
        };
        const onMove = (event) => {
          const { onMapHover: handleHover, isPlacingOnMap: placing } = handlersRef.current;
          if (!placing || !handleHover) return;
          const now = Date.now();
          if (now - lastHover < HOVER_THROTTLE_MS) return;
          lastHover = now;
          handleHover([event.lngLat.lat, event.lngLat.lng]);
        };

        maplibreMap.on('error', onError);
        maplibreMap.on('click', onClick);
        maplibreMap.on('mousemove', onMove);
        maplibreMap.on('style.load', () => {
          enhanceMapStyle(maplibreMap, { baseLayer, is3D });
          onReady?.(maplibreMap);
          try {
            maplibreMap.resize();
          } catch {
            /* resize no crítico */
          }
          // Las capas sólo se montan con el estilo listo: `addSource`/`setPaintProperty`
          // lanzan "Style is not done loading" si corren antes.
          setMap(maplibreMap);
          setReady(true);
        });

        detach = () => {
          maplibreMap.off('error', onError);
          maplibreMap.off('click', onClick);
          maplibreMap.off('mousemove', onMove);
        };
      })
      .catch(() => {
        if (!disposed) onTileFailure?.('No se pudo cargar el motor del mapa');
      });

    return () => {
      disposed = true;
      detach();
      maplibreMap?.remove();
      mapRef.current = null;
      setMap(null);
      setReady(false);
    };
    // La instancia se crea una vez: el centro y la cámara se mueven después con los
    // controladores, no reconstruyendo el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Variante clara/oscura/satélite sin recargar el estilo base.
  useEffect(() => {
    if (!ready || !map) return;
    applyLayerVariant(map, baseLayer, is3D);
  }, [ready, map, baseLayer, is3D]);

  // 3D vs 2D: el ángulo de cámara acompaña al estado para que el mapa siempre sea legible.
  useEffect(() => {
    if (!ready || !map) return;
    const targetPitch = is3D ? 52 : 0;
    const targetBearing = is3D ? -12 : 0;
    if (Math.abs(map.getPitch() - targetPitch) < 0.5 && Math.abs((map.getBearing?.() ?? 0) - targetBearing) < 0.5) return;
    map.easeTo({ pitch: targetPitch, bearing: targetBearing, duration: 650 });
  }, [ready, map, is3D]);

  // El contenedor cambia de tamaño con los paneles laterales: sin esto el canvas queda
  // estirado o con franjas grises.
  useEffect(() => {
    const container = containerRef.current;
    const mapInstance = mapRef.current;
    if (!container || !mapInstance) return undefined;

    let frame = null;
    let lastWidth = 0;
    let lastHeight = 0;
    const observer = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        try {
          mapInstance.resize();
        } catch {
          /* resize no crítico */
        }
      });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [map]);

  return (
    <MapContext.Provider value={map}>
      <div className="gps-map-shell absolute inset-0">
        <div ref={containerRef} className="gps-map-canvas" />
      </div>
      {map ? children : <div className="gps-map-loading">Cargando mapa…</div>}
    </MapContext.Provider>
  );
};

export default MapCanvas;