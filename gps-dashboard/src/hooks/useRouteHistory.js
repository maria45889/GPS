import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchDeviceRouteHistory, sanitizeRoute } from '../lib/queries'

export const useRouteHistory = (entity) => {
  const entityId = entity?.id
  const isVehicle = entity?._kind === 'vehicle'

  // Ruta embebida (vehículos con columna route o simulados con trayecto circular)
  const embedded = useMemo(() => {
    const raw = entity?.route
    if (!Array.isArray(raw) || raw.length < 2) return []
    return sanitizeRoute(raw)
  }, [entity?.route])

  const [telemetryRoute, setTelemetryRoute] = useState([])
  const [loading, setLoading] = useState(false)
  const fetchedIdRef = useRef(null)

  // Dispositivos sin ruta embebida o vehículos: pedir historial real de gps_locations.
  // Ojo: normalizeEntity expone el id del dispositivo como `deviceId` (camelCase), nunca
  // como `device_id`. Leer la columna cruda aquí dejaba `targetDeviceId` en undefined y
  // los vehículos sin_historial, en silencio.
  const targetDeviceId = isVehicle ? entity?.deviceId : entityId
  const wantsTelemetry = Boolean(targetDeviceId && embedded.length < 2)

  useEffect(() => {
    if (fetchedIdRef.current !== targetDeviceId) {
      setTelemetryRoute([])
      fetchedIdRef.current = targetDeviceId
    }

    if (!wantsTelemetry) return undefined

    let active = true
    setLoading(true)

    fetchDeviceRouteHistory(targetDeviceId, 250)
      .then((route) => {
        if (active) {
          setTelemetryRoute(route)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setTelemetryRoute([])
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [targetDeviceId, wantsTelemetry])

  const route = embedded.length >= 2 ? embedded : telemetryRoute

  return { route, loading, hasEmbeddedRoute: embedded.length >= 2 }
}