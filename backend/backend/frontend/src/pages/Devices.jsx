import React, { useState } from 'react';
import { Plus, Search, Battery, Navigation, Clock, Trash2, Smartphone, Wifi, WifiOff, MapPin } from 'lucide-react';

// Stylized Vector Mini Map representing the route path
function MiniMapThumbnail({ path = [] }) {
  const streets = [
    "M 0,15 L 100,15",
    "M 0,45 L 100,45",
    "M 20,0 L 20,70",
    "M 60,0 L 60,70",
    "M 80,0 L 80,70"
  ];

  const getPathD = () => {
    if (!path || path.length < 2) {
      return "M 15,55 Q 35,25 50,45 T 85,20";
    }

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    path.forEach(p => {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    });

    const latSpan = maxLat - minLat || 0.0001;
    const lngSpan = maxLng - minLng || 0.0001;

    return path
      .map((p, idx) => {
        const x = 10 + ((p.longitude - minLng) / lngSpan) * 80;
        const y = 60 - ((p.latitude - minLat) / latSpan) * 50;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const pathD = getPathD();

  return (
    <div className="w-full h-[100px] rounded-xl bg-slate-950 border border-white/5 relative overflow-hidden shadow-inner">
      <svg className="w-full h-full" viewBox="0 0 100 70" preserveAspectRatio="none">
        {streets.map((s, idx) => (
          <path key={idx} d={s} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1.5" />
        ))}
        <path d={pathD} fill="none" stroke="#00f5d4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" className="blur-[1px]" />
        <path d={pathD} fill="none" stroke="#00f5d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="15" cy="55" r="2.5" fill="#10b981" />
        {path.length > 0 ? (
          <circle cx="85" cy="20" r="3" fill="#00f5d4" className="animate-ping" />
        ) : (
          <circle cx="85" cy="20" r="2.5" fill="#ff4757" />
        )}
      </svg>
    </div>
  );
}

export default function Devices({ 
  devices = [], 
  activeToken,
  onSelectDevice, 
  onRegisterDevice,
  onDeleteDevice 
}) {
  const [search, setSearch] = useState('');

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = devices.length;
  const onlineCount = devices.filter(d => d.latest).length;

  const handleRegisterClick = () => {
    const name = prompt('Nombre del nuevo dispositivo:', 'Mi Android');
    if (name && name.trim()) {
      onRegisterDevice(name.trim());
    }
  };

  const handleDeleteClick = (e, id, name) => {
    e.stopPropagation();
    if (confirm(`¿Estás seguro de eliminar el dispositivo "${name}"? Esta acción eliminará todo su historial.`)) {
      onDeleteDevice(id);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts + 'Z');
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'ahora';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString();
  };

  return (
    <div className="flex-1 h-full w-full flex flex-col bg-[#080a14] overflow-hidden">
      {/* Header Bar */}
      <div className="h-[64px] border-b border-white/5 flex items-center justify-between px-8 shrink-0 bg-[#0c0e1b]">
        <div className="flex items-center gap-4">
          <Smartphone size={22} className="text-teal-400" />
          <h1 className="text-lg font-extrabold text-white tracking-wide">Equipos</h1>
          <span className="text-xs font-bold text-slate-500 bg-white/5 px-3 py-1 rounded-lg">{activeCount} dispositivos</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="w-[300px] bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 flex items-center gap-2.5 focus-within:border-teal-400/50 transition-all">
            <Search size={16} className="text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar dispositivo..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-0 outline-none text-sm text-white placeholder-slate-500 w-full"
            />
          </div>

          {/* Add Device */}
          <button 
            onClick={handleRegisterClick}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-extrabold text-sm flex items-center gap-2 hover:from-teal-300 hover:to-emerald-300 transition-all shadow-lg shadow-teal-500/20"
          >
            <Plus size={16} />
            Nuevo Equipo
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-8 py-5 flex gap-4 border-b border-white/5 shrink-0">
        <div className="flex-1 bg-[#111428] border border-white/5 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-teal-400/10 flex items-center justify-center text-teal-400">
            <Smartphone size={22} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Equipos</p>
            <p className="text-2xl font-black text-white">{activeCount}</p>
          </div>
        </div>

        <div className="flex-1 bg-[#111428] border border-white/5 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-emerald-400/10 flex items-center justify-center text-emerald-400">
            <Wifi size={22} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">En Línea</p>
            <p className="text-2xl font-black text-emerald-400">{onlineCount}</p>
          </div>
        </div>

        <div className="flex-1 bg-[#111428] border border-white/5 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-red-400/10 flex items-center justify-center text-red-400">
            <WifiOff size={22} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Desconectados</p>
            <p className="text-2xl font-black text-red-400">{activeCount - onlineCount}</p>
          </div>
        </div>
      </div>

      {/* Device Grid */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {filteredDevices.length > 0 ? (
          <div className="grid grid-cols-3 gap-5">
            {filteredDevices.map((device) => {
              const isActive = device.token === activeToken;
              const isOnline = !!device.latest;
              const speed = device.latest?.speed ? Math.round(device.latest.speed * 3.6) : 0;
              const battery = device.latest?.battery ? Math.round(device.latest.battery) : null;
              const timeStr = device.latest ? formatTime(device.latest.timestamp) : '';
              
              const pathPoints = device.latest 
                ? [
                    { latitude: device.latest.latitude - 0.002, longitude: device.latest.longitude - 0.003 },
                    { latitude: device.latest.latitude - 0.001, longitude: device.latest.longitude - 0.001 },
                    { latitude: device.latest.latitude, longitude: device.latest.longitude }
                  ]
                : [];

              return (
                <div 
                  key={device.id}
                  onClick={() => onSelectDevice(device)}
                  className={`
                    bg-[#111428] border rounded-2xl p-5 cursor-pointer relative group hover:bg-[#151836] transition-all shadow-lg hover:shadow-xl
                    ${isActive ? 'border-teal-400/30 ring-1 ring-teal-400/10' : 'border-white/5 hover:border-white/10'}
                  `}
                >
                  {/* Active badge */}
                  {isActive && (
                    <span className="absolute top-4 right-4 text-[9px] font-bold text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded-md border border-teal-400/20 uppercase tracking-wider">
                      Activo
                    </span>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDeleteClick(e, device.id, device.name)}
                    className="absolute bottom-4 right-4 p-2 rounded-lg text-slate-600 hover:text-[#ff4757] hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Eliminar dispositivo"
                  >
                    <Trash2 size={15} />
                  </button>

                  {/* Device Name & Status */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOnline ? 'bg-teal-400/10 text-teal-400' : 'bg-slate-700/30 text-slate-500'}`}>
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{device.name}</h3>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#00f5d4] shadow-[0_0_8px_#00f5d4]' : 'bg-slate-600'}`} />
                        <span className={`text-xs font-semibold ${isOnline ? 'text-teal-400' : 'text-slate-500'}`}>
                          {isOnline ? 'En línea' : 'Desconectado'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mini Map */}
                  <MiniMapThumbnail path={pathPoints} />

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Navigation size={12} className="rotate-45 text-teal-400" />
                      <span>{isOnline ? `${speed} km/h` : '--'}</span>
                    </div>
                    {battery !== null && (
                      <div className="flex items-center gap-1.5">
                        <Battery size={13} className="text-teal-400" />
                        <span>{battery}%</span>
                      </div>
                    )}
                    {timeStr && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <Clock size={12} className="text-slate-500" />
                        <span className="text-slate-500 font-semibold">{timeStr}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
            <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-600">
              <Smartphone size={40} />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-bold text-white">No hay dispositivos</p>
              <p className="text-sm text-slate-500">Agrega un equipo con el botón "Nuevo Equipo" para empezar el rastreo.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
