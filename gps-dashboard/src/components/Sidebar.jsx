import React from 'react';
import { LayoutGrid, Truck, Route, Bell, MapPin, Settings, User, X } from 'lucide-react';
import clsx from 'clsx';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, active: true },
  { id: 'fleet', label: 'Fleet', icon: Truck },
  { id: 'routes', label: 'Routes', icon: Route },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'geofences', label: 'GeoFences', icon: MapPin },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const Sidebar = ({ activeTab = 'dashboard', onSelectTab, onClose }) => {
  return (
    <aside className="w-full h-full bg-[#0B0F19] border-r border-[#1E293B]/60 flex flex-col justify-between py-6 px-4 select-none">
      <div>
        {/* Brand Header */}
        <div className="px-3 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-bold tracking-wider text-[#00F0FF]">
              RIDEGUARD
            </span>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="md:hidden w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-textMuted hover:text-white transition-all"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isTabActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={clsx(
                  "flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-150 text-left text-sm font-medium",
                  isTabActive 
                    ? "bg-[#16212E] text-[#00F0FF] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                    : "text-[#94A3B8] hover:text-white hover:bg-white/[0.04]"
                )}
                onClick={() => {
                  if (onSelectTab) onSelectTab(item.id);
                  if (onClose) onClose();
                }}
              >
                <Icon 
                  size={19} 
                  className={isTabActive ? "text-[#00F0FF]" : "text-[#64748B] group-hover:text-white"} 
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="px-2 pt-4 border-t border-[#1E293B]/60">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl text-[#94A3B8] hover:text-white cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-[#1E293B] flex items-center justify-center text-[#94A3B8] border border-white/10">
            <User size={16} />
          </div>
          <span className="text-sm font-medium text-white">Alex R.</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;