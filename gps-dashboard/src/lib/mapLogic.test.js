import { describe, expect, it } from 'vitest'
import { deviceStatusFromLastSeen, fleetPositions, isVehicleInsideCircle, routeColorForSpeed } from './mapLogic'

describe('mapLogic', () => {
  it('clasifica el color de ruta según velocidad', () => {
    expect(routeColorForSpeed(45)).toBe('#58e6b0')
    expect(routeColorForSpeed(61)).toBe('#f2c66d')
    expect(routeColorForSpeed(81)).toBe('#ef5c72')
  })

  it('detecta si un vehículo está dentro de un radio GPS', () => {
    expect(isVehicleInsideCircle([4.6097, -74.0817], [4.6097, -74.0817], 10)).toBe(true)
    expect(isVehicleInsideCircle([4.7, -74.0817], [4.6097, -74.0817], 10)).toBe(false)
  })

  it('prepara solo posiciones válidas para fitBounds', () => {
    expect(fleetPositions([
      { position: [4.6, -74.08] },
      { position: null },
      { position: [4.7, -74.09] },
    ])).toEqual([[4.6, -74.08], [4.7, -74.09]])
  })

  it('marca un dispositivo offline si no reporta dentro del intervalo', () => {
    const now = Date.parse('2026-01-01T00:02:00.000Z')
    expect(deviceStatusFromLastSeen('2026-01-01T00:01:30.000Z', now)).toBe('active')
    expect(deviceStatusFromLastSeen('2026-01-01T00:00:00.000Z', now)).toBe('offline')
  })
})