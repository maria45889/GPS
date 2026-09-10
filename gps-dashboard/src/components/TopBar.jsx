import React from 'react';
import { Search, Bell, User, Menu } from 'lucide-react';

const TopBar = ({ onMenuClick, onToggleAlerts, alertCount = 1 }) => {
  return (
    <header className="w-full h-14 px-4 md:px-6 flex items-center justify-between z-20 bg-[#0B0F19]/80 backdrop-blur-md border-b border-[#1E293B]/40 shrink-0">
      {/* Left: Mobile hamburger + Search Input */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-[#00F0FF]"
          aria-label="Toggle menu"
        >
          <Menu size={18} />
        </button>

        <div className="relative flex items-center">
          <Search className="absolute left-3 text-[#64748B]" size={15} />
          <input
            type="text"
            placeholder="Search"
            className="bg-transparent border border-[#1E293B] rounded-lg pl-8 pr-4 py-1.5 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#00F0FF]/60 w-44 sm:w-60 transition-all"
          />
        </div>
      </div>

      {/* Right icons: Search, Bell, User */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleAlerts}
          className="relative w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-white/5 transition-all"
          aria-label="Alerts"
        >
          <Bell size={16} />
          {alertCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF3366] rounded-full shadow-[0_0_6px_#FF3366]"></span>
          )}
        </button>

        <div className="w-8 h-8 rounded-full bg-[#1E293B] flex items-center justify-center text-[#94A3B8] border border-white/10 cursor-pointer">
          <User size={15} />
        </div>
      </div>
    </header>
  );
};

export default TopBar;