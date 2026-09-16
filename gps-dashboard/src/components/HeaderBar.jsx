import React from 'react';
import { Signal, Wifi, Radio, Menu } from 'lucide-react';

export const HeaderBar = ({ onMenuClick }) => {
  return (
    <div className="dashboard-header relative z-20 flex min-h-[72px] items-center justify-between gap-3 border-b border-[#26343b] bg-[#151e23] px-4 py-3 text-[13px] sm:px-6">
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

      <div className="header-status items-center gap-3 text-center">
        <div className="flex items-center gap-2 rounded-full border border-[#30443b] bg-[#1a2925] px-3 py-1.5">
          <div className="h-2 w-2 rounded-full bg-[#b8f36b]"></div>
          <span className="font-semibold uppercase tracking-[0.08em] text-[#c8ef9b]">Sistema activo</span>
        </div>
        <div className="truncate text-[12px] text-[#8b9ba1]">
          Última sincronización hace 12 s
        </div>
      </div>

      <div className="header-signal-actions shrink-0 items-center gap-4">
        <div className="flex items-center gap-2 text-[12px] text-[#8b9ba1]">
          <span>Señal</span>
          <Signal size={15} className="text-[#b8f36b]" />
          <Wifi size={15} className="text-[#b8f36b]" />
          <span className="font-semibold text-[#c8ef9b]">4G</span>
        </div>

      </div>
    </div>
  );
};