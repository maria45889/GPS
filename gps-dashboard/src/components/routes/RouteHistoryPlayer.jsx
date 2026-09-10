import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, Clock, Gauge, Navigation, X } from 'lucide-react';

export const RouteHistoryPlayer = ({ 
  routePoints = [], 
  onProgressChange, 
  onClose,
  initialSpeed = 1 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playSpeed, setPlaySpeed] = useState(initialSpeed); // 1x, 2x, 4x
  const timerRef = useRef(null);

  const totalPoints = routePoints.length;

  // Calculate mock telemetry along the route
  const getWaypointData = (idx) => {
    const ratio = totalPoints > 1 ? idx / (totalPoints - 1) : 0;
    // Simulated time from 11:32 AM to 12:48 PM
    const startMinutes = 11 * 60 + 32;
    const endMinutes = 12 * 60 + 48;
    const currentMinutes = Math.round(startMinutes + ratio * (endMinutes - startMinutes));
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    const timeStr = `${h}:${m < 10 ? '0' : ''}${m} ${h >= 12 ? 'PM' : 'AM'}`;

    // Simulated realistic speeds (turns = slower, straightaways = 84-95 km/h)
    const simulatedSpeeds = [0, 24, 48, 65, 84, 95, 78, 55, 42, 60, 88, 92, 64, 0];
    const speed = simulatedSpeeds[idx % simulatedSpeeds.length];

    return { timeStr, speed, ratio };
  };

  const currentData = getWaypointData(currentIndex);

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(200, 1000 / playSpeed);
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= totalPoints - 1) {
            setIsPlaying(false);
            return prev;
          }
          const next = prev + 1;
          if (onProgressChange && routePoints[next]) {
            onProgressChange(routePoints[next], next, getWaypointData(next));
          }
          return next;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playSpeed, totalPoints, routePoints, onProgressChange]);

  const handleSliderChange = (e) => {
    const newIdx = parseInt(e.target.value, 10);
    setCurrentIndex(newIdx);
    if (onProgressChange && routePoints[newIdx]) {
      onProgressChange(routePoints[newIdx], newIdx, getWaypointData(newIdx));
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    if (onProgressChange && routePoints[0]) {
      onProgressChange(routePoints[0], 0, getWaypointData(0));
    }
  };

  const toggleSpeed = () => {
    const nextSpeed = playSpeed === 1 ? 2 : playSpeed === 2 ? 4 : 1;
    setPlaySpeed(nextSpeed);
  };

  return (
    <div className="w-full max-w-2xl bg-[#0D1424]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] pointer-events-auto select-none">
      {/* Top Bar: Title, Live Waypoint Stats, Close */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_8px_#00F0FF]"></div>
          <span className="text-xs font-bold text-white tracking-wider uppercase">
            Reproductor de Recorrido
          </span>
          <span className="text-[10px] text-[#64748B] font-mono">
            Punto {currentIndex + 1} de {totalPoints}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Timestamp */}
          <div className="flex items-center gap-1.5 text-white font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
            <Clock size={13} className="text-[#00F0FF]" />
            <span>{currentData.timeStr}</span>
          </div>

          {/* Speed at waypoint */}
          <div className="flex items-center gap-1.5 text-white font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
            <Gauge size={13} className="text-[#00E676]" />
            <span>{currentData.speed} <span className="text-[10px] text-[#94A3B8]">km/h</span></span>
          </div>

          {onClose && (
            <button 
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors"
              title="Cerrar reproductor"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Timeline Slider */}
      <div className="relative mb-3.5 px-1">
        <input 
          type="range"
          min="0"
          max={totalPoints - 1}
          value={currentIndex}
          onChange={handleSliderChange}
          className="w-full h-1.5 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
        />
        <div className="flex justify-between text-[10px] text-[#64748B] font-mono mt-1">
          <span>Inicio: 11:32 AM</span>
          <span className="text-[#00F0FF]">Progreso: {Math.round(currentData.ratio * 100)}%</span>
          <span>Fin: 12:48 PM</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00F0FF] hover:bg-[#00D0E6] text-[#0B0F19] font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            <span>{isPlaying ? 'Pausar' : 'Reproducir'}</span>
          </button>

          {/* Reset / Rewind */}
          <button
            onClick={handleReset}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#94A3B8] hover:text-white transition-all"
            title="Reiniciar al inicio"
          >
            <RotateCcw size={15} />
          </button>

          {/* Speed Toggle (1x, 2x, 4x) */}
          <button
            onClick={toggleSpeed}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-[#00F0FF] transition-all"
            title="Cambiar velocidad de reproducción"
          >
            <FastForward size={14} />
            <span>{playSpeed}x</span>
          </button>
        </div>

        {/* Total stats pill */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-[#94A3B8] font-mono">
          <span>Distancia: <strong className="text-white">18.4 km</strong></span>
          <span>•</span>
          <span>Vel. Máx: <strong className="text-white">95 km/h</strong></span>
        </div>
      </div>
    </div>
  );
};
