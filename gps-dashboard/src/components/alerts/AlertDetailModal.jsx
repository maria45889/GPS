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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0D1424]/95 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-950/60 text-slate-200 backdrop-blur-2xl relative border-t-2 border-t-cyan-400">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors"
          title="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 animate-pulse text-2xl">
            🚨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                Alerta de Seguridad Táctica
              </span>
              {alert.status === 'resolved' && (
                <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  Resuelta
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-100 mt-1">{alert.title}</h3>
          </div>
        </div>

        {/* Panel Forense / Telemetría */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/15 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>🏍️</span> Vehículo afectado
            </div>
            <div className="text-sm font-bold text-cyan-200 mt-1">
              {alert.vehicleName} <span className="text-xs text-slate-400 font-mono">({alert.plate})</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/15 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Gauge size={13} className="text-amber-400" /> Velocidad al incidente
            </div>
            <div className="text-sm font-bold text-amber-400 font-mono mt-1">
              {alert.speed} km/h
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/15 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <BatteryCharging size={13} className="text-emerald-400" /> Batería GPS / Voltaje
            </div>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-1">
              {alert.battery}% <span className="text-xs text-slate-400 font-normal">({alert.voltage || '13.8'}V)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/15 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Clock size={13} className="text-cyan-400" /> Hora del Evento
            </div>
            <div className="text-sm font-bold text-slate-200 font-mono mt-1">
              {alert.timestamp}
            </div>
          </div>
        </div>

        {/* Ubicación detallada */}
        <div className="mb-6 text-xs text-slate-300 bg-slate-900/60 p-3.5 rounded-xl border border-cyan-500/10">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
            <MapPin size={14} />
            <span>Ubicación exacta del incidente:</span>
          </div>
          <div className="text-slate-200 font-medium">{alert.locationName}</div>
          <div className="text-slate-400 font-mono text-[11px] mt-1">
            Coordenadas: Lat {alert.lat.toFixed(4)}, Lng {alert.lng.toFixed(4)}
          </div>
        </div>

        {/* Feedback visual si el motor fue bloqueado */}
        {engineBlocked && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-pulse">
            <Lock size={15} />
            <span><strong>Comando enviado:</strong> Inyección cortada y motor bloqueado remotamente.</span>
          </div>
        )}

        {/* Acciones Rápidas */}
        <div className="flex space-x-3">
          <button 
            onClick={handleBlock}
            disabled={engineBlocked}
            className={`flex-1 py-3 px-4 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              engineBlocked 
                ? 'bg-rose-950/40 border-rose-800/40 text-rose-500 cursor-not-allowed' 
                : 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-300 shadow-lg shadow-rose-950/50 hover:border-rose-400'
            }`}
          >
            <Lock size={16} />
            <span>{engineBlocked ? 'Motor Bloqueado' : 'Bloquear Motor'}</span>
          </button>

          <button 
            onClick={() => onResolve && onResolve(alert.id)}
            className="flex-1 py-3 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-950/50 hover:border-cyan-400"
          >
            <CheckCircle2 size={16} />
            <span>Marcar Resuelta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
