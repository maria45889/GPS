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
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const MAX_FAILED_ATTEMPTS = 5
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
    if (error) console.warn(`clearDbRateLimit(${key}) RPC error:`, error.message)
  } catch (e) {
    console.warn(`clearDbRateLimit(${key}) network error:`, e)
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

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown-ip'


  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'json invalido' }, 400)
  }

  const activationCode = String(body.activationCode || body.activation_code || '').trim()
  // Optional activation code for auto-provisioning
  // if (!activationCode) {
  //   await recordDbFailedAttempt(`ip:${clientIp}`)
  //   return json({ error: 'codigo de activacion es obligatorio' }, 400)
  // }

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
    .select('auth_user_id')
    .eq('id', deviceId)
    .maybeSingle()

  if (deviceExisting.error) return json({ error: deviceExisting.error.message }, 500)

  const isAlreadyRegistered = Boolean(existingReg.data || deviceExisting.data?.auth_user_id)

  const email = `device-${deviceId}@local.rideguard`
  const password = randomPassword()

  if (isAlreadyRegistered) {
    // Auto-re-provisioning bypassing activation code for mobile apps
    let authUserId = deviceExisting.data?.auth_user_id
    if (!authUserId) {
      const created = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role: 'device', device_id: deviceId },
      })
      if (created.error) return json({ error: created.error.message }, 500)
      authUserId = created.data.user.id
      
      const { data: orgData } = await supabase.from('organizations').select('id').limit(1).single()
      
      // Update devices table if missing
      await supabase.from('devices').update({ auth_user_id: authUserId }).eq('id', deviceId)
    }

    try {
      const updated = await supabase.auth.admin.updateUserById(authUserId, { password })
      if (updated.error) throw updated.error
      const { error: signOutErr } = await supabase.auth.admin.signOut(authUserId, 'global')
    } catch (error: any) {
      console.error(`⚠️ Error al re-aprovisionar ${authUserId}:`, error)
      await recordDbFailedAttempt(`ip:${clientIp}`)
      return json({ error: error.message || 'Error al actualizar credenciales de dispositivo' }, 500)
    }

    await clearDbRateLimit(`ip:${clientIp}`)
    await clearDbRateLimit(`device:${deviceId}`)
    return json({ ok: true, deviceId, email, password, reissued: true })
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
  const { data: orgData } = await supabase.from('organizations').select('id').limit(1).single()
  const orgId = orgData?.id

  if (!orgId) {
    return json({ error: 'No hay organizaciones creadas en la base de datos' }, 500)
  }

  // Insert into devices
  const { error: deviceErr } = await supabase.from('devices').insert({
    id: deviceId,
    auth_user_id: created.data.user.id,
    organization_id: orgId
  })

  // Insert into vehicles
  const { error: vehicleErr } = await supabase.from('vehicles').insert({
    id: deviceId, // We use the same ID for simplicity in auto-provisioning
    device_id: deviceId,
    name: 'Auto-Móvil ' + deviceId.substring(0, 4),
    organization_id: orgId,
    status: 'active'
  })

  if (deviceErr || vehicleErr) {
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
    return json({ error: 'error al insertar en devices/vehicles: ' + (deviceErr?.message || vehicleErr?.message) }, 500)
  }

  await clearDbRateLimit(`ip:${clientIp}`)
  await clearDbRateLimit(`device:${deviceId}`)
  await clearDbRateLimit(`code:${activationCode}`)
  return json({ ok: true, deviceId, email, password })
})