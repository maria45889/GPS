import React from 'react'
import { Radar, Wifi, SignalHigh, LogOut } from 'lucide-react'
import { useNow } from './useTelemetryStream'

const VIEWS = [
  { id: 'devices', label: 'Equipos' },
  { id: 'vehicles', label: 'Motos' },
  { id: 'all', label: 'Flota Completa' },
]

const TopBar = ({ category, onCategoryChange, stats, alertsCount, onMenuClick, onLogout, lastSyncLabel }) => {
  const now = useNow(1000)
  const time = new Date(now).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-wrap items-start justify-between gap-3 p-4">
      {/* Logo */}
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-slate-900/60 px-4 py-2.5 shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-md">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[#06b6d4]/15 text-[#06b6d4] ring-1 ring-cyan-500/30">
          <Radar size={20} />
          <span className="absolute h-full w-full animate-ping rounded-lg border border-cyan-400/40" />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-extrabold tracking-wide text-slate-100">
            Ride<span className="text-[#06b6d4]">Guard</span>
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-500">Web Guard GPS</div>
        </div>
      </div>

      {/* Switches de vista */}
      <div className="pointer-events-auto mt-0.5 flex items-center gap-1 rounded-full border border-cyan-500/20 bg-slate-900/60 p-1.5 shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-md">
        {VIEWS.map((view) => {
          const active = category === view.id
          return (
            <button
              key={view.id}
              type="button"
              onClick={() => onCategoryChange(view.id)}
              className={`rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-all ${
                active
                  ? 'bg-[#06b6d4]/15 text-[#22d3ee] shadow-[0_0_14px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/50'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {view.label}
            </button>
          )
        })}
      </div>

      {/* Métricas + reloj */}
      <div className="pointer-events-auto flex items-center gap-2.5">
        <div className="hidden items-center gap-2 md:flex">
          <MetricBadge value={stats.total} label="Total" tone="slate" />
          <MetricBadge value={stats.online} label="En línea" tone="green" pulse />
          <MetricBadge value={stats.offline} label="Offline" tone="red" />
          {alertsCount > 0 && <MetricBadge value={alertsCount} label="Alertas" tone="red" pulse />}
        </div>

        <div className="hidden items-center gap-2 rounded-xl border border-cyan-500/20 bg-slate-900/60 px-4 py-2.5 shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-md sm:flex">
          <Wifi size={15} className="text-[#10b981]" />
          <span className="font-mono text-[12px] font-bold tabular-nums text-slate-200">{time}</span>
          <span className="flex items-center gap-1 rounded-md bg-[#10b981]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#10b981]">
            <SignalHigh size={11} /> 5G
          </span>
        </div>

        {lastSyncLabel && (
          <div className="hidden items-center gap-1.5 rounded-xl border border-cyan-500/20 bg-slate-900/60 px-3 py-2.5 shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-md lg:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10b981]" />
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">{lastSyncLabel}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 bg-slate-900/60 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-md lg:hidden"
          aria-label="Abrir panel de flota"
        >
          <Radar size={16} />
        </button>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-cyan-500/20 bg-slate-900/60 px-3 text-[9px] font-bold uppercase tracking-[0.16em] text-red-400 shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-md transition-all hover:border-red-400/40 hover:bg-red-500/10"
            title="Cerrar sesión"
          >
            <LogOut size={13} /> <span className="hidden sm:inline">Salir</span>
          </button>
        )}
      </div>
    </div>
  )
}

const MetricBadge = ({ value, label, tone = 'slate', pulse = false }) => {
  const tones = {
    slate: 'text-slate-300 ring-slate-500/30 bg-slate-500/10',
    green: 'text-[#10b981] ring-[#10b981]/40 bg-[#10b981]/10',
    red: 'text-[#ef4444] ring-[#ef4444]/40 bg-[#ef4444]/10',
  }
  return (
    <div className={`flex flex-col items-center rounded-xl border border-cyan-500/20 px-3.5 py-1.5 shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-md ${tones[tone]}`}>
      <span className="relative font-mono text-[15px] font-extrabold tabular-nums leading-none">
        {pulse && <span className={`absolute -right-2 -top-0.5 flex h-1.5 w-1.5 ${tone === 'red' ? 'animate-ping' : 'animate-pulse'} rounded-full bg-current`} />}
        {value}
      </span>
      <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.18em] opacity-70">{label}</span>
    </div>
  )
}

export default TopBar