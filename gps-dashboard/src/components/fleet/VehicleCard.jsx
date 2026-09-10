import React from 'react';
import { Bike, Zap, Navigation } from 'lucide-react';

export const VehicleCard = ({ vehicle, isSelected, onSelect }) => {
  const statusConfig = {
    active: {
      bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      label: 'En ruta',
      dot: 'bg-emerald-400',
    },
    stopped: {
      bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      label: 'Detenido',
      dot: 'bg-amber-400',
    },
    offline: {
      bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      label: 'Offline',
      dot: 'bg-rose-400',
    },
  };

  const currentStatus = statusConfig[vehicle.status] || statusConfig.active;

  return (
    <div 
      onClick={() => onSelect(vehicle)}
      className={`p-3.5 mb-2.5 rounded-2xl border transition-all cursor-pointer backdrop-blur-md group relative overflow-hidden ${
        isSelected 
          ? 'bg-[#16212E]/95 border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.25)]' 
          : 'bg-[#101726]/80 border-white/10 hover:border-[#00F0FF]/40 hover:bg-[#16212E]/60'
      }`}
    >
      {/* Selected glowing side indicator */}
      {isSelected && (
        <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#00F0FF] rounded-r-full shadow-[0_0_10px_#00F0FF]"></div>
      )}

      {/* Header: Name + Status Badge */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1E293B] border border-white/10 flex items-center justify-center text-[#00F0FF] shrink-0">
            <Bike size={15} />
          </div>
          <div>
            <h4 className="font-bold text-white text-xs group-hover:text-[#00F0FF] transition-colors leading-tight">
              {vehicle.name}
            </h4>
            <span className="text-[10px] text-[#64748B] font-mono">{vehicle.plate || vehicle.id}</span>
          </div>
        </div>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${currentStatus.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot} animate-pulse`}></span>
          {currentStatus.label}
        </span>
      </div>

      {/* Telemetry Row */}
      <div className="flex justify-between items-center text-[11px] text-[#94A3B8] pt-2 border-t border-white/5 font-mono">
        <div className="flex items-center gap-1">
          <Navigation size={12} className="text-[#00F0FF]" />
          <span>{vehicle.speed ?? 0} km/h</span>
        </div>

        <div className="flex items-center gap-1">
          <Zap size={12} className="text-[#00E676]" />
          <span>{vehicle.battery}%</span>
        </div>

        <div className="text-[10px] text-[#64748B]">
          {vehicle.lastUpdate || 'Ahora'}
        </div>
      </div>
    </div>
  );
};
