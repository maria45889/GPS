import { useEffect, useRef, useState } from 'react'
import { fetchLatestLocations, fetchVehicles, isCoordinateValid, isLocationValidForMap, sanitizeAccuracy } from '../lib/queries'
import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { deviceStatusFromLastSeen } from '../lib/mapLogic'

export const useVehicles = () => {
  const [vehicles, setVehicles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [isStale, setIsStale] = useState(false)
  const reqSeqRef = useRef(0)
  const isFetchingRef = useRef(false)
  const pendingRefetchRef = useRef(false)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  useEffect(() => {
    let cancelled = false
    let debounceTimer = null

    const loadVehicles = async () => {
      if (isFetchingRef.current) {
        pendingRefetchRef.current = true
        return
      }
      isFetchingRef.current = true
      const currentSeq = ++reqSeqRef.current
      setIsLoading(true)
      try {
        const data = await fetchVehicles()
        const liveLocations = await fetchLatestLocations()
        const liveByDevice = new Map(liveLocations.map((item) => [item.device_id, item]))

        const merged = data.map((vehicle) => {
          const deviceKey = vehicle.deviceId || vehicle.id
          const live = liveByDevice.get(deviceKey)
          if (!live) return vehicle
          const connectionStatus = deviceStatusFromLastSeen(live.timestamp)
          const isLiveValid = isLocationValidForMap(live.timestamp, 90000, live.latitude, live.longitude)
          const cleanCoords = isCoordinateValid(live.latitude, live.longitude) ? [Number(live.latitude), Number(live.longitude)] : null
          return {
            ...vehicle,
            position: isLiveValid ? cleanCoords : null,
            historicalPosition: cleanCoords || vehicle.position,
            speed: isLiveValid ? (live.speed || 0) : 0,
            bearing: live.bearing || 0,
            accuracy: sanitizeAccuracy(live.accuracy),
            connectionStatus,
            status: connectionStatus === 'offline'
              ? 'offline'
              : (vehicle.status === 'immobilized' ? 'immobilized' : (vehicle.status || connectionStatus)),
            lastUpdate: connectionStatus === 'active'
              ? 'En línea'
              : live.timestamp,
          }
        })

        if (!cancelled && currentSeq === reqSeqRef.current) {
          setVehicles(merged)
          setError(null)
          setLastSyncTime(Date.now())
          setIsStale(false)
        }
      } catch (err) {
        if (!cancelled && currentSeq === reqSeqRef.current) {
          setError(err.message || 'Error al cargar vehículos')
          setIsStale(true)
          // Conservar la lista previa de vehículos en caídas temporales de red
        }
      } finally {
        if (!cancelled && currentSeq === reqSeqRef.current) {
          setIsLoading(false)
        }
        isFetchingRef.current = false
        if (pendingRefetchRef.current && !cancelled) {
          pendingRefetchRef.current = false
          loadVehicles()
        }
      }
    }

    const debouncedLoad = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (!cancelled) loadVehicles()
      }, 500)
    }

    loadVehicles()

    // Polling periódico cada 30 segundos como salvaguarda ante caída de Realtime o suspensión móvil
    const pollInterval = setInterval(() => {
      if (!cancelled) loadVehicles()
    }, 30000)

    // Re-sincronizar al volver a la pestaña o reactivar la app en móvil
    const handleFocusOrVisibility = () => {
      if (!cancelled && document.visibilityState !== 'hidden') {
        loadVehicles()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocusOrVisibility)
      document.addEventListener('visibilitychange', handleFocusOrVisibility)
    }

    let channel = null
    if (hasSupabaseConfig && supabase) {
      channel = supabase
        .channel('gps-dashboard-vehicles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'gps_locations' }, debouncedLoad)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, debouncedLoad)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, debouncedLoad)
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            if (!cancelled) loadVehicles()
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            debouncedLoad()
          }
        })
    }

    return () => {
      cancelled = true
      if (debounceTimer) clearTimeout(debounceTimer)
      clearInterval(pollInterval)
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocusOrVisibility)
        document.removeEventListener('visibilitychange', handleFocusOrVisibility)
      }
      if (channel && supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [refetchTrigger])

  const refetchVehicles = () => setRefetchTrigger(t => t + 1)

  return { vehicles, isLoading, error, lastSyncTime, isStale, refetchVehicles }
}