import React from 'react';
import { Navigation, Share2, Activity, Battery, Wifi, Gauge } from 'lucide-react';
import { normalizeBattery } from '../lib/queries';
import { formatTimestamp } from '../lib/formatters';

const StatusStreamChart = ({ label, value, color, max = 100, unit = '' }) => {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  const percentage = Math.min(100, Math.max(0, (safeValue / max) * 100)) || 0;
  
  const points = React.useMemo(() => {
    return `0,${40 - (Math.random() * 10)} 20,${40 - (Math.random() * 20)} 40,${40 - (percentage * 0.3)} 60,${40 - (percentage * 0.35)} 80,${40 - (percentage * 0.4)} 100,${40 - (percentage * 0.4)}`;
  }, [percentage]);
  
  return (
    <div className="mb-4">
      <div className="flex justify-between text-[10px] text-[#94a3b8] mb-1">
        <span className="uppercase tracking-widest">{label}</span>
        <span style={{ color }} className="font-mono">{safeValue}{unit}</span>
      </div>
      <svg width="100%" height="40" preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id={`grad-${label.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M0,40 L${points} L100,40 Z`} fill={`url(#grad-${label.replace(/\s+/g, '-')})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      </svg>
      <div className="flex gap-[2px] h-[6px] mt-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-[1px]" style={{ background: i < (percentage/5) ? color : 'rgba(255,255,255,0.05)' }} />
        ))}
      </div>
    </div>
  );
};

export const LeftSidebarPanel = ({
  category = 'vehicles',
  vehicles = [],
  entity,
  selectedVehicle,
  isFollowingRoute,
  onToggleRouteFollow,
  onShareRoute,
  onEditVehicle,
  onDeleteVehicle,
}) => {
  const currentEntity = entity ?? selectedVehicle ?? null;
  const isDevice = category === 'devices' || !currentEntity?.plate;
  
  const batteryVal = normalizeBattery(currentEntity?.battery);
  const speed = currentEntity?.speed || 0;
  const isOnline = currentEntity?.status === 'active' || currentEntity?.status === 'online';

  if (!currentEntity) {
    return (
      <div className="dashboard-left-panel hidden shrink-0 flex-col overflow-hidden lg:flex p-4">
        <div className="flex items-center justify-center h-full text-[#94a3b8] text-[12px] uppercase tracking-widest border border-[rgba(45,212,191,0.2)] rounded-lg bg-[rgba(10,20,30,0.4)]">
          <Activity size={16} className="mr-2 animate-pulse" /> Esperando telemetría...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-left-panel hidden shrink-0 flex-col overflow-hidden lg:flex">
      
      {/* DEVICE HEADER BLOCK */}
      <div className="p-4 border-b border-[rgba(6,182,212,0.15)] bg-gradient-to-b from-[rgba(6,182,212,0.05)] to-transparent">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#06b6d4] font-bold mb-1">
              {isDevice ? 'Dispositivo' : 'Vehículo'}
            </div>
            <h2 className="text-[14px] text-[#f8fafc] font-bold truncate max-w-[160px]">
              {currentEntity.name}
            </h2>
            <div className="text-[10px] text-[#94a3b8] font-mono mt-0.5">
              {currentEntity.id.split('-')[0]} {currentEntity.platform ? `, ${currentEntity.platform}` : ''}
            </div>
          </div>
          <div className="relative">
            <Wifi size={16} className={isOnline ? "text-[#10b981]" : "text-[#ef4444]"} />
            {isOnline && <span className="absolute top-0 right-0 w-2 h-2 bg-[#10b981] rounded-full animate-ping opacity-75"></span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-slate-900/60 border border-[rgba(6,182,212,0.15)] rounded p-2">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Velocidad</div>
            <div className="text-[#f8fafc] text-[12px] font-mono">{speed} <span className="text-slate-400 text-[10px]">km/h</span></div>
          </div>
          <div className="bg-slate-900/60 border border-[rgba(6,182,212,0.15)] rounded p-2">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Batería</div>
            <div className="text-[#f8fafc] text-[12px] font-mono">{batteryVal}%</div>
          </div>
          <div className="col-span-2 bg-slate-900/60 border border-[rgba(6,182,212,0.15)] rounded p-2">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Último Reporte</div>
            <div className="text-[#f8fafc] text-[11px] truncate" title={currentEntity.lastUpdate}>
              {formatTimestamp(currentEntity.lastUpdate)}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onToggleRouteFollow}
            disabled={!currentEntity.position}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all
              ${isFollowingRoute ? 'bg-[#0f172a] text-[#06b6d4] border border-[#06b6d4] shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
              : 'bg-gradient-to-r from-[#06b6d4] to-[#0891b2] text-[#0f172a] shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_20px_rgba(6,182,212,0.6)]'}`}
          >
            <Navigation size={14} /> {isFollowingRoute ? 'Siguiendo' : 'Seguir Monitoreo'}
          </button>
          <button
            onClick={onShareRoute}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded text-[11px] font-bold uppercase tracking-wider border border-[rgba(6,182,212,0.3)] text-[#06b6d4] hover:bg-[rgba(6,182,212,0.1)]"
          >
            <Share2 size={14} /> Compartir
          </button>
        </div>

        {/* ADMIN CONTROLS (Edit & Delete) */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onEditVehicle && onEditVehicle(currentEntity)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded text-[10px] font-bold uppercase tracking-wider border border-[#f59e0b] text-[#f59e0b] hover:bg-[rgba(245,158,11,0.1)] transition-colors"
          >
            Editar
          </button>
          <button
            onClick={() => {
              if (window.confirm(`¿Estás seguro de que deseas eliminar este ${isDevice ? 'dispositivo' : 'vehículo'}? Esta acción no se puede deshacer.`)) {
                onDeleteVehicle && onDeleteVehicle(currentEntity.id);
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded text-[10px] font-bold uppercase tracking-wider border border-[#ef4444] text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* STATUS STREAM BLOCK */}
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold mb-4 flex items-center gap-2">
          <Activity size={12} className="text-[#06b6d4]" /> Flujo de Estado
        </div>

        <StatusStreamChart label="Velocidad" value={speed} color="#06b6d4" max={120} unit=" km/h" />
        <StatusStreamChart label="Batería" value={batteryVal} color="#10b981" max={100} unit="%" />
        <StatusStreamChart label="Precisión GPS" value={currentEntity.accuracy || 10} color="#eab308" max={50} unit=" m" />
      </div>

    </div>
  );
};