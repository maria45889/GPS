import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import { AuthGate } from './components/AuthGate';
import { Capacitor } from '@capacitor/core';

function App() {
  const isNativePlatform = Capacitor.isNativePlatform();

  if (isNativePlatform) {
    return (
      <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#0a0f14] flex items-center justify-center flex-col text-center p-8">
        <div className="gps-status-pill absolute top-8 z-20 rounded-full border border-[#2bd1d1]/30 bg-[#0b1d22]/80 px-4 py-2 text-xs font-bold tracking-[0.18em] text-[#b9f4f1] uppercase shadow-lg backdrop-blur-sm">
          Rastreo Activo
        </div>
        
        <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-[#0b1d22]/50 border border-[#2bd1d1]/20">
          <div className="w-24 h-24 rounded-full bg-[#2bd1d1]/10 flex items-center justify-center animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2bd1d1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#b9f4f1] mb-2">GPS Seguro</h1>
            <p className="text-slate-400 text-sm max-w-[250px]">Este dispositivo está enviando ubicación al panel.</p>
          </div>
        </div>
      </div>
    );
  }

  // Web Dashboard Platform
  return (
    <AuthGate>
      <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#0b0f19] text-slate-100 antialiased">
        <Dashboard />
      </div>
    </AuthGate>
  );
}

export default App;
