import React from 'react';
import { AlertTriangle, AlertCircle, Info, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const alerts = [
  {
    id: 1,
    type: 'danger',
    title: 'Salida de Geocerca',
    desc: 'Zona Norte, Salida detectada',
    time: '12:48 PM',
    icon: AlertTriangle
  },
  {
    id: 2,
    type: 'warning',
    title: 'Alerta de Velocidad',
    desc: '95 km/h en zona de 80 km/h',
    time: '12:45 PM',
    icon: AlertCircle
  },
  {
    id: 3,
    type: 'info',
    title: 'Ruta Iniciada',
    desc: 'Motor encendido',
    time: '11:32 AM',
    icon: Info
  }
];

const AlertsPanel = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="absolute top-24 right-8 w-80 z-10 pointer-events-auto"
    >
      <div className="bg-surface backdrop-blur-md border border-surfaceBorder rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm text-white font-semibold flex items-center gap-2">
            Alertas Activas
            <span className="bg-danger/20 text-danger text-[10px] px-2 py-0.5 rounded-full font-bold border border-danger/30">2</span>
          </h2>
          <button className="text-textMuted hover:text-white transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 relative">
          {/* Vertical connecting line */}
          <div className="absolute left-[15px] top-4 bottom-4 w-px bg-surfaceBorder z-0"></div>

          {alerts.map((alert, idx) => {
            const Icon = alert.icon;
            return (
              <div key={alert.id} className="relative z-10 flex gap-4">
                <div className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-surface bg-[#0B0F19]",
                  alert.type === 'danger' ? "text-danger" : alert.type === 'warning' ? "text-orange-500" : "text-accent"
                )}>
                  <Icon size={14} />
                </div>
                
                <div className={clsx(
                  "flex-1 p-3 rounded-xl border transition-colors cursor-pointer",
                  alert.type === 'danger' 
                    ? "bg-danger/5 border-danger/20 hover:bg-danger/10" 
                    : alert.type === 'warning'
                      ? "bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/10"
                      : "bg-white/5 border-white/5 hover:bg-white/10"
                )}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-semibold text-white">{alert.title}</span>
                    <span className="text-[10px] text-textMuted">{alert.time}</span>
                  </div>
                  <p className="text-xs text-textMuted">{alert.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default AlertsPanel;
