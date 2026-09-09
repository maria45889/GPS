import React from 'react';
import { Battery, Zap, Navigation, Signal } from 'lucide-react';
import { motion } from 'framer-motion';

const MotoInfoCard = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="absolute top-24 left-8 w-80 z-10 flex flex-col gap-4 pointer-events-auto"
    >
      <div className="bg-surface backdrop-blur-md border border-surfaceBorder rounded-2xl p-5 shadow-2xl">
        <h2 className="text-sm text-textMuted mb-4 uppercase tracking-wider font-semibold">Estado del Vehículo</h2>
        
        <div className="flex gap-4 items-center mb-6">
          <div className="w-24 h-16 bg-white/5 rounded-xl flex items-center justify-center p-2 relative overflow-hidden group">
            {/* Placeholder for moto image */}
            <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <img src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=200" alt="Moto" className="w-full h-full object-cover rounded-lg" />
          </div>
          
          <div>
            <h3 className="font-bold text-lg leading-tight">Yamaha YZF-R1</h3>
            <p className="text-xs text-textMuted">ID: MT-2101</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
              </span>
              <span className="text-xs font-medium text-success">En movimiento</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 text-textMuted mb-1">
              <Zap size={14} className="text-accent" />
              <span className="text-xs font-medium">Velocidad</span>
            </div>
            <p className="text-xl font-bold">84 <span className="text-sm font-normal text-textMuted">km/h</span></p>
          </div>
          
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 text-textMuted mb-1">
              <Navigation size={14} className="text-accent" />
              <span className="text-xs font-medium">Kilometraje</span>
            </div>
            <p className="text-lg font-bold">14,352 <span className="text-xs font-normal text-textMuted">km</span></p>
          </div>
        </div>
      </div>

      <div className="bg-surface backdrop-blur-md border border-surfaceBorder rounded-2xl p-4 shadow-2xl flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <Battery size={16} className="text-success" />
          </div>
          <div>
            <p className="text-xs text-textMuted">Batería</p>
            <p className="text-sm font-bold">92%</p>
          </div>
        </div>
        <div className="w-px h-8 bg-surfaceBorder"></div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <Signal size={16} className="text-accent" />
          </div>
          <div>
            <p className="text-xs text-textMuted">Señal GPS</p>
            <p className="text-sm font-bold">Excelente</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MotoInfoCard;
