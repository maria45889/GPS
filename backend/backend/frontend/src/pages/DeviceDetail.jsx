import React, { useState } from 'react';
import { ArrowLeft, MoreVertical, MapPin, Navigation, Battery, Compass, Mountain, Crosshair, Share2, Target } from 'lucide-react';
import MapView from '../components/MapView';

export default function DeviceDetail({ device, history = [], onGoBack }) {
  if (!device) return null;

  const latest = device.latest || {};
  const lat = latest.latitude ? latest.latitude.toFixed(4) : '--';
  const lng = latest.longitude ? latest.longitude.toFixed(4) : '--';
  const speed = latest.speed != null ? (latest.speed * 3.6).toFixed(0) : '--';
  const accuracy = latest.accuracy ? latest.accuracy.toFixed(0) : '--';
  const altitude = latest.altitude ? latest.altitude.toFixed(0) : '--';
  const battery = latest.battery != null ? Math.round(latest.battery) : '--';
  const isOnline = !!device.latest;

  // Filter history by this device (if needed)
  const devicePath = history.filter(h => h.device_id === device.id || true); // Keep all for now

  return (
    <div className="flex-1 h-full w-full relative flex flex-col bg-[#080a14] overflow-hidden">
      {/* Header */}
      <div className="h-[60px] border-b border-white/5 flex items-center justify-between px-5 shrink-0 z-20 bg-[#0c0e1b]">
        <button 
          onClick={onGoBack}
          className="w-10 h-10 rounded-xl border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-md font-bold text-white tracking-wide">{device.name}</h1>
        <button className="w-10 h-10 rounded-xl border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all">
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-8">
        {/* Map Section */}
        <div className="h-[280px] relative">
          {latest.latitude && latest.longitude ? (
            <MapView
              latitude={latest.latitude}
              longitude={latest.longitude}
              bearing={latest.bearing}
              path={devicePath}
              zoom={15}
              showControls={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-500">
              <Compass size={40} className="animate-pulse" />
            </div>
          )}

          {/* Floating controls on map */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
            <button className="w-9 h-9 rounded-xl bg-[#111428]/90 backdrop-blur border border-white/5 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all shadow-xl">
              <Target size={16} />
            </button>
            <button className="w-9 h-9 rounded-xl bg-[#111428]/90 backdrop-blur border border-white/5 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all shadow-xl">
              <Share2 size={16} />
            </button>
          </div>

          {/* Device status overlay on map bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#080a14] to-transparent h-16 pointer-events-none" />
        </div>

        {/* Device Status and Info */}
        <div className="px-5 -mt-4 relative z-10 space-y-4">
          {/* Name and Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-[#00f5d4] shadow-[0_0_10px_#00f5d4]' : 'bg-slate-600'}`} />
                <h2 className="text-lg font-extrabold text-white">{device.name}</h2>
              </div>
              <p className="text-xs text-teal-400 font-semibold ml-[18px]">{isOnline ? 'En línea' : 'Desconectado'}</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
              <Battery size={14} className="text-teal-400" />
              <span className="text-xs font-bold text-white">{battery}%</span>
            </div>
          </div>

          {/* Stats Grid 2x3 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card rounded-2xl p-3.5 text-center space-y-1">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Latitud</p>
              <p className="text-xs font-bold text-white font-mono">{lat}</p>
            </div>
            <div className="glass-card rounded-2xl p-3.5 text-center space-y-1">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Longitud</p>
              <p className="text-xs font-bold text-white font-mono">{lng}</p>
            </div>
            <div className="glass-card rounded-2xl p-3.5 text-center space-y-1">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Velocidad</p>
              <p className="text-xs font-bold text-white">{speed} <span className="text-slate-500">km/h</span></p>
            </div>
            <div className="glass-card rounded-2xl p-3.5 text-center space-y-1">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Precisión</p>
              <p className="text-xs font-bold text-white">{accuracy} <span className="text-slate-500">m</span></p>
            </div>
            <div className="glass-card rounded-2xl p-3.5 text-center space-y-1">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Altitud</p>
              <p className="text-xs font-bold text-white">{altitude} <span className="text-slate-500">m</span></p>
            </div>
            <div className="glass-card rounded-2xl p-3.5 text-center space-y-1">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Batería</p>
              <p className="text-xs font-bold text-white">{battery} <span className="text-slate-500">%</span></p>
            </div>
          </div>

          {/* Address line */}
          <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
            <MapPin size={16} className="text-teal-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-bold">Ubicación actual</p>
              <p className="text-sm text-white truncate">Av. 10 de Agosto, Quito</p>
              <p className="text-[10px] text-slate-500">Hace 10 segundos</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button className="py-3.5 rounded-2xl bg-teal-400/10 border border-teal-400/20 text-teal-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-teal-400 hover:text-slate-950 transition-all active:scale-[0.98]">
              <Target size={14} />
              CENTRAR
            </button>
            <button className="py-3.5 rounded-2xl bg-white/5 border border-white/5 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-[0.98]">
              <Share2 size={14} />
              COMPARTIR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
