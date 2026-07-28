import React, { useState } from 'react';
import { Settings as SettingsIcon, Server, User, Key, Clock, Move, Send, Info, Code, ChevronRight, Trash2, Shield, Globe } from 'lucide-react';

function ToggleSwitch({ isOn, onToggle }) {
  return (
    <button 
      onClick={onToggle}
      className={`w-[48px] h-[28px] rounded-full p-[3px] flex items-center transition-all duration-300 ${isOn ? 'bg-teal-400 justify-end' : 'bg-slate-700 justify-start'}`}
    >
      <div className="w-[22px] h-[22px] rounded-full bg-white shadow-md transition-all" />
    </button>
  );
}

function SettingCard({ icon: Icon, iconBg, iconColor, label, description, children, onClick }) {
  return (
    <div 
      className="bg-[#111428] border border-white/5 rounded-2xl p-5 flex items-center justify-between hover:bg-[#151836] transition-all group cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-sm text-white font-bold">{label}</p>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function Settings({ 
  deviceName,
  deviceToken,
  serverUrl,
  sendInterval,
  sendOnlyMoving,
  sendBackground,
  onSaveDeviceName,
  onSaveServerUrl,
  onSaveInterval,
  onToggleSendOnlyMoving,
  onToggleSendBackground,
  onClearData,
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(deviceName || 'Mi Dispositivo');
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlValue, setUrlValue] = useState(serverUrl || 'http://192.168.100.174:3000');
  const [editingInterval, setEditingInterval] = useState(false);
  const [intervalValue, setIntervalValue] = useState(sendInterval || 5);

  const handleSaveName = () => {
    onSaveDeviceName(nameValue);
    setEditingName(false);
  };

  const handleSaveUrl = () => {
    onSaveServerUrl(urlValue);
    setEditingUrl(false);
  };

  const handleSaveInterval = () => {
    onSaveInterval(intervalValue);
    setEditingInterval(false);
  };

  const maskedToken = deviceToken 
    ? deviceToken.substring(0, 6) + '••••••••••' + deviceToken.substring(deviceToken.length - 4)
    : '••••••••••••••••';

  return (
    <div className="flex-1 h-full w-full flex flex-col bg-[#080a14] overflow-hidden">
      {/* Header Bar */}
      <div className="h-[64px] border-b border-white/5 flex items-center px-8 shrink-0 bg-[#0c0e1b]">
        <div className="flex items-center gap-4">
          <SettingsIcon size={22} className="text-teal-400" />
          <h1 className="text-lg font-extrabold text-white tracking-wide">Ajustes</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-[900px] mx-auto space-y-8">
          
          {/* CONFIGURACIÓN Section */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[3px] px-1">Configuración del Sistema</h2>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Server URL */}
              <div className="bg-[#111428] border border-white/5 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <Server size={18} />
                  </div>
                  <div>
                    <p className="text-sm text-white font-bold">URL del Servidor</p>
                    <p className="text-[11px] text-slate-500">Dirección del backend</p>
                  </div>
                </div>
                {!editingUrl ? (
                  <div 
                    className="bg-slate-950 rounded-xl px-4 py-3 text-sm text-white font-mono cursor-pointer hover:bg-slate-900 transition-all border border-white/5 flex items-center justify-between"
                    onClick={() => setEditingUrl(true)}
                  >
                    <span className="truncate">{urlValue}</span>
                    <ChevronRight size={14} className="text-slate-500 shrink-0" />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    onBlur={handleSaveUrl}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveUrl()}
                    autoFocus
                    className="w-full bg-slate-950 border border-teal-400/50 rounded-xl px-4 py-3 text-sm text-white font-mono outline-none"
                  />
                )}
              </div>

              {/* Device Name */}
              <div className="bg-[#111428] border border-white/5 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-400/10 flex items-center justify-center text-teal-400">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-sm text-white font-bold">Nombre del Dispositivo</p>
                    <p className="text-[11px] text-slate-500">Identificador visual</p>
                  </div>
                </div>
                {!editingName ? (
                  <div 
                    className="bg-slate-950 rounded-xl px-4 py-3 text-sm text-white font-semibold cursor-pointer hover:bg-slate-900 transition-all border border-white/5 flex items-center justify-between"
                    onClick={() => setEditingName(true)}
                  >
                    <span>{nameValue}</span>
                    <ChevronRight size={14} className="text-slate-500" />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    autoFocus
                    className="w-full bg-slate-950 border border-teal-400/50 rounded-xl px-4 py-3 text-sm text-white outline-none"
                  />
                )}
              </div>
            </div>

            {/* Token (full width) */}
            <div className="bg-[#111428] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Key size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-bold">Token de Autenticación</p>
                <p className="text-xs text-slate-400 font-mono mt-1">{maskedToken}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20">
                <Shield size={12} />
                <span className="font-bold">Seguro</span>
              </div>
            </div>
          </div>

          {/* ENVÍO DE UBICACIÓN Section */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[3px] px-1">Envío de Ubicación</h2>

            {/* Interval */}
            <div className="bg-[#111428] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-sm text-white font-bold">Intervalo de Envío</p>
                    <p className="text-[11px] text-slate-500">Frecuencia de actualización GPS</p>
                  </div>
                </div>
                {!editingInterval ? (
                  <div
                    className="bg-slate-950 rounded-xl px-4 py-2.5 text-sm text-white font-semibold cursor-pointer hover:bg-slate-900 transition-all border border-white/5 flex items-center gap-2"
                    onClick={() => setEditingInterval(true)}
                  >
                    <span>{intervalValue} segundos</span>
                    <ChevronRight size={14} className="text-slate-500" />
                  </div>
                ) : (
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={intervalValue}
                    onChange={(e) => setIntervalValue(parseInt(e.target.value) || 5)}
                    onBlur={handleSaveInterval}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveInterval()}
                    autoFocus
                    className="bg-slate-950 border border-teal-400/50 rounded-xl px-4 py-2.5 text-sm text-white w-[120px] outline-none"
                  />
                )}
              </div>
            </div>

            {/* Toggle Options */}
            <div className="grid grid-cols-2 gap-4">
              <SettingCard
                icon={Move}
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-400"
                label="Enviar solo con movimiento"
                description="Ahorra batería y datos"
              >
                <ToggleSwitch isOn={sendOnlyMoving} onToggle={onToggleSendOnlyMoving} />
              </SettingCard>

              <SettingCard
                icon={Send}
                iconBg="bg-sky-500/10"
                iconColor="text-sky-400"
                label="Enviar en segundo plano"
                description="Mantiene transmisión activa"
              >
                <ToggleSwitch isOn={sendBackground} onToggle={onToggleSendBackground} />
              </SettingCard>
            </div>
          </div>

          {/* INFORMACIÓN Section */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[3px] px-1">Información</h2>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#111428] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-400">
                  <Info size={18} />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-bold">Versión</p>
                  <p className="text-sm text-white font-semibold">v1.0.0</p>
                </div>
              </div>

              <div className="bg-[#111428] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-400">
                  <Code size={18} />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-bold">Desarrollado por</p>
                  <p className="text-sm text-white font-semibold">GPS Tracker Team</p>
                </div>
              </div>

              <div className="bg-[#111428] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-400">
                  <Globe size={18} />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-bold">Tecnología</p>
                  <p className="text-sm text-white font-semibold">React + Vite</p>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-red-400/70 uppercase tracking-[3px] px-1">Zona de Peligro</h2>
            <div className="bg-red-500/[0.03] border border-red-500/10 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                  <Trash2 size={18} />
                </div>
                <div>
                  <p className="text-sm text-white font-bold">Borrar datos y desconectar</p>
                  <p className="text-[11px] text-slate-500">Elimina todos los datos locales y desconecta el dispositivo</p>
                </div>
              </div>
              <button
                onClick={onClearData}
                className="py-2.5 px-6 rounded-xl bg-red-500/10 border border-red-500/30 text-[#ff4757] font-bold text-sm hover:bg-red-500 hover:text-white transition-all"
              >
                Borrar Todo
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
