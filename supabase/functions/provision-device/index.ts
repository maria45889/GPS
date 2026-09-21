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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  // Validación de autorización: secreto de aprovisionamiento u obligatoriedad de código de activación
  const expectedSecret = Deno.env.get('PROVISION_SECRET')
  const providedSecret = req.headers.get('x-provision-secret')
  if (expectedSecret && providedSecret !== expectedSecret) {
    return json({ error: 'no autorizado: secreto invalido o ausente' }, 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'json invalido' }, 400)
  }

  // Punto 5 & 14: Código de activación obligatorio para asociar organización y vehículo
  const activationCode = String(body.activationCode || body.activation_code || '').trim()
  if (!activationCode) {
    return json({ error: 'codigo de activacion es obligatorio' }, 400)
  }

  // Validación estricta del deviceId: solo caracteres alfanuméricos, guiones y guiones bajos, máx 64 chars
  const rawDeviceId = String(body.deviceId ?? '').trim()
  const deviceId = rawDeviceId.slice(0, 64)
  if (!deviceId || !/^[a-zA-Z0-9_-]+$/.test(deviceId)) {
    return json({ error: 'deviceId invalido' }, 400)
  }

  // Rate limiting y verificación de registro previo
  const existing = await supabase
    .from('device_registry')
    .select('device_id')
    .eq('device_id', deviceId)
    .maybeSingle()

  if (existing.error) return json({ error: existing.error.message }, 500)
  if (existing.data) return json({ alreadyRegistered: true, deviceId })

  const deviceExisting = await supabase
    .from('devices')
    .select('auth_user_id')
    .eq('id', deviceId)
    .maybeSingle()

  if (deviceExisting.error) return json({ error: deviceExisting.error.message }, 500)
  if (deviceExisting.data?.auth_user_id) {
    return json({ alreadyRegistered: true, deviceId })
  }

  const email = `device-${deviceId}@local.rideguard`
  const password = randomPassword()

  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'device', device_id: deviceId },
  })
  if (created.error) return json({ error: created.error.message }, 500)

  // Invocación atómica RPC obligatoria para aprovisionar dispositivo y asociar organización y vehículo
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('provision_device_atomic', {
    p_device_id: deviceId,
    p_activation_code: activationCode,
    p_auth_user_id: created.data.user.id,
  })

  if (rpcErr || !rpcRes?.success) {
    if (created.data?.user?.id) {
      await supabase.auth.admin.deleteUser(created.data.user.id)
    }
    return json({ error: rpcErr?.message || rpcRes?.error || 'error al aprovisionar dispositivo' }, 403)
  }

  return json({ ok: true, deviceId, email, password })
})