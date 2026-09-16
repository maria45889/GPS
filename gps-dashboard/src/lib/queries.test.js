import { describe, expect, it } from 'vitest'
import {
  latestLocationsByDevice,
  transformAlert,
  transformGeofence,
  transformVehicle,
} from './queries'
import { initialGeofences } from '../data/geofencesData'

describe('transformVehicle', () => {
  it('normaliza un vehículo incompleto con valores seguros', () => {
    expect(transformVehicle({ id: 'moto-1', plate: 'ABC-123' })).toMatchObject({
      id: 'moto-1',
      name: 'ABC-123',
      driver: 'Desconocido',
      status: 'offline',
      fuel: 75,
      position: [4.6097, -74.0817],
    })
  })

  it('conserva la ruta y telemetría recibidas', () => {
    const vehicle = transformVehicle({
      id: 'moto-2',
      name: 'Honda',
      speed: 48,
      position: [4.61, -74.08],
      route: [[4.61, -74.08], [4.62, -74.09]],
    })
    expect(vehicle.speed).toBe(48)
    expect(vehicle.route).toHaveLength(2)
    expect(vehicle.position).toEqual([4.61, -74.08])
  })
})

describe('transformAlert and transformGeofence', () => {
  it('mapea vehicle_id, ubicación y estado de alerta', () => {
    expect(transformAlert({
      id: 'a-1', vehicle_id: 'moto-1', title: 'Exceso', read: true,
      lat: 4.6, lng: -74.08,
    })).toMatchObject({ vehicleId: 'moto-1', status: 'resolved', lat: 4.6 })
  })

  it('convierte coordenadas de geocerca a números', () => {
    const geo = transformGeofence({ id: 'g-1', type: 'circle', center: ['4.6', '-74.08'], radius: '300' })
    expect(geo.center).toEqual([4.6, -74.08])
    expect(geo.radius).toBe(300)
  })

  it('mantiene el contrato de las geocercas iniciales', () => {
    const geo = transformGeofence(initialGeofences[0])
    expect(geo.positions.length).toBeGreaterThan(2)
    expect(geo.active).toBe(true)
  })
})

describe('latestLocationsByDevice', () => {
  it('conserva solo la primera ubicación de cada dispositivo', () => {
    const result = latestLocationsByDevice([
      { device_id: 'moto-1', timestamp: '2026-01-02' },
      { device_id: 'moto-1', timestamp: '2026-01-01' },
      { device_id: 'moto-2', timestamp: '2026-01-03' },
    ])
    expect(result).toEqual([
      { device_id: 'moto-1', timestamp: '2026-01-02' },
      { device_id: 'moto-2', timestamp: '2026-01-03' },
    ])
  })
})