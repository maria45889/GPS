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
  historicalPosition: e?.historicalPosition || e?.position || null,
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
  const accuracy = Number(entity?.accuracy)
  if (Number.isFinite(accuracy) && accuracy > 0) {
    if (accuracy <= 10) return 96
    if (accuracy <= 25) return 90
    if (accuracy <= 50) return 82
    if (accuracy <= 100) return 72
    return 58
  }
  const battery = Number(entity?.battery)
  if (Number.isFinite(battery) && battery > 0) {
    if (battery >= 60) return 88
    if (battery >= 25) return 74
    return 55
  }
  return 70
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