import React from 'react';
import { Zap, Gauge, Thermometer, Droplets, Wifi } from 'lucide-react';

const MotoInfoCard = ({ vehicle }) => {
  const current = vehicle || {
    id: 'MT-2101',
    name: 'Yamaha YZF-R1',
    plate: 'XYZ-987',
    status: 'active',
    speed: 84,
    battery: 92,
    odometer: '14,352 km',
    temp: 82,
    fuel: 78,
  };

  const isMoving = current.status === 'active';

  const statusColor = isMoving ? '#00E676'
    : current.status === 'stopped' ? '#F59E0B'
    : '#64748B';

  const statusLabel = isMoving ? 'En Ruta'
    : current.status === 'stopped' ? 'Detenido'
    : 'Offline';

  return (
    <div className="flex flex-col gap-2 pointer-events-auto w-72 sm:w-80 max-w-[calc(100vw-2rem)] select-none">
      {/* Vehicle Status Card */}
      <div
        style={{
          background: 'rgba(8,14,24,0.92)',
          border: '1px solid rgba(0,230,118,0.2)',
          borderRadius: '16px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 0 20px rgba(0,230,118,0.05)',
          padding: '14px 16px',
        }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: '#00E676', textTransform: 'uppercase' }}>
            Estado del Vehículo
          </span>
          <div className="flex items-center gap-1.5">
            <span
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: statusColor,
                boxShadow: `0 0 8px ${statusColor}`,
                display: 'inline-block',
                animation: isMoving ? 'pulse 2s infinite' : 'none',
              }}
            />
            <span style={{ fontSize: '11px', fontWeight: 700, color: statusColor }}>{statusLabel}</span>
          </div>
        </div>

        {/* Vehicle name + plate */}
        <div className="flex items-center gap-3 mb-3">
          <div
            style={{
              width: 80, height: 60, shrink: 0, borderRadius: 10,
              overflow: 'hidden', background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(0,230,118,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=300"
              alt={current.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8)) brightness(0.95)' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>{current.name}</div>
            <div style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace', marginTop: 3 }}>{current.plate || current.id}</div>
          </div>
        </div>

        {/* Speed — LARGE */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <div style={{ fontSize: '10px', color: '#00E676', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Velocidad</div>
            <div style={{ fontSize: '36px', fontWeight: 900, color: '#ffffff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {current.speed ?? 0}
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#00E676', marginLeft: 4 }}>km/h</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Odómetro</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', fontFamily: 'monospace' }}>{current.odometer || '14,352 km'}</div>
          </div>
        </div>

        {/* Battery bar */}
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span style={{ fontSize: '10px', color: '#00E676', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={11} /> Batería GPS
            </span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>{current.battery}%</span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${current.battery}%`,
              background: 'linear-gradient(90deg, #00E676, #00ff88)',
              borderRadius: 6,
              boxShadow: '0 0 8px rgba(0,230,118,0.6)',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Fuel bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Droplets size={11} color="#64748B" /> Combustible
            </span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>{current.fuel ?? 78}%</span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${current.fuel ?? 78}%`,
              background: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
              borderRadius: 6,
              boxShadow: '0 0 8px rgba(59,130,246,0.4)',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Live Data Card */}
      <div
        style={{
          background: 'rgba(8,14,24,0.92)',
          border: '1px solid rgba(0,230,118,0.2)',
          borderRadius: '16px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
          padding: '12px 16px',
        }}
      >
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: '#00E676', textTransform: 'uppercase', marginBottom: 10 }}>
          Datos en Vivo
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { icon: <Thermometer size={14} color="#FF6B6B" />, label: 'Motor', value: `${current.temp ?? 82}°C`, color: '#FF6B6B' },
            { icon: <Gauge size={14} color="#00E676" />, label: 'RPM', value: '3,200', color: '#00E676' },
            { icon: <Wifi size={14} color="#60A5FA" />, label: 'Señal', value: '4G LTE', color: '#60A5FA' },
          ].map((item, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 10,
              padding: '8px 6px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{item.icon}</div>
              <div style={{ fontSize: '9px', color: '#475569', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: item.color, fontFamily: 'monospace' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MotoInfoCard;
