import React from 'react';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children, activeScreen, onSelectScreen, serverStatus, onClearData }) {
  return (
    <div className="w-screen h-screen flex bg-[#05060f] overflow-hidden text-white">
      {/* Sidebar - Fixed on the left */}
      <Sidebar 
        activeScreen={activeScreen} 
        onSelectScreen={onSelectScreen} 
        serverStatus={serverStatus}
        onClearData={onClearData}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-1 relative w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
