import React, { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';

export const AlertsFeed = ({ alerts = [], onSelectAlert, onClose }) => {
  const [filter, setFilter] = useState('all');

  const severityColors = {
    critical: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    info: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  };

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.severity === filter);
  const criticalCount = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length;

  return (
    <div className="w-80 h-full bg-[#0B0F19]/95 border-r border-[#1E293B]/80 p-4 flex flex-col backdrop-blur-xl text-slate-200 select-none shadow-2xl">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-cyan-400 tracking-wide">Centro de Alertas</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse font-mono">
            {criticalCount} Críticas
          </span>
          {onClose && (
            <button 
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
              title="Cerrar panel"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Filtros de severidad */}
      <div className="flex space-x-1 mb-3 text-xs">
        {['all', 'critical', 'warning', 'info'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-2.5 py-1 rounded-lg capitalize border transition-all ${
              filter === type 
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]' 
                : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            {type === 'all' ? 'Todas' : type === 'critical' ? 'Críticas' : type === 'warning' ? 'Avisos' : 'Info'}
          </button>
        ))}
      </div>

      {/* Lista cronológica */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
        {filteredAlerts.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No hay alertas en esta categoría.
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              onClick={() => onSelectAlert && onSelectAlert(alert)}
              className={`p-3 rounded-xl bg-slate-900/60 border ${
                alert.status === 'resolved' 
                  ? 'border-white/5 opacity-60' 
                  : 'border-cyan-500/20 hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(0,240,255,0.15)]'
              } cursor-pointer transition-all backdrop-blur-md group`}
            >
              <div className="flex justify-between items-start mb-1 gap-2">
                <span className="font-bold text-xs text-slate-200 group-hover:text-cyan-400 transition-colors leading-tight">
                  {alert.title}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-mono shrink-0 ${severityColors[alert.severity]}`}>
                  {alert.severity}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2 line-clamp-2 leading-relaxed">{alert.description}</p>
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1 border-t border-white/5">
                <span className="text-cyan-400/80 font-medium">🏍️ {alert.vehicleName}</span>
                <span>⏱️ {alert.timestamp}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
