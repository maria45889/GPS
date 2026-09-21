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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-provision-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
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

function recordFailedAttempt(key: string) {
  const now = Date.now()
  const record = attemptStore.get(key)
  if (!record || now > record.expiresAt) {
    attemptStore.set(key, { count: 1, expiresAt: now + ATTEMPT_WINDOW_MS })
  } else {
    record.count += 1
  }
}

async function checkDbRateLimit(key: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_and_record_rate_limit', {
      p_key: key,
      p_max_attempts: MAX_FAILED_ATTEMPTS,
      p_window_seconds: 900,
    })
    if (!error && typeof data === 'boolean') {
      return data
    }
  } catch {
    // Fallback si RPC no está desplegado aún
  }
  return checkRateLimit(key)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown-ip'

  // Validación de secreto administrativo (si se incluye header x-provision-secret debe coincidir)
  const expectedSecret = Deno.env.get('PROVISION_SECRET')
  const providedSecret = req.headers.get('x-provision-secret')
  if (expectedSecret && providedSecret && providedSecret !== expectedSecret) {
    recordFailedAttempt(`ip:${clientIp}`)
    return json({ error: 'no autorizado: secreto de aprovisionamiento invalido' }, 403)
  }


  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'json invalido' }, 400)
  }

  const activationCode = String(body.activationCode || body.activation_code || '').trim()
  if (!activationCode) {
    recordFailedAttempt(`ip:${clientIp}`)
    return json({ error: 'codigo de activacion es obligatorio' }, 400)
  }

  const rawDeviceId = String(body.deviceId ?? '').trim()
  const deviceId = rawDeviceId.slice(0, 64)
  if (!deviceId || !/^[a-zA-Z0-9_-]+$/.test(deviceId)) {
    recordFailedAttempt(`ip:${clientIp}`)
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
    // Si el dispositivo ya está registrado, SOLO se permite re-aprovisionar con un código de activación NUEVO y VÁLIDO.
    const { data: validCode, error: codeErr } = await supabase
      .from('device_activation_codes')
      .select('id, organization_id, vehicle_id, expires_at')
      .eq('code', activationCode)
      .eq('used', false)
      .maybeSingle()

    const isExpired = validCode?.expires_at ? new Date(validCode.expires_at).getTime() <= Date.now() : false

    if (codeErr || !validCode || isExpired) {
      recordFailedAttempt(`ip:${clientIp}`)
      recordFailedAttempt(`device:${deviceId}`)
      recordFailedAttempt(`code:${activationCode}`)
      return json({ error: 'dispositivo ya registrado. requiere un codigo de activacion nuevo y valido para restablecer credenciales' }, 403)
    }

    let authUserId = deviceExisting.data?.auth_user_id
    if (authUserId) {
      const updated = await supabase.auth.admin.updateUserById(authUserId, { password })
      if (updated.error) return json({ error: updated.error.message }, 500)
    } else {
      const created = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role: 'device', device_id: deviceId },
      })
      if (created.error) return json({ error: created.error.message }, 500)
      authUserId = created.data.user.id
    }

    const { data: rpcRes, error: rpcErr } = await supabase.rpc('provision_device_atomic', {
      p_device_id: deviceId,
      p_activation_code: activationCode,
      p_auth_user_id: authUserId,
    })

    if (rpcErr || !rpcRes?.success) {
      recordFailedAttempt(`ip:${clientIp}`)
      return json({ error: rpcErr?.message || rpcRes?.error || 'error al re-aprovisionar dispositivo' }, 403)
    }

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
    recordFailedAttempt(`ip:${clientIp}`)
    return json({ error: created.error.message }, 500)
  }

  const { data: rpcRes, error: rpcErr } = await supabase.rpc('provision_device_atomic', {
    p_device_id: deviceId,
    p_activation_code: activationCode,
    p_auth_user_id: created.data.user.id,
  })

  if (rpcErr || !rpcRes?.success) {
    recordFailedAttempt(`ip:${clientIp}`)
    recordFailedAttempt(`device:${deviceId}`)
    recordFailedAttempt(`code:${activationCode}`)
    if (created.data?.user?.id) {
      await supabase.auth.admin.deleteUser(created.data.user.id)
    }
    return json({ error: rpcErr?.message || rpcRes?.error || 'error al aprovisionar dispositivo' }, 403)
  }

  return json({ ok: true, deviceId, email, password })
})