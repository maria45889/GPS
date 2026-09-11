import React, { useState } from 'react';
import { Search, Clock, History, MapPin, AlertTriangle } from 'lucide-react';

export const RightSidebarPanel = ({ vehicles, selectedVehicle, onSelectVehicle, onSetGeofence, onReportTheft, onViewHistory }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVehicles = vehicles.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-80 bg-[#0d1220] border-l border-cyan-500/30 flex flex-col overflow-hidden neon-border">
      {/* Vehicle List */}
      <div className="p-4 border-b border-cyan-500/20">
        <h3 className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-3">Vehículos</h3>
        
        <div className="space-y-2">
          {filteredVehicles.map(vehicle => (
            <div
              key={vehicle.id}
              onClick={() => onSelectVehicle(vehicle)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedVehicle?.id === vehicle.id
                  ? 'bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                  : 'bg-cyan-500/5 border-cyan-500/20 hover:bg-cyan-500/10 hover:border-cyan-500/30'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-white text-sm font-bold">{vehicle.plate}</p>
                  <p className="text-gray-400 text-xs">{vehicle.name}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  vehicle.status === 'active' ? 'bg-green-500' : 
                  vehicle.status === 'stopped' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">{vehicle.speed} km/h</span>
                <span className="text-gray-400">{vehicle.battery}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="p-4 border-b border-cyan-500/20">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-cyan-500/10 border border-cyan-500/30 rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>
      
      {/* Mini Map Section */}
      <div className="flex-1 p-4">
        <div className="w-full h-32 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <MapPin size={24} className="text-cyan-400 mx-auto mb-2" />
            <p className="text-cyan-400 text-xs font-semibold">Mapa de ubicación</p>
            <p className="text-gray-400 text-xs">Vista general</p>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="p-4 border-t border-cyan-500/20 space-y-2">
        <button
          onClick={onViewHistory}
          className="w-full py-3 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-sm font-bold rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <History size={16} />
          Ver Historial
        </button>
        
        <button
          onClick={onSetGeofence}
          className="w-full py-3 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-sm font-bold rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <MapPin size={16} />
          Establecer Geocerca
        </button>
        
        <button
          onClick={onReportTheft}
          className="w-full py-3 bg-red-500/20 border border-red-500/40 text-red-400 text-sm font-bold rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <AlertTriangle size={16} />
          Reportar Robo
        </button>
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-cyan-500/20 text-center">
        <p className="text-gray-500 text-xs">Powered by</p>
        <p className="text-cyan-400 text-sm font-bold">Dola AI</p>
      </div>
    </div>
  );
};