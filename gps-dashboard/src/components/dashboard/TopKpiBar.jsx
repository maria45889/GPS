import React from 'react';
import { Bike, AlertTriangle, Fuel, ShieldCheck, Zap } from 'lucide-react';

export const TopKpiBar = ({ kpis = {} }) => {
  const safeKpis = {
    active: kpis.active ?? 2,
    stopped: kpis.stopped ?? 1,
    offline: kpis.offline ?? 1,
    criticalAlerts: kpis.criticalAlerts ?? 1,
    fuelEfficiency: kpis.fuelEfficiency ?? '3.8',
    safetyScore: kpis.safetyScore ?? 94,
  };

  const items = [
    {
      icon: <Bike size={15} />,
      iconBg: 'rgba(0,230,118,0.12)',
      iconBorder: 'rgba(0,230,118,0.3)',
      iconColor: '#00E676',
      label: 'Estado de Flota',
      value: (
        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#00E676', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E676', boxShadow: '0 0 6px #00E676', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            {safeKpis.active} en ruta
          </span>
          <span style={{ color: '#1E293B' }}>·</span>
          <span style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
            {safeKpis.stopped} det.
          </span>
          <span style={{ color: '#1E293B' }}>·</span>
          <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#64748B', display: 'inline-block' }} />
            {safeKpis.offline} off
          </span>
        </span>
      ),
    },
    {
      icon: <AlertTriangle size={15} />,
      iconBg: 'rgba(239,68,68,0.12)',
      iconBorder: 'rgba(239,68,68,0.3)',
      iconColor: '#F87171',
      label: 'Alertas Críticas',
      value: <span style={{ fontSize: 13, fontWeight: 800, color: safeKpis.criticalAlerts > 0 ? '#F87171' : '#00E676', fontFamily: 'monospace' }}>{safeKpis.criticalAlerts} Activa{safeKpis.criticalAlerts !== 1 ? 's' : ''}</span>,
      pulse: safeKpis.criticalAlerts > 0,
    },
    {
      icon: <Fuel size={15} />,
      iconBg: 'rgba(96,165,250,0.12)',
      iconBorder: 'rgba(96,165,250,0.3)',
      iconColor: '#60A5FA',
      label: 'Consumo Prom.',
      value: <span style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>{safeKpis.fuelEfficiency} <span style={{ fontSize: 10, color: '#60A5FA', fontWeight: 600 }}>L/100km</span></span>,
      hideOnMobile: true,
    },
    {
      icon: <ShieldCheck size={15} />,
      iconBg: 'rgba(0,230,118,0.12)',
      iconBorder: 'rgba(0,230,118,0.3)',
      iconColor: '#00E676',
      label: 'Conducción Segura',
      value: <span style={{ fontSize: 13, fontWeight: 800, color: '#00E676', fontFamily: 'monospace' }}>{safeKpis.safetyScore}% <span style={{ fontSize: 10, fontWeight: 600 }}>Segura</span></span>,
      hideOnSmall: true,
    },
  ];

  return (
    <div style={{ width: '100%', padding: '10px 16px 0', zIndex: 20, userSelect: 'none' }}>
      <div style={{
        background: 'rgba(8,14,24,0.88)',
        border: '1px solid rgba(0,230,118,0.12)',
        borderRadius: 14,
        backdropFilter: 'blur(24px)',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        overflowX: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        {items.map((item, i) => (
          <div
            key={i}
            className={item.hideOnMobile ? 'hidden md:flex' : item.hideOnSmall ? 'hidden lg:flex' : 'flex'}
            style={{ alignItems: 'center', gap: 10, flexShrink: 0, borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingLeft: i > 0 ? 14 : 0 }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: item.iconBg, border: `1px solid ${item.iconBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: item.iconColor,
              animation: item.pulse ? 'pulse 2s infinite' : 'none',
              boxShadow: item.pulse ? `0 0 12px ${item.iconColor}` : 'none',
            }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 2 }}>{item.label}</div>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
