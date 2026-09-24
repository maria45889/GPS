import React from 'react';
import { Navigation, Share2, Radio, MapPin } from 'lucide-react';
import { VehicleControlCard } from './VehicleControlCard';
import { normalizeBattery, sanitizeAccuracy } from '../lib/queries';

const DeviceInfo = ({ entity, onToggleRouteFollow, isFollowingRoute, onShareRoute }) => {
  if (!entity) {
    return <div className="dashboard-telemetry border-b border-[#26343b] p-4 text-[12px] text-[#6a8994]">Esperando dispositivo GPS…</div>
  }
  const status = entity.status === 'active' || entity.status === 'online' ? 'En línea' : entity.status === 'stopped' ? 'Detenido' : entity.status === 'immobilized' ? 'Inmovilizado' : 'Offline'
  const batteryVal = normalizeBattery(entity.battery);
  const accVal = sanitizeAccuracy(entity.accuracy);

  return (
    <div className="device-info-card">
      <div className="card-header-row">
        <div className="min-w-0">
          <p className="eyebrow-text">Ubicación del dispositivo</p>
          <h3 className="card-title">{entity.name}</h3>
          <span className="card-subtitle"><span>{entity.model ? `${entity.model} · ` : ''}</span><span>{entity.platform || 'GPS'}</span></span>
        </div>
        <span className={`dashboard-status-dot ${entity.status}`} aria-label={status} />
      </div>

      <div className="stat-metric-grid">
        <div><span>Velocidad</span><strong>{entity.speed || 0} km/h</strong></div>
        <div><span>Batería</span><strong>{batteryVal}%</strong></div>
        <div><span>Precisión</span><strong>{accVal !== null ? `${accVal} m` : '--'}</strong></div>
        <div><span>Reporte</span><strong>{entity.lastUpdate || '--'}</strong></div>
      </div>

      <div className="action-button-row">
        <button
          type="button"
          onClick={onToggleRouteFollow}
          disabled={!entity?.position}
          title={!entity?.position ? 'Sin posición GPS para seguir' : ''}
          className={`panel-primary-button ${isFollowingRoute && entity?.position ? 'is-active' : ''} ${!entity?.position ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Navigation size={13} /> <span>{isFollowingRoute && entity?.position ? 'Siguiendo' : 'Seguir ubicación'}</span>
        </button>
        <button type="button" onClick={onShareRoute} className="panel-secondary-button">
          <Share2 size={13} /> <span>Compartir</span>
        </button>
      </div>

      <div className="panel-helper-text">
        El mapa mantiene el foco del equipo y marca la guía visual para que el usuario entienda su posición en tiempo real.
      </div>
    </div>
  )
}

export const LeftSidebarPanel = ({
  category = 'vehicles',
  vehicles = [],
  entity,
  onControlVehicle,
  onDeleteVehicle,
  isControlBusy,
  userLocation,
  isFollowingRoute,
  onToggleRouteFollow,
  onShareRoute,
  selectedVehicle,
}) => {
  const currentEntity = entity ?? selectedVehicle ?? null
  const effectiveCategory = category === 'devices' || category === 'vehicles' ? category : currentEntity?.plate ? 'vehicles' : 'devices'
  const rawBattery = currentEntity?.battery
  const hasBattery = rawBattery !== null && rawBattery !== undefined && Number.isFinite(Number(rawBattery))
  const batteryVal = hasBattery ? Math.max(0, Math.min(100, Number(rawBattery))) : null
  const batteryDisplay = batteryVal !== null ? `${batteryVal}%` : '--'
  const batteryHours = batteryVal !== null ? (batteryVal * 0.48).toFixed(1) : '--'
  const apkUrl = import.meta.env.VITE_ANDROID_APK_URL
  const fleetCount = vehicles.length
  const onRoute = vehicles.filter((vehicle) => vehicle.status === 'active' || vehicle.status === 'online').length
  const stopped = vehicles.filter((vehicle) => vehicle.status === 'stopped').length
  const offline = vehicles.filter((vehicle) => vehicle.status === 'offline' || vehicle.status === 'unknown').length

  return (
    <div className="dashboard-left-panel hidden w-[248px] shrink-0 flex-col overflow-hidden rounded-[12px] border border-[#213a46] bg-[#0d1a24] text-[13px] lg:flex">
      {effectiveCategory === 'devices' ? (
        <DeviceInfo
          entity={currentEntity}
          isFollowingRoute={isFollowingRoute}
          onToggleRouteFollow={onToggleRouteFollow}
          onShareRoute={onShareRoute}
        />
      ) : (
        <div className="vehicle-info-card">
          <div className="card-header-row">
            <div className="min-w-0">
              <p className="eyebrow-text">Vehículo seleccionado</p>
              <h3 className="card-title">{currentEntity?.name || 'Sin vehículo'}</h3>
              <span className="card-subtitle"><span>{currentEntity?.plate || '--'}</span> · <span>{currentEntity?.location || 'Ubicación pendiente'}</span></span>
            </div>
            <span className={`dashboard-status-dot ${currentEntity?.status || 'offline'}`} aria-label="Vehículo conectado" />
          </div>

          <div className="stat-metric-grid">
            <div><span>Velocidad</span><strong>{currentEntity?.speed || 0} km/h</strong></div>
            <div><span>Batería</span><strong>{batteryDisplay}</strong></div>
            <div><span>Autonomía</span><strong>{batteryHours !== '--' ? `${batteryHours} h aprox.` : '--'}</strong></div>
            <div><span>Actualizado</span><strong>{currentEntity?.lastUpdate || '--'}</strong></div>
          </div>

          <div className="bar-track mt-3">
            <div className="bar-fill" style={{ width: `${batteryVal !== null ? batteryVal : 0}%` }} />
          </div>
        </div>
      )}

      {effectiveCategory === 'devices' ? (
        <div className="border-b border-[#26343b] px-4 pb-4">
          <h3 className="mb-3 mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73838a]">Qué ves aquí</h3>
          <p className="text-[12px] leading-relaxed text-[#9aa9ad]">
            El panel sigue la ubicación real del dispositivo GPS que envía coordenadas cada 30 s. Selecciónalo en la lista o en el mapa.</p>
        </div>
      ) : (
        <VehicleControlCard vehicle={currentEntity} onControl={onControlVehicle} onDelete={onDeleteVehicle} isBusy={isControlBusy} />
      )}

      <div className="border-b border-[#26343b] px-4 pb-4">
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73838a]">Resumen <span>{effectiveCategory === 'vehicles' ? 'de flota' : 'de dispositivos'}</span></h3>
        <div className="space-y-2 text-[12px] text-[#9aa9ad]">
          <div className="flex items-center justify-between"><span>{effectiveCategory === 'vehicles' ? 'Vehículos' : 'Dispositivos'}</span><strong className="text-[#edf5ef]">{fleetCount}</strong></div>
          <div className="flex items-center justify-between"><span>En línea</span><strong className="text-[#b8f36b]">{onRoute}</strong></div>
          <div className="flex items-center justify-between"><span>Detenidos</span><strong className="text-[#f2c66d]">{stopped}</strong></div>
          <div className="flex items-center justify-between"><span>Offline</span><strong className="text-[#8b9ba1]">{offline}</strong></div>
        </div>
      </div>

      {effectiveCategory === 'vehicles' && (
        <div className="border-b border-[#26343b] p-4">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73838a]">Alerta reciente</h3>
          <div className="rounded-[8px] border border-[#5a4430] bg-[#2a2119] p-3">
            <p className="text-[12px] font-medium text-[#f2d7a2]">Revisa la lista de alertas en el mapa.</p>
            <p className="mt-1 text-[11px] text-[#aa9270]">Las alertas activas se muestran arriba del mapa.</p>
          </div>
        </div>
      )}

      {effectiveCategory === 'devices' && userLocation?.position && (
        <div className="flex items-start gap-2 border-b border-[#26343b] px-4 py-3 text-[11px] text-[#6a8994]">
          <MapPin size={13} className="mt-[1px] shrink-0 text-[#b8f36b]" />
          <span>Operador: {userLocation.position.map((value) => value.toFixed(5)).join(', ')}</span>
        </div>
      )}

      <div className="dashboard-apk-card mt-auto p-4">
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73838a]">Aplicación Android</h3>
        <p className="text-[12px] font-semibold text-[#edf5ef]">APK de control GPS</p>
        <p className="mt-1 text-[11px] text-[#6a8994]">{apkUrl ? 'Alojado y disponible' : 'Alojamiento pendiente de configurar'}</p>
        {apkUrl && <a href={apkUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-[8px] bg-[#168ca4] py-2 text-center text-[11px] font-bold text-white"><Radio size={13} /> Abrir APK</a>}
      </div>
    </div>
  )
}