import React from 'react';
import { Bike, Zap, Navigation } from 'lucide-react';

export const VehicleCard = ({ vehicle, isSelected, onSelect }) => {
  const statusConfig = {
    active: {
      bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      label: 'En ruta',
      dot: 'bg-emerald-400',
      glow: 'rgba(0,230,118,0.2)',
    },
    stopped: {
      bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      label: 'Detenido',
      dot: 'bg-amber-400',
      glow: 'rgba(245,158,11,0.2)',
    },
    offline: {
      bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      label: 'Offline',
      dot: 'bg-rose-400',
      glow: 'rgba(244,63,94,0.2)',
    },
  };

  const currentStatus = statusConfig[vehicle.status] || statusConfig.active;

  return (
    <div 
      onClick={() => onSelect(vehicle)}
      className={`p-4 mb-3 rounded-2xl border transition-all cursor-pointer backdrop-blur-md group relative overflow-hidden ${
        isSelected 
          ? 'bg-gradient-to-br from-[#16212E]/95 to-[#0F1520]/95 border-[#00F0FF] shadow-[0_0_30px_rgba(0,240,255,0.3),0_0_60px_rgba(0,240,255,0.1)]' 
          : 'bg-gradient-to-br from-[#101726]/80 to-[#0D1220]/80 border-white/10 hover:border-[#00F0FF]/50 hover:bg-gradient-to-br hover:from-[#16212E]/70 hover:to-[#0F1520]/70'
      }`}
      style={{
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'translateX(4px)';
          e.currentTarget.style.boxShadow = `0 0 20px ${currentStatus.glow}`;
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {/* Selected glowing side indicator */}
      {isSelected && (
        <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-gradient-to-b from-[#00F0FF] to-[#00B4D8] rounded-r-full shadow-[0_0_15px_#00F0FF]"></div>
      )}

      {/* Background glow effect */}
      {isSelected && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#00F0FF]/5 to-transparent pointer-events-none"></div>
      )}

      {/* Header: Name + Status Badge */}
      <div className="flex justify-between items-center mb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-white/10 flex items-center justify-center shrink-0 transition-all ${
            isSelected ? 'text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'text-[#00F0FF]/70 group-hover:text-[#00F0FF] group-hover:shadow-[0_0_10px_rgba(0,240,255,0.2)]'
          }`}>
            <Bike size={16} strokeWidth={2} />
          </div>
          <div>
            <h4 className={`font-bold text-xs leading-tight transition-colors ${
              isSelected ? 'text-[#00F0FF]' : 'text-white group-hover:text-[#00F0FF]'
            }`}>
              {vehicle.name}
            </h4>
            <span className="text-[10px] text-[#64748B] font-mono tracking-wide">{vehicle.plate || vehicle.id}</span>
          </div>
        </div>

        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-2 transition-all ${
          currentStatus.bg
        }`} style={{
          boxShadow: `0 0 15px ${currentStatus.glow}`,
        }}>
          <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot} animate-pulse`} style={{
            boxShadow: `0 0 8px ${currentStatus.dot.replace('bg-', '').replace('-400', '')}`,
          }}></span>
          {currentStatus.label}
        </span>
      </div>

      {/* Telemetry Row */}
      <div className="flex justify-between items-center text-[11px] text-[#94A3B8] pt-3 border-t border-white/8 font-mono relative z-10">
        <div className="flex items-center gap-2">
          <Navigation size={13} className={`transition-colors ${isSelected ? 'text-[#00F0FF]' : 'text-[#00F0FF]/70'}`} strokeWidth={2} />
          <span className={isSelected ? 'text-white' : ''}>{vehicle.speed ?? 0} km/h</span>
        </div>

        <div className="flex items-center gap-2">
          <Zap size={13} className="text-[#00E676]" strokeWidth={2} />
          <span className={isSelected ? 'text-white' : ''}>{vehicle.battery}%</span>
        </div>

        <div className={`text-[10px] ${isSelected ? 'text-[#00F0FF]' : 'text-[#64748B]'}`}>
          {vehicle.lastUpdate || 'Ahora'}
        </div>
      </div>
    </div>
  );
};
