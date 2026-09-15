import React, { useState } from 'react';
import { Search } from 'lucide-react';

export const RightSidebarPanel = ({ vehicles, selectedVehicle, onSelectVehicle, onSetGeofence, onViewHistory }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVehicles = vehicles.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-[300px] bg-[#071a26] border-l border-[#1dd6ff]/25 flex flex-col overflow-hidden shadow-[inset_1px_0_0_rgba(29,214,255,0.12)] p-4">
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[#0d2330] border border-[#1dd6ff]/25 rounded-[8px] p-2 text-center">
          <div className="text-[#8fe8ff] text-[22px] font-black">4</div>
          <div className="text-[10px] text-slate-300 uppercase tracking-[0.12em] mt-1">Vehículos</div>
        </div>
        <div className="bg-[#0d2330] border border-[#1dd6ff]/25 rounded-[8px] p-2 text-center">
          <div className="text-[#8fe8ff] text-[22px] font-black">2</div>
          <div className="text-[10px] text-slate-300 uppercase tracking-[0.12em] mt-1">En ruta</div>
        </div>
        <div className="bg-[#0d2330] border border-[#1dd6ff]/25 rounded-[8px] p-2 text-center">
          <div className="text-[#8fe8ff] text-[22px] font-black">1</div>
          <div className="text-[10px] text-slate-300 uppercase tracking-[0.12em] mt-1">Offline</div>
        </div>
      </div>

      <div className="bg-[#0d2330] border border-[#1dd6ff]/25 rounded-[10px] p-3 mb-4">
        <h3 className="text-[#90e8ff] text-[11px] font-bold uppercase tracking-[0.18em] mb-3">Ubicación actual</h3>
        <div className="space-y-1 text-[13px] text-slate-300">
          <div>Coordenadas: <span className="text-white">4.3891, -74.2254</span></div>
          <div>Velocidad: <span className="text-white">82 km/h</span></div>
          <div>Distancia: <span className="text-white">12.93 km</span></div>
          <div>ETA: <span className="text-white">01h 45m</span></div>
        </div>
        <button className="w-full mt-3 py-2.5 bg-[#42d4ff] text-[#061a27] rounded-[8px] font-bold uppercase tracking-[0.12em] shadow-[0_0_18px_rgba(66,212,255,0.35)]">
          Ver ruta
        </button>
      </div>

      <div className="mb-3">
        <h3 className="text-[#90e8ff] text-[11px] font-bold uppercase tracking-[0.18em] mb-3">Lista de vehículos</h3>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar vehículo"
            aria-label="Buscar vehículo"
            className="w-full rounded-[8px] border border-[#1dd6ff]/20 bg-[#0b1d2a] py-2 pl-9 pr-3 text-[12px] text-white placeholder:text-slate-500 focus:border-[#1dd6ff]/60 focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          {filteredVehicles.map(vehicle => (
            <div
              key={vehicle.id}
              onClick={() => onSelectVehicle(vehicle)}
              className={`flex items-center justify-between gap-3 p-2.5 rounded-[8px] border cursor-pointer transition-colors ${
                selectedVehicle?.id === vehicle.id
                  ? 'bg-[#0d2330] border-[#1dd6ff]/50'
                  : 'bg-[#0b1d2a] border-[#1dd6ff]/15 hover:border-[#1dd6ff]/35'
              }`}
            >
              <div>
                <div className="text-white text-[14px] font-semibold">{vehicle.name}</div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${
                    vehicle.status === 'active' ? 'bg-emerald-400' :
                    vehicle.status === 'stopped' ? 'bg-amber-400' : 'bg-slate-400'
                  }`}></span>
                  <span>{vehicle.status === 'active' ? 'En ruta' : vehicle.status === 'stopped' ? 'Detenido' : 'Offline'}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[#8fe8ff] text-[13px] font-semibold">{vehicle.speed} km/h</div>
                <div className="text-[10px] text-slate-400">{vehicle.battery}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-2">
        <button onClick={onViewHistory} className="w-full py-3 bg-[#0d2330] border border-[#1dd6ff]/25 text-[#8fe8ff] text-[13px] font-semibold rounded-[6px] hover:border-[#1dd6ff]/50 transition-colors">
          Historial
        </button>
        <button onClick={onSetGeofence} className="w-full py-3 bg-[#0d2330] border border-[#1dd6ff]/25 text-[#8fe8ff] text-[13px] font-semibold rounded-[6px] hover:border-[#1dd6ff]/50 transition-colors">
          Geocerca
        </button>
      </div>
    </div>
  );
};