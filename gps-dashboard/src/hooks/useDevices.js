import { useEffect, useRef, useState } from 'react'
import { fetchDevices, fetchLatestLocations, transformDevice } from '../lib/queries'
import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { deviceStatusFromLastSeen } from '../lib/mapLogic'

const ephemeralDevice = (location) => ({
  id: location.device_id,
  status: deviceStatusFromLastSeen(location.timestamp),
  last_seen: location.timestamp,
  platform: null,
  model: null,
  app_version: null,
  battery: null,
  label: null,
})

export const useDevices = () => {
  const [devices, setDevices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const reqSeqRef = useRef(0)
  const isFetchingRef = useRef(false)
  const pendingRefetchRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let debounceTimer = null

    const loadDevices = async () => {
      if (isFetchingRef.current) {
        pendingRefetchRef.current = true
        return
      }
      isFetchingRef.current = true
      const currentSeq = ++reqSeqRef.current
      setIsLoading(true)
      try {
        const dbDevices = await fetchDevices()
        const liveLocations = await fetchLatestLocations()
        const liveByDevice = new Map(liveLocations.map((item) => [item.device_id, item]))

        const knownIds = new Set(dbDevices.map((device) => device.id))

        const ephemerals = liveLocations
          .filter((location) => !knownIds.has(location.device_id))
          .map(ephemeralDevice)

        const merged = [...dbDevices, ...ephemerals].map((dbDevice) => {
          const live = liveByDevice.get(dbDevice.id)
          const device = transformDevice(dbDevice, live)
          if (live) device.status = deviceStatusFromLastSeen(live.timestamp)
          return device
        })

        const result = merged.sort((a, b) => {
          const normalize = (value) => (value instanceof Date ? value.getTime() : Date.parse(value) || 0)
          return normalize(b.lastSeen) - normalize(a.lastSeen)
        })

        if (!cancelled && currentSeq === reqSeqRef.current) {
          setDevices(result)
          setError(null)
        }
      } catch (err) {
        if (!cancelled && currentSeq === reqSeqRef.current) {
          setError(err.message || 'Error al cargar dispositivos')
          // Conservar la lista previa de dispositivos en caídas temporales de red
        }
      } finally {
        if (!cancelled && currentSeq === reqSeqRef.current) {
          setIsLoading(false)
        }
        isFetchingRef.current = false
        if (pendingRefetchRef.current && !cancelled) {
          pendingRefetchRef.current = false
          loadDevices()
        }
      }
    }

    const debouncedLoad = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (!cancelled) loadDevices()
      }, 500)
    }

    loadDevices()

    // Polling periódico cada 30 segundos como salvaguarda ante caída de Realtime o suspensión móvil
    const pollInterval = setInterval(() => {
      if (!cancelled) loadDevices()
    }, 30000)

    // Re-sincronizar al volver a la pestaña o reactivar la app en móvil
    const handleFocusOrVisibility = () => {
      if (!cancelled && document.visibilityState !== 'hidden') {
        loadDevices()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocusOrVisibility)
      document.addEventListener('visibilitychange', handleFocusOrVisibility)
    }

    let channel = null
    if (hasSupabaseConfig && supabase) {
      channel = supabase
        .channel('gps-dashboard-devices')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'gps_locations' }, debouncedLoad)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, debouncedLoad)
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            if (!cancelled) loadDevices()
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
  }, [])

  return { devices, isLoading, error }
}