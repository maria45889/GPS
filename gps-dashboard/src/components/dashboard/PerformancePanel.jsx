import React from 'react';

const sparkLinePoints = (values, width = 180, height = 52) => {
  if (!values || values.length === 0) return '';
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
};

export const PerformancePanel = ({ vehicles = [], alerts = [] }) => {
  const avgSpeed = vehicles.length
    ? Math.round(vehicles.reduce((sum, vehicle) => sum + (vehicle.speed || 0), 0) / vehicles.length)
    : 0;

  const avgBattery = vehicles.length
    ? Math.round(vehicles.reduce((sum, vehicle) => sum + (vehicle.battery || 0), 0) / vehicles.length)
    : 0;

  const activeCount = vehicles.filter(vehicle => vehicle.status === 'active').length;
  const criticalCount = alerts.filter(alert => alert.status !== 'resolved' && alert.severity === 'critical').length;

  const speedTrend = [42, 46, 52, 58, 64, 61, 68, 74, 70, 85, 80, 88];
  const efficiencyTrend = [76, 72, 80, 79, 82, 84, 87, 85, 88, 90, 92, 94];

  const metricCards = [
    {
      label: 'Velocidad media',
      value: `${avgSpeed} km/h`,
      delta: '+12%',
      tone: 'cyan',
      detail: 'Comparado con ayer',
    },
    {
      label: 'Batería promedio',
      value: `${avgBattery}%`,
      delta: '+6%',
      tone: 'green',
      detail: 'Nivel de salud del sistema',
    },
    {
      label: 'Vehículos activos',
      value: `${activeCount}`,
      delta: '3 en ruta',
      tone: 'amber',
      detail: 'Ritmo operativo actual',
    },
    {
      label: 'Alertas críticas',
      value: `${criticalCount}`,
      delta: 'Revisar',
      tone: 'red',
      detail: 'Requieren atención inmediata',
    },
  ];

  return (
    <div className="performance-panel">
      <div className="performance-header">
        <div>
          <p className="performance-eyebrow">Operación</p>
          <h3>Control de rendimiento</h3>
        </div>
        <button type="button">Vista 24h</button>
      </div>

      <div className="performance-grid">
        {metricCards.map(card => (
          <div key={card.label} className={`metric-card metric-${card.tone}`}>
            <div className="metric-topline">
              <span>{card.label}</span>
              <strong>{card.delta}</strong>
            </div>
            <div className="metric-value">{card.value}</div>
            <small>{card.detail}</small>
          </div>
        ))}
      </div>

      <div className="performance-visuals">
        <div className="chart-card">
          <div className="chart-title-row">
            <div>
              <p>Velocidad</p>
              <strong>{avgSpeed} km/h</strong>
            </div>
            <span>+18.4%</span>
          </div>
          <svg viewBox="0 0 180 52" preserveAspectRatio="none" aria-label="Velocidad">
            <path d={sparkLinePoints(speedTrend, 180, 52)} fill="none" stroke="#74f0ff" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>

        <div className="chart-card">
          <div className="chart-title-row">
            <div>
              <p>Eficiencia</p>
              <strong>94%</strong>
            </div>
            <span>+6.2%</span>
          </div>
          <svg viewBox="0 0 180 52" preserveAspectRatio="none" aria-label="Eficiencia">
            <path d={sparkLinePoints(efficiencyTrend, 180, 52)} fill="none" stroke="#7ef7a3" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
};
