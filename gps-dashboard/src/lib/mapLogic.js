export const routeColorForSpeed = (speed = 0) => {
  if (speed > 80) return '#ef5c72'
  if (speed > 60) return '#f2c66d'
  return '#58e6b0'
}

export const parsePoint = (point) => {
  if (!point) return null
  if (Array.isArray(point) && point.length >= 2) {
    const lat = Number(point[0])
    const lng = Number(point[1])
    const isValid = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    return isValid ? [lat, lng] : null
  }
  if (typeof point === 'object') {
    const lat = Number(point.lat ?? point.latitude)
    const lng = Number(point.lng ?? point.longitude)
    const isValid = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    return isValid ? [lat, lng] : null
  }
  return null
}

export const isPointOnSegment = ([px, py], [ax, ay], [bx, by], epsilon = 1e-7) => {
  const cross = (py - ay) * (bx - ax) - (px - ax) * (by - ay)
  if (Math.abs(cross) > epsilon) return false

  const dot = (px - ax) * (bx - ax) + (py - ay) * (by - ay)
  if (dot < -epsilon) return false

  const squaredLength = (bx - ax) * (bx - ax) + (by - ay) * (by - ay)
  if (dot > squaredLength + epsilon) return false

  return true
}

export const isVehicleInsideCircle = (vehiclePosition, center, radiusMeters) => {
  const p1 = parsePoint(vehiclePosition)
  const p2 = parsePoint(center)
  const radius = Number(radiusMeters)

  if (!p1 || !p2 || !Number.isFinite(radius) || radius <= 0) return false

  const [lat1, lon1] = p1
  const [lat2, lon2] = p2
  const earthRadius = 6371000
  const latDelta = (lat2 - lat1) * Math.PI / 180
  const lonDelta = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(lonDelta / 2) ** 2
  const distance = 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return distance <= radius
}

// Ray casting + verificación de bordes: devuelve true si [lat,lng] está dentro o sobre el borde del polígono.
export const isVehicleInsidePolygon = (vehiclePosition, polygonPositions) => {
  const vehiclePoint = parsePoint(vehiclePosition)
  if (!vehiclePoint || !Array.isArray(polygonPositions)) return false

  const points = polygonPositions.map(parsePoint).filter(Boolean)
  if (points.length < 3) return false

  const [lat, lng] = vehiclePoint

  // Verificar si el punto cae directamente sobre un borde o vértice (tolerancia epsilon)
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    if (isPointOnSegment([lat, lng], points[j], points[i])) {
      return true
    }
  }

  let inside = false

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [lati, lngi] = points[i]
    const [latj, lngj] = points[j]

    const intersect = ((lati > lat) !== (latj > lat))
      && (lng < ((lngj - lngi) * (lat - lati)) / (latj - lati) + lngi)

    if (intersect) inside = !inside
  }

  return inside
}

export const fleetPositions = (vehicles = []) => vehicles
  .filter((vehicle) => Array.isArray(vehicle.position) && vehicle.position.length === 2)
  .map((vehicle) => vehicle.position)

export const deviceStatusFromLastSeen = (timestamp, now = Date.now(), timeoutMs = 90000, maxFutureMs = 300000) => {
  const lastSeen = new Date(timestamp).getTime()
  if (!Number.isFinite(lastSeen)) return 'offline'
  const diff = now - lastSeen
  if (diff < -maxFutureMs) return 'offline'
  if (diff > timeoutMs) return 'offline'
  return 'active'
}