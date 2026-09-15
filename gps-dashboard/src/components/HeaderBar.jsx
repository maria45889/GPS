import React, { useState } from 'react';
import { Signal, Wifi, User, Settings, ChevronDown, Radio, MoreHorizontal, Menu } from 'lucide-react';

export const HeaderBar = ({ selectedVehicle, onMenuClick }) => {
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
    <div className="relative z-20 flex min-h-[72px] items-center justify-between gap-3 border-b border-[#26343b] bg-[#151e23] px-4 py-3 text-[13px] sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#b8f36b] text-[#16251a] shadow-[0_4px_14px_rgba(184,243,107,0.18)]">
          <Radio size={19} strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold tracking-[-0.02em] text-[#f2f6f3]">RideGuard</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#73838a]">Control de flota</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onMenuClick}
        className="mobile-menu-button"
        aria-label="Abrir menú"
      >
        <Menu size={18} />
      </button>

      <div className="hidden items-center gap-3 text-center md:flex">
        <div className="flex items-center gap-2 rounded-full border border-[#30443b] bg-[#1a2925] px-3 py-1.5">
          <div className="h-2 w-2 rounded-full bg-[#b8f36b]"></div>
          <span className="font-semibold uppercase tracking-[0.08em] text-[#c8ef9b]">Sistema activo</span>
        </div>
        <div className="truncate text-[12px] text-[#8b9ba1]">
          Última sincronización hace 12 s
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          onClick={handleDropdownClick}
          className="relative flex cursor-pointer items-center gap-2 rounded-[8px] border border-[#304149] bg-[#1c282d] px-3 py-2 transition-colors hover:border-[#b8f36b]/60"
        >
          <span className="hidden text-[12px] font-semibold text-[#e2ebe6] sm:inline">Scooter Enterprise</span>
          <ChevronDown size={13} className="text-[#b8f36b]" />

          {isDropdownOpen && (
            <div className="absolute top-full left-0 z-50 mt-2 w-48 overflow-hidden rounded-[8px] border border-[#304149] bg-[#1a252a] shadow-[0_16px_30px_rgba(0,0,0,0.45)]">
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
          className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#304149] bg-[#1c282d] text-[#b8f36b] transition-colors hover:border-[#b8f36b]/60 sm:w-auto sm:px-3"
          aria-label="Acciones"
        >
          <MoreHorizontal size={17} className="sm:hidden" />
          <span className="hidden sm:inline">Acciones</span>
        </button>
      </div>

      <div className="hidden shrink-0 items-center gap-4 lg:flex">
        <div className="flex items-center gap-2 text-[12px] text-[#8b9ba1]">
          <span>Señal</span>
          <Signal size={15} className="text-[#b8f36b]" />
          <Wifi size={15} className="text-[#b8f36b]" />
          <span className="font-semibold text-[#c8ef9b]">4G</span>
        </div>

        <div className="h-6 w-px bg-[#304149]"></div>

        <div className="flex items-center gap-2">
          <div onClick={handleUserClick} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#43545a] bg-[#27343a] hover:border-[#b8f36b]/60">
            <User size={15} className="text-[#d3ddd8]" />
          </div>
          <Settings onClick={handleSettingsClick} size={15} className="cursor-pointer text-[#8b9ba1] transition-colors hover:text-[#b8f36b]" />
        </div>
      </div>
    </div>
  );
};