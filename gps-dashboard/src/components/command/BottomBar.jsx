import React, { useState } from 'react'
import { Gauge, Mountain, Compass, Navigation, Satellite, Flame, Users } from 'lucide-react'
import { useNow } from './useTelemetryStream'
import { gForceFor, altitudeFor } from './normalize'

const LAYERS = [
  { id: 'traffic', label: 'Tráfico', icon: Flame },
  { id: 'heat', label: 'Calor', icon: Users },
  { id: 'satellite', label: 'Satélite', icon: Satellite },
]

const BottomBar = ({ entity, onToggleRouteFollow, isFollowingRoute, baseLayer, onBaseLayerChange }) => {
  const now = useNow(900)
  const [extraLayers, setExtraLayers] = useState([])

  const toggleLayer = (layerId) => {
    if (layerId === 'satellite') {
      onBaseLayerChange(baseLayer === 'satellite' ? 'dark' : 'satellite')
      return
    }
    setExtraLayers((prev) => (prev.includes(layerId) ? prev.filter((l) => l !== layerId) : [...prev, layerId]))
  }

  const isLayerActive = (layerId) =>
    layerId === 'satellite' ? baseLayer === 'satellite' : extraLayers.includes(layerId)

  const gForce = gForceFor(entity, now)
  const altitude = altitudeFor(now, entity ? (String(entity.id).charCodeAt(0) || 0) : 0)
  const heading = Math.round(entity?.bearing ?? 0)
  const speed = Math.round(entity?.speed ?? 0)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex flex-col items-center gap-3 px-3">
      {/* Capas */}
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-cyan-500/20 bg-slate-900/70 px-1.5 py-1 shadow-[0_0_18px_rgba(6,182,212,0.15)] backdrop-blur-md">
        {LAYERS.map((layer) => {
          const Icon = layer.icon
          const active = isLayerActive(layer.id)
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => toggleLayer(layer.id)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] transition-all sm:px-3 ${
                active
                  ? 'bg-[#06b6d4]/20 text-[#22d3ee] shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={11} /> <span className="hidden sm:inline">{layer.label}</span>
            </button>
          )
        })}
      </div>

      {/* Barra principal */}
      <div className="pointer-events-auto flex w-full max-w-3xl items-center gap-3 overflow-x-auto rounded-2xl border border-cyan-500/40 bg-slate-900/70 px-4 py-3 shadow-[0_0_30px_rgba(6,182,212,0.2)] backdrop-blur-md cmd-scroll">
        <MetricCell icon={<Gauge size={13} />} label="G-Force" value={<span className="font-mono text-[16px] font-extrabold text-slate-100">{gForce}<span className="text-[9px] text-[#06b6d4]"> G</span></span>} className="hidden md:flex" />
        <Divider className="hidden md:block" />
        <MetricCell icon={<Mountain size={13} />} label="Altitud" value={<span className="font-mono text-[16px] font-extrabold text-slate-100">{altitude}<span className="text-[9px] text-slate-500"> m</span></span>} className="hidden md:flex" />
        <Divider className="hidden md:block" />
        <MetricCell
          icon={<Compass size={13} />}
          label="Dirección"
          value={<span className="font-mono text-[16px] font-extrabold text-slate-100">{heading}<span className="text-[9px] text-[#06b6d4]">°</span></span>}
          className="hidden md:flex"
        />

        <Divider className="hidden md:block" />

        <div className="flex min-w-0 max-w-[170px] flex-1 flex-col items-center px-1">
          <span className="text-[8px] tracking-[0.2em] text-slate-500 uppercase">Dispositivo</span>
          <span className="w-full truncate text-center font-mono text-[13px] font-bold text-[#22d3ee]">
            {entity?.name || entity?.id || 'Sin selección'}
          </span>
          <span className="text-[8px] text-slate-600">{speed} km/h · {entity?.plate}</span>
        </div>

        <Divider className="hidden md:block" />

        <button
          type="button"
          onClick={() => onToggleRouteFollow?.()}
          disabled={!entity?.position}
          className={`group flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider transition-all sm:px-5 ${
            isFollowingRoute
              ? 'bg-[#22d3ee] text-[#0b0f19] shadow-[0_0_30px_rgba(34,211,238,0.6)]'
              : 'bg-[#06b6d4] text-[#0b0f19] shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:bg-[#22d3ee] hover:shadow-[0_0_35px_rgba(6,182,212,0.65)]'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          title={!entity?.position ? 'Sin posición GPS para seguir' : 'Seguir/enrutar dispositivo en el mapa'}
        >
          <span className="relative flex h-4 w-4 items-center justify-center">
            <Navigation size={15} className={isFollowingRoute ? 'animate-pulse' : 'group-hover:animate-pulse'} />
          </span>
          {isFollowingRoute ? 'Siguiendo' : 'Seguir'}
        </button>
      </div>
    </div>
  )
}

const MetricCell = ({ icon, label, value, className = '' }) => (
  <div className={`min-w-[64px] shrink-0 flex-col items-center ${className}`}>
    <span className="mb-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
      {icon} {label}
    </span>
    {value}
  </div>
)

const Divider = ({ className = '' }) => <div className={`h-9 w-px shrink-0 bg-cyan-500/20 ${className}`} />

export default BottomBar