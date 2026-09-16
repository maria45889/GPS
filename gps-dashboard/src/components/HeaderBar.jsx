import React from 'react';
import { Signal, Wifi, LogOut, Menu } from 'lucide-react';

export const HeaderBar = ({ category, onCategoryChange, lastSyncLabel, onLogout, onMenuClick }) => {
  return (
    <div className="reference-dashboard-header dashboard-header relative z-20 flex min-h-[58px] items-center justify-between gap-3 border-b border-[#173344] bg-[#081522] px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#071c2b] text-[#1ee6ee]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
        </div>
        <div className="min-w-0">
          <div className="truncate text-[14px] font-bold tracking-[-0.02em] text-[#edf5ef]">RideGuard</div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#5f7e87]">
            {category === 'devices' ? 'Monitoreo de dispositivos' : 'Control de flota'}
          </div>
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

      <div className="hidden items-center rounded-full border border-[#173344] bg-[#0d1d26] p-[3px] sm:flex" role="tablist" aria-label="Categoría de vista">
        {[
          { id: 'devices', label: 'Dispositivos' },
          { id: 'vehicles', label: 'Motos' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={category === item.id}
            onClick={() => onCategoryChange(item.id)}
            className={`relative min-w-[84px] rounded-full px-3 py-[5px] text-[11px] font-bold uppercase tracking-[0.1em] transition-all ${
              category === item.id
                ? 'bg-[#1a2d36] text-[#b8f36b] shadow-[0_0_10px_rgba(184,243,107,0.14)]'
                : 'text-[#5f7e87] hover:text-[#8fa5ad]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="header-status flex items-center gap-2 rounded-full border border-[#30443b] bg-[#1a2925] px-3 py-1.5">
          <div className="h-[7px] w-[7px] rounded-full bg-[#b8f36b]"></div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#c8ef9b]">
            {lastSyncLabel || 'Sistema activo'}
          </span>
        </div>
        <div className="header-signal-actions hidden items-center gap-2 text-[12px] text-[#8b9ba1] md:flex">
          <Signal size={14} className="text-[#b8f36b]" />
          <Wifi size={14} className="text-[#b8f36b]" />
          <span className="font-semibold text-[#c8ef9b]">4G</span>
        </div>
        <button
          type="button"
          onClick={onLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="hidden items-center justify-center rounded-[7px] border border-[#28566a] bg-[#102b38] p-[7px] text-[#66d9d8] transition-colors hover:border-[#35b9c9] hover:text-[#9feeff] sm:flex"
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );
};