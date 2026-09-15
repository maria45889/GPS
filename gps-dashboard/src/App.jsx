import React from 'react';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="w-screen h-[100dvh] flex items-center justify-center overflow-hidden bg-[#0a0f14] p-4 text-slate-100 antialiased sm:p-5">
      <Dashboard />
    </div>
  );
}

export default App;