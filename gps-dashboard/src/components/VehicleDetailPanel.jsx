import React from 'react';
import { Battery, Gauge, MapPin, Navigation, Share2, Thermometer, X, Crosshair } from 'lucide-react';
import { VehicleControlCard } from './VehicleControlCard';
import { normalizeBattery, sanitizeAccuracy } from '../lib/queries';

const statusLabels = {
  active: 'En ruta / En línea',
  stopped: 'Detenido',
  offline: 'Sin conexión',
  immobilized: 'Inmovilizado',
};

export const VehicleDetailPanel = ({
  category = 'devices',
  entity,
  isFollowingRoute,
  onClose,
  onToggleRouteFollow,
  onShareRoute,
  onControlVehicle,
  onDeleteVehicle,
  isControlBusy,
}) => {
  if (!entity) return null;

  const statusKey = entity.status === 'active' || entity.status === 'online' ? 'active' : entity.status
  const statusLabel = statusLabels[statusKey] || 'Desconocido';
  const statusClass = statusKey === 'active'
    ? 'vehicle-detail-status-active'
    : statusKey === 'stopped'
      ? 'vehicle-detail-status-stopped'
      : statusKey === 'immobilized'
        ? 'vehicle-detail-status-stopped'
        : 'vehicle-detail-status-offline';

  const isDevices = category === 'devices'
  const batteryVal = normalizeBattery(entity.battery);
  const accVal = sanitizeAccuracy(entity.accuracy);

  return (
    <aside className="vehicle-detail-panel" aria-label={`Detalle de ${entity.name}`}>
      <div className="vehicle-detail-header">
        <div>
          <span className="vehicle-detail-eyebrow">{isDevices ? 'Dispositivo seleccionado' : 'Vehículo seleccionado'}</span>
          <h2>{entity.name}</h2>
          <p>{isDevices
            ? `${entity.model || 'Dispositivo GPS'}${entity.platform ? ` · ${entity.platform}` : ''}`
            : `${entity.plate || entity.id} · ${entity.driver || 'Conductor no asignado'}`}</p>
        </div>
        <button type="button" className="vehicle-detail-close" onClick={onClose} aria-label="Cerrar detalle">
          <X size={18} />
        </button>
      </div>

      <div className={`vehicle-detail-status ${statusClass}`}>
        <span className="vehicle-detail-status-dot" />
        <strong>{statusLabel}</strong>
        <span>{entity.lastUpdate || 'Sin actualización'}</span>
      </div>

      <div className="vehicle-detail-grid">
        <div><Gauge size={16} /><span>Velocidad<strong>{entity.speed || 0} km/h</strong></span></div>
        <div><Battery size={16} /><span>Batería<strong>{batteryVal}%</strong></span></div>
        {isDevices ? (
          <div><Crosshair size={16} /><span>Precisión<strong>{accVal !== null ? `${accVal} m` : '--'}</strong></span></div>
        ) : (
          <div><Thermometer size={16} /><span>Motor<strong>{entity.temp || 0}°C</strong></span></div>
        )}
        <div><MapPin size={16} /><span>Ubicación<strong>{entity.position ? `${entity.position[0].toFixed(5)}, ${entity.position[1].toFixed(5)}` : 'GPS activo'}</strong></span></div>
      </div>

      <div className="vehicle-detail-actions">
        <button
          type="button"
          onClick={onToggleRouteFollow}
          disabled={!entity?.position}
          title={!entity?.position ? 'Sin posición GPS para seguir' : ''}
          className={`${isFollowingRoute && entity?.position ? 'is-active' : ''} ${!entity?.position ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Navigation size={16} />
          {isFollowingRoute && entity?.position ? 'Siguiendo' : 'Seguir'}
        </button>
        <button type="button" onClick={onShareRoute}>
          <Share2 size={16} />
          Compartir
        </button>
      </div>

      {!isDevices && (
        <VehicleControlCard vehicle={entity} onControl={onControlVehicle} onDelete={onDeleteVehicle} isBusy={isControlBusy} />
      )}
    </aside>
  );
};