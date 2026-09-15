import React from 'react';

export const LeftSidebarPanel = () => {
  return (
    <div className="w-[260px] bg-[#071a26] border-r border-[#1dd6ff]/25 flex flex-col overflow-hidden text-[13px] shadow-[inset_-1px_0_0_rgba(29,214,255,0.12)]">
      <div className="p-4">
        <nav className="space-y-2">
          {['Inicio', 'Mapa', 'Vehículos', 'Historial', 'Alertas', 'Configuración'].map((item, index) => (
            <button
              key={item}
              className={`w-full text-left px-3 py-2.5 rounded-[8px] border text-[14px] transition-all ${
                index === 0
                  ? 'bg-[#0d2330] border-[#1dd6ff]/60 text-[#9eeeff] shadow-[0_0_14px_rgba(29,214,255,0.10)]'
                  : 'bg-[#0a1d2b] border-[#1dd6ff]/20 text-white/90 hover:border-[#1dd6ff]/50 hover:text-[#9eeeff]'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      <div className="px-4 pb-4 border-b border-[#1dd6ff]/15">
        <h3 className="text-[#90e8ff] text-[11px] font-bold uppercase tracking-[0.18em] mb-3">Resumen</h3>

        <div className="space-y-2 text-[13px] text-slate-300">
          <div className="flex justify-between items-center">
            <span>Vehículos</span>
            <strong className="text-white">4</strong>
          </div>
          <div className="flex justify-between items-center">
            <span>En ruta</span>
            <strong className="text-white">2</strong>
          </div>
          <div className="flex justify-between items-center">
            <span>Detenidos</span>
            <strong className="text-white">1</strong>
          </div>
          <div className="flex justify-between items-center">
            <span>Offline</span>
            <strong className="text-white">1</strong>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-[#1dd6ff]/15">
        <h3 className="text-[#90e8ff] text-[11px] font-bold uppercase tracking-[0.18em] mb-3">Alerta reciente</h3>
        <p className="text-slate-300 text-[13px]">Exceso de velocidad detectado.</p>
        <button className="w-full mt-3 py-2.5 rounded-[8px] bg-gradient-to-r from-[#ff5a78] to-[#ff8c52] text-white text-[12px] font-bold uppercase tracking-[0.10em] shadow-[0_0_18px_rgba(255,94,120,0.3)]">
          Ver alerta
        </button>
      </div>
    </div>
  );
};