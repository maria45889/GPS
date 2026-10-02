// Marcadores y popups como HTML plano: MapLibre los monta como nodos del DOM, así que
// el mismo marcado sirve para los pines del mapa y para los popups.

export const escapeHtml = (str) => {
  if (typeof str !== 'string') return String(str ?? '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};

export const sanitizeColorSafe = (color) => {
  if (typeof color !== 'string') return '#00E676';
  const trimmed = color.trim();
  if (/^#([0-9a-fA-F]{3}){1,2}$/.test(trimmed) || /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$/.test(trimmed)) {
    return trimmed;
  }
  return '#00E676';
};

export const STATUS_COLOR = {
  active: '#00E676',
  stopped: '#F59E0B',
  offline: '#64748B',
};

export const userLocationHtml = () => '<div class="user-location-dot"><span></span></div>';

export const originHtml = () => '<div class="origin-flag"><span></span></div>';

export const heroPinHtml = (name, id) => `
  <div class="pin-stack">
    <div class="pin-hero-card">
      <div class="pin-hero-name">${escapeHtml(name)}</div>
      <div class="pin-hero-id">ID: ${escapeHtml(id)}</div>
    </div>
    <div class="pin-hero-marker">
      <div class="pin-pulse pin-pulse-a"></div>
      <div class="pin-pulse pin-pulse-b"></div>
      <div class="pin-hero-body">
        <svg viewBox="0 0 24 24" fill="none" stroke="#0A0F1A" stroke-width="2.5">
          <circle cx="18.5" cy="17.5" r="3.5" />
          <circle cx="5.5" cy="17.5" r="3.5" />
          <circle cx="15" cy="5" r="1" />
          <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
        </svg>
      </div>
    </div>
  </div>`;

export const fleetPinHtml = (status) => {
  const color = STATUS_COLOR[status] || STATUS_COLOR.offline;
  return `
    <div class="fleet-pin" data-status="${escapeHtml(status || 'offline')}">
      <div class="fleet-pin-glow" style="box-shadow: 0 0 15px ${color}66"></div>
      <div class="fleet-pin-halo" style="background: ${color}25; border-color: ${color}70"></div>
      <div class="fleet-pin-core" style="background: linear-gradient(135deg, ${color} 0%, ${color}CC 100%); box-shadow: 0 0 12px ${color}, 0 0 24px ${color}55"></div>
    </div>`;
};

export const waypointHtml = (label, color = '#00E676') => `
  <div class="waypoint-pin" style="border-color: ${color}; color: ${color}; box-shadow: 0 0 15px ${color}, 0 0 30px ${color}40">
    <div class="waypoint-pin-glow" style="background: radial-gradient(circle, ${color}20 0%, transparent 70%)"></div>
    <span>${escapeHtml(label)}</span>
  </div>`;

export const headingHtml = (bearing = 0) => {
  const rounded = Math.round(Number(bearing) || 0);
  return `<div class="heading-arrow" style="transform: rotate(${rounded}deg)">▲</div>`;
};

export const zoneLabelHtml = (name, rawColor = '#00E676') => {
  const color = sanitizeColorSafe(rawColor);
  return `
    <div class="zone-label" style="border-color: ${color}; color: ${color}; box-shadow: 0 0 15px ${color}40, 0 0 30px ${color}20">
      ${escapeHtml(name)}
    </div>`;
};

export const alertIncidentHtml = (severity) => {
  const isCritical = severity === 'critical';
  const color = isCritical ? '#FF3366' : '#F59E0B';
  return `
    <div class="alert-pin">
      <div class="alert-pin-ping" style="background: ${color}35; box-shadow: 0 0 16px ${color}"></div>
      <div class="alert-pin-core" style="border-color: ${color}; box-shadow: 0 0 12px ${color}">
        ${isCritical ? '!' : 'ALERTA'}
      </div>
    </div>`;
};

const statusBadge = (status) => {
  if (status === 'active') return '<span class="badge badge-active">En ruta</span>';
  if (status === 'stopped') return '<span class="badge badge-stopped">Detenido</span>';
  return '<span class="badge badge-offline">Offline</span>';
};

export const vehiclePopupHtml = (vehicle, { category = 'devices', isSelected = false, isOffline = false, isFollowingRoute = false } = {}) => {
  const battery = Number(vehicle.battery);
  const batteryLabel = Number.isFinite(battery) ? `${Math.round(battery)}%` : '--';
  const actions = isSelected
    ? `<div class="popup-actions">
        <button type="button" class="popup-btn popup-btn-cyan" data-action="follow" aria-label="${isFollowingRoute ? 'Dejar de seguir la ruta' : 'Seguir la ruta del dispositivo'}">${isFollowingRoute ? 'Siguiendo' : 'Seguir ruta'}</button>
        <button type="button" class="popup-btn popup-btn-emerald" data-action="share" aria-label="Compartir ubicación y ruta">Compartir</button>
      </div>`
    : `<button type="button" class="popup-btn popup-btn-block" data-action="select" aria-label="Seleccionar ${escapeHtml(vehicle.name || vehicle.plate || vehicle.id)}">Seleccionar ${category === 'vehicles' ? 'moto' : 'dispositivo'}</button>`;

  return `
    <div class="popup-card" data-vehicle-id="${escapeHtml(vehicle.id)}">
      <div class="popup-head">
        <span class="popup-title">${escapeHtml(vehicle.name || vehicle.id)}</span>
        ${statusBadge(vehicle.status)}
      </div>
      <div class="popup-body">
        ${isOffline ? '<p class="popup-desc">Sin señal · última posición conocida</p>' : ''}
        <p>Velocidad: <strong>${escapeHtml(String(vehicle.speed ?? 0))} km/h</strong></p>
        <p>Batería: <strong>${batteryLabel}</strong></p>
        ${vehicle.driver ? `<p>Conductor: <span>${escapeHtml(vehicle.driver)}</span></p>` : ''}
        <p>${category === 'vehicles' ? 'Placa' : 'ID'}: <span class="popup-accent">${escapeHtml(vehicle.plate || vehicle.id || '--')}</span></p>
      </div>
      ${actions}
    </div>`;
};

export const alertPopupHtml = (alert, category = 'devices') => `
  <div class="popup-card" data-alert-id="${escapeHtml(alert.id)}">
    <div class="popup-head">
      <span class="popup-alert-icon">${alert.severity === 'critical' ? '!' : 'ALERTA'}</span>
      <div>
        <span class="popup-title">${escapeHtml(alert.title)}</span>
        <span class="popup-time">${escapeHtml(alert.timestamp || '')}</span>
      </div>
    </div>
    <p class="popup-desc">${escapeHtml(alert.description || '')}</p>
    <div class="popup-meta">${category === 'devices' ? 'Dispositivo' : 'Moto'}: ${escapeHtml(alert.vehicleName || '--')} · ${escapeHtml(String(alert.speed ?? 0))} km/h</div>
    <button type="button" class="popup-btn popup-btn-block" data-action="alert" aria-label="Ver alerta: ${escapeHtml(alert.title)}">Ver alerta</button>
  </div>`;

export const geofencePopupHtml = ({ name, color = '#00E676', detail = '', rule = 'Supervision' }) => `
  <div class="popup-card">
    <div class="popup-head">
      <span class="zone-dot" style="background:${color}; box-shadow:0 0 8px ${color}"></span>
      <span class="popup-title">${escapeHtml(name)}</span>
    </div>
    <div class="popup-body"><p>${escapeHtml(detail)}</p></div>
    <div class="popup-meta">Regla: ${escapeHtml(rule)}</div>
  </div>`;