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

  // Dispositivos sin ruta embebida: pedir historial real de gps_locations
  const wantsTelemetry = Boolean(entityId && !isVehicle && embedded.length < 2)

  useEffect(() => {
    if (!wantsTelemetry || fetchedIdRef.current === entityId) return undefined
    fetchedIdRef.current = entityId

    let active = true
    setLoading(true)

    fetchDeviceRouteHistory(entityId, 250)
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
  }, [entityId, wantsTelemetry])

  const route = embedded.length >= 2 ? embedded : telemetryRoute

  return { route, loading, hasEmbeddedRoute: embedded.length >= 2 }
}