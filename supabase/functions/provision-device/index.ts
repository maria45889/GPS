// Edge Function de Supabase: provision-device
// Crea la cuenta Auth de un dispositivo, la asocia en devices.auth_user_id
// y devuelve al APK las credenciales para que el dispositivo pueda entrar
// a su panel ("login por dispositivo").
//
// Se genera la cuenta una sola vez usando deviceId como identidad. Si el
// dispositivo ya fue aprovisionado, responde already_registered y no
// reemite el password.
//
// Requiere el rol service_role (la funcion corre dentro de Supabase y usa
// SUPABASE_SERVICE_ROLE_KEY, nunca la anon key).
//
// Despliegue:
//   cd supabase && supabase functions deploy provision-device
//
// Llamada desde el APK (una sola vez en la instalacion):
//   POST https://<ref>.supabase.co/functions/v1/provision-device
//   headers: { authorization: 'Bearer <VITE_SUPABASE_ANON_KEY>',
//              'apikey': '<VITE_SUPABASE_ANON_KEY>',
//              'Content-Type': 'application/json' }
//   body: { "deviceId": "c8f2-ab31...", "platform": "android",
//           "model": "MotoG 24", "app_version": "1.2.0", "battery": 87 }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
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
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } })
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'json invalido' }, 400)
  }

  const deviceId = String(body.deviceId ?? '').trim().slice(0, 64)
  if (!deviceId) return json({ error: 'deviceId requerido' }, 400)

  const existing = await supabase
    .from('devices')
    .select('auth_user_id')
    .eq('id', deviceId)
    .maybeSingle()

  if (existing.error) return json({ error: existing.error.message }, 500)
  if (existing.data?.auth_user_id) {
    return json({ alreadyRegistered: true, deviceId })
  }

  const email = `device-${deviceId}@local.rideguard`
  const password = randomPassword()

  const created = await supabase.auth.admin.createUser({
    email,
    password,
    emailConfirm: true,
    userMetadata: { role: 'device', device_id: deviceId },
  })
  if (created.error) return json({ error: created.error.message }, 500)

  const upsert = await supabase
    .from('devices')
    .upsert(
      {
        id: deviceId,
        auth_user_id: created.data.user.id,
        status: 'active',
        platform: String(body.platform ?? 'android').slice(0, 40) || null,
        model: String(body.model ?? '').slice(0, 80) || null,
        app_version: String(body.app_version ?? '').slice(0, 20) || null,
        battery: typeof body.battery === 'number' ? body.battery : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

  if (upsert.error) return json({ error: upsert.error.message }, 500)

  return json({ ok: true, deviceId, email, password })
})