import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { currentLocationIcon, savedLocationIcon } from './leaflet-icons'
import { shareLocation, listenToLocation, generateUserId } from './firebaseConfig'
import './App.css'

// Componente para cambiar la vista del mapa cuando hay ubicación
function MapView({ center, zoom, bounds }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] })
    } else if (center) {
      map.setView(center, zoom)
    }
  }, [center, zoom, bounds, map])
  return null
}

// Iconos SVG
const Icons = {
  map: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>,
  location: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
  history: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  myLocation: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22"></line><line x1="2" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22" y2="12"></line></svg>,
  share: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>,
  save: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
  external: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>,
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
}

function App() {
  const [activeTab, setActiveTab] = useState('map')
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [savedLocations, setSavedLocations] = useState([])
  const [isTracking, setIsTracking] = useState(false)
  const [address, setAddress] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [showAllLocations, setShowAllLocations] = useState(true)
  const [showRoutes, setShowRoutes] = useState(true)
  
  // Estado para tiempo real
  const [userId, setUserId] = useState(null)
  const [isSharing, setIsSharing] = useState(false)
  const [watchingUserId, setWatchingUserId] = useState('')
  const [watchedLocation, setWatchedLocation] = useState(null)
  const [sharingInterval, setSharingInterval] = useState(null)

  useEffect(() => {
    // Cargar ubicaciones guardadas del localStorage
    const saved = localStorage.getItem('gps-locations')
    if (saved) {
      setSavedLocations(JSON.parse(saved))
    }
    
    // Cargar o generar ID de usuario
    const savedUserId = localStorage.getItem('gps-user-id')
    if (savedUserId) {
      setUserId(savedUserId)
    } else {
      const newUserId = generateUserId()
      setUserId(newUserId)
      localStorage.setItem('gps-user-id', newUserId)
    }
  }, [])

  // Geocoding inverso para obtener dirección
  const getAddress = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      )
      const data = await response.json()
      if (data.address) {
        setAddress({
          display_name: data.display_name,
          city: data.address.city || data.address.town || data.address.village || 'Desconocido',
          country: data.address.country || 'Desconocido',
          postcode: data.address.postcode || ''
        })
      }
    } catch (err) {
      console.error('Error getting address:', err)
    }
  }

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización')
      return
    }

    setIsTracking(true)
    setError(null)
    setAddress(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed,
          timestamp: new Date().toLocaleString(),
          date: new Date().toISOString().split('T')[0] // Para filtrar por fecha
        }
        setLocation(newLocation)
        getAddress(newLocation.latitude, newLocation.longitude)
        setIsTracking(false)
      },
      (err) => {
        setError(`Error: ${err.message}`)
        setIsTracking(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const saveLocation = () => {
    if (!location) return

    const newLocation = {
      ...location,
      id: Date.now(),
      name: `Ubicación ${savedLocations.length + 1}`,
      address: address ? address.display_name : null
    }

    const updated = [...savedLocations, newLocation]
    setSavedLocations(updated)
    localStorage.setItem('gps-locations', JSON.stringify(updated))
  }

  const deleteLocation = (id) => {
    const updated = savedLocations.filter(loc => loc.id !== id)
    setSavedLocations(updated)
    localStorage.setItem('gps-locations', JSON.stringify(updated))
  }

  const openInMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
  }

  // Filtrar ubicaciones por búsqueda y fecha
  const filteredLocations = savedLocations.filter(loc => {
    const matchesSearch = searchTerm === '' || 
      loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loc.address && loc.address.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesDate = filterDate === '' || loc.date === filterDate
    
    return matchesSearch && matchesDate
  })

  // Obtener fechas únicas para el filtro
  const uniqueDates = [...new Set(savedLocations.map(loc => loc.date))].sort().reverse()

  // Crear coordenadas para la polylinea de rutas
  const routeCoordinates = savedLocations.length > 1
    ? savedLocations.map(loc => [loc.latitude, loc.longitude])
    : []

  // Obtener bounds para mostrar todas las ubicaciones
  const getAllBounds = () => {
    if (savedLocations.length === 0) return null
    const coordinates = savedLocations.map(loc => [loc.latitude, loc.longitude])
    return L.latLngBounds(coordinates)
  }

  // Funciones para tiempo real
  const startSharing = () => {
    if (!location) {
      setError('Necesitas obtener tu ubicación primero')
      return
    }
    
    setIsSharing(true)
    
    // Compartir ubicación inicial
    shareLocation(userId, location)
    
    // Actualizar ubicación cada 5 segundos
    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const currentLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              speed: position.coords.speed,
              timestamp: new Date().toLocaleString()
            }
            setLocation(currentLocation)
            shareLocation(userId, currentLocation)
          },
          (err) => console.error('Error tracking:', err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
      }
    }, 5000)
    
    setSharingInterval(interval)
  }

  const stopSharing = () => {
    setIsSharing(false)
    if (sharingInterval) {
      clearInterval(sharingInterval)
      setSharingInterval(null)
    }
  }

  const startWatching = () => {
    if (!watchingUserId.trim()) {
      setError('Ingresa un ID de usuario válido')
      return
    }
    
    listenToLocation(watchingUserId.trim(), (data) => {
      if (data) {
        setWatchedLocation(data)
      }
    })
  }

  const stopWatching = () => {
    setWatchedLocation(null)
    setWatchingUserId('')
  }

  // Copiar ID de usuario al portapapeles
  const copyUserId = () => {
    navigator.clipboard.writeText(userId)
    alert('ID copiado al portapapeles')
  }

  // Pestaña Mapa
  const MapTab = () => (
    <div className="tab-content map-tab">
      <div className="map-container-full">
        <MapContainer
          key={location ? `${location.latitude}-${location.longitude}` : 'default'}
          center={location ? [location.latitude, location.longitude] : [40.4168, -3.7038]}
          zoom={location ? 15 : 6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapView 
            center={location ? [location.latitude, location.longitude] : null} 
            zoom={location ? 15 : 6}
            bounds={showAllLocations ? getAllBounds() : null}
          />
          {location && (
            <Marker 
              position={[location.latitude, location.longitude]} 
              icon={currentLocationIcon}
            >
              <Popup>
                <div>
                  <strong>📍 Ubicación Actual</strong><br/>
                  Lat: {location.latitude.toFixed(6)}<br/>
                  Lng: {location.longitude.toFixed(6)}
                  {address && <><br/>📍 {address.city}, {address.country}</>}
                </div>
              </Popup>
            </Marker>
          )}
          {showAllLocations && savedLocations.map((loc) => (
            <Marker
              key={loc.id}
              position={[loc.latitude, loc.longitude]}
              icon={savedLocationIcon}
            >
              <Popup>
                <div>
                  <strong>{loc.name}</strong><br/>
                  Lat: {loc.latitude.toFixed(6)}<br/>
                  Lng: {loc.longitude.toFixed(6)}<br/>
                  🕒 {loc.timestamp}
                  {loc.address && <><br/>📍 {loc.address}</>}
                </div>
              </Popup>
            </Marker>
          ))}
          {showRoutes && routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              color="#8b5cf6"
              weight={3}
              opacity={0.7}
            />
          )}
        </MapContainer>
        
        <button 
          className="fab-button my-location-fab"
          onClick={getLocation}
          disabled={isTracking}
          title="Mi ubicación"
        >
          {Icons.myLocation}
        </button>

        {location && (
          <div className="location-float-card">
            <div className="location-float-header">
              <div className="location-status-dot"></div>
              <h3>Ubicación actual</h3>
            </div>
            <div className="location-coordinates">
              <span>Lat: {location.latitude.toFixed(6)}</span>
              <span>Lng: {location.longitude.toFixed(6)}</span>
            </div>
            {location.accuracy && (
              <div className="location-coordinates" style={{ marginTop: '8px' }}>
                <span>Precisión: {location.accuracy.toFixed(0)}m</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  // Pestaña Ubicación
  const LocationTab = () => (
    <div className="tab-content location-tab">
      <div className="location-hero">
        <div className="location-icon-large">
          {Icons.location}
        </div>
        <h1 className="location-title">GPS Offline</h1>
        <p className="location-subtitle">Tu ubicación, incluso sin internet</p>
      </div>

      <button
        className="primary-button"
        onClick={getLocation}
        disabled={isTracking}
      >
        {isTracking ? 'Obteniendo ubicación...' : 'Obtener mi ubicación'}
      </button>

      {error && <div className="error-card">{error}</div>}

      {location && (
        <div className="location-info-card">
          <div className="location-header">
            <div className="location-status-indicator"></div>
            <h2>Ubicación actual</h2>
          </div>
          
          <div className="location-grid">
            <div className="location-item">
              <span className="location-label">Latitud</span>
              <span className="location-value">{location.latitude.toFixed(6)}</span>
            </div>
            <div className="location-item">
              <span className="location-label">Longitud</span>
              <span className="location-value">{location.longitude.toFixed(6)}</span>
            </div>
            <div className="location-item">
              <span className="location-label">Precisión</span>
              <span className="location-value">{location.accuracy?.toFixed(0)}m</span>
            </div>
            <div className="location-item">
              <span className="location-label">Hora</span>
              <span className="location-value">{location.timestamp}</span>
            </div>
            {location.altitude && (
              <div className="location-item">
                <span className="location-label">Altitud</span>
                <span className="location-value">{location.altitude.toFixed(0)}m</span>
              </div>
            )}
            {location.speed && (
              <div className="location-item">
                <span className="location-label">Velocidad</span>
                <span className="location-value">{location.speed.toFixed(1)} m/s</span>
              </div>
            )}
          </div>

          {address && (
            <div className="address-section">
              <h3>Dirección</h3>
              <p className="address-text">{address.display_name}</p>
              <div className="address-details">
                <span>{address.city}</span>
                <span>•</span>
                <span>{address.country}</span>
              </div>
            </div>
          )}

          <div className="location-actions-grid">
            <button className="action-card" onClick={saveLocation}>
              <div className="action-icon">{Icons.save}</div>
              <span>Guardar</span>
            </button>
            <button 
              className="action-card" 
              onClick={() => openInMaps(location.latitude, location.longitude)}
            >
              <div className="action-icon">{Icons.external}</div>
              <span>Maps</span>
            </button>
            <button className="action-card" onClick={() => setActiveTab('map')}>
              <div className="action-icon">{Icons.map}</div>
              <span>Ver mapa</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // Pestaña Historial
  const HistoryTab = () => (
    <div className="tab-content history-tab">
      <div className="history-header">
        <h2>Historial</h2>
        <span className="location-count">{filteredLocations.length} ubicaciones</span>
      </div>

      <div className="search-bar">
        <div className="search-icon">{Icons.search}</div>
        <input
          type="text"
          placeholder="Buscar ubicación..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        >
          <option value="">Todas</option>
          {uniqueDates.map(date => (
            <option key={date} value={date}>{date}</option>
          ))}
        </select>
      </div>

      {filteredLocations.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon">{Icons.history}</div>
          <p>{savedLocations.length === 0 
            ? 'No hay ubicaciones guardadas' 
            : 'No se encontraron resultados'}</p>
        </div>
      ) : (
        <div className="history-list">
          {filteredLocations.map((loc) => (
            <div key={loc.id} className="history-card">
              <div className="history-card-header">
                <h3>{loc.name}</h3>
                <span className="history-date">{loc.date}</span>
              </div>
              <div className="history-coordinates">
                <span>{loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}</span>
              </div>
              {loc.address && (
                <p className="history-address">{loc.address}</p>
              )}
              <div className="history-actions">
                <button 
                  className="history-action-btn"
                  onClick={() => openInMaps(loc.latitude, loc.longitude)}
                >
                  {Icons.external}
                </button>
                <button 
                  className="history-action-btn delete"
                  onClick={() => deleteLocation(loc.id)}
                >
                  {Icons.trash}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Pestaña Ajustes
  const SettingsTab = () => (
    <div className="tab-content settings-tab">
      <h2>Ajustes</h2>
      
      <div className="settings-section">
        <h3>Compartir ubicación</h3>
        <div className="settings-card">
          <div className="user-id-display">
            <span className="user-id-label">Tu ID:</span>
            <span className="user-id-value">{userId}</span>
            <button className="icon-button" onClick={copyUserId}>
              {Icons.copy}
            </button>
          </div>
        </div>

        <div className="settings-card">
          <h4>Compartir tu ubicación</h4>
          {isSharing ? (
            <button className="danger-button" onClick={stopSharing}>
              Dejar de compartir
            </button>
          ) : (
            <button 
              className="primary-button"
              onClick={startSharing}
              disabled={!location}
            >
              Comenzar a compartir
            </button>
          )}
          {isSharing && (
            <p className="status-text active">Compartiendo en tiempo real</p>
          )}
        </div>

        <div className="settings-card">
          <h4>Ver ubicación de otro</h4>
          <div className="input-group">
            <input
              type="text"
              placeholder="ID del usuario..."
              value={watchingUserId}
              onChange={(e) => setWatchingUserId(e.target.value)}
            />
            {watchedLocation ? (
              <button className="danger-button" onClick={stopWatching}>
                Dejar de ver
              </button>
            ) : (
              <button className="primary-button" onClick={startWatching}>
                Ver ubicación
              </button>
            )}
          </div>
          {watchedLocation && (
            <div className="watched-info">
              <p><strong>Ubicación:</strong></p>
              <p>Lat: {watchedLocation.latitude?.toFixed(6)}</p>
              <p>Lng: {watchedLocation.longitude?.toFixed(6)}</p>
              <p>Actualizado: {new Date(watchedLocation.timestamp).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="gps-app-modern">
      <header className="modern-header">
        <div className="header-content">
          <h1>GPS Offline</h1>
          <p className="header-subtitle">Tu ubicación, sin internet</p>
        </div>
      </header>

      <main className="modern-main">
        {activeTab === 'map' && <MapTab />}
        {activeTab === 'location' && <LocationTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <span className="nav-icon">{Icons.map}</span>
          <span className="nav-label">Mapa</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'location' ? 'active' : ''}`}
          onClick={() => setActiveTab('location')}
        >
          <span className="nav-icon">{Icons.location}</span>
          <span className="nav-label">Ubicación</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <span className="nav-icon">{Icons.history}</span>
          <span className="nav-label">Historial</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="nav-icon">{Icons.settings}</span>
          <span className="nav-label">Ajustes</span>
        </button>
      </nav>
    </div>
  )
}

export default App
