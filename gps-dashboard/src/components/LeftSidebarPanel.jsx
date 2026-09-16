import React from 'react';
import { Navigation, Share2, Radio, MapPin } from 'lucide-react';
import { VehicleControlCard } from './VehicleControlCard';

const DeviceInfo = ({ entity, onToggleRouteFollow, isFollowingRoute, onShareRoute }) => {
  if (!entity) {
    return <div className="dashboard-telemetry border-b border-[#26343b] p-4 text-[12px] text-[#6a8994]">Esperando dispositivo GPS…</div>
  }
  const status = entity.status === 'active' ? 'En línea' : entity.status === 'stopped' ? 'Detenido' : 'Offline'

  return (
    <div className="dashboard-telemetry border-b border-[#26343b] px-4 pb-4">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73838a]">Dispositivo seleccionado</h3>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <strong className="block truncate text-[14px] text-[#edf5ef]">{entity.name}</strong>
          <span className="block truncate text-[11px] text-[#6a8994]">{entity.model ? `${entity.model} · ` : ''}{entity.platform || 'GPS'}</span>
        </div>
        <span className={`dashboard-status-dot ${entity.status}`} aria-label={status} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div><span className="block text-[#6a8994]">Velocidad</span><strong>{entity.speed || 0} km/h</strong></div>
        <div><span className="block text-[#6a8994]">Batería</span><strong>{entity.battery ? `${entity.battery}%` : '--'}</strong></div>
        <div><span className="block text-[#6a8994]">Precisión</span><strong>{entity.accuracy ? `${Math.round(entity.accuracy)} m` : '--'}</strong></div>
        <div><span className="block text-[#6a8994]">Reporte</span><strong>{entity.lastUpdate || '--'}</strong></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onToggleRouteFollow} className={`flex items-center justify-center gap-2 rounded-[7px] border px-2 py-2 text-[11px] font-bold transition-colors ${isFollowingRoute ? 'border-[#35b9c9] bg-[#123a43] text-[#9feeff]' : 'border-[#28566a] bg-[#102b38] text-[#c8e0e7] hover:border-[#35b9c9]'}`}>
          <Navigation size={13} /> {isFollowingRoute ? 'Siguiendo' : 'Seguir'}
        </button>
        <button type="button" onClick={onShareRoute} className="flex items-center justify-center gap-2 rounded-[7px] border border-[#28566a] bg-[#102b38] px-2 py-2 text-[11px] font-bold text-[#c8e0e7] transition-colors hover:border-[#b8f36b]/50 hover:text-[#b8f36b]">
          <Share2 size={13} /> Compartir
        </button>
      </div>
    </div>
  )
}

export const LeftSidebarPanel = ({
  category = 'devices',
  vehicles = [],
  entity,
  onControlVehicle,
  onDeleteVehicle,
  isControlBusy,
  userLocation,
  isFollowingRoute,
  onToggleRouteFollow,
  onShareRoute,
}) => {
  const batteryHours = Math.max(1, Math.round(((category === 'vehicles' ? entity?.battery : 0) || 0) / 18))
  const apkUrl = import.meta.env.VITE_ANDROID_APK_URL
  const fleetCount = category === 'devices' ? vehicles.length : vehicles.length
  const onRoute = vehicles.filter((v) => v.status === 'active').length
  const stopped = vehicles.filter((v) => v.status === 'stopped').length
  const offline = vehicles.filter((v) => v.status === 'offline' || v.status === 'unknown').length

  return (
    <div className="dashboard-left-panel hidden w-[248px] shrink-0 flex-col overflow-hidden rounded-[12px] border border-[#2a3a40] bg-[#151e23] text-[13px] lg:flex">
      {category === 'devices' ? (
        <DeviceInfo
          entity={entity}
          isFollowingRoute={isFollowingRoute}
          onToggleRouteFollow={onToggleRouteFollow}
          onShareRoute={onShareRoute}
        />
      ) : (
        <div className="dashboard-telemetry border-b border-[#26343b] px-4 pb-4">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73838a]">Vehículo seleccionado</h3>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <strong className="block text-[14px] text-[#edf5ef]">{entity?.name || 'Sin vehículo'}</strong>
              <span className="text-[11px] text-[#6a8994]">{entity?.plate || '--'} · {entity?.location || 'Ubicación pendiente'}</span>
            </div>
            <span className="dashboard-status-dot" aria-label="Vehículo conectado" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div><span className="block text-[#6a8994]">Velocidad</span><strong>{entity?.speed || 0} km/h</strong></div>
            <div><span className="block text-[#6a8994]">Batería</span><strong>{entity?.battery || 0}%</strong></div>
            <div><span className="block text-[#6a8994]">Autonomía</span><strong>{batteryHours} h aprox.</strong></div>
            <div><span className="block text-[#6a8994]">Actualizado</span><strong>{entity?.lastUpdate || '--'}</strong></div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e3eef2]">
            <div className="h-full rounded-full bg-[#35b9c9]" style={{ width: `${entity?.battery || 0}%` }} />
          </div>
        </div>
      )}

      {category === 'devices' ? (
        <div className="border-b border-[#26343b] px-4 pb-4">
          <h3 className="mb-3 mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73838a]">Qué ves aquí</h3>
          <p className="text-[12px] leading-relaxed text-[#9aa9ad]">
            El panel sigue la ubicación real del dispositivo GPS que envía coordenadas cada 30 s. Selecciónalo en la lista o el mapa.</p>
        </div>
      ) : (
        <VehicleControlCard vehicle={entity} onControl={onControlVehicle} onDelete={onDeleteVehicle} isBusy={isControlBusy} />
      )}

      <div className="border-b border-[#26343b] px-4 pb-4">
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73838a]">Resumen {category === 'vehicles' ? 'de flota' : 'de dispositivos'}</h3>
        <div className="space-y-2 text-[12px] text-[#9aa9ad]">
          <div className="flex justify-between items-center"><span>{category === 'vehicles' ? 'Vehículos' : 'Dispositivos'}</span><strong className="text-[#edf5ef]">{fleetCount}</strong></div>
          <div className="flex justify-between items-center"><span>En línea</span><strong className="text-[#b8f36b]">{onRoute}</strong></div>
          <div className="flex justify-between items-center"><span>Detenidos</span><strong className="text-[#f2c66d]">{stopped}</strong></div>
          <div className="flex justify-between items-center"><span>Offline</span><strong className="text-[#8b9ba1]">{offline}</strong></div>
        </div>
      </div>

      {category === 'vehicles' && (
        <div className="border-b border-[#26343b] p-4">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73838a]">Alerta reciente</h3>
          <div className="rounded-[8px] border border-[#5a4430] bg-[#2a2119] p-3">
            <p className="text-[12px] font-medium text-[#f2d7a2]">Revisa la lista de alertas en el mapa.</p>
            <p className="mt-1 text-[11px] text-[#aa9270]">Las alertas activas se muestran arriba del mapa.</p>
          </div>
        </div>
      )}

      {category === 'devices' && userLocation && (
        <div className="flex items-start gap-2 border-b border-[#26343b] px-4 py-3 text-[11px] text-[#6a8994]">
          <MapPin size={13} className="mt-[1px] shrink-0 text-[#b8f36b]" />
          <span>Operador: {userLocation.position.map((v) => v.toFixed(5)).join(', ')}</span>
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