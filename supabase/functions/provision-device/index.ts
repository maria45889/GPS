// Edge Function de Supabase: provision-device
// Crea la cuenta Auth de un dispositivo, la asocia en devices.auth_user_id
// y devuelve al APK las credenciales para que el dispositivo pueda entrar
// a su panel ("login por dispositivo").
//
// Requiere el rol service_role (la funcion corre dentro de Supabase y usa
// SUPABASE_SERVICE_ROLE_KEY, nunca la anon key).
//
// Seguridad:
//   - Valida encabezado x-provision-secret (configurar en Supabase con
//     supabase secrets set PROVISION_SECRET=<valor>).
//   - Rate limiting: si el deviceId ya existe en device_registry, devuelve
//     alreadyRegistered sin crear usuario.
//   - Validacion estricta del deviceId (alfanumerico, guiones, max 64 chars).
//   - Si upsert a devices falla despues de crear el usuario Auth, elimina
//     el usuario para evitar cuentas huerfanas.
//
// Despliegue:
//   cd supabase && supabase functions deploy provision-device
//
// Llamada desde el APK (una sola vez en la instalacion):
//   POST https://<ref>.supabase.co/functions/v1/provision-device
//   headers: { authorization: 'Bearer <VITE_SUPABASE_ANON_KEY>',
//              'apikey': '<VITE_SUPABASE_ANON_KEY>',
//              'x-provision-secret': '<PROVISION_SECRET>',
//              'Content-Type': 'application/json' }
//   body: { "deviceId": "c8f2-ab31...", "platform": "android",
//           "model": "MotoG 24", "app_version": "1.2.0", "battery": 87 }

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

  // Validación de autorización: encabezado x-provision-secret
  const expectedSecret = Deno.env.get('PROVISION_SECRET')
  const providedSecret = req.headers.get('x-provision-secret')
  if (expectedSecret && providedSecret !== expectedSecret) {
    return json({ error: 'no autorizado' }, 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'json invalido' }, 400)
  }

  // Validación estricta del deviceId: solo caracteres alfanuméricos, guiones y guiones bajos, máx 64 chars
  const rawDeviceId = String(body.deviceId ?? '').trim()
  const deviceId = rawDeviceId.slice(0, 64)
  if (!deviceId || !/^[a-zA-Z0-9_-]+$/.test(deviceId)) {
    return json({ error: 'deviceId invalido' }, 400)
  }

  // Rate limiting simple: verificar que el dispositivo no esté ya registrado en device_registry
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

  if (upsert.error) {
    // Limpieza: elimina la cuenta Auth si el registro en devices falla
    if (created.data?.user?.id) {
      await supabase.auth.admin.deleteUser(created.data.user.id)
    }
    return json({ error: upsert.error.message }, 500)
  }

  return json({ ok: true, deviceId, email, password })
})