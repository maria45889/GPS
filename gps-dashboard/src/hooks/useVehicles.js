import { useCallback } from 'react'
import { fetchLatestLocations, fetchVehicles, isCoordinateValid, isLocationValidForMap, sanitizeAccuracy } from '../lib/queries'
import { deviceStatusFromLastSeen } from '../lib/mapLogic'
import { useLiveCollection } from './useLiveCollection'

export const useVehicles = () => {
  const fetchFn = useCallback(async () => {
    const data = await fetchVehicles()
    const liveLocations = await fetchLatestLocations()
    const liveByDevice = new Map(liveLocations.map((item) => [item.device_id, item]))

    return data.map((vehicle) => {
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
  }, [])

  const { data: vehicles, isLoading, error, lastSyncTime, isStale, refetch: refetchVehicles } = useLiveCollection({
    fetchFn,
    subscribeTables: ['gps_locations', 'devices', 'vehicles']
  })

  return { vehicles, isLoading, error, lastSyncTime, isStale, refetchVehicles }
}