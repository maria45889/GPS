import React, { useMemo, useState } from 'react';
import { Search, Radar, Navigation, MapPinned } from 'lucide-react';
import { normalizeBattery } from '../lib/queries';

const statusLabel = (status) => {
  if (status === 'active' || status === 'online') return 'En línea'
  if (status === 'stopped') return 'Detenido'
  if (status === 'immobilized') return 'Inmovilizado'
  return 'Offline'
}

const statusColor = (status) => {
  if (status === 'active' || status === 'online') return 'bg-[#5ee6a8]'
  if (status === 'stopped') return 'bg-[#f2c66d]'
  if (status === 'immobilized') return 'bg-[#ef5c72]'
  return 'bg-[#8b9ba1]'
}

export const RightSidebarPanel = ({
  category = 'vehicles',
  entities = [],
  selectedEntity,
  onSelectEntity,
  onSetGeofence,
  userLocation,
  onLocateUser,
  vehicles = [],
  selectedVehicle,
  onSelectVehicle,
  isMobile = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const list = entities?.length ? entities : vehicles
  const activeCount = list.filter((entry) => entry.status === 'active' || entry.status === 'online').length
  const offlineCount = list.filter((entry) => entry.status === 'offline' || entry.status === 'unknown').length
  const selectedItem = selectedEntity ?? selectedVehicle ?? list[0]

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return list
    return list.filter((entry) => `${entry.name} ${entry.plate || ''} ${entry.id}`.toLowerCase().includes(term))
  }, [list, searchTerm])

  const plural = category === 'vehicles' ? 'Vehículos' : 'Dispositivos'

  const handleSelectEntry = (entry) => {
    if (onSelectEntity) onSelectEntity(entry)
    else if (onSelectVehicle) onSelectVehicle(entry)
  }

  return (
    <aside className={`dashboard-right-panel flex flex-col overflow-hidden rounded-[12px] border border-[#213a46] bg-[#0d1a24] p-4 ${isMobile ? 'w-full' : 'hidden w-[312px] shrink-0 xl:flex'}`}>
      <div className="mb-5 grid grid-cols-3 gap-2">
        <div className="right-panel-stat-card">
          <div className="right-panel-stat-value">{list.length}</div>
          <div className="right-panel-stat-label">{plural}</div>
        </div>
        <div className="right-panel-stat-card accent-green">
          <div className="right-panel-stat-value">{activeCount}</div>
          <div className="right-panel-stat-label">En línea</div>
        </div>
        <div className="right-panel-stat-card accent-muted">
          <div className="right-panel-stat-value">{offlineCount}</div>
          <div className="right-panel-stat-label">Offline</div>
        </div>
      </div>

      <div className="right-panel-operator-card mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h3>Ubicación del operador</h3>
          <MapPinned size={13} className="text-[#67e8f9]" />
        </div>
        <div className="space-y-1 text-[12px] text-[#9aa9ad]">
          <div className="flex items-center justify-between gap-3">
            <span>Coordenadas</span>
            <span className="text-right text-[#edf5ef]">
              {userLocation?.position ? userLocation.position.map((value) => value.toFixed(5)).join(', ') : userLocation?.error ? 'GPS no disponible' : 'Solicitando…'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Velocidad</span>
            <span className="text-[#edf5ef]">{userLocation?.speed != null ? `${Math.round(userLocation.speed * 3.6)} km/h` : 'No disponible'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Precisión</span>
            <span className="text-[#edf5ef]">{userLocation?.accuracy != null ? `${Math.round(userLocation.accuracy)} m` : userLocation?.error ? 'Sin señal' : 'Esperando GPS'}</span>
          </div>
        </div>
        <button type="button" onClick={onLocateUser} className="right-panel-action-button mt-3">
          <Navigation size={14} /> Mi ubicación
        </button>
      </div>

      <div className="mb-3 flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7da1b0]">Lista {category === 'vehicles' ? 'de vehículos' : 'de dispositivos'}</h3>
          <span className="rounded-full border border-[#1f4d59] bg-[#102b38] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#67e8f9]">{list.length}</span>
        </div>

        <div className="right-panel-search">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#73838a]" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar…"
            aria-label="Buscar"
          />
        </div>

        <div className="scrollable-list mt-3 space-y-2 overflow-y-auto pr-1">
          {filtered.length === 0 && <p className="px-2 text-[11px] text-[#6a8994]">Sin resultados.</p>}
          {filtered.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`right-panel-item ${selectedItem?.id === entry.id ? 'selected' : ''}`}
              onClick={() => handleSelectEntry(entry)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#edf5ef]">
                  <Radar size={13} className="shrink-0 text-[#67e8f9]" />
                  <span className="truncate">{entry.name}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-[#8b9ba1]">
                  <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${statusColor(entry.status)}`}></span>
                  <span>{statusLabel(entry.status)}</span>
                  {entry.lastUpdate && <span className="truncate text-[#5f7e87]">· {entry.lastUpdate}</span>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[13px] font-semibold text-[#c8ef9b]">{entry.speed || 0} km/h</div>
                <div className="mt-1 text-[10px] text-[#8b9ba1]">{normalizeBattery(entry.battery)}%</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-2 pt-3">
        <button type="button" onClick={onSetGeofence} className="right-panel-secondary-button">
          Nueva geocerca
        </button>
      </div>
    </aside>
  )
}