import React from 'react';

export const LeftSidebarPanel = () => {
  return (
    <div className="hidden w-[224px] shrink-0 flex-col overflow-hidden rounded-[12px] border border-[#2a3a40] bg-[#151e23] text-[13px] lg:flex">
      <div className="p-3">
        <nav className="space-y-2">
          {['Inicio', 'Mapa', 'Vehículos', 'Historial', 'Alertas', 'Configuración'].map((item, index) => (
            <button
              key={item}
              className={`w-full rounded-[8px] border px-3 py-2.5 text-left text-[13px] transition-all ${
                index === 0
                  ? 'border-[#b8f36b]/35 bg-[#223329] font-semibold text-[#d7f6ad]'
                  : 'border-transparent bg-transparent text-[#9aa9ad] hover:border-[#304149] hover:bg-[#1c292e] hover:text-[#edf5ef]'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      <div className="border-b border-[#26343b] px-4 pb-4">
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73838a]">Resumen de flota</h3>

        <div className="space-y-2 text-[12px] text-[#9aa9ad]">
          <div className="flex justify-between items-center">
            <span>Vehículos</span>
            <strong className="text-[#edf5ef]">4</strong>
          </div>
          <div className="flex justify-between items-center">
            <span>En ruta</span>
            <strong className="text-[#b8f36b]">2</strong>
          </div>
          <div className="flex justify-between items-center">
            <span>Detenidos</span>
            <strong className="text-[#f2c66d]">1</strong>
          </div>
          <div className="flex justify-between items-center">
            <span>Offline</span>
            <strong className="text-[#8b9ba1]">1</strong>
          </div>
        </div>
      </div>

      <div className="border-b border-[#26343b] p-4">
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73838a]">Alerta reciente</h3>
        <div className="rounded-[8px] border border-[#5a4430] bg-[#2a2119] p-3">
          <p className="text-[12px] font-medium text-[#f2d7a2]">Exceso de velocidad detectado.</p>
          <p className="mt-1 text-[11px] text-[#aa9270]">Yamaha MT-07 · hace 4 min</p>
        </div>
        <button className="mt-3 w-full rounded-[8px] border border-[#5a4430] bg-transparent py-2.5 text-[11px] font-bold uppercase tracking-[0.10em] text-[#f2c66d] transition-colors hover:bg-[#3a2b1c]">
          Ver alerta
        </button>
      </div>
    </div>
  );
};