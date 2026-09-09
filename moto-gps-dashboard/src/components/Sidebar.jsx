import React from 'react';
import { LayoutDashboard, Truck, Route, Bell, MapPin, Settings, User } from 'lucide-react';
import clsx from 'clsx';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { id: 'fleet', label: 'Mis motocicletas', icon: Truck },
  { id: 'routes', label: 'Historial', icon: Route },
  { id: 'alerts', label: 'Alertas', icon: Bell },
  { id: 'geofences', label: 'Geocercas', icon: MapPin },
  { id: 'settings', label: 'Configuración', icon: Settings },
];

const Sidebar = () => {
  return (
    <aside className="w-64 h-full bg-[#080C14] border-r border-surfaceBorder flex flex-col justify-between py-6 z-20">
      <div>
        <div className="px-6 mb-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <span className="text-accent font-bold text-lg">R</span>
          </div>
          <h1 className="text-xl font-bold tracking-wide">RIDEGUARD</h1>
        </div>

        <nav className="flex flex-col gap-2 px-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={clsx(
                  "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300",
                  item.active 
                    ? "bg-surface border border-surfaceBorder shadow-[0_0_15px_rgba(0,229,255,0.1)] text-white" 
                    : "text-textMuted hover:text-white hover:bg-white/5"
                )}
              >
                <Icon size={20} className={item.active ? "text-accent" : ""} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-4">
        <button className="flex items-center gap-4 px-4 py-3 w-full rounded-xl text-textMuted hover:text-white hover:bg-white/5 transition-all">
          <div className="w-8 h-8 rounded-full bg-surface border border-surfaceBorder flex items-center justify-center overflow-hidden">
             <User size={16} />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-white">Alex R.</span>
            <span className="text-xs text-textMuted">Administrador</span>
          </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
