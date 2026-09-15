import React, { useState } from 'react';
import { Signal, Wifi, User, Settings, ChevronDown } from 'lucide-react';

export const HeaderBar = ({ selectedVehicle }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleActionsClick = () => {
    alert('Panel de acciones para: ' + selectedVehicle?.plate);
  };

  const handleSettingsClick = () => {
    alert('Configuración del sistema');
  };

  const handleUserClick = () => {
    alert('Perfil de usuario');
  };

  const handleDropdownClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
    alert('Flota seleccionada: MotoGPS');
  };

  return (
    <div className="h-16 bg-[#081923] border-b border-[#1dd6ff]/40 flex items-center justify-between px-4 text-[13px] shadow-[inset_0_-1px_0_rgba(29,214,255,0.18)]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-[#7cecff] font-black uppercase tracking-[0.14em] text-[15px]">GPS Tracker</div>
      </div>

      <div className="flex items-center gap-3 text-center">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]"></div>
          <span className="text-emerald-400 font-semibold uppercase tracking-[0.08em]">Activo</span>
        </div>
        <div className="text-slate-300 truncate text-[12px] uppercase tracking-[0.14em]">
          Conexión: activa | señal: buena
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div
          onClick={handleDropdownClick}
          className="flex items-center gap-2 bg-[#0d1f2b] border border-[#1dd6ff]/30 rounded-[6px] px-3 py-2 cursor-pointer hover:border-[#1dd6ff]/60 transition-colors relative shadow-[0_0_10px_rgba(29,214,255,0.06)]"
        >
          <span className="text-[#8fe8ff] font-semibold uppercase text-[12px] tracking-[0.08em]">Scooter Enterprise</span>
          <ChevronDown size={13} className="text-[#8fe8ff]" />

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#091d2d] border border-[#1dd6ff]/30 rounded-[6px] shadow-[0_16px_30px_rgba(0,0,0,0.45)] z-50 overflow-hidden">
              <div className="p-2">
                <div className="px-3 py-2 text-cyan-200 text-xs hover:bg-[#0e1d2d] rounded cursor-pointer">Operación principal</div>
                <div className="px-3 py-2 text-cyan-200 text-xs hover:bg-[#0e1d2d] rounded cursor-pointer">Rutas</div>
                <div className="px-3 py-2 text-cyan-200 text-xs hover:bg-[#0e1d2d] rounded cursor-pointer">Monitoreo</div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleActionsClick}
          className="bg-[#0d1f2b] border border-[#1dd6ff]/30 text-[#8fe8ff] px-3 py-2 rounded-[6px] text-[12px] font-semibold uppercase tracking-[0.08em] hover:border-[#1dd6ff]/60 transition-colors shadow-[0_0_10px_rgba(29,214,255,0.06)]"
        >
          Acciones
        </button>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2 text-[12px] text-slate-300 uppercase tracking-[0.08em]">
          <span>Señales</span>
          <Signal size={15} className="text-[#8fe8ff]" />
          <Wifi size={15} className="text-[#8fe8ff]" />
          <span className="text-[#8fe8ff] font-semibold">4G</span>
        </div>

        <div className="w-px h-6 bg-[#1dd6ff]/30"></div>

        <div className="flex items-center gap-2">
          <div onClick={handleUserClick} className="w-8 h-8 rounded-full bg-[#0d1f2b] border border-[#1dd6ff]/30 flex items-center justify-center cursor-pointer hover:border-[#1dd6ff]/60 shadow-[0_0_10px_rgba(29,214,255,0.06)]">
            <User size={15} className="text-[#8fe8ff]" />
          </div>
          <Settings onClick={handleSettingsClick} size={15} className="text-slate-300 cursor-pointer hover:text-[#8fe8ff] transition-colors" />
        </div>
      </div>
    </div>
  );
};