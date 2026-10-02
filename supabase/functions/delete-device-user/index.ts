import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

// B4: ALLOWED_ORIGIN es obligatorio en producción. Si falta, el worker falla rápido.
const CORS_ORIGIN = Deno.env.get('ALLOWED_ORIGIN')
if (!CORS_ORIGIN) {
  throw new Error(
    '[delete-device-user] Variable de entorno ALLOWED_ORIGIN no configurada. ' +
    'Defina el secret antes de desplegar: supabase secrets set ALLOWED_ORIGIN=https://tu-dominio.com'
  )
}
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })

/**
 * Resuelve el vehicle_id de un device_id.
 *
 * device_registry es el puente device_id -> vehicle_id, pero puede no tener fila
 * (devices provisionados antes de que provision-device insertara ahí). La tabla
 * `vehicles` tiene la columna device_id y es la fuente autoritativa del vínculo,
 * así que se consulta como fallback. Sin esto, borrar un vehículo legacy fallaba
 * en silencio y el registro quedaba huérfano.
 *
 * Se filtra siempre por organization_id: un device de otra org nunca debe
 * revelar (ni devolver) el vehicle_id de otro tenant.
 */
async function resolveVehicleId(
  client: ReturnType<typeof createClient>,
  deviceId: string | null | undefined,
  organizationId: string | null | undefined
): Promise<string | null> {
  if (!deviceId) return null

  const { data: regData } = await client
    .from('device_registry')
    .select('vehicle_id')
    .eq('device_id', deviceId)
    .maybeSingle()

  if (regData?.vehicle_id) return regData.vehicle_id as string

  let query = client
    .from('vehicles')
    .select('id')
    .eq('device_id', deviceId)

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  const { data: vehicleData } = await query.limit(1).maybeSingle()

  return (vehicleData?.id as string | undefined) ?? null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  // Autenticación: Verificar JWT administrativo u operador
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  
  if (authError || !user) {
    return json({ error: 'Unauthorized' }, 401)
  }

  // Verificar que el llamador sea un admin
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, organization_id')
    .eq('user_id', user.id)
    .single()
    
  if (profile?.role !== 'admin' && profile?.role !== 'owner') {
    return json({ error: 'Forbidden: Requires admin role' }, 403)
  }

  let body: { auth_user_id?: string, vehicle_id?: string, device_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { auth_user_id, vehicle_id, device_id } = body
  if (!auth_user_id && !vehicle_id && !device_id) {
    return json({ error: 'auth_user_id, vehicle_id or device_id is required' }, 400)
  }

  let targetAuthUserId: string | null = auth_user_id ?? null
  let targetDeviceId: string | null = device_id ?? null
  let resolvedVehicleId: string | null = vehicle_id ?? null

  // --- Resolver identificadores faltantes ---

  if (vehicle_id) {
    // Caso A: se recibió vehicle_id — derivar device_id desde vehicles
    const { data: vehicleData, error: vehicleError } = await supabaseAdmin
      .from('vehicles')
      .select('device_id')
      .eq('id', vehicle_id)
      .single()

    if (vehicleError || !vehicleData) {
      return json({ error: 'Vehicle not found or could not read device' }, 404)
    }
    targetDeviceId = vehicleData.device_id

    // Verificar organización del dispositivo si existe
    if (targetDeviceId) {
      const { data: deviceData, error: deviceError } = await supabaseAdmin
        .from('devices')
        .select('auth_user_id, organization_id')
        .eq('id', targetDeviceId)
        .maybeSingle()

      if (deviceError) {
        return json({ error: 'Could not fetch device details' }, 500)
      }
      if (!deviceData) {
        return json({ error: 'Device not found' }, 404)
      }
      if (deviceData.organization_id !== profile?.organization_id) {
        return json({ error: 'Forbidden: Device organization mismatch' }, 403)
      }
      // Resolver auth_user_id solo si no fue enviado en el body
      if (!targetAuthUserId && deviceData) {
        targetAuthUserId = deviceData.auth_user_id
      }
    }
  }

  if (auth_user_id && !vehicle_id) {
    // Caso B: solo se recibió auth_user_id — resolver vehicle_id y device_id
    const { data: deviceData, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('organization_id, id')
      .eq('auth_user_id', auth_user_id)
      .maybeSingle()

    if (deviceError) {
      return json({ error: 'Could not fetch device details to verify organization' }, 500)
    }
    if (!deviceData) {
      return json({ error: 'Device not found' }, 404)
    }
    if (deviceData.organization_id !== profile?.organization_id) {
      return json({ error: 'Forbidden: Device organization mismatch' }, 403)
    }
    targetDeviceId = deviceData?.id ?? null

    // C3: Buscar vehicle_id. device_registry es el puente primario, pero puede no
    // tener fila (devices provisionados antes de que provision-device la insertara).
    // vehicles.device_id es la fuente autoritativa del vinculo, asi que se usa de
    // fallback: sin esto el vehiculo queda huerfano para siempre.
    resolvedVehicleId = await resolveVehicleId(supabaseAdmin, targetDeviceId, profile?.organization_id)
  }

  if (device_id && !vehicle_id && !auth_user_id) {
    const { data: deviceData, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('organization_id, auth_user_id')
      .eq('id', device_id)
      .maybeSingle()

    if (deviceError) {
      return json({ error: 'Could not fetch device details to verify organization' }, 500)
    }
    if (!deviceData) {
      return json({ error: 'Device not found' }, 404)
    }
    if (deviceData.organization_id !== profile?.organization_id) {
      return json({ error: 'Forbidden: Device organization mismatch' }, 403)
    }
    if (!targetAuthUserId && deviceData) targetAuthUserId = deviceData.auth_user_id;

    // Buscar si tiene un vehículo asociado (mismo helper que en el bloque de device_id)
    resolvedVehicleId = await resolveVehicleId(supabaseAdmin, device_id, profile?.organization_id)
  }

  // B2/B5b: Si el llamador envió MÚLTIPLES identificadores, verificar que apunten al MISMO dispositivo.
  // Sin esta validación, podría eliminarse el usuario de B mientras se borra el vehículo de A.
  
  if (targetDeviceId && targetAuthUserId) {
    const { data: deviceByAuth } = await supabaseAdmin
      .from('devices')
      .select('id')
      .eq('auth_user_id', targetAuthUserId)
      .single()
      
    if (!deviceByAuth || deviceByAuth.id !== targetDeviceId) {
       return json({ error: 'Conflicto: device_id y auth_user_id no corresponden al mismo dispositivo' }, 409)
    }
  }
  
  if (targetDeviceId && resolvedVehicleId) {
    const { data: vehicleData } = await supabaseAdmin
      .from('vehicles')
      .select('device_id')
      .eq('id', resolvedVehicleId)
      .single()
      
    if (!vehicleData || vehicleData.device_id !== targetDeviceId) {
       return json({ error: 'Conflicto: vehicle_id y device_id no corresponden al mismo dispositivo' }, 409)
    }
  }

  // B3: Permitir eliminar vehículo aunque no exista auth_user_id (dispositivo desconectado/no provisionado).
  // El bloqueo anterior que retornaba 400 aquí impedía eliminar vehículos sin usuario Auth.
  // Si no hay targetAuthUserId simplemente omitimos el paso de Auth.admin.deleteUser.

  // Marcar el dispositivo como pendiente de eliminación ANTES de tocar Auth.
  // Si la cascada SQL falla, el flag permite reintentar la operación de forma idempotente.
  if (targetDeviceId) {
    const { error: flagErr } = await supabaseAdmin
      .from('devices')
      .update({ deletion_pending: true })
      .eq('id', targetDeviceId)
    if (flagErr) {
      console.warn('Could not set deletion_pending flag (non-fatal):', flagErr)
    }
  } else if (targetAuthUserId) {
    const { error: flagErr } = await supabaseAdmin
      .from('devices')
      .update({ deletion_pending: true })
      .eq('auth_user_id', targetAuthUserId)
    if (flagErr) {
      console.warn('Could not set deletion_pending flag (non-fatal):', flagErr)
    }
  }

  // 1. Eliminar de Auth (solo si existe targetAuthUserId)
  if (targetAuthUserId) {
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetAuthUserId)
    if (deleteError) {
      // Ignorar error si el usuario ya no existe en Auth (404 Not Found)
      if (deleteError.status === 404 || (deleteError.message && deleteError.message.toLowerCase().includes('not found'))) {
        console.warn(`User ${targetAuthUserId} already deleted or not found in Auth, continuing...`)
      } else {
        console.error(`Error deleting user ${targetAuthUserId}:`, deleteError)
        return json({ error: 'Failed to delete auth user, aborting vehicle deletion' }, 500)
      }
    }
  }

  // 2. Ejecutar la cascada en la base de datos
  // delete_vehicle_cascade usa security definer y es accesible con el JWT de admin (authenticated).
  if (resolvedVehicleId) {
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: rpcData, error: rpcError } = await supabaseUserClient.rpc('delete_vehicle_cascade', {
      p_vehicle_id: resolvedVehicleId
    })

    if (rpcError || (rpcData && rpcData.success === false)) {
      console.error('Vehicle deletion failed, but Auth user was deleted', rpcError || rpcData)
      return json({ 
        success: false, 
        error: rpcError?.message || rpcData?.error || 'Auth deleted, but failed to delete vehicle',
        warning: 'Device is permanently disconnected but vehicle record remains.'
      }, 500)
    }

    if (targetDeviceId) {
      await supabaseAdmin.from('devices').update({ deletion_pending: false, status: 'inactive', auth_user_id: null }).eq('id', targetDeviceId)
      await supabaseAdmin.from('device_registry').delete().eq('device_id', targetDeviceId)
    }
  } else if (targetDeviceId && !resolvedVehicleId) {
    // B3: No hay vehículo — limpiar solo el registro del dispositivo.
    await supabaseAdmin
      .from('devices')
      .update({ status: 'inactive', auth_user_id: null, deletion_pending: false })
      .eq('id', targetDeviceId)
  }

  // B7: Intentar revocar sesiones globales. Si falla, loguear pero NO retornar éxito parcial silencioso.
  if (targetAuthUserId) {
    const { error: signOutErr } = await supabaseAdmin.auth.admin.signOut(targetAuthUserId, 'global')
    if (signOutErr) {
      // La sesión puede haber expirado o el usuario ya fue eliminado — no fatal,
      // pero se registra para auditoría. La eliminación Auth ya revocó el acceso permanentemente.
      console.warn(`signOut global para ${targetAuthUserId} falló (no fatal — Auth ya fue eliminado):`, signOutErr)
    }
  }

  return json({ success: true, message: 'Vehicle and user deleted successfully' })
})
