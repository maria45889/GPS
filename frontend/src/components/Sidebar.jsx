import React from 'react';
import { 
  Radio, Calendar, Smartphone, Settings, 
  LogOut, MapPin, Activity
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar({ serverStatus }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const menuItems = [
    { path: '/', label: 'En Vivo', icon: Radio },
    { path: '/history', label: 'Historial', icon: Calendar },
    { path: '/devices', label: 'Equipos', icon: Smartphone },
    { path: '/settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="w-[260px] h-full bg-[#080a14] border-r border-white/5 flex flex-col z-50 shrink-0">
      {/* Header / Logo */}
      <div className="p-6 border-b border-white/5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-400 to-emerald-400 flex items-center justify-center text-[#080a14] shadow-lg shadow-teal-500/20">
          <MapPin size={20} fill="currentColor" />
        </div>
        <div>
          <h1 className="font-extrabold tracking-wide text-lg text-white flex items-center gap-1.5">
            <span className="text-teal-400">GPS</span> PRO
          </h1>
        </div>
      </div>

      {/* Main Menu */}
      <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition-all group
                ${isActive 
                  ? 'bg-teal-400/10 text-teal-400 border border-teal-400/10 shadow-md shadow-teal-500/5' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }
              `}
            >
              <Icon 
                size={18} 
                className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-white'}`} 
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer Area */}
      <div className="p-4 border-t border-white/5 space-y-3">
        
        {/* Server Status */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/5">
          <span className={`w-2.5 h-2.5 rounded-full ${serverStatus === 'connected' ? 'bg-teal-400 shadow-md shadow-teal-500/50 animate-pulse' : 'bg-red-500 shadow-md shadow-red-500/50'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Servidor</span>
            <span className="text-xs font-semibold text-white">{serverStatus === 'connected' ? 'Conectado' : 'Desconectado'}</span>
          </div>
          <Activity size={16} className={`ml-auto ${serverStatus === 'connected' ? 'text-teal-400' : 'text-red-500 opacity-50'}`} />
        </div>

        {/* Logout */}
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:text-white hover:bg-red-500/10 border border-transparent hover:border-red-500/10 transition-all group">
          <LogOut size={18} className="transition-transform group-hover:translate-x-1" />
          <span>Salir</span>
        </button>
      </div>
    </div>
  );
}
