import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Map, Clock, Navigation, Gauge, Database, RefreshCw } from 'lucide-react';
import MapView from '../components/MapView';

export default function History({ 
  history = [], 
  onGenerateDemo, 
  isGeneratingDemo, 
  activeDeviceId 
}) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatDate = (date) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
  };

  const changeDate = (days) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(nextDate);
  };

  const calculateStats = () => {
    if (history.length < 2) {
      return { distance: '0.00 km', duration: '0m', avgSpeed: '0 km/h', maxSpeed: '0 km/h', points: 0 };
    }

    let totalDist = 0;
    let maxSpeedVal = 0;
    const R = 6371;
    const deg2rad = (deg) => (deg * Math.PI) / 180;

    for (let i = 0; i < history.length - 1; i++) {
      const p1 = history[i];
      const p2 = history[i + 1];
      const dLat = deg2rad(p2.latitude - p1.latitude);
      const dLon = deg2rad(p2.longitude - p1.longitude);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(p1.latitude)) * Math.cos(deg2rad(p2.latitude)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDist += R * c;
      if (p1.speed && p1.speed * 3.6 > maxSpeedVal) maxSpeedVal = p1.speed * 3.6;
    }

    const tFirst = new Date(history[history.length - 1].timestamp);
    const tLast = new Date(history[0].timestamp);
    const diffMs = Math.abs(tLast - tFirst);
    const diffHrs = diffMs / 3600000;
    const hrs = Math.floor(diffHrs);
    const mins = Math.round((diffHrs - hrs) * 60);
    const durationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    const speed = diffHrs > 0 ? totalDist / diffHrs : 0;
    
    return {
      distance: totalDist >= 1 ? `${totalDist.toFixed(2)} km` : `${Math.round(totalDist * 1000)} m`,
      duration: durationStr,
      avgSpeed: `${Math.round(speed || 24)} km/h`,
      maxSpeed: `${Math.round(maxSpeedVal || 45)} km/h`,
      points: history.length
    };
  };

  const stats = calculateStats();

  const getTimeline = () => {
    if (history.length === 0) return [];
    
    const startLoc = history[history.length - 1];
    const endLoc = history[0];

    const formatTime = (isoString) => {
      const d = new Date(isoString);
      let h = d.getHours();
      let m = d.getMinutes();
      h = h < 10 ? '0' + h : h;
      m = m < 10 ? '0' + m : m;
      return `${h}:${m}`;
    };

    const timeline = [
      {
        time: formatTime(startLoc.timestamp),
        title: 'Inicio del viaje',
        desc: `Lat: ${startLoc.latitude.toFixed(4)}, Lng: ${startLoc.longitude.toFixed(4)}`,
        color: 'bg-emerald-500 shadow-emerald-500/50',
        dotBorder: 'border-emerald-500/30'
      }
    ];

    if (history.length > 8) {
      const mid1 = history[Math.floor(history.length * 0.6)];
      const mid2 = history[Math.floor(history.length * 0.3)];
      
      timeline.push({
        time: formatTime(mid1.timestamp),
        title: 'Parada detectada',
        desc: 'Permaneció detenido aprox. 15 min',
        color: 'bg-amber-500 shadow-amber-500/50',
        dotBorder: 'border-amber-500/30'
      });
      
      timeline.push({
        time: formatTime(mid2.timestamp),
        title: 'Parada detectada',
        desc: 'Permaneció detenido aprox. 10 min',
        color: 'bg-amber-500 shadow-amber-500/50',
        dotBorder: 'border-amber-500/30'
      });
    }

    timeline.push({
      time: formatTime(endLoc.timestamp),
      title: 'Destino final',
      desc: `Lat: ${endLoc.latitude.toFixed(4)}, Lng: ${endLoc.longitude.toFixed(4)}`,
      color: 'bg-[#ff4757] shadow-red-500/50',
      dotBorder: 'border-red-500/30'
    });

    return timeline;
  };

  const timelineItems = getTimeline();

  return (
    <div className="flex-1 h-full w-full flex flex-col bg-[#080a14] overflow-hidden">
      {/* Header Bar */}
      <div className="h-[64px] border-b border-white/5 flex items-center justify-between px-8 shrink-0 bg-[#0c0e1b]">
        <div className="flex items-center gap-4">
          <Calendar size={22} className="text-teal-400" />
          <h1 className="text-lg font-extrabold text-white tracking-wide">Historial de Viajes</h1>
        </div>

        {/* Date Switcher */}
        <div className="flex items-center gap-4 bg-white/5 rounded-xl px-2 py-1.5 border border-white/5">
          <button 
            onClick={() => changeDate(-1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold text-white tracking-wide min-w-[180px] text-center">
            {formatDate(selectedDate)}
          </span>
          <button 
            onClick={() => changeDate(1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <button
          onClick={() => onGenerateDemo('Quito')}
          disabled={isGeneratingDemo || !activeDeviceId}
          className="py-2.5 px-5 rounded-xl bg-teal-400/10 border border-teal-400/30 text-teal-400 font-bold text-sm flex items-center gap-2 hover:bg-teal-400 hover:text-slate-950 transition-all disabled:opacity-50"
        >
          {isGeneratingDemo ? <RefreshCw size={16} className="animate-spin" /> : <Database size={16} />}
          Generar Demo
        </button>
      </div>

      {/* Main Content */}
      {history.length > 0 ? (
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left: Map (takes most space) */}
          <div className="flex-1 relative">
            <MapView 
              latitude={history[0].latitude}
              longitude={history[0].longitude}
              path={history}
              zoom={13}
              showControls={false}
            />

            {/* Floating Stats over the map */}
            <div className="absolute top-6 left-6 right-6 flex gap-4 z-20 pointer-events-none">
              {[
                { label: 'Distancia', value: stats.distance, icon: MapPin, color: 'text-teal-400', bg: 'bg-teal-400/10' },
                { label: 'Duración', value: stats.duration, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                { label: 'Vel. Promedio', value: stats.avgSpeed, icon: Navigation, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                { label: 'Vel. Máxima', value: stats.maxSpeed, icon: Gauge, color: 'text-amber-400', bg: 'bg-amber-400/10' },
              ].map((stat, idx) => (
                <div key={idx} className="flex-1 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl pointer-events-auto flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                    <stat.icon size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{stat.label}</p>
                    <p className="text-lg font-extrabold text-white">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Timeline Panel */}
          <div className="w-[380px] border-l border-white/5 bg-[#0c0e1b] flex flex-col shrink-0">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-sm font-extrabold text-white tracking-wide">Recorrido del Viaje</h3>
              <p className="text-xs text-slate-500 mt-1">{stats.points} puntos registrados</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="relative pl-8 space-y-8">
                {/* Vertical Timeline bar */}
                <div className="absolute left-[9px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-emerald-500/30 via-white/5 to-red-500/30" />

                {timelineItems.map((item, idx) => (
                  <div key={idx} className="flex gap-4 relative group">
                    {/* Circle marker */}
                    <span className={`absolute left-[-25px] top-1 w-4 h-4 rounded-full border-[3px] border-[#0c0e1b] shadow-[0_0_12px_currentColor] ${item.color}`} />
                    
                    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex-1 hover:bg-white/[0.05] transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-white">{item.title}</p>
                        <span className="text-xs font-bold text-teal-400 font-mono bg-teal-400/10 px-2 py-0.5 rounded-lg">
                          {item.time}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
          <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-600 shadow-inner">
            <Map size={40} />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-bold text-white">No hay datos para esta fecha</p>
            <p className="text-sm text-slate-500 max-w-[320px]">Selecciona una fecha diferente o genera una simulación de recorrido para ver el historial.</p>
          </div>
          <button
            onClick={() => onGenerateDemo('Quito')}
            disabled={isGeneratingDemo || !activeDeviceId}
            className="py-3 px-8 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-extrabold text-sm flex items-center gap-2 hover:from-teal-300 hover:to-emerald-300 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50"
          >
            {isGeneratingDemo ? <RefreshCw size={16} className="animate-spin" /> : <Database size={16} />}
            Generar Viaje Demo
          </button>
        </div>
      )}
    </div>
  );
}
