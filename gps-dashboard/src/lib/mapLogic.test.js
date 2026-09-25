import { describe, expect, it } from 'vitest'
import { deviceStatusFromLastSeen, fleetPositions, isVehicleInsideCircle, isVehicleInsidePolygon, routeColorForSpeed, routeDistanceKm } from './mapLogic'

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

  it('detecta correctamente si un vehículo está dentro de una geocerca poligonal', () => {
    const polygon = [
      [37.7710, -122.4280],
      [37.7745, -122.4270],
      [37.7740, -122.4200],
      [37.7695, -122.4215],
    ]

    // Punto dentro del polígono
    expect(isVehicleInsidePolygon([37.7725, -122.4245], polygon)).toBe(true)

    // Punto fuera del polígono
    expect(isVehicleInsidePolygon([37.8000, -122.4500], polygon)).toBe(false)

    // Funciona también con objetos { lat, lng }
    const objectPolygon = [
      { lat: 37.7710, lng: -122.4280 },
      { lat: 37.7745, lng: -122.4270 },
      { lat: 37.7740, lng: -122.4200 },
      { lat: 37.7695, lng: -122.4215 },
    ]
    expect(isVehicleInsidePolygon({ lat: 37.7725, lng: -122.4245 }, objectPolygon)).toBe(true)
    expect(isVehicleInsidePolygon({ lat: 37.8000, lng: -122.4500 }, objectPolygon)).toBe(false)
  })

  it('detecta correctamente si un vehículo está sobre el borde de un polígono (tolerancia)', () => {
    const squarePolygon = [
      [10, 10],
      [10, 20],
      [20, 20],
      [20, 10],
    ]

    // Punto exactamente en el borde superior [10, 15]
    expect(isVehicleInsidePolygon([10, 15], squarePolygon)).toBe(true)
    // Vértice [10, 10]
    expect(isVehicleInsidePolygon([10, 10], squarePolygon)).toBe(true)
  })

  it('rechaza coordenadas fuera de rangos válidos (-90..90, -180..180)', () => {
    const invalidPositions = [
      [500, 900],
      [-95, 45],
      [45, 185],
    ]
    invalidPositions.forEach((pos) => {
      expect(isVehicleInsideCircle(pos, [4.6, -74.08], 100)).toBe(false)
    })
  })

  it('prepara solo posiciones válidas para fitBounds', () => {
    expect(fleetPositions([
      { position: [4.6, -74.08] },
      { position: null },
      { position: [4.7, -74.09] },
    ])).toEqual([[4.6, -74.08], [4.7, -74.09]])
  })

  it('marca un dispositivo offline si no reporta dentro del intervalo o si el timestamp es futuro excede los 5 min', () => {
    const now = Date.parse('2026-01-01T00:02:00.000Z')
    expect(deviceStatusFromLastSeen('2026-01-01T00:01:30.000Z', now)).toBe('active')
    expect(deviceStatusFromLastSeen('2026-01-01T00:00:00.000Z', now)).toBe('offline')
    // Timestamp en el futuro lejano (> 5 min) se rechaza como offline
    expect(deviceStatusFromLastSeen('2026-01-01T00:10:00.000Z', now)).toBe('offline')
    // Timestamp en el futuro cercano (<= 5 min) por desvío de reloj se acepta
    expect(deviceStatusFromLastSeen('2026-01-01T00:04:30.000Z', now)).toBe('active')
  })

  it('suma la distancia del recorrido en km', () => {
    // 0.01° de latitud ≈ 1.11 km; 0.02° de latitud ≈ 2.22 km
    expect(routeDistanceKm([[4.60, -74.08], [4.61, -74.08]])).toBeGreaterThan(1.1)
    expect(routeDistanceKm([[4.60, -74.08], [4.61, -74.08]])).toBeLessThan(1.12)
    // Un tramo doble devuelve aproximadamente el doble
    expect(routeDistanceKm([
      [4.60, -74.08],
      [4.61, -74.08],
      [4.62, -74.08],
    ])).toBeCloseTo(routeDistanceKm([[4.60, -74.08], [4.61, -74.08]]) * 2, 1)
    // Lista vacía o de un solo punto no acumula distancia
    expect(routeDistanceKm([])).toBe(0)
    expect(routeDistanceKm([[4.60, -74.08]])).toBe(0)
  })
})