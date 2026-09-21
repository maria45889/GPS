import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import MapArea from './MapArea';
import { LeftSidebarPanel } from './LeftSidebarPanel';
import { RightSidebarPanel } from './RightSidebarPanel';
import { HeaderBar } from './HeaderBar';
import { initialFleet } from '../data/fleetData';
import { initialAlerts } from '../data/alertsData';
import { initialGeofences } from '../data/geofencesData';
import { useVehicles, useDevices, useAlerts, useGeofences } from '../hooks';
import { VehicleDetailPanel } from './VehicleDetailPanel';
import { deleteVehicle, sendVehicleCommand } from '../lib/vehicleActions';
import { clearAllGpsCaches } from '../lib/gpsTracker';
import { createGeofence } from '../lib/queries';

// Construye la entidad mostrada en el mapa con los campos que MapArea espera
const buildMapEntity = (source) => ({
  id: source.id,
  name: source.name,
  plate: source.plate || source.id,
  driver: source.driver || null,
  status: source.status || 'offline',
  speed: source.speed || 0,
  bearing: source.bearing || 0,
  battery: (source.battery !== null && source.battery !== undefined && Number.isFinite(Number(source.battery))) ? Number(source.battery) : 0,
  accuracy: (source.accuracy !== null && source.accuracy !== undefined && Number.isFinite(Number(source.accuracy))) ? Number(source.accuracy) : null,
  lastUpdate: source.lastUpdate || '--',
  position: source.position || null,
  route: source.route || [],
  controlState: source.controlState,
})

const Dashboard = () => {
  const { vehicles: supabaseVehicles, error: vehiclesError } = useVehicles()
  const { devices: supabaseDevices, error: devicesError } = useDevices()
  const { alerts: supabaseAlerts, error: alertsError } = useAlerts()
  const { geofences: supabaseGeofences, error: geofencesError } = useGeofences()

  const sharedVehicleId = new URLSearchParams(window.location.search).get('vehicle')

  // --- Estado persistente de vista ---
  const [category, setCategory] = useState(() => {
    const queryCategory = new URLSearchParams(window.location.search).get('category')
    if (queryCategory === 'devices' || queryCategory === 'vehicles') return queryCategory
    const stored = localStorage.getItem('rg_category')
    return stored === 'vehicles' ? 'vehicles' : 'devices'
  })

  const activeNetworkError = (category === 'devices' ? devicesError : vehiclesError) || alertsError || geofencesError

  const handleCategoryChange = (next) => {
    setCategory(next)
    localStorage.setItem('rg_category', next)
    setSelectedEntity(null)
    setFlyToTrigger(null)
    setIsVehicleDetailOpen(false)
  }

  // --- Datos con fallback ---
  const [localVehicles, setLocalVehicles] = useState(initialFleet)
  const [localGeofences, setLocalGeofences] = useState(initialGeofences)

  const vehicles = useMemo(
    () => (hasSupabaseConfig ? supabaseVehicles : localVehicles),
    [localVehicles, supabaseVehicles],
  )
  const devices = useMemo(
    () => (hasSupabaseConfig ? supabaseDevices : []),
    [supabaseDevices],
  )
  const alerts = useMemo(
    () => (hasSupabaseConfig ? supabaseAlerts : initialAlerts),
    [supabaseAlerts],
  )
  const geofences = useMemo(
    () => (hasSupabaseConfig ? supabaseGeofences : localGeofences),
    [localGeofences, supabaseGeofences],
  )

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
  const [pendingGeofenceConfirm, setPendingGeofenceConfirm] = useState(null)
  const drawerPanelRef = useRef(null)

  const closeMobileDrawer = () => {
    setIsMobileSidebarOpen(false)
    if (window.history.state?.drawerOpen) {
      window.history.back()
    }
  }

  useEffect(() => {
    if (!isMobileSidebarOpen) return undefined

    window.history.pushState({ drawerOpen: true }, '')
    const handlePopState = () => {
      setIsMobileSidebarOpen(false)
    }
    window.addEventListener('popstate', handlePopState)

    const timer = setTimeout(() => {
      drawerPanelRef.current?.querySelector('button')?.focus()
    }, 50)

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeMobileDrawer()
      } else if (e.key === 'Tab' && drawerPanelRef.current) {
        const focusables = drawerPanelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([-1])'
        )
        if (focusables.length > 0) {
          const first = focusables[0]
          const last = focusables[focusables.length - 1]
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileSidebarOpen])
  const [operationMessage, setOperationMessage] = useState('')
  const [alertFocusTrigger, setAlertFocusTrigger] = useState(null)
  const [isVehicleControlBusy, setIsVehicleControlBusy] = useState(false)

  const handleLogout = async () => {
    localStorage.removeItem('gps_dev_admin')
    clearAllGpsCaches()
    if (supabase) await supabase.auth.signOut()
  }

  // --- Listas por categoría ---
  const devicesList = devices
  const vehiclesList = vehicles

  // Entidad actual según la categoría
  const selectedEntityId = selectedEntity?.id


  useEffect(() => {
    const list = category === 'devices' ? devicesList : vehiclesList
    if (!selectedEntityId) {
      if (list.length > 0) setSelectedEntity(list[0])
    } else {
      const updated = list.find((item) => item.id === selectedEntityId)
      if (updated) {
        setSelectedEntity((prev) => (prev ? { ...updated, controlState: prev.controlState } : updated))
      }
    }
  }, [category, devicesList, vehiclesList, selectedEntityId])

  const selectEntity = (entity, openDetail = false) => {
    if (!entity) return
    setSelectedEntity({ ...entity, controlState: undefined })
    setIsVehicleDetailOpen(openDetail)
    if (entity.position) {
      setFlyToTrigger({ coords: entity.position, zoom: 16, timestamp: Date.now() })
    }
  }

  // --- Compartir ---
  const handleShareRoute = async () => {
    if (!selectedEntity) return
    const routeUrl = new URL(window.location.href)
    routeUrl.searchParams.set('vehicle', selectedEntity.id)
    routeUrl.searchParams.set('category', category)
    routeUrl.searchParams.set('follow', '1')
    const shareData = {
      title: `Ubicación de ${selectedEntity.name}`,
      text: `Ubicación GPS de ${selectedEntity.name} (${selectedEntity.plate || selectedEntity.id})`,
      url: routeUrl.toString(),
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(shareData.url)
        setOperationMessage('Enlace copiado')
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = shareData.url
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        if (successful) {
          setOperationMessage('Enlace copiado al portapapeles')
        } else {
          setOperationMessage(`Copia este enlace: ${shareData.url}`)
        }
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setOperationMessage('No se pudo compartir')
    }
  }

  // --- Alertas ---
  const handleSelectAlert = (alert) => {
    if (Number.isFinite(alert.lat) && Number.isFinite(alert.lng)) {
      setFlyToTrigger({ coords: [alert.lat, alert.lng], zoom: 16, timestamp: Date.now() })
      setAlertFocusTrigger({ id: alert.id, coords: [alert.lat, alert.lng], zoom: 16, timestamp: Date.now() })
    }
    const relatedVehicle = vehiclesList.find((v) => v.id === alert.vehicleId)
    const relatedDevice = devicesList.find((d) => d.id === alert.vehicleId)

    if (relatedVehicle) {
      if (category !== 'vehicles') {
        handleCategoryChange('vehicles')
        setOperationMessage('Cambiado a vista de Motos por alerta seleccionada')
      }
      selectEntity(relatedVehicle, true)
    } else if (relatedDevice) {
      if (category !== 'devices') {
        handleCategoryChange('devices')
        setOperationMessage('Cambiado a vista de Dispositivos por alerta seleccionada')
      }
      selectEntity(relatedDevice, true)
    }
  }


  // --- Geocerca ---
  const handleMapClickForGeofence = (latlng) => {
    setIsPlacingOnMap(false)
    setPendingCenter(null)
    setPendingGeofenceConfirm({
      center: latlng,
      name: 'Nueva geocerca',
      radius: 300,
    })
  }

  const handleConfirmGeofence = async () => {
    if (!pendingGeofenceConfirm) return
    const { center, radius, name } = pendingGeofenceConfirm
    const newGeo = {
      name,
      type: 'circle',
      center,
      positions: [center],
      radius: radius || 300,
      color: '#168ca4',
      rule: 'outside',
      active: true,
    }
    if (hasSupabaseConfig && supabase) {
      try {
        const saved = await createGeofence(newGeo)
        if (saved) {
          setLocalGeofences((prev) => [saved, ...prev])
          setOperationMessage('Geocerca guardada con éxito')
          setPendingGeofenceConfirm(null)
          setPendingCenter(null)
        }
      } catch (err) {
        console.error('Error al guardar geocerca en Supabase:', err)
        setOperationMessage(`Error al guardar geocerca: ${err.message || 'Sin permisos'}. Puedes reintentar.`)
      }
    } else {
      setLocalGeofences((prev) => [{ id: `GEOF-${Date.now()}`, ...newGeo }, ...prev])
      setOperationMessage('Geocerca guardada localmente')
      setPendingGeofenceConfirm(null)
      setPendingCenter(null)
    }
  }

  const handleCancelGeofence = () => {
    setPendingGeofenceConfirm(null)
    setPendingCenter(null)
  }

  // --- Ubicación del operador ---
  const handleLocateUser = () => {
    setLocateUserTrigger({ timestamp: Date.now(), coords: userLocation?.position })
  }

  // --- Control vehicular (solo categoría motos) ---
  const handleVehicleControl = async (command) => {
    if (!selectedEntity || category !== 'vehicles' || isVehicleControlBusy) return
    setIsVehicleControlBusy(true)
    setSelectedEntity((prev) => (prev ? { ...prev, controlState: 'command_pending' } : null))

    const commandResult = await sendVehicleCommand(selectedEntity.id, command, selectedEntity.deviceId || null)
    if (commandResult.error) {
      setOperationMessage(`Error al registrar comando ${command}: ${commandResult.error.message || 'Falló envío'}`)
      setSelectedEntity((prev) => (prev ? { ...prev, controlState: undefined } : null))
      setIsVehicleControlBusy(false)
      return
    }

    setOperationMessage(
      commandResult.remote
        ? `Comando ${command} en cola. Esperando confirmación física de relé.`
        : `Comando ${command} registrado localmente.`,
    )
    setTimeout(() => {
      setIsVehicleControlBusy(false)
      setSelectedEntity((prev) => (prev?.controlState === 'command_pending' ? { ...prev, controlState: undefined } : prev))
    }, 15000)
  }

  const handleDeleteVehicle = async (vehicleId) => {
    if (category !== 'vehicles' || isVehicleControlBusy) return
    setIsVehicleControlBusy(true)
    const result = await deleteVehicle(vehicleId)
    if (result.error) {
      setOperationMessage('No se pudo eliminar el vehículo')
      setIsVehicleControlBusy(false)
      return
    }
    setLocalVehicles((prev) => {
      const remaining = prev.filter((v) => v.id !== vehicleId)
      setSelectedEntity(remaining[0] || null)
      setIsVehicleDetailOpen(false)
      return remaining
    })
    setOperationMessage(result.remote ? 'Vehículo eliminado' : 'Eliminado del panel local')
    setIsVehicleControlBusy(false)
  }

  // --- Seguir ruta ---
  const handleToggleRouteFollow = () => {
    if (!selectedEntity?.position) {
      setIsFollowingRoute(false)
      setOperationMessage('Sin posición GPS para seguir')
      return
    }
    setIsFollowingRoute((v) => !v)
  }

  // --- Compartido ---
  useEffect(() => {
    if (!sharedVehicleId) return
    const sharedCategory = new URLSearchParams(window.location.search).get('category')

    const inVehicles = vehiclesList.find((v) => v.id === sharedVehicleId)
    const inDevices = devicesList.find((d) => d.id === sharedVehicleId)

    const targetCategory = sharedCategory === 'devices'
      ? (inDevices ? 'devices' : null)
      : (sharedCategory === 'vehicles' ? (inVehicles ? 'vehicles' : null) : null)

    const resolvedCategory = targetCategory || (inDevices && !inVehicles ? 'devices' : (inVehicles ? 'vehicles' : (inDevices ? 'devices' : null)))
    const targetEntity = resolvedCategory === 'devices' ? inDevices : (resolvedCategory === 'vehicles' ? inVehicles : null)

    if (resolvedCategory && category !== resolvedCategory) {
      queueMicrotask(() => {
        setCategory(resolvedCategory)
        localStorage.setItem('rg_category', resolvedCategory)
      })
    }
    if (targetEntity) selectEntity(targetEntity)
  }, [sharedVehicleId, vehiclesList, devicesList]) // eslint-disable-line react-hooks/exhaustive-deps/exhaustive-deps

  // --- Última sincronización ---
  const lastSyncLabel = useMemo(() => {
    if (activeNetworkError) return 'Sin conexión (Desactualizado)'
    const lastUpdate = selectedEntity?.lastUpdate
    if (!lastUpdate || lastUpdate === '--') return 'Sin reporte'
    if (lastUpdate === 'En línea') return 'En línea'
    if (lastUpdate === 'Ahora') return 'Actualizado'
    return lastUpdate
  }, [activeNetworkError, selectedEntity?.lastUpdate])

  // --- Entidades para el mapa ---
  const mapEntities = useMemo(
    () => (category === 'devices' ? devices.map(buildMapEntity) : vehiclesList.map(buildMapEntity)),
    [category, devices, vehiclesList],
  )

  const activeAlerts = useMemo(() => alerts.filter((a) => a.status !== 'resolved'), [alerts])

  return (
    <div className="reference-dashboard relative flex flex-col w-full max-w-[1680px] h-[calc(100dvh-2rem)] overflow-hidden rounded-[14px] border border-[#1a3544] bg-[#07111c] shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:h-[calc(100dvh-2.5rem)]">
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
            vehicles={category === 'devices' ? devicesList : vehiclesList}
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
                pendingCenter={pendingGeofenceConfirm ? pendingGeofenceConfirm.center : (isPlacingOnMap ? pendingCenter : null)}
                onMapClick={handleMapClickForGeofence}
                onMapHover={(latlng) => setPendingCenter(latlng)}
                flyToTrigger={flyToTrigger}
                isFollowingRoute={isFollowingRoute}
                onToggleRouteFollow={handleToggleRouteFollow}
                onShareRoute={handleShareRoute}
                isVehicleDetailOpen={isVehicleDetailOpen}
                userLocation={userLocation}
                onLocationChange={setUserLocation}
                locateUserTrigger={locateUserTrigger}
              />

              {isPlacingOnMap && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-full border border-[#f59e0b] bg-[#11181d]/90 px-4 py-2 text-[12px] font-bold text-[#f59e0b] shadow-[0_4px_20px_rgba(245,158,11,0.3)] backdrop-blur-md">
                  <span>Toca o haz clic en el mapa para ubicar la geocerca</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlacingOnMap(false)
                      setPendingCenter(null)
                    }}
                    className="rounded-full bg-[#f59e0b]/20 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-[#fcd34d] hover:bg-[#f59e0b]/30"
                  >
                    Cancelar
                  </button>
                </div>
              )}

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
            onSetGeofence={() => {
              setIsPlacingOnMap(true)
              setPendingCenter(null)
            }}
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

      {!operationMessage && activeNetworkError && (
        <div className="dashboard-toast border border-[#ef5c72]/60 bg-[#250d12]/95 text-[#fca5a5]">
          ⚠️ Sin conexión a la red. Mostrando datos locales previamente cargados.
        </div>
      )}

      {isMobileSidebarOpen && (
        <div className="mobile-drawer-layer" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <button type="button" className="mobile-drawer-backdrop" aria-label="Cerrar menú" onClick={closeMobileDrawer} />
          <div className="mobile-drawer-panel" ref={drawerPanelRef}>
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-[#183546] pb-3">
              <div className="flex flex-1 items-center rounded-full border border-[#173344] bg-[#0d1d26] p-[3px]" role="tablist" aria-label="Categoría de vista en menú">
                {[
                  { id: 'devices', label: 'Dispositivos' },
                  { id: 'vehicles', label: 'Motos' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={category === item.id}
                    onClick={() => {
                      handleCategoryChange(item.id)
                      closeMobileDrawer()
                    }}
                    className={`flex-1 rounded-full py-1 text-[11px] font-bold uppercase tracking-[0.08em] transition-all ${
                      category === item.id
                        ? 'bg-[#1a2d36] text-[#b8f36b] shadow-[0_0_10px_rgba(184,243,107,0.14)]'
                        : 'text-[#5f7e87] hover:text-[#8fa5ad]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button type="button" className="mobile-drawer-close flex-shrink-0" aria-label="Cerrar menú" onClick={closeMobileDrawer}>
                <X size={18} />
              </button>
            </div>
            <RightSidebarPanel
              isMobile
              category={category}
              entities={category === 'devices' ? devicesList : vehiclesList}
              selectedEntity={selectedEntity}
              onSelectEntity={(entity) => {
                selectEntity(entity, true)
                closeMobileDrawer()
              }}
              onSetGeofence={() => {
                setIsPlacingOnMap(true)
                setPendingCenter(null)
                closeMobileDrawer()
              }}
              userLocation={userLocation}
              onLocateUser={() => {
                handleLocateUser()
                closeMobileDrawer()
              }}
            />
            <div className="mt-3">
              <LeftSidebarPanel
                category={category}
                entity={selectedEntity}
                vehicles={category === 'devices' ? devicesList : vehiclesList}
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
        </div>
      )}

      {pendingGeofenceConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Confirmar geocerca">
          <div className="w-full max-w-sm rounded-xl border border-[#28566a] bg-[#081825] p-5 shadow-2xl">
            <h3 className="text-[15px] font-bold text-[#effcff]">Confirmar Nueva Geocerca</h3>
            <p className="mt-2 text-[12px] text-[#89a9b5]">
              ¿Deseas crear una geocerca circular de <strong>300 metros</strong> en las coordenadas seleccionadas?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelGeofence}
                className="rounded-lg border border-[#28566a] bg-[#102b38] px-3.5 py-2 text-[11px] font-bold text-[#89a9b5] hover:text-[#effcff]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmGeofence}
                className="rounded-lg bg-[#b8f36b] px-4 py-2 text-[11px] font-extrabold text-[#07111c] shadow-[0_0_12px_rgba(184,243,107,0.2)] hover:bg-[#cbfb88]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
