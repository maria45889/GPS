// Query functions for Supabase integration
// These fetch data from Supabase and transform it to the UI expected format

import { supabase } from '../lib/supabase'
import { deviceStatusFromLastSeen } from './mapLogic'

// Transform raw Supabase vehicle data to UI format
export const transformVehicle = (dbVehicle) => {
  const route = Array.isArray(dbVehicle.route) ? dbVehicle.route : [];
  return {
    id: dbVehicle.id,
    deviceId: dbVehicle.device_id || null,
    name: dbVehicle.label || dbVehicle.name || dbVehicle.plate || dbVehicle.id,
    plate: dbVehicle.vehicle_id || dbVehicle.plate || dbVehicle.id,
    driver: dbVehicle.driver || (dbVehicle.platform ? 'Dispositivo GPS' : 'Desconocido'),
    status: dbVehicle.last_seen ? deviceStatusFromLastSeen(dbVehicle.last_seen) : (dbVehicle.status || 'offline'),
    speed: dbVehicle.speed || 0,
    battery: dbVehicle.battery || 0,
    fuel: dbVehicle.fuel !== undefined ? dbVehicle.fuel : 75,
    temp: dbVehicle.temp || 24,
    odometer: dbVehicle.odometer || '0 km',
    position: dbVehicle.position || [4.6097, -74.0817], // Bogotá default
    location: dbVehicle.location || 'Ubicación actual',
    lastUpdate: dbVehicle.lastUpdate || dbVehicle.last_seen || 'Now',
    route,
  };
}

// Transform a GPS device (devices table + latest gps_location)
export const transformDevice = (dbDevice, live = null) => {
  const isOnline = dbDevice.status === 'online' || dbDevice.status === 'active'
  return {
    id: dbDevice.id,
    name: dbDevice.label || dbDevice.id,
    deviceId: dbDevice.id,
    status: isOnline ? 'active' : dbDevice.status || 'offline',
    platform: dbDevice.platform || null,
    model: dbDevice.model || null,
    appVersion: dbDevice.app_version || null,
    battery: dbDevice.battery || 0,
    lastSeen: dbDevice.last_seen || null,
    lastUpdate: dbDevice.last_seen || '--',
    position: live ? [live.latitude, live.longitude] : null,
    speed: live?.speed || 0,
    accuracy: live?.accuracy || null,
    bearing: live?.bearing || 0,
    route: [],
  }
}

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
    .from('devices')
    .select('id, status, last_seen, updated_at, platform, model, app_version')
    .order('last_seen', { ascending: false, nullsFirst: false })

  if (error) throw error
  return data ? data.map(transformVehicle) : []
}

// Fetch registered GPS devices from Supabase
export const fetchDevices = async () => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('devices')
    .select('id, status, last_seen, platform, model, app_version, battery, label')
    .order('last_seen', { ascending: false })

  if (error) throw error
  return data || []
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

  return latestLocationsByDevice(data)
}

export const latestLocationsByDevice = (locations = []) => {
  const latestByDevice = new Map()
  for (const location of locations) {
    if (!latestByDevice.has(location.device_id)) latestByDevice.set(location.device_id, location)
  }
  return [...latestByDevice.values()]
}