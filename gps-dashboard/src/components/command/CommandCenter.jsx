import React, { useEffect, useMemo, useRef, useState } from 'react'
import MapArea from '../MapArea'
import TopBar from './TopBar'
import DetailPanel from './DetailPanel'
import FleetPanel from './FleetPanel'
import BottomBar from './BottomBar'
import { useSimulatedFleet } from './useSimulatedFleet'
import { normalizeEntity } from './normalize'

const toMapShape = (e, original = null) => ({
  id: e.id,
  name: e.name,
  plate: e.plate,
  driver: e.driver || (e._kind === 'vehicle' ? 'Dispositivo GPS' : null),
  status: e.status || 'offline',
  speed: e.speed || 0,
  bearing: e.bearing || 0,
  battery: e.battery ?? 0,
  accuracy: e.accuracy ?? null,
  lastUpdate: e.lastUpdate || '--',
  position: e.position || null,
  route: e.route || [],
  controlState: original?.controlState,
})

const CommandCenter = ({
  category,
  onCategoryChange,
  devices,
  vehicles,
  selectedEntity,
  onSelectVehicle,
  alerts,
  onSelectAlert,
  geofences,
  isPlacingOnMap,
  onSetGeofence,
  onCancelGeofence,
  pendingCenter,
  onMapClick,
  onMapHover,
  isFollowingRoute,
  onToggleRouteFollow,
  onShareRoute,
  userLocation,
  onLocateUser,
  onLocationChange,
  locateUserTrigger,
  flyToTrigger,
  focusTrigger,
  onControlVehicle,
  isControlBusy,
  onDeleteVehicle,
  onEditVehicle,
  onLogout,
  lastSyncLabel,
}) => {
  const [baseLayer, setBaseLayer] = useState('dark')
  const [fleetOpen, setFleetOpen] = useState(false)
  const onSelectRef = useRef(onSelectVehicle)
  useEffect(() => {
    onSelectRef.current = onSelectVehicle
  }, [onSelectVehicle])

  // --- Flota consolidada (reales + simulados cuando hay poca data) ---
  const realFleet = useMemo(() => {
    const list =
      category === 'devices'
        ? devices.map((e) => ({ ...normalizeEntity(e), _kind: 'device' }))
        : category === 'vehicles'
          ? vehicles.map((e) => ({ ...normalizeEntity(e), _kind: 'vehicle' }))
          : [
              ...vehicles.map((e) => ({ ...normalizeEntity(e), _kind: 'vehicle' })),
              ...devices.map((e) => ({ ...normalizeEntity(e), _kind: 'device' })),
            ]

    const seen = new Set()
    return list.filter((e) => {
      if (seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })
  }, [category, devices, vehicles])

  const simulated = useSimulatedFleet(realFleet.length)
  const combined = useMemo(() => [...realFleet, ...simulated.units], [realFleet, simulated.units])

  // --- Entidad activa ---
  const active = useMemo(() => {
    if (selectedEntity) return normalizeEntity(selectedEntity)
    return combined[0] || null
  }, [selectedEntity, combined])

  const activeOriginal = selectedEntity || null

  // Auto-seleccionar la primera entidad cuando no hay ninguna
  useEffect(() => {
    if (active || combined.length === 0) return undefined
    onSelectRef.current(combined[0])
    return undefined
  }, [active, combined]) // eslint-disable-line react-hooks/exhaustive-deps/exhaustive-deps

  // Entidades para el mapa
  const mapEntities = useMemo(() => combined.map((e) => toMapShape(e)), [combined])
  const selectedVehicle = useMemo(() => (active ? toMapShape(active, activeOriginal) : null), [active, activeOriginal])

  const stats = useMemo(() => {
    const online = combined.filter((e) => e.status === 'active' || e.status === 'online').length
    return { total: combined.length, online, offline: combined.length - online }
  }, [combined])

  const handleSelectFromFleet = (entity) => {
    onSelectRef.current(entity)
    setFleetOpen(false)
  }

  const handleToggleRouteFollow = () => {
    if (active?.position) onSelectRef.current(active)
    onToggleRouteFollow?.(active || undefined)
  }

  const handleDeleteEntity = (entity) => {
    if (!entity) return
    if (entity?._mock) {
      simulated.removeUnit(entity.id)
      return
    }
    onDeleteVehicle?.(entity.id)
  }

  return (
    <div className="reference-dashboard cmd-center relative h-full w-full overflow-hidden bg-[#0b0f19] text-slate-100">
      {/* Mapa de fondo a pantalla completa */}
      <div className="absolute inset-0 z-0">
        <MapArea
          category={category}
          vehicles={mapEntities}
          selectedVehicle={selectedVehicle}
          onSelectVehicle={onSelectVehicle}
          alerts={alerts}
          onSelectAlert={onSelectAlert}
          geofences={geofences}
          isPlacingOnMap={isPlacingOnMap}
          pendingCenter={pendingCenter}
          onMapClick={onMapClick}
          onMapHover={onMapHover}
          isFollowingRoute={isFollowingRoute}
          onToggleRouteFollow={onToggleRouteFollow}
          onShareRoute={onShareRoute}
          userLocation={userLocation}
          onLocationChange={onLocationChange}
          locateUserTrigger={locateUserTrigger}
          flyToTrigger={flyToTrigger}
          focusTrigger={focusTrigger}
          baseLayer={baseLayer}
          onBaseLayerChange={setBaseLayer}
          hideControls
          hideSelectionBar
        />
      </div>

      {/* Grid HUD decorativo */}
      <div className="pointer-events-none absolute inset-0 z-[1] cmd-grid" />

      {/* Overlays */}
      <TopBar
        category={category}
        onCategoryChange={onCategoryChange}
        stats={stats}
        alertsCount={(alerts || []).filter((a) => a.status !== 'resolved').length}
        onMenuClick={() => setFleetOpen(true)}
        onLogout={onLogout}
        lastSyncLabel={lastSyncLabel}
      />

      {/* Panel izquierdo - Detalle */}
      <div className="pointer-events-none absolute left-4 top-[5.5rem] bottom-28 z-20 hidden xl:block">
        <div className="pointer-events-auto max-h-full overflow-y-auto cmd-scroll">
          <DetailPanel
            entity={active}
            category={category}
            onToggleRouteFollow={handleToggleRouteFollow}
            isFollowingRoute={isFollowingRoute}
            onShareRoute={onShareRoute}
            onControlVehicle={category === 'vehicles' ? onControlVehicle : undefined}
            isControlBusy={isControlBusy}
            onDeleteEntity={handleDeleteEntity}
            onEditVehicle={onEditVehicle}
          />
        </div>
      </div>

      {/* Panel derecho - Flota (escritorio) */}
      <div className="pointer-events-none absolute right-4 top-[5.5rem] bottom-28 z-20 hidden lg:block">
        <div className="pointer-events-auto max-h-full overflow-y-auto cmd-scroll">
          <FleetPanel
            entities={combined}
            selectedId={active?.id}
            onSelectEntity={handleSelectFromFleet}
            onDeleteEntity={handleDeleteEntity}
            onResetDemos={simulated.resetDemos}
            userLocation={userLocation}
            onLocateUser={onLocateUser}
            onSetGeofence={onSetGeofence}
            alerts={alerts}
            onSelectAlert={onSelectAlert}
          />
        </div>
      </div>

      {/* Drawer móvil de flota */}
      {fleetOpen && (
        <div className="absolute inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFleetOpen(false)} aria-label="Cerrar panel" />
          <div className="absolute right-0 top-0 h-full max-h-[88vh] overflow-y-auto cmd-scroll p-3">
            <FleetPanel
              entities={combined}
              selectedId={active?.id}
              onSelectEntity={handleSelectFromFleet}
              onDeleteEntity={handleDeleteEntity}
              onResetDemos={simulated.resetDemos}
              userLocation={userLocation}
              onLocateUser={onLocateUser}
              onSetGeofence={onSetGeofence}
              alerts={alerts}
              onSelectAlert={onSelectAlert}
            />
          </div>
        </div>
      )}

      {/* Aviso al colocar geocerca */}
      {isPlacingOnMap && (
        <div className="absolute left-1/2 top-20 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-[#f59e0b] bg-[#23200f]/90 px-4 py-2 text-[11px] font-bold text-[#fbbf24] shadow-[0_4px_20px_rgba(245,158,11,0.35)] backdrop-blur-md">
          Toca o haz clic en el mapa para ubicar la geocerca
          <button
            type="button"
            onClick={onCancelGeofence}
            className="rounded-full bg-[#f59e0b]/20 px-2.5 py-0.5 text-[9px] uppercase tracking-wider text-[#fcd34d] hover:bg-[#f59e0b]/30"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Barra inferior */}
      <BottomBar
        entity={active}
        onToggleRouteFollow={handleToggleRouteFollow}
        isFollowingRoute={isFollowingRoute}
        baseLayer={baseLayer}
        onBaseLayerChange={setBaseLayer}
      />
    </div>
  )
}

export default CommandCenter