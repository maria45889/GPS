import React, { useState } from 'react';
import { Bell, Battery, Compass, Layers, Maximize, Navigation, Play, Square, RefreshCw, Database } from 'lucide-react';
import MapView from '../components/MapView';

export default function Live({ 
  activeDevice,
  location,
  history,
  isTracking,
  onToggleTracking,
  serverStatus,
  onStartSimulation,
  onStopSimulation,
  isSimulating,
  onGenerateDemo,
  isGeneratingDemo
}) {
  const speedKmh = location && location.speed != null ? Math.round(location.speed * 3.6) : 0;
  const battery = location && location.battery != null ? Math.round(location.battery) : 85;
  const accuracy = location && location.accuracy != null ? Math.round(location.accuracy) : 5;

  const [simRoute, setSimRoute] = useState('Quito');

  return (
    <div className="flex-1 w-full h-full relative bg-[#080a14]">
      {/* Top Header Floating over the map */}
      <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between pointer-events-none">
        
        {/* Device Name Chip */}
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-xl pointer-events-auto">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Compass className="text-slate-900" size={20} />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-extrabold text-white tracking-wide">
              {activeDevice ? activeDevice.name : 'Mi Dispositivo'}
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f5d4] shadow-lg shadow-teal-500/50" />
              <span className="text-xs font-semibold text-teal-400">En línea</span>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-xl">
            <span className={`w-2 h-2 rounded-full ${isTracking ? 'bg-[#00f5d4] shadow-lg shadow-teal-400/50 animate-pulse' : 'bg-[#ff4757]'} `} />
            <span className="text-sm font-bold tracking-wide text-white">
              {isTracking ? 'Enviando ubicación...' : 'Conexión lista'}
            </span>
          </div>
          
          <button className="w-12 h-12 rounded-xl bg-slate-900/80 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-slate-800 transition-all shadow-xl pointer-events-auto relative">
            <Bell size={20} />
            <span className="absolute top-3 right-3 w-2 h-2 bg-[#ff4757] rounded-full shadow-md shadow-[#ff4757]/50" />
          </button>
        </div>
      </div>

      {/* Fullscreen Map Background */}
      <div className="absolute inset-0 z-10 w-full h-full">
        <MapView 
          latitude={location?.latitude || -0.2206} 
          longitude={location?.longitude || -78.5148} 
          bearing={location?.bearing || null}
          path={history || []}
          showControls={false}
          zoom={14}
        />

        {!location && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 pointer-events-none text-slate-300">
            <Compass className="animate-pulse text-teal-400" size={64} />
            <p className="text-lg font-medium bg-slate-900/90 px-6 py-3 rounded-2xl shadow-2xl border border-teal-500/30">Esperando datos de ubicación GPS...</p>
          </div>
        )}

        {/* Map Context Controls (Right Side) */}
        {location && (
          <div className="absolute right-6 top-[120px] flex flex-col gap-3 z-30 pointer-events-auto">
            <button className="w-12 h-12 rounded-xl bg-slate-900/90 backdrop-blur border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl hover:bg-slate-800">
              <Maximize size={20} />
            </button>
            <button className="w-12 h-12 rounded-xl bg-slate-900/90 backdrop-blur border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl hover:bg-slate-800">
              <Layers size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Floating Panel Bottom - Statistics & Simulation Controls */}
      <div className="absolute bottom-6 left-6 right-6 z-30 pointer-events-none flex items-end justify-between">
        
        {/* Left Side: Simulation Tools */}
        <div className="w-[320px] bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl pointer-events-auto flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Simulación de Rutas</h3>
          
          <select 
            value={simRoute} 
            onChange={(e) => setSimRoute(e.target.value)}
            disabled={isSimulating}
            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-teal-400 disabled:opacity-50 transition-colors"
          >
            <option value="Quito">Quito (Centro & Carolina)</option>
            <option value="Nueva York">Nueva York (Manhattan)</option>
            <option value="Madrid">Madrid (Centro/Gran Vía)</option>
          </select>

          <div className="flex gap-2">
            {!isSimulating ? (
              <button 
                onClick={() => onStartSimulation(simRoute)}
                disabled={!activeDevice}
                className="flex-1 py-3 rounded-xl bg-teal-400/10 border border-teal-400/30 text-teal-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-teal-400 hover:text-slate-950 transition-all shadow-lg hover:shadow-teal-500/10 disabled:opacity-50"
              >
                <Play size={16} fill="currentColor" />
                Iniciar
              </button>
            ) : (
              <button 
                onClick={onStopSimulation}
                className="flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-lg"
              >
                <Square size={16} fill="currentColor" />
                Detener
              </button>
            )}

            <button
              onClick={() => onGenerateDemo(simRoute)}
              disabled={isGeneratingDemo || !activeDevice}
              className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold hover:bg-blue-500 hover:text-white transition-all shadow-lg disabled:opacity-50 flex items-center justify-center"
              title="Generar Viaje Demo (Historial)"
            >
              {isGeneratingDemo ? <RefreshCw size={18} className="animate-spin" /> : <Database size={18} />}
            </button>
          </div>
        </div>

        {/* Right Side: Floating Telemetry Stats */}
        <div className="w-[450px] bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl pointer-events-auto flex flex-col gap-4">
          
          {/* Action Toggle Button */}
          {isTracking ? (
            <button 
              onClick={onToggleTracking}
              className="w-full py-4 rounded-xl bg-red-500/10 border border-red-500/30 text-[#ff4757] font-bold text-sm tracking-wider flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-lg"
            >
              <Square size={16} fill="currentColor" />
              DETENER TRANSMISIÓN GPS
            </button>
          ) : (
            <button 
              onClick={onToggleTracking}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-extrabold text-sm tracking-wider flex items-center justify-center gap-2 hover:from-teal-300 hover:to-emerald-300 transition-all shadow-lg shadow-teal-500/20"
            >
              <Play size={16} fill="currentColor" />
              INICIAR TRANSMISIÓN GPS
            </button>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-xl p-3 text-center space-y-1">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Velocidad</p>
              <p className="text-xl font-extrabold text-white tracking-tight">{speedKmh} <span className="text-xs text-slate-400 font-normal">km/h</span></p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center space-y-1 border-x border-transparent">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Precisión</p>
              <p className="text-xl font-extrabold text-white tracking-tight">{accuracy} <span className="text-xs text-slate-400 font-normal">m</span></p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center space-y-1">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1"><Battery size={12}/> Batería</p>
              <p className="text-xl font-extrabold text-white tracking-tight">{battery} <span className="text-xs text-slate-400 font-normal">%</span></p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
