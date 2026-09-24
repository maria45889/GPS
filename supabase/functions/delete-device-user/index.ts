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
        .single()

      if (deviceError) {
        return json({ error: 'Could not fetch device details' }, 500)
      }
      if (deviceData.organization_id !== profile?.organization_id) {
        return json({ error: 'Forbidden: Device organization mismatch' }, 403)
      }
      // Resolver auth_user_id solo si no fue enviado en el body
      if (!targetAuthUserId) {
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
      .single()

    if (deviceError) {
      return json({ error: 'Could not fetch device details to verify organization' }, 500)
    }
    if (deviceData.organization_id !== profile?.organization_id) {
      return json({ error: 'Forbidden: Device organization mismatch' }, 403)
    }
    targetDeviceId = deviceData.id

    // C3: Buscar vehicle_id en device_registry (devices NO tiene vehicle_id)
    const { data: regData } = await supabaseAdmin
      .from('device_registry')
      .select('vehicle_id')
      .eq('device_id', targetDeviceId)
      .single()

    resolvedVehicleId = regData?.vehicle_id ?? null
  }

  if (device_id && !vehicle_id && !auth_user_id) {
    const { data: deviceData, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('organization_id, auth_user_id')
      .eq('id', device_id)
      .single()

    if (deviceError) {
      return json({ error: 'Could not fetch device details to verify organization' }, 500)
    }
    if (deviceData.organization_id !== profile?.organization_id) {
      return json({ error: 'Forbidden: Device organization mismatch' }, 403)
    }
    if (!targetAuthUserId) targetAuthUserId = deviceData.auth_user_id;

    // Buscar si tiene un vehículo asociado
    const { data: regData } = await supabaseAdmin
      .from('device_registry')
      .select('vehicle_id')
      .eq('device_id', device_id)
      .single()

    resolvedVehicleId = regData?.vehicle_id ?? null
  }

  // B2: Si el llamador envió AMBOS identificadores, verificar que apunten al MISMO dispositivo.
  // Sin esta validación, podría eliminarse el usuario de B mientras se borra el vehículo de A.
  if (auth_user_id && vehicle_id) {
    // Obtener el device_id del vehículo para cruzar con el del usuario
    const { data: vehicleData } = await supabaseAdmin
      .from('vehicles')
      .select('device_id')
      .eq('id', vehicle_id)
      .single()

    const { data: deviceByAuth } = await supabaseAdmin
      .from('devices')
      .select('id, organization_id')
      .eq('auth_user_id', auth_user_id)
      .single()

    if (!vehicleData || !deviceByAuth) {
      return json({ error: 'No se pudo verificar la correspondencia de identificadores' }, 404)
    }
    if (vehicleData.device_id !== deviceByAuth.id) {
      // B2: Los dos identificadores apuntan a dispositivos distintos — rechazar.
      return json({ error: 'Conflicto: vehicle_id y auth_user_id no corresponden al mismo dispositivo' }, 409)
    }
    if (deviceByAuth.organization_id !== profile?.organization_id) {
      return json({ error: 'Forbidden: Device organization mismatch' }, 403)
    }
    targetDeviceId = deviceByAuth.id
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
      console.error(`Error deleting user ${targetAuthUserId}:`, deleteError)
      return json({ error: 'Failed to delete auth user, aborting vehicle deletion' }, 500)
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
