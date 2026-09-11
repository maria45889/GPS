import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Lock, X, MapPin, Gauge, BatteryCharging, Clock, AlertTriangle } from 'lucide-react';

export const AlertDetailModal = ({ alert, onClose, onResolve, onBlockEngine }) => {
  const [engineBlocked, setEngineBlocked] = useState(false);

  if (!alert) return null;

  const handleBlock = () => {
    setEngineBlocked(true);
    if (onBlockEngine) onBlockEngine(alert.vehicleId);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-gradient-to-br from-[#0D1424]/98 to-[#0A0F1A]/95 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-950/60 text-slate-200 backdrop-blur-2xl relative border-t-2 border-t-cyan-400">
        
        {/* Ambient background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none rounded-2xl" />
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-all border border-white/10 hover:border-cyan-500/30"
          title="Cerrar"
        >
          <X size={18} strokeWidth={2} />
        </button>

        <div className="flex items-center space-x-4 mb-6 relative z-10">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/25 to-rose-600/15 border border-rose-500/40 text-rose-400 animate-pulse text-3xl shadow-[0_0_30px_rgba(244,63,94,0.3)]">
            🚨
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-mono tracking-wider text-rose-400 font-bold px-2.5 py-1 rounded-lg bg-gradient-to-r from-rose-500/15 to-rose-600/10 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                Alerta de Seguridad Táctica
              </span>
              {alert.status === 'resolved' && (
                <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500/15 to-emerald-600/10 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  Resuelta
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-slate-100 mt-2 tracking-tight">{alert.title}</h3>
          </div>
        </div>

        {/* Panel Forense / Telemetría */}
        <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-900/60 border border-cyan-500/20 flex flex-col justify-between shadow-[0_0_15px_rgba(0,240,255,0.1)]">
            <div className="text-[11px] text-slate-400 flex items-center gap-2 font-medium">
              <span className="text-lg">🏍️</span> Vehículo afectado
            </div>
            <div className="text-sm font-bold text-cyan-200 mt-2">
              {alert.vehicleName} <span className="text-xs text-slate-400 font-mono">({alert.plate})</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-900/60 border border-cyan-500/20 flex flex-col justify-between shadow-[0_0_15px_rgba(0,240,255,0.1)]">
            <div className="text-[11px] text-slate-400 flex items-center gap-2 font-medium">
              <Gauge size={14} className="text-amber-400" strokeWidth={2} /> Velocidad al incidente
            </div>
            <div className="text-sm font-bold text-amber-400 font-mono mt-2">
              {alert.speed} km/h
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-900/60 border border-cyan-500/20 flex flex-col justify-between shadow-[0_0_15px_rgba(0,240,255,0.1)]">
            <div className="text-[11px] text-slate-400 flex items-center gap-2 font-medium">
              <BatteryCharging size={14} className="text-emerald-400" strokeWidth={2} /> Batería GPS / Voltaje
            </div>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-2">
              {alert.battery}% <span className="text-xs text-slate-400 font-normal">({alert.voltage || '13.8'}V)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-900/60 border border-cyan-500/20 flex flex-col justify-between shadow-[0_0_15px_rgba(0,240,255,0.1)]">
            <div className="text-[11px] text-slate-400 flex items-center gap-2 font-medium">
              <Clock size={14} className="text-cyan-400" strokeWidth={2} /> Hora del Evento
            </div>
            <div className="text-sm font-bold text-slate-200 font-mono mt-2">
              {alert.timestamp}
            </div>
          </div>
        </div>

        {/* Ubicación detallada */}
        <div className="mb-6 text-xs text-slate-300 bg-gradient-to-br from-slate-900/70 to-slate-900/50 p-4 rounded-xl border border-cyan-500/15 shadow-[0_0_15px_rgba(0,240,255,0.1)] relative z-10">
          <div className="flex items-center gap-2 text-cyan-400 font-bold mb-2">
            <MapPin size={15} strokeWidth={2} />
            <span>Ubicación exacta del incidente:</span>
          </div>
          <div className="text-slate-200 font-medium leading-relaxed">{alert.locationName}</div>
          <div className="text-slate-400 font-mono text-[11px] mt-2 tracking-wide">
            Coordenadas: Lat {alert.lat.toFixed(4)}, Lng {alert.lng.toFixed(4)}
          </div>
        </div>

        {/* Feedback visual si el motor fue bloqueado */}
        {engineBlocked && (
          <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-rose-500/20 to-rose-600/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.3)] relative z-10">
            <Lock size={18} strokeWidth={2} />
            <span><strong>Comando enviado:</strong> Inyección cortada y motor bloqueado remotamente.</span>
          </div>
        )}

        {/* Acciones Rápidas */}
        <div className="flex space-x-3 relative z-10">
          <button 
            onClick={handleBlock}
            disabled={engineBlocked}
            className={`flex-1 py-3.5 px-4 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              engineBlocked 
                ? 'bg-gradient-to-r from-rose-950/40 to-rose-900/30 border-rose-800/40 text-rose-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-rose-500/25 to-rose-600/15 hover:from-rose-500/30 hover:to-rose-600/20 border-rose-500/40 text-rose-300 shadow-lg shadow-rose-950/50 hover:border-rose-400 hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]'
            }`}
          >
            <Lock size={17} strokeWidth={2} />
            <span>{engineBlocked ? 'Motor Bloqueado' : 'Bloquear Motor'}</span>
          </button>

          <button 
            onClick={() => onResolve && onResolve(alert.id)}
            className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500/25 to-cyan-600/15 hover:from-cyan-500/30 hover:to-cyan-600/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-950/50 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,240,255,0.3)]"
          >
            <CheckCircle2 size={17} strokeWidth={2} />
            <span>Marcar Resuelta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
