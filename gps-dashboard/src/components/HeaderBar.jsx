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
    alert('Dropdown: Scomleterr Empentone');
  };

  return (
    <div className="h-14 bg-[#0d1220] border-b border-cyan-500/40 flex items-center justify-between px-4 neon-border">
      {/* Left: Connection Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
          <span className="text-green-400 text-xs font-semibold">ACTIVO</span>
        </div>
        <div className="text-gray-400 text-xs">
          Ultima Conexion: <span className="text-white">ACTIVO (mas 1s)</span>
        </div>
      </div>
      
      {/* Center: Dropdown and Actions */}
      <div className="flex items-center gap-4">
        <div 
          onClick={handleDropdownClick}
          className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-cyan-500/20 transition-colors relative"
        >
          <span className="text-cyan-400 text-xs font-semibold">Scomleterr Empentone</span>
          <ChevronDown size={14} className="text-cyan-400" />
          
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#0d1220] border border-cyan-500/30 rounded-lg shadow-xl z-50">
              <div className="p-2">
                <div className="px-3 py-2 text-cyan-400 text-xs hover:bg-cyan-500/20 rounded cursor-pointer">Opción 1</div>
                <div className="px-3 py-2 text-cyan-400 text-xs hover:bg-cyan-500/20 rounded cursor-pointer">Opción 2</div>
                <div className="px-3 py-2 text-cyan-400 text-xs hover:bg-cyan-500/20 rounded cursor-pointer">Opción 3</div>
              </div>
            </div>
          )}
        </div>
        
        <button 
          onClick={handleActionsClick}
          className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-cyan-500/30 transition-colors"
        >
          Acciones
        </button>
      </div>
      
      {/* Right: Signal and User */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">Señales</span>
          <Signal size={16} className="text-cyan-400" />
          <Wifi size={16} className="text-cyan-400" />
          <span className="text-cyan-400 text-xs font-semibold">4G</span>
        </div>
        
        <div className="w-px h-6 bg-cyan-500/30"></div>
        
        <div className="flex items-center gap-2">
          <div 
            onClick={handleUserClick}
            className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center cursor-pointer hover:bg-cyan-500/30 transition-colors"
          >
            <User size={16} className="text-cyan-400" />
          </div>
          <Settings 
            onClick={handleSettingsClick}
            size={16} 
            className="text-gray-400 cursor-pointer hover:text-cyan-400 transition-colors" 
          />
        </div>
      </div>
    </div>
  );
};