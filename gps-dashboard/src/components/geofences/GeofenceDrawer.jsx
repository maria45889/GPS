import React, { useState } from 'react';
import { X, MapPin, Eye, EyeOff, Trash2, Crosshair, Shield, Plus } from 'lucide-react';

const neonColors = [
  { label: 'Cian', value: '#00F0FF' },
  { label: 'Esmeralda', value: '#00E676' },
  { label: 'Ámbar', value: '#FF9100' },
  { label: 'Rosa', value: '#FF3366' },
  { label: 'Púrpura', value: '#A855F7' },
];

export const GeofenceDrawer = ({ 
  geofences = [], 
  onAddGeofence, 
  onToggleVisibility, 
  onDeleteGeofence,
  onFocusGeofence,
  isPlacingOnMap,
  setIsPlacingOnMap,
  pendingCenter,
  onClose 
}) => {
  const [newGeoName, setNewGeoName] = useState('');
  const [radius, setRadius] = useState(600);
  const [color, setColor] = useState('#00F0FF');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newGeoName) return;

    // Use selected map center or default SF coordinates
    const targetCenter = pendingCenter || [37.7749, -122.4194];

    onAddGeofence({
      id: Date.now(),
      name: newGeoName,
      type: 'circle',
      center: targetCenter,
      radius,
      color,
      rule: 'Monitoreo de perímetro',
      active: true
    });

    setNewGeoName('');
    if (setIsPlacingOnMap) setIsPlacingOnMap(false);
  };

  return (
    <div className="w-80 h-full bg-[#0B0F19]/95 border-r border-[#1E293B]/80 p-4 flex flex-col backdrop-blur-xl text-slate-200 select-none shadow-2xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-cyan-400 tracking-wide">Gestor de Geocercas</h2>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
            title="Cerrar panel"
          >
            <X size={15} />
          </button>
        )}
      </div>
      
      {/* Formulario de Creación */}
      <form onSubmit={handleSubmit} className="mb-4 bg-slate-900/70 p-3.5 rounded-xl border border-cyan-500/20 shadow-lg">
        <div className="text-xs font-bold text-cyan-300 mb-2 flex items-center gap-1.5">
          <Plus size={14} /> Nueva Zona Segura
        </div>

        <input 
          type="text"
          placeholder="Nombre (ej. Base Operativa Sur)"
          value={newGeoName}
          onChange={(e) => setNewGeoName(e.target.value)}
          className="w-full bg-slate-950 border border-cyan-500/30 rounded-lg px-3 py-1.5 text-xs text-cyan-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 mb-2.5 transition-all"
        />

        {/* Radio y Slider */}
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>Radio de cobertura:</span>
          <span className="font-mono text-cyan-300 font-bold">{radius}m</span>
        </div>
        <input 
          type="range"
          min="150"
          max="2500"
          step="50"
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full mb-3 accent-cyan-400 cursor-pointer"
        />

        {/* Selector de Color Neón */}
        <div className="mb-3">
          <span className="text-[11px] text-slate-400 block mb-1.5">Color Neón Perímetro:</span>
          <div className="flex items-center gap-2">
            {neonColors.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={`w-6 h-6 rounded-full border transition-all ${
                  color === c.value 
                    ? 'border-white scale-110 shadow-[0_0_10px_currentColor]' 
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.value, color: c.value }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Indicador de Posición en Mapa */}
        {setIsPlacingOnMap && (
          <button
            type="button"
            onClick={() => setIsPlacingOnMap(!isPlacingOnMap)}
            className={`w-full mb-2.5 py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 border transition-all ${
              isPlacingOnMap 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' 
                : 'bg-white/5 text-slate-300 border-white/10 hover:border-cyan-500/40 hover:text-cyan-300'
            }`}
          >
            <MapPin size={13} />
            <span>{isPlacingOnMap ? '🎯 Haz clic en el mapa...' : 'Fijar centro con clic en mapa'}</span>
          </button>
        )}

        <button 
          type="submit"
          disabled={!newGeoName}
          className={`w-full py-2 rounded-lg border font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-1.5 ${
            newGeoName 
              ? 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40 text-cyan-300 shadow-cyan-950/50 cursor-pointer' 
              : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
          }`}
        >
          <Shield size={13} />
          <span>Trazar Geocerca en Mapa</span>
        </button>
      </form>

      {/* Lista de Geocercas Activas */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        <div className="flex justify-between items-center text-xs uppercase font-mono text-slate-400 tracking-wider mb-1 px-1">
          <span>Zonas Configuradas</span>
          <span className="text-cyan-400">{geofences.length}</span>
        </div>

        {geofences.map(geo => (
          <div 
            key={geo.id} 
            className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/15 hover:border-cyan-500/35 transition-all backdrop-blur-md group"
          >
            <div className="flex justify-between items-start mb-1.5">
              <div className="flex items-center gap-2">
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: geo.color, boxShadow: `0 0 8px ${geo.color}` }}
                />
                <div>
                  <div className="font-bold text-xs text-slate-200 group-hover:text-cyan-300 transition-colors">
                    {geo.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Radio: {geo.radius || 600}m {geo.rule ? `• ${geo.rule}` : ''}
                  </div>
                </div>
              </div>

              {/* Botón de visibilidad */}
              <button 
                onClick={() => onToggleVisibility && onToggleVisibility(geo.id)}
                className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 shrink-0 ${
                  geo.active 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                    : 'bg-slate-800/80 text-slate-500 border-slate-700'
                }`}
                title={geo.active ? 'Ocultar en mapa' : 'Mostrar en mapa'}
              >
                {geo.active ? <Eye size={12} /> : <EyeOff size={12} />}
                <span>{geo.active ? 'Activa' : 'Oculta'}</span>
              </button>
            </div>

            {/* Acciones de cada geocerca */}
            <div className="flex items-center justify-end gap-1.5 pt-1.5 mt-1.5 border-t border-white/5">
              {onFocusGeofence && (
                <button
                  onClick={() => onFocusGeofence(geo)}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 text-[10px] flex items-center gap-1 transition-all"
                  title="Centrar en el mapa"
                >
                  <Crosshair size={11} />
                  <span>Enfocar</span>
                </button>
              )}

              {onDeleteGeofence && (
                <button
                  onClick={() => onDeleteGeofence(geo.id)}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-[10px] flex items-center gap-1 transition-all"
                  title="Eliminar geocerca"
                >
                  <Trash2 size={11} />
                  <span>Borrar</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
