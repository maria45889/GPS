import React from 'react';
import { Bike, AlertTriangle, Fuel, ShieldCheck } from 'lucide-react';

export const TopKpiBar = ({ kpis = {} }) => {
  const safeKpis = {
    active: kpis.active ?? 2,
    stopped: kpis.stopped ?? 1,
    offline: kpis.offline ?? 1,
    criticalAlerts: kpis.criticalAlerts ?? 1,
    fuelEfficiency: kpis.fuelEfficiency ?? '3.8',
    safetyScore: kpis.safetyScore ?? 94,
  };

  return (
    <div className="w-full px-3 sm:px-5 pt-3 pointer-events-auto z-20 select-none">
      <div className="bg-[#0D1424]/90 border border-white/10 rounded-2xl backdrop-blur-2xl px-4 py-2.5 flex items-center justify-between gap-4 overflow-x-auto shadow-[0_10px_35px_rgba(0,0,0,0.7)]">
        {/* 1. Estado de Flota Activa */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF]">
            <Bike size={16} />
          </div>
          <div>
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">Estado de Flota</div>
            <div className="text-xs font-bold flex items-center gap-2 font-mono">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {safeKpis.active} en ruta
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                {safeKpis.stopped} detenidas
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-rose-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                {safeKpis.offline} off
              </span>
            </div>
          </div>
        </div>

        {/* 2. Alertas Críticas */}
        <div className="flex items-center gap-3 border-l border-white/10 pl-4 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 animate-pulse">
            <AlertTriangle size={15} />
          </div>
          <div>
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">Alertas Críticas</div>
            <div className="text-xs font-bold text-rose-400 font-mono">
              {safeKpis.criticalAlerts} Activa (Requiere atención)
            </div>
          </div>
        </div>

        {/* 3. Eficiencia de Combustible */}
        <div className="hidden md:flex items-center gap-3 border-l border-white/10 pl-4 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF]">
            <Fuel size={15} />
          </div>
          <div>
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">Consumo Promedio</div>
            <div className="text-xs font-bold text-cyan-200 font-mono">
              {safeKpis.fuelEfficiency} L / 100 km
            </div>
          </div>
        </div>

        {/* 4. Índice de Conducción Segura */}
        <div className="hidden lg:flex items-center gap-3 border-l border-white/10 pl-4 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck size={16} />
          </div>
          <div>
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">Conducción Segura</div>
            <div className="text-xs font-bold text-emerald-400 font-mono">
              {safeKpis.safetyScore}% Flota Segura
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
