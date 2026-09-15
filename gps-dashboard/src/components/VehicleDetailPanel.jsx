import React from 'react';
import { Battery, Gauge, MapPin, Navigation, Share2, Thermometer, X, Zap } from 'lucide-react';

const statusLabels = {
  active: 'En ruta',
  stopped: 'Detenido',
  offline: 'Sin conexión',
};

export const VehicleDetailPanel = ({
  vehicle,
  isFollowingRoute,
  onClose,
  onToggleRouteFollow,
  onShareRoute,
  onViewHistory,
  onReportTheft,
}) => {
  if (!vehicle) return null;

  const statusLabel = statusLabels[vehicle.status] || 'Desconocido';
  const statusClass = vehicle.status === 'active'
    ? 'vehicle-detail-status-active'
    : vehicle.status === 'stopped'
      ? 'vehicle-detail-status-stopped'
      : 'vehicle-detail-status-offline';

  return (
    <aside className="vehicle-detail-panel" aria-label={`Detalle de ${vehicle.name}`}>
      <div className="vehicle-detail-header">
        <div>
          <span className="vehicle-detail-eyebrow">Vehículo seleccionado</span>
          <h2>{vehicle.name}</h2>
          <p>{vehicle.plate || vehicle.id} · {vehicle.driver || 'Conductor no asignado'}</p>
        </div>
        <button type="button" className="vehicle-detail-close" onClick={onClose} aria-label="Cerrar detalle">
          <X size={18} />
        </button>
      </div>

      <div className={`vehicle-detail-status ${statusClass}`}>
        <span className="vehicle-detail-status-dot" />
        <strong>{statusLabel}</strong>
        <span>{vehicle.lastUpdate || 'Sin actualización'}</span>
      </div>

      <div className="vehicle-detail-grid">
        <div><Gauge size={16} /><span>Velocidad<strong>{vehicle.speed || 0} km/h</strong></span></div>
        <div><Battery size={16} /><span>Batería<strong>{vehicle.battery || 0}%</strong></span></div>
        <div><Thermometer size={16} /><span>Motor<strong>{vehicle.temp || 0}°C</strong></span></div>
        <div><MapPin size={16} /><span>Ubicación<strong>{vehicle.location || 'GPS activo'}</strong></span></div>
      </div>

      <div className="vehicle-detail-actions">
        <button type="button" onClick={onToggleRouteFollow} className={isFollowingRoute ? 'is-active' : ''}>
          <Navigation size={16} />
          {isFollowingRoute ? 'Siguiendo ruta' : 'Seguir ruta'}
        </button>
        <button type="button" onClick={onShareRoute}>
          <Share2 size={16} />
          Compartir
        </button>
        <button type="button" onClick={onViewHistory}>
          <Gauge size={16} />
          Historial
        </button>
        <button type="button" onClick={onReportTheft} className="vehicle-detail-danger">
          <Zap size={16} />
          Reportar incidente
        </button>
      </div>
    </aside>
  );
};
