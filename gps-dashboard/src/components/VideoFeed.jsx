import React, { useState } from 'react';
import { MoreVertical } from 'lucide-react';

export const VideoFeed = ({ selectedVehicle, onOpenDetail, onOperationMessage }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="dashboard-video relative w-full h-[220px] shrink-0 bg-black overflow-hidden rounded-[12px] border border-[#cfe2e9] shadow-[0_8px_20px_rgba(43,93,112,0.12)]">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=1200"
          alt="Yamaha MT-07"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.12),rgba(2,6,23,0.55))]"></div>
      </div>

      <div className="absolute top-3 left-3 bg-black/55 backdrop-blur-md px-3 py-2 rounded-lg border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.12)]">
        <p className="text-white text-[11px] font-bold uppercase tracking-[0.12em]">{selectedVehicle?.plate || 'PC-450V'} - {selectedVehicle?.name || 'Yamaha MT-07'}</p>
        <p className="text-cyan-300 text-[10px] mt-1 uppercase tracking-[0.12em]">En movimiento</p>
      </div>

      <button
        onClick={() => setIsMenuOpen((open) => !open)}
        className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/55 backdrop-blur-md border border-cyan-500/30 flex items-center justify-center text-cyan-300 hover:bg-cyan-500/20 transition-colors"
      >
        <MoreVertical size={16} />
      </button>

      {isMenuOpen && (
        <div className="video-feed-menu">
          <button type="button" onClick={() => { onOpenDetail?.(); setIsMenuOpen(false); }}>Ver detalle</button>
          <button type="button" onClick={() => { onOperationMessage?.('Cámara en vivo disponible cuando se conecte el dispositivo'); setIsMenuOpen(false); }}>Estado de cámara</button>
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
        <span className="text-emerald-300 text-[10px] font-semibold uppercase tracking-[0.18em]">En vivo</span>
      </div>
    </div>
  );
};