import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import MapArea from './MapArea';
import { LeftSidebarPanel } from './LeftSidebarPanel';
import { RightSidebarPanel } from './RightSidebarPanel';
import { HeaderBar } from './HeaderBar';
import { initialFleet } from '../data/fleetData';
import { initialAlerts } from '../data/alertsData';
import { initialGeofences } from '../data/geofencesData';
import { useVehicles, useDevices, useAlerts, useGeofences } from '../hooks';
import { VehicleDetailPanel } from './VehicleDetailPanel';
import { deleteVehicle, sendVehicleCommand, updateVehicleStatus } from '../lib/vehicleActions';

// Construye la entidad mostrada en el mapa con los campos que MapArea espera
const buildMapEntity = (source) => ({
  id: source.id,
  name: source.name,
  plate: source.plate || source.id,
  driver: source.driver || null,
  status: source.status || 'offline',
  speed: source.speed || 0,
  bearing: source.bearing || 0,
  battery: source.battery || 0,
  accuracy: source.accuracy || null,
  lastUpdate: source.lastUpdate || '--',
  position: source.position || null,
  route: source.route || [],
  controlState: source.controlState,
})

const Dashboard = () => {
  const { vehicles: supabaseVehicles } = useVehicles()
  const { devices: supabaseDevices } = useDevices()
  const { alerts: supabaseAlerts } = useAlerts()
  const { geofences: supabaseGeofences } = useGeofences()

  const sharedVehicleId = new URLSearchParams(window.location.search).get('vehicle')

  // --- Estado persistente de vista ---
  const [category, setCategory] = useState(() => {
    const stored = localStorage.getItem('rg_category')
    return stored === 'vehicles' ? 'vehicles' : 'devices'
  })

  const handleCategoryChange = (next) => {
    setCategory(next)
    localStorage.setItem('rg_category', next)
    setSelectedEntity(null)
    setFlyToTrigger(null)
    setIsVehicleDetailOpen(false)
  }

  // --- Datos con fallback ---
  const [vehicles, setVehicles] = useState(supabaseVehicles.length > 0 ? supabaseVehicles : initialFleet)
  const [devices, setDevices] = useState(supabaseDevices)
  const [alerts, setAlertsState] = useState(supabaseAlerts.length > 0 ? supabaseAlerts : initialAlerts)
  const [geofences, setGeofencesState] = useState(supabaseGeofences.length > 0 ? supabaseGeofences : initialGeofences)

  useEffect(() => {
    if (supabaseVehicles.length > 0) setVehicles(supabaseVehicles)
  }, [supabaseVehicles])

  useEffect(() => {
    setDevices(supabaseDevices)
  }, [supabaseDevices])

  useEffect(() => {
    if (supabaseAlerts.length > 0) setAlertsState(supabaseAlerts)
  }, [supabaseAlerts])

  useEffect(() => {
    if (supabaseGeofences.length > 0) setGeofencesState(supabaseGeofences)
  }, [supabaseGeofences])

  // --- Selección ---
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [flyToTrigger, setFlyToTrigger] = useState(null)
  const [isPlacingOnMap, setIsPlacingOnMap] = useState(false)
  const [pendingCenter, setPendingCenter] = useState(null)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [locateUserTrigger, setLocateUserTrigger] = useState(null)
  const [isFollowingRoute, setIsFollowingRoute] = useState(
    () => new URLSearchParams(window.location.search).get('follow') === '1',
  )
  const [isVehicleDetailOpen, setIsVehicleDetailOpen] = useState(false)
  const [operationMessage, setOperationMessage] = useState('')
  const [alertFocusTrigger, setAlertFocusTrigger] = useState(null)
  const [isVehicleControlBusy, setIsVehicleControlBusy] = useState(false)

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut()
  }

  // --- Listas por categoría ---
  const devicesList = useMemo(() => devices.filter((d) => d.position), [devices])
  const vehiclesList = vehicles

  // Entidad actual según la categoría
  const selectedEntityId = selectedEntity?.id

  useEffect(() => {
    if (category === 'devices') {
      if (!selectedEntityId && devicesList.length > 0) setSelectedEntity(devicesList[0])
    } else {
      if (!selectedEntityId && vehiclesList.length > 0) setSelectedEntity(vehiclesList[0])
    }
  }, [category, devicesList, vehiclesList, selectedEntityId])

  const selectEntity = (entity, openDetail = false) => {
    if (!entity?.position) return
    setSelectedEntity({ ...entity, controlState: undefined })
    setIsVehicleDetailOpen(openDetail)
    setFlyToTrigger({ coords: entity.position, zoom: 16, timestamp: Date.now() })
  }

  // --- Compartir ---
  const handleShareRoute = async () => {
    if (!selectedEntity) return
    const routeUrl = new URL(window.location.href)
    routeUrl.searchParams.set('vehicle', selectedEntity.id)
    routeUrl.searchParams.set('follow', '1')
    const shareData = {
      title: `Ubicación de ${selectedEntity.name}`,
      text: `Ubicación GPS de ${selectedEntity.name} (${selectedEntity.plate || selectedEntity.id})`,
      url: routeUrl.toString(),
    }
    try {
      if (navigator.share) await navigator.share(shareData)
      else {
        await navigator.clipboard.writeText(shareData.url)
        setOperationMessage('Enlace copiado')
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setOperationMessage('No se pudo compartir')
    }
  }

  // --- Alertas ---
  const handleSelectAlert = (alert) => {
    if (alert.lat && alert.lng) {
      setFlyToTrigger({ coords: [alert.lat, alert.lng], zoom: 16, timestamp: Date.now() })
      setAlertFocusTrigger({ id: alert.id, coords: [alert.lat, alert.lng], zoom: 16, timestamp: Date.now() })
    }
    const related = vehiclesList.find((v) => v.id === alert.vehicleId) || devicesList.find((d) => d.id === alert.vehicleId)
    if (related) selectEntity(related, true)
  }

  // --- Geocerca ---
  const handleMapClickForGeofence = (latlng) => {
    setPendingCenter(latlng)
    setIsPlacingOnMap(false)
    setGeofencesState((prev) => [
      {
        id: `GEOF-${Date.now()}`,
        name: 'Nueva geocerca',
        type: 'circle',
        center: latlng,
        radius: 300,
        color: '#168ca4',
        rule: 'Supervisión de ubicación',
        active: true,
      },
      ...prev,
    ])
  }

  // --- Ubicación del operador ---
  const handleLocateUser = () => {
    setLocateUserTrigger({ timestamp: Date.now(), coords: userLocation?.position })
  }

  // --- Control vehicular (solo categoría motos) ---
  const handleVehicleControl = async (command) => {
    if (!selectedEntity || category !== 'vehicles' || isVehicleControlBusy) return
    setIsVehicleControlBusy(true)
    const nextStatus = command === 'activate' ? 'active' : 'stopped'
    const result = await updateVehicleStatus(selectedEntity.id, nextStatus)
    if (command === 'immobilize') await sendVehicleCommand(selectedEntity.id, command)
    const nextVehicle = {
      ...selectedEntity,
      status: nextStatus,
      controlState: command === 'immobilize' ? 'immobilized' : undefined,
      lastUpdate: 'Ahora',
    }
    setVehicles((current) => current.map((v) => (v.id === selectedEntity.id ? nextVehicle : v)))
    setSelectedEntity(nextVehicle)
    setOperationMessage(
      result.remote
        ? `Comando ${command} enviado`
        : `Comando ${command} aplicado en este panel`,
    )
    setIsVehicleControlBusy(false)
  }

  const handleDeleteVehicle = async (vehicleId) => {
    if (category !== 'vehicles' || isVehicleControlBusy) return
    setIsVehicleControlBusy(true)
    const result = await deleteVehicle(vehicleId)
    setVehicles((prev) => {
      const remaining = prev.filter((v) => v.id !== vehicleId)
      setSelectedEntity(remaining[0] || null)
      setIsVehicleDetailOpen(false)
      return remaining
    })
    setOperationMessage(result.remote ? 'Vehículo eliminado' : 'Eliminado del panel local')
    setIsVehicleControlBusy(false)
  }

  // --- Seguir ruta ---
  const handleToggleRouteFollow = () => setIsFollowingRoute((v) => !v)

  // --- Compartido ---
  useEffect(() => {
    if (!sharedVehicleId) return
    const shared = vehiclesList.find((v) => v.id === sharedVehicleId) || devicesList.find((d) => d.id === sharedVehicleId)
    if (shared && selectedEntity?.id !== shared.id) selectEntity(shared)
  }, [sharedVehicleId, vehiclesList, devicesList]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Última sincronización ---
  const lastSyncLabel = useMemo(() => {
    const lastUpdate = selectedEntity?.lastUpdate
    if (!lastUpdate || lastUpdate === '--') return 'Sin reporte'
    if (lastUpdate === 'En línea') return 'En línea'
    if (lastUpdate === 'Ahora') return 'Actualizado'
    return lastUpdate
  }, [selectedEntity?.lastUpdate])

  // --- Entidades para el mapa ---
  const mapEntities = useMemo(
    () => (category === 'devices' ? devicesList.map(buildMapEntity) : vehiclesList.map(buildMapEntity)),
    [category, devicesList, vehiclesList],
  )

  const activeAlerts = useMemo(() => alerts.filter((a) => a.status !== 'resolved'), [alerts])

  return (
    <div className="reference-dashboard relative flex flex-col w-full max-w-[1680px] h-[calc(100vh-2rem)] overflow-hidden rounded-[14px] border border-[#1a3544] bg-[#07111c] shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:h-[calc(100vh-2.5rem)]">
      <div className="relative z-10 flex flex-col h-full">
        <HeaderBar
          category={category}
          onCategoryChange={handleCategoryChange}
          lastSyncLabel={lastSyncLabel}
          onLogout={handleLogout}
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden gap-3 p-3">
          <LeftSidebarPanel
            category={category}
            entity={selectedEntity}
            vehicles={vehiclesList}
            onControlVehicle={category === 'vehicles' ? handleVehicleControl : undefined}
            onDeleteVehicle={category === 'vehicles' ? handleDeleteVehicle : undefined}
            isControlBusy={isVehicleControlBusy}
            userLocation={userLocation}
            isFollowingRoute={isFollowingRoute}
            onToggleRouteFollow={handleToggleRouteFollow}
            onShareRoute={handleShareRoute}
          />

          <div className="dashboard-center min-h-0 min-w-0 flex-1">
            <div className="map-surface relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-[12px] border border-[#cfe2e9] bg-[#eaf4f7] shadow-[0_8px_24px_rgba(43,93,112,0.12)]">
              <MapArea
                category={category}
                vehicles={mapEntities}
                selectedVehicle={selectedEntity ? buildMapEntity(selectedEntity) : null}
                onSelectVehicle={(entity) => selectEntity(entity)}
                alerts={alerts}
                onSelectAlert={handleSelectAlert}
                focusTrigger={alertFocusTrigger}
                geofences={geofences}
                isPlacingOnMap={isPlacingOnMap}
                pendingCenter={pendingCenter}
                onMapClick={handleMapClickForGeofence}
                flyToTrigger={flyToTrigger}
                isFollowingRoute={isFollowingRoute}
                onToggleRouteFollow={handleToggleRouteFollow}
                onShareRoute={handleShareRoute}
                isVehicleDetailOpen={isVehicleDetailOpen}
                userLocation={userLocation}
                onLocationChange={setUserLocation}
                locateUserTrigger={locateUserTrigger}
              />

              {/* Alerts */}
              {activeAlerts.length > 0 && (
                <div className="reference-dashboard map-alerts-card absolute left-4 bottom-4 z-10">
                  <div className="map-card-heading">
                    <span>Alertas activas</span>
                    <span className="alert-count">{activeAlerts.length}</span>
                  </div>
                  {activeAlerts.slice(0, 3).map((item) => (
                    <button key={item.id} type="button" onClick={() => handleSelectAlert(item)} className="map-alert-row">
                      <span className={`alert-dot ${item.severity}`} />
                      <span>
                        <strong>{item.title.split(' - ')[0]}</strong>
                        <small>{item.timestamp} · {item.locationName}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <RightSidebarPanel
            category={category}
            entities={category === 'devices' ? devicesList : vehiclesList}
            selectedEntity={selectedEntity}
            onSelectEntity={(entity) => selectEntity(entity, true)}
            onSetGeofence={() => setIsPlacingOnMap(true)}
            userLocation={userLocation}
            onLocateUser={handleLocateUser}
          />
        </div>

        {isVehicleDetailOpen && selectedEntity && (
          <VehicleDetailPanel
            category={category}
            entity={selectedEntity}
            isFollowingRoute={isFollowingRoute}
            onClose={() => setIsVehicleDetailOpen(false)}
            onToggleRouteFollow={handleToggleRouteFollow}
            onShareRoute={handleShareRoute}
            onControlVehicle={category === 'vehicles' ? handleVehicleControl : undefined}
            onDeleteVehicle={category === 'vehicles' ? handleDeleteVehicle : undefined}
            isControlBusy={isVehicleControlBusy}
          />
        )}
      </div>

      {operationMessage && (
        <button type="button" className="dashboard-toast" onClick={() => setOperationMessage('')} aria-label="Cerrar mensaje">
          {operationMessage}
        </button>
      )}

      {isMobileSidebarOpen && (
        <div className="mobile-drawer-layer" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <button type="button" className="mobile-drawer-backdrop" aria-label="Cerrar menú" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="mobile-drawer-panel">
            <button type="button" className="mobile-drawer-close" aria-label="Cerrar menú" onClick={() => setIsMobileSidebarOpen(false)}>
              <X size={18} />
            </button>
            <LeftSidebarPanel
              category={category}
              entity={selectedEntity}
              vehicles={vehiclesList}
              onControlVehicle={category === 'vehicles' ? handleVehicleControl : undefined}
              onDeleteVehicle={category === 'vehicles' ? handleDeleteVehicle : undefined}
              isControlBusy={isVehicleControlBusy}
              userLocation={userLocation}
              isFollowingRoute={isFollowingRoute}
              onToggleRouteFollow={handleToggleRouteFollow}
              onShareRoute={handleShareRoute}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard