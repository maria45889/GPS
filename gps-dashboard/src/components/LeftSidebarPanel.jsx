import React from 'react';
import { Play, AlertTriangle } from 'lucide-react';

export const LeftSidebarPanel = ({ selectedVehicle }) => {
  const handleAlertClick = (alertName) => {
    alert('Ver detalles de alerta: ' + alertName);
  };

  const handlePlaybackClick = () => {
    alert('Reproduciendo historial de: ' + selectedVehicle?.plate);
  };

  return (
    <div className="w-72 bg-[#0d1220] border-r border-cyan-500/30 flex flex-col overflow-hidden neon-border">
      {/* Panel 1: Direncias léam */}
      <div className="p-4 border-b border-cyan-500/20">
        <h3 className="text-cyan-400 text-sm font-bold mb-3 uppercase tracking-wider animate-neon-pulse">Direncias léam</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs">Caadata</span>
            <span className="text-white text-xs font-mono font-bold">1600M</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs">Cedulrweiteren</span>
            <span className="text-white text-xs font-mono font-bold">3067.30254</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs">Lafmhishg 4</span>
            <span className="text-white text-xs font-mono font-bold">3067.30254</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs">Meituellets</span>
            <span className="text-white text-xs font-mono font-bold">0669</span>
          </div>
        </div>
        
        <button className="w-full mt-4 py-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-bold rounded-lg hover:bg-cyan-500/30 transition-colors cursor-not-allowed opacity-60">
          Proximamente
        </button>
      </div>
      
      {/* Panel 2: Desde Ahora */}
      <div className="p-4 border-b border-cyan-500/20">
        <h3 className="text-cyan-400 text-sm font-bold mb-3 uppercase tracking-wider animate-neon-pulse">Desde Ahora</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs">Derade an</span>
            <span className="text-white text-xs font-mono font-bold">PC-450V</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs">Faerie 8000</span>
            <span className="text-white text-xs font-mono font-bold">PC-450V</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs">Reundgo</span>
            <span className="text-white text-xs font-mono font-bold">1255</span>
          </div>
        </div>
      </div>
      
      {/* Panel 3: Alertas Guardadas */}
      <div className="p-4 border-b border-cyan-500/20">
        <h3 className="text-cyan-400 text-sm font-bold mb-3 uppercase tracking-wider animate-neon-pulse">Alertas Guardadas</h3>
        
        <div 
          onClick={handlePlaybackClick}
          className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4 cursor-pointer hover:bg-cyan-500/20 transition-colors"
        >
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 border-2 border-cyan-500/50 flex items-center justify-center">
              <Play size={20} className="text-cyan-400" fill="currentColor" />
            </div>
          </div>
          <p className="text-center text-cyan-400 text-xs mt-2 font-semibold">Reproducción</p>
          <p className="text-center text-gray-400 text-xs">Historial de movimiento</p>
        </div>
      </div>
      
      {/* Panel 4: Alertas Recibidas */}
      <div className="p-4 flex-1">
        <h3 className="text-cyan-400 text-sm font-bold mb-3 uppercase tracking-wider animate-neon-pulse">Alertas Recibidas</h3>
        
        <div className="space-y-2">
          <div 
            onClick={() => handleAlertClick('70-12-Doprava One A')}
            className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 flex items-center gap-2 cursor-pointer hover:bg-cyan-500/20 transition-colors"
          >
            <AlertTriangle size={16} className="text-cyan-400 shrink-0" />
            <div>
              <p className="text-white text-xs font-bold">70-12-Doprava One A</p>
              <p className="text-gray-400 text-xs">Alerta de velocidad</p>
            </div>
          </div>
          
          <div 
            onClick={() => handleAlertClick('20-48-hazia ta Veja')}
            className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 flex items-center gap-2 cursor-pointer hover:bg-cyan-500/20 transition-colors"
          >
            <AlertTriangle size={16} className="text-cyan-400 shrink-0" />
            <div>
              <p className="text-white text-xs font-bold">20-48-hazia ta Veja</p>
              <p className="text-gray-400 text-xs">Alerta de geocerca</p>
            </div>
          </div>
          
          <div 
            onClick={() => handleAlertClick('00-00-hazia de Vieja')}
            className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 flex items-center gap-2 cursor-pointer hover:bg-cyan-500/20 transition-colors"
          >
            <AlertTriangle size={16} className="text-cyan-400 shrink-0" />
            <div>
              <p className="text-white text-xs font-bold">00-00-hazia de Vieja</p>
              <p className="text-gray-400 text-xs">Alerta de movimiento</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};