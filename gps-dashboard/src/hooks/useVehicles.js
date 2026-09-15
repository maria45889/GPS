import { useEffect, useState } from 'react'
import { fetchLatestLocations, fetchVehicles } from '../lib/queries'
import { initialFleet } from '../data/fleetData'
import { hasSupabaseConfig, supabase } from '../lib/supabase'

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
          const live = liveByDevice.get(vehicle.id)
          if (!live) return vehicle
          return { ...vehicle, position: [live.latitude, live.longitude], speed: live.speed || 0, lastUpdate: live.timestamp }
        })
        const knownIds = new Set(merged.map((vehicle) => vehicle.id))
        for (const live of liveLocations) {
          if (!knownIds.has(live.device_id)) {
            merged.push({
              id: live.device_id,
              name: live.device_id,
              plate: live.device_id,
              driver: 'Dispositivo GPS',
              status: 'active',
              speed: live.speed || 0,
              battery: 0,
              fuel: 0,
              temp: 0,
              odometer: '0 km',
              position: [live.latitude, live.longitude],
              location: 'Ubicación GPS',
              lastUpdate: live.timestamp,
              route: [],
            })
          }
        }
        if (!cancelled) {
          setVehicles(merged)
          setError(null)
        }
      } catch (err) {
        setError(err.message)
        if (!cancelled) {
          setVehicles(initialFleet)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadVehicles()

    if (hasSupabaseConfig && supabase) {
      const channel = supabase
        .channel('gps-dashboard-vehicles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'gps_locations' }, loadVehicles)
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