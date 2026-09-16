import React, { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import { AuthGate } from './components/AuthGate';
import { Capacitor } from '@capacitor/core';

function App() {
  const [gpsStatus, setGpsStatus] = useState('GPS inicializando...');

  useEffect(() => {
    setGpsStatus(Capacitor.isNativePlatform() ? 'GPS nativo activo' : 'Panel protegido');
  }, []);

  const dashboard = <Dashboard />;

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#0a0f14] p-4 text-slate-100 antialiased sm:p-5">
      <div className="gps-status-pill pointer-events-none absolute left-4 top-4 z-20 rounded-full border border-[#2bd1d1]/30 bg-[#0b1d22]/80 px-3 py-1.5 text-[10px] font-medium tracking-[0.18em] text-[#b9f4f1] uppercase shadow-lg backdrop-blur-sm">
        {gpsStatus}
      </div>
      {Capacitor.isNativePlatform() ? dashboard : <AuthGate>{dashboard}</AuthGate>}
    </div>
  );
}

export default App;