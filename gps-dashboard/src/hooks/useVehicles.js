import { useEffect, useState } from 'react'
import { fetchLatestLocations, fetchVehicles } from '../lib/queries'
import { initialFleet } from '../data/fleetData'
import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { deviceStatusFromLastSeen } from '../lib/mapLogic'

export const useVehicles = () => {
  const [vehicles, setVehicles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadVehicles = async () => {
      setIsLoading(true)
      try {
        const data = await fetchVehicles()
        const liveLocations = await fetchLatestLocations()
        const liveByDevice = new Map(liveLocations.map((item) => [item.device_id, item]))

        const merged = data.map((vehicle) => {
          const deviceKey = vehicle.deviceId || vehicle.id
          const live = liveByDevice.get(deviceKey)
          if (!live) return vehicle
          return {
            ...vehicle,
            position: [live.latitude, live.longitude],
            speed: live.speed || 0,
            bearing: live.bearing || 0,
            accuracy: live.accuracy || null,
            status: deviceStatusFromLastSeen(live.timestamp),
            lastUpdate: deviceStatusFromLastSeen(live.timestamp) === 'active'
              ? 'En línea'
              : live.timestamp,
          }
        })

        if (!cancelled) {
          setVehicles(merged)
          setError(null)
        }
      } catch (err) {
        setError(err.message)
        if (!cancelled) setVehicles(initialFleet)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadVehicles()

    if (hasSupabaseConfig && supabase) {
      const channel = supabase
        .channel('gps-dashboard-vehicles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'gps_locations' }, loadVehicles)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, loadVehicles)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, loadVehicles)
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

  return { vehicles, isLoading, error }
}