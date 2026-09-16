import { useEffect, useState } from 'react'
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

  useEffect(() => {
    let cancelled = false

    const loadDevices = async () => {
      setIsLoading(true)
      try {
        const dbDevices = await fetchDevices()
        const liveLocations = await fetchLatestLocations()
        const liveByDevice = new Map(liveLocations.map((item) => [item.device_id, item]))

        const knownIds = new Set(dbDevices.map((device) => device.id))

        // El APK envia gps_locations aunque el alta en devices falle.
        // Los dispositivos con posicion pero sin registro se muestran igual.
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

        if (!cancelled) {
          setDevices(result)
          setError(null)
        }
      } catch (err) {
        setError(err.message)
        if (!cancelled) setDevices([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadDevices()

    if (hasSupabaseConfig && supabase) {
      const channel = supabase
        .channel('gps-dashboard-devices')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'gps_locations' }, loadDevices)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, loadDevices)
        .subscribe()

      return () => {
        cancelled = true
        supabase.removeChannel(channel)
      }
    }

    return () => {
      cancelled = true
    }
  }, [])

  return { devices, isLoading, error }
}