import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { listenToLocation } from './firebaseConfig'
import './App.css'

// Icono para ubicación en tiempo real
const realtimeIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background-color: #dc3545; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); animation: pulse 2s infinite;"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
})

function MapView({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, 16)
    }
  }, [center, map])
  return null
}

function Viewer() {
  const [userId, setUserId] = useState('')
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [isWatching, setIsWatching] = useState(false)

  const startWatching = () => {
    if (!userId.trim()) {
      setError('Ingresa un ID de usuario válido')
      return
    }

    setIsWatching(true)
    setError(null)

    listenToLocation(userId.trim(), (data) => {
      if (data) {
        setLocation(data)
      } else {
        setError('No se encontró ubicación para este ID')
        setLocation(null)
      }
    })
  }

  const stopWatching = () => {
    setIsWatching(false)
    setLocation(null)
    setUserId('')
    setError(null)
  }

  return (
    <div className="gps-app">
      <header className="header">
        <h1>👁️ Visor de Ubicación</h1>
        <p className="subtitle">Ver ubicación en tiempo real</p>
      </header>

      <main className="main-content">
        <section className="viewer-section">
          <div className="viewer-controls">
            <input
              type="text"
              className="watch-input"
              placeholder="Ingresa ID del usuario a vigilar..."
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isWatching}
            />
            {isWatching ? (
              <button className="stop-btn" onClick={stopWatching}>
                ⏹️ Dejar de vigilar
              </button>
            ) : (
              <button className="watch-btn" onClick={startWatching}>
                👁️ Comenzar a vigilar
              </button>
            )}
          </div>

          {error && <div className="error">{error}</div>}

          {location && (
            <div className="location-card">
              <h2>📍 Ubicación en Tiempo Real</h2>
              <div className="location-info">
                <p><strong>Latitud:</strong> {location.latitude?.toFixed(6)}</p>
                <p><strong>Longitud:</strong> {location.longitude?.toFixed(6)}</p>
                <p><strong>Precisión:</strong> {location.accuracy?.toFixed(0)} metros</p>
                {location.altitude && (
                  <p><strong>Altitud:</strong> {location.altitude.toFixed(0)} metros</p>
                )}
                {location.speed && (
                  <p><strong>Velocidad:</strong> {location.speed.toFixed(1)} m/s</p>
                )}
                <p><strong>Última actualización:</strong> {new Date(location.timestamp).toLocaleString()}</p>
              </div>
            </div>
          )}

          {location && (
            <div className="map-section">
              <h2>🗺️ Mapa en Vivo</h2>
              <div className="map-container">
                <MapContainer
                  center={[location.latitude, location.longitude]}
                  zoom={16}
                  style={{ height: '400px', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapView center={[location.latitude, location.longitude]} />
                  <Marker 
                    position={[location.latitude, location.longitude]} 
                    icon={realtimeIcon}
                  >
                    <Popup>
                      <div>
                        <strong>🔴 Ubicación en vivo</strong><br/>
                        Lat: {location.latitude.toFixed(6)}<br/>
                        Lng: {location.longitude.toFixed(6)}<br/>
                        🕒 {new Date(location.timestamp).toLocaleString()}
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>⚡ Visor en tiempo real - GPS</p>
      </footer>
    </div>
  )
}

export default Viewer