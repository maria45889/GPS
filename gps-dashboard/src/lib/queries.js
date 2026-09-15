// Query functions for Supabase integration
// These fetch data from Supabase and transform it to the UI expected format

import { supabase } from '../lib/supabase'

// Transform raw Supabase vehicle data to UI format
export const transformVehicle = (dbVehicle) => ({
  id: dbVehicle.id,
  name: dbVehicle.name || dbVehicle.plate,
  plate: dbVehicle.plate,
  driver: dbVehicle.driver || 'Desconocido',
  status: dbVehicle.status || 'offline',
  speed: dbVehicle.speed || 0,
  battery: dbVehicle.battery || 0,
  fuel: dbVehicle.fuel !== undefined ? dbVehicle.fuel : 75,
  temp: dbVehicle.temp || 24,
  odometer: dbVehicle.odometer || '0 km',
  position: dbVehicle.position || [4.6097, -74.0817], // Bogotá default
  location: dbVehicle.location || 'Ubicación actual',
  lastUpdate: dbVehicle.lastUpdate || 'Now',
  route: dbVehicle.route || [[4.6097, -74.0817], [4.6100, -74.0820]],
})

// Transform raw Supabase alert data to UI format
export const transformAlert = (dbAlert) => ({
  id: dbAlert.id,
  severity: dbAlert.severity || 'info',
  title: dbAlert.title || 'Sin título',
  description: dbAlert.description || '',
  vehicleId: dbAlert.vehicle_id || dbAlert.plate,
  vehicleName: dbAlert.vehicle_name || 'Vehículo desconocido',
  plate: dbAlert.plate || 'UNK',
  speed: dbAlert.speed || 0,
  battery: dbAlert.battery || 0,
  voltage: dbAlert.voltage || 12.0,
  timestamp: dbAlert.timestamp || Date.now(),
  locationName: dbAlert.location_name || 'Ubicación',
  lat: dbAlert.lat !== undefined ? dbAlert.lat : null,
  lng: dbAlert.lng !== undefined ? dbAlert.lng : null,
  status: dbAlert.read !== undefined ? (dbAlert.read ? 'resolved' : 'active') : 'active',
})

// Transform raw Supabase geofence data to UI format
export const transformGeofence = (dbGeofence) => {
  const positions = dbGeofence.positions || dbGeofence.coordinates || []
  const center = dbGeofence.center || (positions.length > 0 ? positions[0] : [4.6097, -74.0817])
  const radius = dbGeofence.radius || 600

  return {
    id: dbGeofence.id,
    name: dbGeofence.name || 'Geocerca',
    type: dbGeofence.type || 'circle',
    positions: positions.map(pos => [Number(pos[0]), Number(pos[1])]),
    center: [Number(center[0]), Number(center[1])],
    radius: Number(radius),
    color: dbGeofence.color || '#00E676',
    rule: dbGeofence.rule || 'Supervisión de ubicación',
    active: dbGeofence.active !== undefined ? dbGeofence.active : true,
  }
}

// Fetch vehicles from Supabase - returns raw data
export const fetchVehicles = async () => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('last_update', { ascending: false })

  if (error) throw error
  return data ? data.map(transformVehicle) : []
}

// Fetch alerts from Supabase - returns raw data
export const fetchAlerts = async () => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .order('timestamp', { ascending: false })

  if (error) throw error
  return data ? data.map(transformAlert) : []
}

// Fetch geofences from Supabase - returns raw data
export const fetchGeofences = async () => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('geofences')
    .select('*')

  if (error) throw error
  return data ? data.map(transformGeofence) : []
}

export const fetchLatestLocations = async () => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('gps_locations')
    .select('device_id, latitude, longitude, speed, accuracy, altitude, bearing, timestamp')
    .order('timestamp', { ascending: false })

  if (error) throw error

  const latestByDevice = new Map()
  for (const location of data || []) {
    if (!latestByDevice.has(location.device_id)) latestByDevice.set(location.device_id, location)
  }

  return [...latestByDevice.values()]
}