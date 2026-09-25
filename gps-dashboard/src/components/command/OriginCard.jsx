import React, { useEffect, useRef, useState } from 'react'
import { MapPin, Search, Loader2, LocateFixed, X, Navigation, ChevronDown, Pencil } from 'lucide-react'
import { searchPlaces } from '../../lib/geocode'

const OriginCard = ({ origin, onSelectOrigin, onUseGps, hasGps, isFollowingRoute, onToggleFollow, hasTarget }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const seqRef = useRef(0)

  useEffect(() => {
    const q = query.trim()
    const seq = ++seqRef.current
    const timer = setTimeout(async () => {
      if (q.length < 3) {
        if (seq === seqRef.current) {
          setResults([])
          setLoading(false)
        }
        return
      }
      setLoading(true)
      try {
        const found = await searchPlaces(q)
        if (seq !== seqRef.current) return
        setResults(found)
      } catch {
        if (seq !== seqRef.current) return
        setResults([])
      } finally {
        if (seq === seqRef.current) setLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  const pickPlace = (place) => {
    onSelectOrigin({ position: place.position, label: place.label, address: place.address })
    setExpanded(false)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  return (
    <div className="w-[min(320px,calc(100vw - 24px))] overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900/70 shadow-[0_0_25px_rgba(6,182,212,0.15)] backdrop-blur-md">
      {/* Fila compacta */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#06b6d4]/15 text-[#06b6d4] ring-1 ring-cyan-500/25">
          {origin ? <LocateFixed size={14} className="text-emerald-300" /> : <MapPin size={14} />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">Punto de partida</div>
          <div className="truncate text-[12px] font-bold leading-tight text-slate-100">
            {origin ? origin.label : 'Elige tu punto de partida'}
          </div>
        </div>

        {origin && (
          <button
            type="button"
            onClick={() => onSelectOrigin(null)}
            className="flex h-6 shrink-0 items-center gap-1 rounded-md border border-slate-500/30 px-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 transition-all hover:border-red-400/50 hover:text-red-400"
            aria-label="Quitar punto de partida"
          >
            <X size={10} /> Quitar
          </button>
        )}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`flex h-7 shrink-0 items-center gap-1 rounded-lg border px-2 text-[9px] font-bold uppercase tracking-wider transition-all ${
            expanded
              ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200'
              : 'border-cyan-500/25 bg-slate-900/70 text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-500/10'
          }`}
          aria-expanded={expanded}
        >
          {origin ? <Pencil size={11} /> : <Search size={11} />}
          <span>{expanded ? 'Cerrar' : origin ? 'Editar' : 'Buscar'}</span>
        </button>
      </div>

      {/* Cuerpo expandido */}
      {expanded && (
        <div className="border-t border-cyan-500/10 p-3">
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-cyan-500/70" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              placeholder="Escribe tu calle (ej: Calle 12, Bogotá)"
              className="w-full rounded-lg border border-cyan-500/25 bg-[#0a1220]/80 py-2 pl-8 pr-8 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
            />
            {loading && <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-cyan-400" />}
            {!loading && query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setResults([]) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                aria-label="Limpiar búsqueda"
              >
                <X size={12} />
              </button>
            )}

            {open && (results.length > 0 || loading || query.trim().length >= 3) && (
              <div className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-cyan-500/20 bg-[#0b1424]/95 shadow-xl backdrop-blur-md cmd-scroll">
                {loading && <div className="px-3 py-2 text-[10px] text-slate-400">Buscando...</div>}
                {!loading && results.length === 0 && query.trim().length >= 3 && (
                  <div className="px-3 py-2 text-[10px] text-slate-500">Sin resultados para "{query}"</div>
                )}
                {results.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => pickPlace(place)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-cyan-500/10"
                  >
                    <MapPin size={12} className="mt-0.5 shrink-0 text-cyan-400" />
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-semibold text-slate-100">{place.label}</span>
                      {place.address && place.address !== place.label && (
                        <span className="block truncate text-[9px] text-slate-500">{place.address}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {!origin && hasGps && (
            <button
              type="button"
              onClick={onUseGps}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-cyan-300 transition-all hover:bg-cyan-500/20"
            >
              <LocateFixed size={12} /> Usar mi ubicación GPS
            </button>
          )}

          {origin && (
            <div className="mt-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5">
              <div className="font-mono text-[9px] text-emerald-300">{origin.position[0].toFixed(5)}, {origin.position[1].toFixed(5)}</div>
            </div>
          )}

          <div className="mt-2.5 border-t border-cyan-500/10 pt-2">
            <button
              type="button"
              onClick={onToggleFollow}
              disabled={!hasTarget}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                isFollowingRoute
                  ? 'bg-[#06b6d4] text-[#0b0f19] shadow-[0_0_22px_rgba(6,182,212,0.55)]'
                  : 'bg-[#06b6d4]/85 text-[#0b0f19] shadow-[0_0_18px_rgba(6,182,212,0.4)] hover:bg-[#22d3ee]'
              } ${!hasTarget ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <Navigation size={14} /> {isFollowingRoute ? 'Siguiendo al dispositivo' : 'Seguir al dispositivo'}
            </button>
            {!hasTarget && (
              <p className="mt-1.5 text-center text-[9px] text-slate-500">El dispositivo no tiene posición GPS aún</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default OriginCard