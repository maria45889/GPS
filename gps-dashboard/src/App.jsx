import React from 'react';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="w-screen h-[100dvh] flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(29,214,255,0.12),_transparent_20%),#01070d] p-3 text-slate-100 antialiased">
      <Dashboard />
    </div>
  );
}

export default App;