import React, { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';

export const AlertsFeed = ({ alerts = [], onSelectAlert, onClose }) => {
  const [filter, setFilter] = useState('all');

  const severityColors = {
    critical: 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    info: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.3)]',
  };

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.severity === filter);
  const criticalCount = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length;

  return (
    <div className="w-80 h-full bg-gradient-to-b from-[#0B0F19]/98 to-[#060912]/95 border-r border-[#1E293B]/80 p-4 flex flex-col backdrop-blur-xl text-slate-200 select-none shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            <ShieldAlert className="w-5 h-5 text-cyan-400" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-base font-bold text-cyan-400 tracking-wide text-shadow">Centro de Alertas</h2>
            <div className="text-[10px] text-slate-500 font-mono tracking-wider">MONITOREO EN TIEMPO REAL</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-500/20 to-rose-600/15 text-rose-400 border border-rose-500/30 animate-pulse font-mono font-bold shadow-[0_0_15px_rgba(244,63,94,0.3)]">
            {criticalCount} Críticas
          </span>
          {onClose && (
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-all border border-white/10 hover:border-cyan-500/30"
              title="Cerrar panel"
            >
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Filtros de severidad */}
      <div className="flex space-x-1.5 mb-4 text-xs">
        {['all', 'critical', 'warning', 'info'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-lg capitalize border transition-all font-medium ${
              filter === type 
                ? 'bg-gradient-to-r from-cyan-500/25 to-cyan-600/15 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.3)]' 
                : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
            }`}
          >
            {type === 'all' ? 'Todas' : type === 'critical' ? 'Críticas' : type === 'warning' ? 'Avisos' : 'Info'}
          </button>
        ))}
      </div>

      {/* Lista cronológica */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
        {filteredAlerts.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-slate-600" strokeWidth={1.5} />
            <span>No hay alertas en esta categoría.</span>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              onClick={() => onSelectAlert && onSelectAlert(alert)}
              className={`p-3.5 rounded-xl bg-gradient-to-br from-slate-900/70 to-slate-900/50 border backdrop-blur-md group transition-all cursor-pointer relative overflow-hidden ${
                alert.status === 'resolved' 
                  ? 'border-white/5 opacity-50' 
                  : 'border-cyan-500/20 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:from-slate-900/80 hover:to-slate-900/60'
              }`}
            >
              {/* Background glow for active alerts */}
              {alert.status !== 'resolved' && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none" />
              )}
              
              <div className="flex justify-between items-start mb-2 gap-2 relative z-10">
                <span className={`font-bold text-xs leading-tight transition-colors ${
                  alert.status === 'resolved' ? 'text-slate-400' : 'text-slate-200 group-hover:text-cyan-400'
                }`}>
                  {alert.title}
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-lg border uppercase font-mono shrink-0 font-bold ${severityColors[alert.severity]}`}>
                  {alert.severity}
                </span>
              </div>
              <p className={`text-[11px] mb-3 line-clamp-2 leading-relaxed relative z-10 ${
                alert.status === 'resolved' ? 'text-slate-500' : 'text-slate-400'
              }`}>{alert.description}</p>
              <div className="flex justify-between items-center text-[10px] font-mono pt-2 border-t border-white/5 relative z-10">
                <span className={`font-medium flex items-center gap-1.5 ${
                  alert.status === 'resolved' ? 'text-slate-500' : 'text-cyan-400/80'
                }`}>
                  <span>🏍️</span> {alert.vehicleName}
                </span>
                <span className={alert.status === 'resolved' ? 'text-slate-500' : 'text-slate-400'}>
                  ⏱️ {alert.timestamp}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
