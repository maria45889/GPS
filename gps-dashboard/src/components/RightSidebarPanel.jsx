import React, { useState } from 'react';
import { Search, Radar, Navigation } from 'lucide-react';

const statusLabel = (status) => {
  if (status === 'active') return 'En línea'
  if (status === 'stopped') return 'Detenido'
  return 'Offline'
}

const statusColor = (status) => {
  if (status === 'active') return 'bg-emerald-400'
  if (status === 'stopped') return 'bg-amber-400'
  return 'bg-slate-400'
}

export const RightSidebarPanel = ({
  category = 'devices',
  entities = [],
  selectedEntity,
  onSelectEntity,
  onSetGeofence,
  userLocation,
  onLocateUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const active = entities.filter((e) => e.status === 'active').length
  const offline = entities.filter((e) => e.status === 'offline' || e.status === 'unknown').length

  const filtered = entities.filter((entry) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return `${entry.name} ${entry.plate || ''} ${entry.id}`.toLowerCase().includes(term)
  })

  const plural = category === 'vehicles' ? 'Vehículos' : 'Dispositivos'

  return (
    <div className="dashboard-right-panel hidden w-[312px] shrink-0 flex-col overflow-hidden rounded-[12px] border border-[#2a3a40] bg-[#151e23] p-4 xl:flex">
      <div className="mb-5 grid grid-cols-3 gap-2">
        <div className="rounded-[8px] border border-[#304149] bg-[#1c282d] p-2 text-center">
          <div className="text-[22px] font-black text-[#edf5ef]">{entities.length}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#73838a]">{plural}</div>
        </div>
        <div className="rounded-[8px] border border-[#304149] bg-[#1c282d] p-2 text-center">
          <div className="text-[22px] font-black text-[#b8f36b]">{active}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#73838a]">En línea</div>
        </div>
        <div className="rounded-[8px] border border-[#304149] bg-[#1c282d] p-2 text-center">
          <div className="text-[22px] font-black text-[#8b9ba1]">{offline}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#73838a]">Offline</div>
        </div>
      </div>

      <div className="mb-5 rounded-[10px] border border-[#304149] bg-[#1c282d] p-3">
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73838a]">Ubicación del operador</h3>
        <div className="space-y-1 text-[12px] text-[#9aa9ad]">
          <div>Coordenadas: <span className="text-[#edf5ef]">{userLocation ? userLocation.position.map((v) => v.toFixed(5)).join(', ') : 'Solicitando ubicación…'}</span></div>
          <div>Velocidad: <span className="text-[#edf5ef]">{userLocation?.speed ? `${Math.round(userLocation.speed * 3.6)} km/h` : 'No disponible'}</span></div>
          <div>Precisión: <span className="text-[#edf5ef]">{userLocation ? `${Math.round(userLocation.accuracy)} m` : 'Esperando GPS'}</span></div>
        </div>
        <button onClick={onLocateUser} className="mt-3 flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#b8f36b] py-2.5 font-bold uppercase tracking-[0.12em] text-[#172319] transition-colors hover:bg-[#d0fa9a]">
          <Navigation size={14} /> Mi ubicación
        </button>
      </div>

      <div className="mb-3 flex min-h-0 flex-1 flex-col">
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73838a]">Lista {category === 'vehicles' ? 'de vehículos' : 'de dispositivos'}</h3>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#73838a]" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar…"
            aria-label="Buscar"
            className="w-full rounded-[8px] border border-[#304149] bg-[#1c282d] py-2 pl-9 pr-3 text-[12px] text-white placeholder:text-[#73838a] focus:border-[#b8f36b]/60 focus:outline-none"
          />
        </div>
        <div className="scrollable-list space-y-2 overflow-y-auto">
          {filtered.length === 0 && <p className="px-2 text-[11px] text-[#6a8994]">Sin resultados.</p>}
          {filtered.map((entry) => (
            <div
              key={entry.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectEntity(entry)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelectEntity(entry)
              }}
              className={`flex items-center justify-between gap-3 p-2.5 rounded-[8px] border cursor-pointer transition-colors ${
                selectedEntity?.id === entry.id
                  ? 'border-[#b8f36b]/40 bg-[#223329]'
                  : 'border-[#304149] bg-[#1c282d] hover:border-[#b8f36b]/35'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#edf5ef]">
                  <Radar size={13} className="shrink-0 text-[#66d9d8]" />
                  <span className="truncate">{entry.name}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-[#8b9ba1]">
                  <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusColor(entry.status)}`}></span>
                  <span>{statusLabel(entry.status)}</span>
                  {entry.lastUpdate && <span className="truncate text-[#5f7e87]">· {entry.lastUpdate}</span>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[13px] font-semibold text-[#c8ef9b]">{entry.speed || 0} km/h</div>
                <div className="text-[10px] text-[#8b9ba1]">{entry.battery ? `${entry.battery}%` : ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-2 pt-3">
        <button onClick={onSetGeofence} className="w-full rounded-[8px] border border-[#304149] bg-[#1c282d] py-3 text-[12px] font-semibold text-[#c8d4d0] transition-colors hover:border-[#b8f36b]/50 hover:text-[#b8f36b]">
          Nueva geocerca
        </button>
      </div>
    </div>
  )
}