// Edge Function de Supabase: provision-device
// Crea la cuenta Auth de un dispositivo, la asocia en devices.auth_user_id
// y devuelve al APK las credenciales para que el dispositivo pueda entrar
// a su panel ("login por dispositivo").

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

// B4: ALLOWED_ORIGIN es obligatorio en producción. Si falta, el worker falla rápido
// y la función retorna 500 en todas las solicitudes hasta que se configure.
const CORS_ORIGIN = Deno.env.get('ALLOWED_ORIGIN')
if (!CORS_ORIGIN) {
  throw new Error(
    '[provision-device] Variable de entorno ALLOWED_ORIGIN no configurada. ' +
    'Defina el secret antes de desplegar: supabase secrets set ALLOWED_ORIGIN=https://tu-dominio.com'
  )
}
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-provision-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })

// Password aleatorio legible (sin 0/O/1/l/I para evitar confusiones).
function randomPassword(len = 18): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}

// Rate Limiter persistente en DB (con fallback en memoria para solicitudes por ventana de 15 min)
// NOTA: activationCode viaja en el BODY (campo "activationCode"), NO en un header.
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const MAX_FAILED_ATTEMPTS = 5  // Máximo 5 intentos fallidos por ventana de 15 minutos por IP
const attemptStore = new Map<string, { count: number; expiresAt: number }>()

// Fallback en memoria: solo lectura
function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const record = attemptStore.get(key)
  if (!record) return true
  if (now > record.expiresAt) {
    attemptStore.delete(key)
    return true
  }
  return record.count < MAX_FAILED_ATTEMPTS
}

// Fallback en memoria: incremento solo en fallo
function recordFailedAttemptMemory(key: string) {
  const now = Date.now()
  const record = attemptStore.get(key)
  if (!record || now > record.expiresAt) {
    attemptStore.set(key, { count: 1, expiresAt: now + ATTEMPT_WINDOW_MS })
  } else {
    record.count += 1
  }
}

async function clearDbRateLimit(key: string) {
  try {
    const { error } = await supabase.rpc('clear_rate_limit', { p_key: key })
    // B2: Verificar el objeto error de Supabase — no siempre lanza excepción.
    if (error) console.warn(`clearDbRateLimit RPC error for type ${key.split(':')[0]}:`, error.message)
  } catch (e) {
    console.warn(`clearDbRateLimit network error for type ${key.split(':')[0]}:`, e)
  }
  // Siempre limpiar memoria (independientemente de si DB tuvo éxito)
  attemptStore.delete(key)
}

// B3: check es SOLO LECTURA en DB. No incrementa.
async function checkDbRateLimit(key: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_max_attempts: MAX_FAILED_ATTEMPTS,
    })
    if (!error && typeof data === 'boolean') {
      return data
    }
  } catch {
    // Fallback si RPC no está desplegado aún
  }
  return checkRateLimit(key)
}

// B2: Incremento en DB solo cuando hay un fallo real.
// recordFailedAttemptMemory se llama SOLO como fallback si la RPC falla — nunca las dos juntas.
async function recordDbFailedAttempt(key: string) {
  try {
    const { error } = await supabase.rpc('record_rate_limit_failure', { p_key: key })
    // B2: Supabase devuelve { error } sin lanzar excepción. Verificar explícitamente.
    if (error) throw error
    // RPC exitosa: solo la DB tiene el registro — no duplicar en memoria.
  } catch {
    // DB no disponible: registrar solo en memoria como fallback.
    recordFailedAttemptMemory(key)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const clientIp = req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || 'unknown-ip'


  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'json invalido' }, 400)
  }

  const activationCode = String(body.activationCode || body.activation_code || '').trim()
  
  const PROVISION_SECRET = Deno.env.get('PROVISION_SECRET')
  if (!PROVISION_SECRET) {
    throw new Error('PROVISION_SECRET no configurada')
  }

  if (!activationCode) {
    await recordDbFailedAttempt(`ip:${clientIp}`)
    return json({ error: 'codigo de activacion es obligatorio' }, 400)
  }

  if (activationCode !== PROVISION_SECRET) {
    await recordDbFailedAttempt(`ip:${clientIp}`)
    return json({ error: 'codigo de activacion invalido' }, 403)
  }

  const rawDeviceId = String(body.deviceId ?? '').trim()
  const deviceId = rawDeviceId.slice(0, 64)
  if (!deviceId || !/^[a-zA-Z0-9_-]+$/.test(deviceId)) {
    await recordDbFailedAttempt(`ip:${clientIp}`)
    return json({ error: 'deviceId invalido' }, 400)
  }

  // Verificación de Rate Limit por IP, deviceId y código de activación (Persistente en DB + In-memory fallback)
  const ipAllowed = await checkDbRateLimit(`ip:${clientIp}`)
  const deviceAllowed = await checkDbRateLimit(`device:${deviceId}`)
  const codeAllowed = await checkDbRateLimit(`code:${activationCode}`)

  if (!ipAllowed || !deviceAllowed || !codeAllowed) {
    return json({ error: 'demasiados intentos de aprovisionamiento. intente mas tarde' }, 429)
  }


  // Verificación de registro previo en el sistema
  const existingReg = await supabase
    .from('device_registry')
    .select('device_id')
    .eq('device_id', deviceId)
    .maybeSingle()

  if (existingReg.error) return json({ error: existingReg.error.message }, 500)

  const deviceExisting = await supabase
    .from('devices')
    .select('auth_user_id, status')
    .eq('id', deviceId)
    .maybeSingle()

  if (deviceExisting.error) return json({ error: deviceExisting.error.message }, 500)

  // Si existe en device_registrations (existingReg.data), siempre lo consideramos registrado
  // Si existe en devices, lo consideramos registrado SOLO SI está activo/online.
  // Si está 'inactive', es porque fue eliminado (baja lógica), por lo que permitimos re-aprovisionar.
  const isInactive = deviceExisting.data && deviceExisting.data.status === 'inactive';
  const isAlreadyRegistered = Boolean(existingReg.data || (deviceExisting.data && !isInactive))

  // Generamos un correo único agregando un timestamp corto para evitar colisiones "email already registered"
  // si hubo un intento fallido anterior que dejó al usuario huérfano en auth.users
  const uniqueSuffix = Math.floor(Date.now() / 1000).toString(36)
  const email = `device-${deviceId}-${uniqueSuffix}@local.rideguard`
  const password = randomPassword()

  if (isAlreadyRegistered) {
    // Anti-hijack protection: no re-provisioning allowed for existing devices
    return json({ error: 'El dispositivo ya se encuentra registrado y activado.' }, 403)
  }

  // Si está inactivo, primero limpiamos el usuario de auth anterior si lo había,
  // o simplemente dejamos que el nuevo usuario tome el control sobreescribiendo el auth_user_id.
  if (isInactive && deviceExisting.data.auth_user_id) {
    try {
      await supabase.auth.admin.deleteUser(deviceExisting.data.auth_user_id);
    } catch (e) {
      // Ignorar si el usuario ya no existe
    }
  }

  // Primer aprovisionamiento del dispositivo
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'device', device_id: deviceId },
  })
  if (created.error) {
    // B1: Era recordFailedAttempt (no existe) — corregido a recordDbFailedAttempt.
    await recordDbFailedAttempt(`ip:${clientIp}`)
    return json({ error: created.error.message }, 500)
  }

  // Auto-provisioning directly via service role (bypassing activation code requirements)
  const { data: orgData } = await supabase.from('organizations').select('id').limit(1).maybeSingle()
  const orgId = orgData?.id

  if (!orgId) {
    return json({ error: 'No hay organizaciones creadas en la base de datos' }, 500)
  }

  // Insert or Upsert into devices
  // 'status' debe ser 'active': la policy gps_locations_device_insert exige
  // status in ('active','online') y el default de la columna es 'offline',
  // sin este campo RLS rechazaria el 100% de los inserts de posicion.
  const { error: deviceErr } = await supabase.from('devices').upsert({
    id: deviceId,
    auth_user_id: created.data.user.id,
    organization_id: orgId,
    status: 'active'
  })

  // Insert or Upsert into vehicles
  const { error: vehicleErr } = await supabase.from('vehicles').upsert({
    id: deviceId, // We use the same ID for simplicity in auto-provisioning
    device_id: deviceId,
    name: 'Auto-Móvil ' + deviceId.substring(0, 4),
    organization_id: orgId,
    status: 'active'
  })

  // Insert or Upsert into device_registry
  // Esta tabla es el puente device_id -> vehicle_id. Sin esta fila:
  //   - delete-device-user nunca resuelve vehicle_id y deja vehiculos huerfanos
  //   - reconcile_pending_deletions cae siempre en la rama ELSE y borra el device
  //     (cascada => se pierde todo el historial GPS) sin borrar el vehiculo
  //   - el UPDATE de device_registry en delete_vehicle_cascade es un no-op
  const { error: registryErr } = await supabase.from('device_registry').upsert({
    device_id: deviceId,
    organization_id: orgId,
    vehicle_id: deviceId,
    label: 'Auto-Móvil ' + deviceId.substring(0, 4),
    status: 'active'
  })

  if (deviceErr || vehicleErr || registryErr) {
    await recordDbFailedAttempt(`ip:${clientIp}`)
    await recordDbFailedAttempt(`device:${deviceId}`)

    // Cleanup orphan user
    if (created.data?.user?.id) {
      const { error: deleteErr } = await supabase.auth.admin.deleteUser(created.data.user.id)
      if (deleteErr) {
        await supabase.from('orphan_auth_users').insert({
          auth_user_id: created.data.user.id,
          device_id: deviceId,
          reason: `auto-provision failed. deleteUser also failed: ${deleteErr.message}`,
        })
      }
    }
    return json({ error: 'error al insertar en devices/vehicles/device_registry: ' + (deviceErr?.message || vehicleErr?.message || registryErr?.message) }, 500)
  }

  await clearDbRateLimit(`ip:${clientIp}`)
  await clearDbRateLimit(`device:${deviceId}`)
  await clearDbRateLimit(`code:${activationCode}`)
  return json({ ok: true, deviceId, email, password })
})