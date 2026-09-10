import React, { useState } from 'react';
import { Search, Filter, Bike, X } from 'lucide-react';
import { VehicleCard } from './VehicleCard';

export const FleetList = ({ vehicles, selectedVehicle, onSelectVehicle, onClose }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filteredVehicles = vehicles.filter(v => {
    const term = search.toLowerCase();
    const matchesSearch = v.name.toLowerCase().includes(term) || 
                          v.id.toLowerCase().includes(term) || 
                          (v.plate && v.plate.toLowerCase().includes(term));
    const matchesFilter = filter === 'all' || v.status === filter;
    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: vehicles.length,
    active: vehicles.filter(v => v.status === 'active').length,
    stopped: vehicles.filter(v => v.status === 'stopped').length,
    offline: vehicles.filter(v => v.status === 'offline').length,
  };

  return (
    <div className="w-80 sm:w-88 h-full bg-[#0D1424]/95 border-r border-[#1E293B]/70 p-4 flex flex-col backdrop-blur-2xl text-slate-200 select-none shadow-2xl z-30">
      {/* Header with Title and Close (mobile) */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF]">
            <Bike size={16} />
          </div>
          <h2 className="text-sm font-bold text-white tracking-wide">
            Flota de Vehículos
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-[#00F0FF]">
            {vehicles.length}
          </span>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={14} />
        <input 
          type="text"
          placeholder="Buscar por nombre, placa o ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#131D31] border border-[#1E293B] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#00F0FF]/60 focus:ring-1 focus:ring-[#00F0FF]/40 transition-all font-sans"
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Status Filter Pills */}
      <div className="flex gap-1.5 mb-3.5 pb-1 overflow-x-auto text-[10px] font-medium">
        <button
          onClick={() => setFilter('all')}
          className={`px-2.5 py-1 rounded-lg transition-all ${
            filter === 'all' 
              ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-bold' 
              : 'bg-white/5 text-[#94A3B8] hover:text-white'
          }`}
        >
          Todos ({counts.all})
        </button>

        <button
          onClick={() => setFilter('active')}
          className={`px-2.5 py-1 rounded-lg transition-all ${
            filter === 'active' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold' 
              : 'bg-white/5 text-[#94A3B8] hover:text-white'
          }`}
        >
          En ruta ({counts.active})
        </button>

        <button
          onClick={() => setFilter('stopped')}
          className={`px-2.5 py-1 rounded-lg transition-all ${
            filter === 'stopped' 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold' 
              : 'bg-white/5 text-[#94A3B8] hover:text-white'
          }`}
        >
          Detenidos ({counts.stopped})
        </button>
      </div>

      {/* Lista de vehículos */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredVehicles.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#64748B]">
            No se encontraron vehículos coincidentes
          </div>
        ) : (
          filteredVehicles.map(vehicle => (
            <VehicleCard 
              key={vehicle.id} 
              vehicle={vehicle} 
              isSelected={selectedVehicle?.id === vehicle.id}
              onSelect={onSelectVehicle} 
            />
          ))
        )}
      </div>
    </div>
  );
};
