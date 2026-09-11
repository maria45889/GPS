import React from 'react';
import { MoreVertical } from 'lucide-react';

export const VideoFeed = ({ selectedVehicle }) => {
  const handleMenuClick = () => {
    alert('Opciones de video para: ' + selectedVehicle?.plate);
  };

  return (
    <div className="relative w-full h-48 bg-black overflow-hidden border-b border-cyan-500/40 neon-border">
      {/* Video feed with motorcycle image */}
      <div className="absolute inset-0">
        <img 
          src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=1200" 
          alt="Yamaha MT-07" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"></div>
      </div>
      
      {/* Vehicle info overlay */}
      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-2 rounded-lg border border-cyan-500/30">
        <p className="text-white text-xs font-bold">{selectedVehicle?.plate || 'PC-450V'} - {selectedVehicle?.name || 'Yamaha MT-07'}</p>
        <p className="text-cyan-400 text-xs mt-0.5">En Movimiento</p>
      </div>
      
      {/* Menu button */}
      <button 
        onClick={handleMenuClick}
        className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md border border-cyan-500/30 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 transition-colors"
      >
        <MoreVertical size={16} />
      </button>
      
      {/* Status indicator */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
        <span className="text-green-400 text-xs font-semibold">EN VIVO</span>
      </div>
    </div>
  );
};