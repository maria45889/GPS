export const routeColorForSpeed = (speed = 0) => {
  if (speed > 80) return '#ef5c72'
  if (speed > 60) return '#f2c66d'
  return '#58e6b0'
}

export const isVehicleInsideCircle = (vehiclePosition, center, radiusMeters) => {
  if (!vehiclePosition || !center || !Number.isFinite(radiusMeters)) return false

  const [lat1, lon1] = vehiclePosition.map(Number)
  const [lat2, lon2] = center.map(Number)
  const earthRadius = 6371000
  const latDelta = (lat2 - lat1) * Math.PI / 180
  const lonDelta = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(lonDelta / 2) ** 2
  const distance = 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return distance <= radiusMeters
}

export const fleetPositions = (vehicles = []) => vehicles
  .filter((vehicle) => Array.isArray(vehicle.position) && vehicle.position.length === 2)
  .map((vehicle) => vehicle.position)

export const deviceStatusFromLastSeen = (timestamp, now = Date.now(), timeoutMs = 90000) => {
  const lastSeen = new Date(timestamp).getTime()
  if (!Number.isFinite(lastSeen)) return 'offline'
  return now - lastSeen <= timeoutMs ? 'active' : 'offline'
}