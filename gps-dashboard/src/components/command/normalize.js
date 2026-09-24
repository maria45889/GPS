export const normalizeEntity = (e) => ({
  id: e?.id ?? null,
  name: e?.name || e?.label || e?.id || 'N/A',
  plate: e?.plate || e?.vehicle_id || e?.id || 'NN',
  status: e?.status || 'offline',
  speed: Math.max(0, Number(e?.speed) || 0),
  bearing: Math.round(Number(e?.bearing) || 0),
  battery: Number.isFinite(Number(e?.battery))
    ? Math.max(0, Math.min(100, Math.round(Number(e.battery))))
    : 0,
  accuracy: Number.isFinite(Number(e?.accuracy)) ? Math.max(0, Math.round(Number(e.accuracy))) : null,
  position: e?.position || null,
  route: Array.isArray(e?.route) ? e.route : [],
  lastUpdate: e?.lastUpdate || e?.last_seen || '--',
  deviceId: e?.deviceId || e?.device_id || null,
  model: e?.model || e?.platform || (e?.driver && e.driver !== 'Desconocido' ? 'Moto GPS' : 'Android APK'),
  driver: e?.driver || null,
  controlState: e?.controlState,
  _mock: Boolean(e?._mock),
  _ephemeral: Boolean(e?._ephemeral),
  _kind: e?._kind || 'device',
})

export const isOnline = (entity) => entity?.status === 'active' || entity?.status === 'online' || entity?.status === 'online_moving'

export const statusLabel = (entity) => {
  if (!entity) return 'SIN DATOS'
  if (isOnline(entity)) return 'EN LÍNEA'
  if (entity.status === 'immobilized') return 'INMOVILIZADO'
  return 'SIN SEÑAL'
}

export const statusColor = (entity) => {
  if (isOnline(entity)) return '#10b981'
  if (entity?.status === 'immobilized') return '#f59e0b'
  return '#ef4444'
}

export const signalFor = (entity) => {
  if (!entity || !isOnline(entity)) return 0
  const seed = (String(entity.id).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 12)
  return Math.max(82, Math.min(99, 96 - seed))
}

export const gForceFor = (entity, tick = Date.now()) => {
  const seed = String(entity?.id || 'x').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const wave = Math.sin(tick / 1100 + seed) * 0.12
  const speedPull = (Number(entity?.speed) || 0) / 180
  return (0.92 + wave + speedPull).toFixed(2)
}

export const altitudeFor = (tick = Date.now(), seed = 0) => {
  const wave = Math.sin(tick / 1400 + seed) * 6
  return Math.round(2574 + wave)
}

export const hashSpark = (seedValue, max = 18) => {
  let s = Number(seedValue) || 1
  const out = []
  for (let i = 0; i < max; i++) {
    s = (s * 9301 + 49297) % 233280
    out.push(((s / 233280) * 100) + ((i % 3) * 4))
  }
  return out
}