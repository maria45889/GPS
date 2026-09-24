import React, { useMemo, useState } from 'react'
import { Search, Crosshair, MapPin, Plus, AlertTriangle, Trash2 } from 'lucide-react'
import { isOnline, statusColor, signalFor, hashSpark } from './normalize'

const FleetPanel = ({ entities, selectedId, onSelectEntity, onDeleteEntity, userLocation, onLocateUser, onSetGeofence, alerts, onSelectAlert }) => {
  const [query, setQuery] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entities
    return entities.filter(
      (e) => e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || String(e.plate).toLowerCase().includes(q),
    )
  }, [entities, query])

  const activeAlerts = (alerts || []).filter((a) => a.status !== 'resolved')

  return (
    <div className="flex w-[304px] flex-col rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-4 shadow-[0_0_25px_rgba(6,182,212,0.12)] backdrop-blur-md">
      {/* Ubicación del operador */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-cyan-500/15 bg-[#0a1220]/70 p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#06b6d4]/15 text-[#06b6d4] ring-1 ring-cyan-500/30">
            <MapPin size={15} />
            <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
              <span className="absolute h-full w-full animate-ping rounded-full bg-[#10b981] opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-[#10b981]" />
            </span>
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[11px] font-bold text-slate-200">Ubicación del Operador</div>
            <div className="truncate font-mono text-[9px] text-slate-500">
              {userLocation?.position ? `${userLocation.position[0].toFixed(4)}, ${userLocation.position[1].toFixed(4)}` : 'Desconocida'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onLocateUser}
          title="Centrar en mi posición"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 text-cyan-300 transition-all hover:bg-cyan-500/10 hover:shadow-[0_0_14px_rgba(6,182,212,0.4)]"
        >
          <Crosshair size={14} />
        </button>
      </div>

      {/* Búsqueda */}
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-cyan-500/15 bg-[#0a1220]/70 px-3 py-2">
        <Search size={13} className="shrink-0 text-cyan-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar dispositivo..."
          className="w-full bg-transparent text-[11px] text-slate-200 placeholder-slate-600 outline-none"
        />
      </div>

      {/* Lista */}
      <div className="cmd-scroll mt-3 -mr-1 max-h-[36vh] min-h-[120px] flex-1 space-y-1.5 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <div className="py-6 text-center text-[10px] uppercase tracking-widest text-slate-600">Sin dispositivos</div>
        )}
        {filtered.map((entity) => {
          const isSel = entity.id === selectedId
          const online = isOnline(entity)
          const color = statusColor(entity)
          const spark = hashSpark((String(entity.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) + entity.speed) * 7 + 13, 20)
          const sparkPts = spark.map((v, i) => `${(i / (spark.length - 1)) * 52},${(v / 110) * 14}`).join(' ')
          const signal = signalFor(entity)
          return (
            <button
              key={entity.id}
              type="button"
              onClick={() => onSelectEntity(entity)}
              className={`w-full rounded-xl border p-2.5 text-left transition-all ${
                isSel
                  ? 'border-cyan-400/50 bg-cyan-500/10 shadow-[0_0_16px_rgba(6,182,212,0.25)]'
                  : 'border-cyan-500/10 bg-[#0a1220]/50 hover:border-cyan-500/30 hover:bg-cyan-500/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className={`absolute h-full w-full rounded-full opacity-50 ${online ? 'animate-ping' : ''}`} style={{ backgroundColor: color }} />
                  <span className="relative h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-mono text-[11px] font-bold text-slate-200">{entity.name || entity.id}</span>
                    {entity._mock && (
                      <span className="rounded bg-amber-500/15 px-1 py-px text-[7px] font-extrabold uppercase tracking-wider text-amber-400">Sim</span>
                    )}
                  </div>
                  <div className="truncate text-[9px] text-slate-600">{entity.id}</div>
                </div>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[11px] font-bold ${online ? 'text-[#06b6d4]' : 'text-slate-600'}`}>
                    {Math.round(entity.speed ?? 0)}<span className="ml-0.5 text-[7px] text-slate-600">km/h</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">{entity.battery ?? '—'}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`font-mono text-[8px] font-bold ${signal > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{signal}%</span>
                  <svg viewBox="0 0 52 16" className="h-3.5 w-14">
                    <polyline points={sparkPts} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.9" style={{ filter: `drop-shadow(0 0 2px ${color})` }} />
                  </svg>
                  {onDeleteEntity && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        if (confirmingDelete === entity.id) {
                          setConfirmingDelete(null)
                          onDeleteEntity(entity)
                        } else {
                          setConfirmingDelete(entity.id)
                          window.setTimeout(() => setConfirmingDelete((cur) => (cur === entity.id ? null : cur)), 2500)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation()
                          e.preventDefault()
                          onDeleteEntity(entity)
                        }
                      }}
                      title="Eliminar dispositivo"
                      aria-label={`Eliminar ${entity.name || entity.id}`}
                      className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-all ${
                        confirmingDelete === entity.id
                          ? 'border-red-400/70 bg-red-500/20 text-[#f87171]'
                          : 'border-red-500/20 bg-red-500/5 text-red-400/60 hover:border-red-400/50 hover:bg-red-500/15 hover:text-red-300'
                      }`}
                    >
                      <Trash2 size={10} />
                    </span>
                  )}
                  {confirmingDelete === entity.id && (
                    <span className="font-mono text-[7px] font-bold uppercase tracking-wider text-red-400">¿Borrar?</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Alertas */}
      {activeAlerts.length > 0 && (
        <div className="mt-3 border-t border-cyan-500/10 pt-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400">
            <AlertTriangle size={11} /> Alertas activas
          </div>
          <div className="cmd-scroll max-h-[16vh] space-y-1 overflow-y-auto pr-1">
            {activeAlerts.slice(0, 5).map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => onSelectAlert && onSelectAlert(alert)}
                className="flex w-full items-center gap-2 rounded-lg border border-amber-500/15 bg-[#2a1a0a]/40 px-2 py-1.5 text-left transition-all hover:border-amber-400/40"
              >
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-400" />
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-bold text-amber-200">{alert.title.split(' - ')[0]}</span>
                  <span className="block truncate text-[8px] text-slate-500">{alert.timestamp} · {alert.locationName}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Geocerca */}
      <button
        type="button"
        onClick={onSetGeofence}
        className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-cyan-500/30 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400 transition-all hover:border-cyan-400/60 hover:bg-cyan-500/10"
      >
        <Plus size={12} /> Nueva Geocerca
      </button>
    </div>
  )
}

export default FleetPanel