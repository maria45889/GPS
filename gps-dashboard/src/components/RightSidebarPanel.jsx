import React, { useState } from 'react';
import { Search } from 'lucide-react';

export const RightSidebarPanel = ({ vehicles, selectedVehicle, onSelectVehicle, onSetGeofence, onViewHistory, userLocation, onLocateUser }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVehicles = vehicles.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-right-panel hidden w-[312px] shrink-0 flex-col overflow-hidden rounded-[12px] border border-[#2a3a40] bg-[#151e23] p-4 xl:flex">
      <div className="mb-5 grid grid-cols-3 gap-2">
        <div className="rounded-[8px] border border-[#304149] bg-[#1c282d] p-2 text-center">
          <div className="text-[22px] font-black text-[#edf5ef]">4</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#73838a]">Vehículos</div>
        </div>
        <div className="rounded-[8px] border border-[#304149] bg-[#1c282d] p-2 text-center">
          <div className="text-[22px] font-black text-[#b8f36b]">2</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#73838a]">En ruta</div>
        </div>
        <div className="rounded-[8px] border border-[#304149] bg-[#1c282d] p-2 text-center">
          <div className="text-[22px] font-black text-[#8b9ba1]">1</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#73838a]">Offline</div>
        </div>
      </div>

      <div className="mb-5 rounded-[10px] border border-[#304149] bg-[#1c282d] p-3">
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73838a]">Ubicación actual</h3>
        <div className="space-y-1 text-[12px] text-[#9aa9ad]">
          <div>Coordenadas: <span className="text-[#edf5ef]">{userLocation ? userLocation.position.map(value => value.toFixed(5)).join(', ') : 'Solicitando ubicación...'}</span></div>
          <div>Velocidad: <span className="text-[#edf5ef]">{userLocation?.speed ? `${Math.round(userLocation.speed * 3.6)} km/h` : 'No disponible'}</span></div>
          <div>Precisión: <span className="text-[#edf5ef]">{userLocation ? `${Math.round(userLocation.accuracy)} m` : 'Esperando GPS'}</span></div>
          <div>Estado: <span className="text-[#edf5ef]">{userLocation ? 'Ubicación activa' : 'Permite el GPS'}</span></div>
        </div>
          <button onClick={onLocateUser} className="mt-3 w-full rounded-[8px] bg-[#b8f36b] py-2.5 font-bold uppercase tracking-[0.12em] text-[#172319] transition-colors hover:bg-[#d0fa9a]">
          Mi ubicación
        </button>
      </div>

      <div className="mb-3">
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73838a]">Lista de vehículos</h3>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#73838a]" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar vehículo"
            aria-label="Buscar vehículo"
            className="w-full rounded-[8px] border border-[#304149] bg-[#1c282d] py-2 pl-9 pr-3 text-[12px] text-white placeholder:text-[#73838a] focus:border-[#b8f36b]/60 focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          {filteredVehicles.map(vehicle => (
            <div
              key={vehicle.id}
              onClick={() => onSelectVehicle(vehicle)}
              className={`flex items-center justify-between gap-3 p-2.5 rounded-[8px] border cursor-pointer transition-colors ${
                selectedVehicle?.id === vehicle.id
                  ? 'border-[#b8f36b]/40 bg-[#223329]'
                  : 'border-[#304149] bg-[#1c282d] hover:border-[#b8f36b]/35'
              }`}
            >
              <div>
                <div className="text-[13px] font-semibold text-[#edf5ef]">{vehicle.name}</div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-[#8b9ba1]">
                  <span className={`inline-block h-2 w-2 rounded-full ${
                    vehicle.status === 'active' ? 'bg-emerald-400' :
                    vehicle.status === 'stopped' ? 'bg-amber-400' : 'bg-slate-400'
                  }`}></span>
                  <span>{vehicle.status === 'active' ? 'En ruta' : vehicle.status === 'stopped' ? 'Detenido' : 'Offline'}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[13px] font-semibold text-[#c8ef9b]">{vehicle.speed} km/h</div>
                <div className="text-[10px] text-[#8b9ba1]">{vehicle.battery}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-2">
        <button onClick={onViewHistory} className="w-full rounded-[8px] border border-[#304149] bg-[#1c282d] py-3 text-[12px] font-semibold text-[#c8d4d0] transition-colors hover:border-[#b8f36b]/50 hover:text-[#b8f36b]">
          Historial
        </button>
        <button onClick={onSetGeofence} className="w-full rounded-[8px] border border-[#304149] bg-[#1c282d] py-3 text-[12px] font-semibold text-[#c8d4d0] transition-colors hover:border-[#b8f36b]/50 hover:text-[#b8f36b]">
          Geocerca
        </button>
      </div>
    </div>
  );
};