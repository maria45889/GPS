import React, { useMemo, useState } from 'react';
import { Search, Radar, Navigation, MapPinned, Activity } from 'lucide-react';
import { normalizeBattery } from '../lib/queries';
import { formatTimestamp } from '../lib/formatters';
import { ProvisionDeviceModal } from './ProvisionDeviceModal';

const statusColor = (status) => {
  if (status === 'active' || status === 'online') return 'text-[#a3e635] drop-shadow-[0_0_5px_rgba(163,230,53,0.8)]'
  if (status === 'stopped') return 'text-[#facc15]'
  if (status === 'immobilized') return 'text-[#f43f5e]'
  return 'text-[#64748b]'
}

const CircularMetric = ({ value, label, color }) => {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return (
    <div className="flex flex-col items-center justify-center relative w-16 h-16">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
        <path
          className="text-[#1e293b]"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <path
          style={{ color, strokeDasharray: `${Math.min(100, Math.max(0, safeValue))}, 100` }}
          className="transition-all duration-1000 ease-out"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-[13px] font-mono text-[#f8fafc] leading-none">{safeValue}</span>
      </div>
      <span className="text-[8px] uppercase tracking-widest text-[#94a3b8] mt-2 whitespace-nowrap">{label}</span>
    </div>
  );
};

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
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false)
  const list = entities?.length ? entities : vehicles
  const activeCount = list.filter((entry) => entry.status === 'active' || entry.status === 'online').length
  const offlineCount = list.filter((entry) => entry.status === 'offline' || entry.status === 'unknown').length
  const selectedItem = selectedEntity ?? selectedVehicle ?? list[0]

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return list
    return list.filter((entry) => `${entry.name} ${entry.plate || ''} ${entry.id}`.toLowerCase().includes(term))
  }, [list, searchTerm])

  const handleSelectEntry = (entry) => {
    if (onSelectEntity) onSelectEntity(entry)
    else if (onSelectVehicle) onSelectVehicle(entry)
  }

  return (
    <aside className={`dashboard-right-panel flex flex-col overflow-hidden lg:flex ${isMobile ? 'w-full p-4' : 'hidden shrink-0'}`}>
      
      {/* KPI CIRCLES */}
      <div className="flex justify-around items-center p-4 border-b border-[rgba(6,182,212,0.15)] bg-slate-900/60">
        <CircularMetric value={list.length} label="Total" color="#06b6d4" />
        <CircularMetric value={activeCount} label="En Línea" color="#10b981" />
        <CircularMetric value={offlineCount} label="Offline" color="#ef4444" />
      </div>

      {/* OPERATOR LOCATION */}
      <div className="p-4 border-b border-[rgba(6,182,212,0.15)]">
        <div className="flex items-center justify-between mb-3 text-[10px] uppercase tracking-[0.2em] font-bold text-[#06b6d4]">
          <span>Ubicación del Operador</span>
          <MapPinned size={14} />
        </div>
        <div className="relative rounded-lg overflow-hidden border border-[rgba(6,182,212,0.2)] bg-slate-900/60 p-3 shadow-[0_0_15px_rgba(6,182,212,0.05)]">
          <div className="absolute inset-0 opacity-20 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.2) 0%, transparent 70%)' }}></div>
          <div className="relative z-10 flex flex-col gap-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Coordenadas</span>
              <span className="text-[#f8fafc] font-mono text-right w-24 truncate">
                {userLocation?.position ? userLocation.position.map((v) => v.toFixed(4)).join(', ') : 'Buscando...'}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Estado</span>
              <span className="text-[#10b981] flex items-center gap-1">
                {userLocation?.position ? <><span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span> Activo</> : 'No disponible'}
              </span>
            </div>
            <button onClick={onLocateUser} className="w-full mt-2 py-1.5 text-[10px] uppercase tracking-wider border border-[rgba(6,182,212,0.4)] text-[#06b6d4] rounded hover:bg-[rgba(6,182,212,0.1)] transition-colors">
              Centrar GPS
            </button>
          </div>
        </div>
      </div>

      {/* DEVICE LIST */}
      <div className="p-4 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between mb-3 text-[10px] uppercase tracking-[0.2em] font-bold text-[#94a3b8]">
          <span>Lista de Dispositivos</span>
        </div>

        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#06b6d4]" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={`Buscar ${category === 'devices' ? 'dispositivo' : 'vehículo'}...`}
            className="w-full bg-slate-900/60 border border-[rgba(6,182,212,0.2)] rounded pl-9 pr-3 py-2 text-[12px] text-[#f8fafc] focus:outline-none focus:border-[#06b6d4] focus:shadow-[0_0_10px_rgba(6,182,212,0.2)] transition-all"
          />
        </div>

        <div className="overflow-y-auto flex-1 pr-1 space-y-2">
          {filtered.length === 0 && <p className="px-2 text-[11px] text-[#64748b]">No hay coincidencias.</p>}
          {filtered.map((entry) => {
            const isOnline = entry.status === 'active' || entry.status === 'online';
            return (
                <button
                  key={entry.id}
                  onClick={() => handleSelectEntry(entry)}
                  className={`w-full text-left p-3 rounded border transition-all ${
                    selectedItem?.id === entry.id
                      ? 'bg-[rgba(6,182,212,0.1)] border-[#06b6d4] shadow-[inset_0_0_15px_rgba(6,182,212,0.1)]'
                      : 'bg-slate-900/60 border-[rgba(6,182,212,0.1)] hover:border-[#06b6d4]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Radar size={14} className={isOnline ? "text-[#10b981]" : "text-[#ef4444]"} />
                      <span className="text-[12px] font-bold text-[#f8fafc] truncate w-24">{entry.name}</span>
                    </div>
                    <div className="text-[11px] text-[#06b6d4] font-mono">{entry.speed || 0} km/h</div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400">
                    <span className="truncate w-32 font-mono" title={entry.lastUpdate}>
                      {isOnline ? 'LIVE ' : 'OFF '} • {formatTimestamp(entry.lastUpdate)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{normalizeBattery(entry.battery)}%</span>
                      <Activity size={12} className={isOnline ? "text-[#10b981]" : "text-[#ef4444]"} />
                    </div>
                  </div>
                </button>
            )
          })}
        </div>
      </div>

      <div className="mt-auto space-y-2 p-4 border-t border-[rgba(6,182,212,0.15)]">
        <button type="button" onClick={() => setIsProvisionModalOpen(true)} className="w-full py-2 text-[11px] font-bold uppercase tracking-wider border border-[rgba(6,182,212,0.4)] text-[#06b6d4] rounded hover:bg-[rgba(6,182,212,0.1)] transition-colors">
          Vincular Móvil
        </button>
      </div>
      
      {isProvisionModalOpen && <ProvisionDeviceModal onClose={() => setIsProvisionModalOpen(false)} />}
    </aside>
  )
}