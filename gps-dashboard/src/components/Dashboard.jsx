import React, { useState, useEffect, useMemo, useRef } from 'react';
import { hasSupabaseConfig, supabase, withAuthRetry } from '../lib/supabase';
import CommandCenter from './command/CommandCenter';
import { useVehicles, useDevices, useAlerts, useGeofences } from '../hooks';
import { deleteVehicle, sendVehicleCommand, updateEntity } from '../lib/vehicleActions';
import { clearAllGpsCaches } from '../lib/gpsTracker';
import { createGeofence } from '../lib/queries';
import { EditEntityModal } from './EditEntityModal';

const Dashboard = () => {
  const { vehicles: supabaseVehicles, error: vehiclesError, lastSyncTime: vehiclesSyncTime, isStale: vehiclesStale, refetchVehicles } = useVehicles()
  const { devices: supabaseDevices, error: devicesError, isStale: devicesStale, lastSyncTime: devicesSyncTime, hideEphemeral } = useDevices()
  const { alerts: supabaseAlerts, error: alertsError } = useAlerts()
  const { geofences: supabaseGeofences, error: geofencesError } = useGeofences()

  const sharedVehicleId = new URLSearchParams(window.location.search).get('vehicle')

  // --- Estado persistente de vista ---
  const [category, setCategory] = useState(() => {
    const queryCategory = new URLSearchParams(window.location.search).get('category')
    if (queryCategory === 'devices' || queryCategory === 'vehicles' || queryCategory === 'all') return queryCategory
    const stored = localStorage.getItem('rg_category')
    return stored === 'vehicles' || stored === 'all' ? stored : 'devices'
  })

  const activeNetworkError = (category === 'devices' ? devicesError : vehiclesError) || alertsError || geofencesError

  const handleCategoryChange = (next) => {
    setCategory(next)
    localStorage.setItem('rg_category', next)
    setSelectedEntity(null)
    setFlyToTrigger(null)
  }

  // --- Datos con fallback ---
  const [localVehicles, setLocalVehicles] = useState([])
  const [localGeofences, setLocalGeofences] = useState([])

  const vehicles = useMemo(
    () => (hasSupabaseConfig ? supabaseVehicles : localVehicles),
    [localVehicles, supabaseVehicles],
  )
  const devices = useMemo(
    () => (hasSupabaseConfig ? supabaseDevices : []),
    [supabaseDevices],
  )
  const alerts = useMemo(
    () => (hasSupabaseConfig ? supabaseAlerts : []),
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
  const [userLocation, setUserLocation] = useState(null)
  const [locateUserTrigger, setLocateUserTrigger] = useState(null)
  const [isFollowingRoute, setIsFollowingRoute] = useState(
    () => new URLSearchParams(window.location.search).get('follow') === '1',
  )
  const [pendingGeofenceConfirm, setPendingGeofenceConfirm] = useState(null)
  const [entityToEdit, setEntityToEdit] = useState(null)
  const [operationMessage, setOperationMessage] = useState('')
  const [alertFocusTrigger, setAlertFocusTrigger] = useState(null)
  const [isVehicleControlBusy, setIsVehicleControlBusy] = useState(false)
  const commandPollTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (commandPollTimeoutRef.current) clearTimeout(commandPollTimeoutRef.current)
    }
  }, [])

  const handleLogout = async () => {
    try {
      localStorage.removeItem('gps_dev_admin')
      clearAllGpsCaches()
      if (supabase) await supabase.auth.signOut()
    } catch (err) {
      console.error('Error al cerrar sesión:', err)
    }
  }

  // --- Listas por categoría ---
  const devicesList = devices
  const vehiclesList = vehicles
  const selectedEntityId = selectedEntity?.id

  useEffect(() => {
    const list = category === 'all' ? devicesList : (category === 'vehicles' ? vehiclesList : devicesList)
    if (!selectedEntityId) {
      if (list.length > 0) setSelectedEntity(list[0])
    } else {
      const updated = list.find((item) => item.id === selectedEntityId)
      if (updated) {
        setSelectedEntity((prev) => (prev ? { ...updated, controlState: prev.controlState } : updated))
      }
    }
  }, [category, devicesList, vehiclesList, selectedEntityId])

  const selectEntity = (entity) => {
    if (!entity) return
    setSelectedEntity({ ...entity, controlState: undefined })
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
      if (category !== 'vehicles' && category !== 'all') handleCategoryChange('vehicles')
      selectEntity(relatedVehicle, true)
    } else if (relatedDevice) {
      if (category !== 'devices' && category !== 'all') handleCategoryChange('devices')
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

  // --- Control vehicular ---
  const handleVehicleControl = async (command) => {
    if (!selectedEntity || category !== 'vehicles' || isVehicleControlBusy) return
    setIsVehicleControlBusy(true)
    setSelectedEntity((prev) => (prev ? { ...prev, controlState: 'command_pending' } : null))

    let commandResult
    try {
      commandResult = await sendVehicleCommand(selectedEntity.id, command, selectedEntity.deviceId || null)
    } catch (err) {
      setOperationMessage(`Error al enviar comando ${command}: ${err?.message || 'Error de red'}`)
      setSelectedEntity((prev) => (prev ? { ...prev, controlState: undefined } : null))
      setIsVehicleControlBusy(false)
      return
    }

    if (commandResult.error) {
      setOperationMessage(`Error al registrar comando ${command}: ${commandResult.error.message || 'Falló envío'}`)
      setSelectedEntity((prev) => (prev ? { ...prev, controlState: undefined } : null))
      setIsVehicleControlBusy(false)
      return
    }

    setOperationMessage(
      commandResult.remote
        ? `Comando ${command} en cola. Esperando confirmación física de relé...`
        : `Comando ${command} registrado localmente.`,
    )

    if (commandResult.commandId && supabase) {
      const commandId = commandResult.commandId
      let attempts = 0
      const maxAttempts = 30
      if (commandPollTimeoutRef.current) {
        clearTimeout(commandPollTimeoutRef.current)
        commandPollTimeoutRef.current = null
      }

      const schedulePoll = () => {
        commandPollTimeoutRef.current = setTimeout(async () => {
          attempts++
          try {
            const res = await withAuthRetry(async () =>
              supabase
                .from('vehicle_commands')
                .select('status')
                .eq('id', commandId)
                .maybeSingle()
            )
            const data = res?.data
            const error = res?.error

            if (!error && data) {
              if (data.status === 'received') {
                setOperationMessage(`Comando ${command} recibido por el APK. Ejecutando relé...`)
              } else if (data.status === 'done') {
                commandPollTimeoutRef.current = null
                setOperationMessage(`✅ Comando ${command} ejecutado exitosamente en el relé físico.`)
                setIsVehicleControlBusy(false)
                setSelectedEntity((prev) => (prev?.controlState === 'command_pending' ? { ...prev, controlState: undefined } : prev))
                return
              } else if (data.status === 'failed') {
                commandPollTimeoutRef.current = null
                setOperationMessage(`❌ Falló la ejecución del comando ${command} en el dispositivo.`)
                setIsVehicleControlBusy(false)
                setSelectedEntity((prev) => (prev?.controlState === 'command_pending' ? { ...prev, controlState: undefined } : prev))
                return
              }
            }
          } catch (err) {
            const status = err?.status ?? err?.code
            const isFatal = status === 401 || status === 403 || status === 404
            if (isFatal) {
              commandPollTimeoutRef.current = null
              const msg = status === 401 || status === 403
                ? `⚠️ Sesión expirada o sin permisos. Recarga la página.`
                : `⚠️ Comando ${command} no encontrado. Es posible que haya sido cancelado.`
              setOperationMessage(msg)
              setIsVehicleControlBusy(false)
              setSelectedEntity((prev) => (prev?.controlState === 'command_pending' ? { ...prev, controlState: undefined } : prev))
              return
            }
          }

          if (attempts >= maxAttempts) {
            commandPollTimeoutRef.current = null
            setOperationMessage(`⚠️ Tiempo de espera agotado esperando confirmación del comando ${command}.`)
            setIsVehicleControlBusy(false)
            setSelectedEntity((prev) => (prev?.controlState === 'command_pending' ? { ...prev, controlState: undefined } : prev))
            return
          }

          schedulePoll()
        }, 2000)
      }
      schedulePoll()
    } else {
      commandPollTimeoutRef.current = setTimeout(() => {
        commandPollTimeoutRef.current = null
        setIsVehicleControlBusy(false)
        setSelectedEntity((prev) => (prev?.controlState === 'command_pending' ? { ...prev, controlState: undefined } : prev))
      }, 5000)
    }
  }

  const handleDeleteVehicle = async (entityId) => {
    if (isVehicleControlBusy) return
    setIsVehicleControlBusy(true)
    const result = await deleteVehicle(entityId, category)
    if (result.error) {
      setOperationMessage(`No se pudo eliminar: ${result.error.message || 'Error desconocido'}`)
      setIsVehicleControlBusy(false)
      return
    }

    if (category === 'vehicles') {
      if (result.remote && refetchVehicles) await refetchVehicles();
      setLocalVehicles((prev) => {
        const remaining = prev.filter((v) => v.id !== entityId)
        setSelectedEntity(remaining[0] || null)
        return remaining
      });
    } else {
      setSelectedEntity(null);
    }

    setOperationMessage(result.remote ? (category === 'vehicles' ? 'Vehículo eliminado' : 'Dispositivo eliminado') : 'Eliminado del panel local')
    setIsVehicleControlBusy(false)
  }

  const handleEditVehicle = (entity) => {
    setEntityToEdit(entity);
  };

  const handleSaveEntity = async (entityId, currentCategory, updates) => {
    const result = await updateEntity(entityId, currentCategory, updates);
    if (result.error) {
      throw new Error(result.error.message || 'Error al guardar los cambios');
    }
    setOperationMessage('Cambios guardados con éxito');
    if (currentCategory === 'vehicles' && refetchVehicles) {
      refetchVehicles();
    }
  };

  // --- Seguir ruta ---
  const handleToggleRouteFollow = (entity) => {
    const target = entity?.position ? entity : selectedEntity
    if (!target?.position) {
      setIsFollowingRoute(false)
      setOperationMessage('Sin posición GPS para seguir')
      return
    }
    if (entity?.position && entity !== selectedEntity) selectEntity(entity)
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
    if ((category === 'vehicles' && vehiclesStale) || (category === 'devices' && devicesStale)) return 'Sin conexión (Desactualizado)'

    if (category === 'vehicles' && vehiclesSyncTime) {
      const date = new Date(vehiclesSyncTime)
      return `Act. ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }
    if (category === 'devices' && devicesSyncTime) {
      const date = new Date(devicesSyncTime)
      return `Act. ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }

    const lastUpdate = selectedEntity?.lastUpdate
    if (!lastUpdate || lastUpdate === '--') return 'Sin reporte'
    if (lastUpdate === 'En línea') return 'En línea'
    if (lastUpdate === 'Ahora') return 'Actualizado'
    return lastUpdate
  }, [activeNetworkError, selectedEntity?.lastUpdate, category, vehiclesStale, devicesStale, vehiclesSyncTime, devicesSyncTime])

  return (
    <div className="relative flex w-full flex-col bg-[#0b0f19] h-[100dvh] overflow-hidden">
      <CommandCenter
        category={category}
        onCategoryChange={handleCategoryChange}
        devices={devicesList}
        vehicles={vehiclesList}
        selectedEntity={selectedEntity}
        onSelectVehicle={(entity) => selectEntity(entity)}
        alerts={alerts}
        onSelectAlert={handleSelectAlert}
        geofences={geofences}
        isPlacingOnMap={isPlacingOnMap}
        onSetGeofence={() => {
          setIsPlacingOnMap(true)
          setPendingCenter(null)
        }}
        onCancelGeofence={() => {
          setIsPlacingOnMap(false)
          setPendingCenter(null)
        }}
        pendingCenter={pendingGeofenceConfirm ? pendingGeofenceConfirm.center : (isPlacingOnMap ? pendingCenter : null)}
        onMapClick={handleMapClickForGeofence}
        onMapHover={(latlng) => setPendingCenter(latlng)}
        isFollowingRoute={isFollowingRoute}
        onToggleRouteFollow={handleToggleRouteFollow}
        onShareRoute={handleShareRoute}
        userLocation={userLocation}
        onLocateUser={handleLocateUser}
        onLocationChange={setUserLocation}
        locateUserTrigger={locateUserTrigger}
        flyToTrigger={flyToTrigger}
        focusTrigger={alertFocusTrigger}
        onControlVehicle={handleVehicleControl}
        isControlBusy={isVehicleControlBusy}
        onDeleteVehicle={handleDeleteVehicle}
        onDeleteEphemeral={hideEphemeral}
        onEditVehicle={handleEditVehicle}
        onLogout={handleLogout}
        lastSyncLabel={lastSyncLabel}
      />

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

      {entityToEdit && (
        <EditEntityModal
          entity={entityToEdit}
          category={category}
          onClose={() => setEntityToEdit(null)}
          onSave={handleSaveEntity}
        />
      )}
    </div>
  )
}

export default Dashboard