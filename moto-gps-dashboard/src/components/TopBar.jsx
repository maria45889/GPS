import React from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';

const TopBar = () => {
  return (
    <header className="absolute top-0 left-0 right-0 h-20 px-8 flex items-center justify-between z-10 pointer-events-none">
      <div className="flex items-center gap-4 pointer-events-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
          <input 
            type="text" 
            placeholder="Buscar vehículo..." 
            className="bg-[#0B0F19]/80 backdrop-blur-md border border-surfaceBorder rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-accent text-white w-64 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-6 pointer-events-auto">
        <button className="relative w-10 h-10 rounded-full bg-[#0B0F19]/80 backdrop-blur-md border border-surfaceBorder flex items-center justify-center text-textMuted hover:text-white transition-colors">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full shadow-[0_0_8px_#FF3366]"></span>
        </button>

        <button className="flex items-center gap-2 bg-[#0B0F19]/80 backdrop-blur-md border border-surfaceBorder rounded-full pl-2 pr-4 py-1.5 hover:border-white/20 transition-colors">
          <div className="w-8 h-8 rounded-full bg-surface border border-surfaceBorder overflow-hidden">
            <img src="https://ui-avatars.com/api/?name=Alex+R&background=0D8ABC&color=fff" alt="User" className="w-full h-full object-cover" />
          </div>
          <ChevronDown size={16} className="text-textMuted" />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
