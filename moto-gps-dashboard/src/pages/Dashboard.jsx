import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import MapArea from '../components/MapArea';
import { Menu } from 'lucide-react';

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex w-full h-full relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <aside className={`
        fixed md:relative z-40 md:z-20
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        transition-transform duration-300 ease-in-out
        w-64 h-full bg-[#080C14] border-r border-surfaceBorder flex flex-col
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative h-full w-full">
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-[#0B0F19]/80 backdrop-blur-md border border-surfaceBorder flex items-center justify-center text-white"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu size={20} />
        </button>

        {/* TopBar - Compact on mobile */}
        <TopBar />
        
        {/* Map Area - Full height on mobile */}
        <main className="flex-1 relative w-full h-full overflow-hidden">
          <MapArea />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
