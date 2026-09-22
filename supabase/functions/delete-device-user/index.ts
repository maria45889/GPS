import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

  let body: { auth_user_id?: string, vehicle_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { auth_user_id, vehicle_id } = body
  if (!auth_user_id && !vehicle_id) {
    return json({ error: 'auth_user_id or vehicle_id is required' }, 400)
  }

  let targetAuthUserId = auth_user_id;

  // Si se provee vehicle_id, realizamos la eliminación en cascada de forma atómica
  if (vehicle_id) {
    // Usar el token del usuario para respetar RLS y permisos en la RPC
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: rpcData, error: rpcError } = await supabaseUserClient.rpc('delete_vehicle_cascade', {
      p_vehicle_id: vehicle_id
    })

    if (rpcError || (rpcData && rpcData.success === false)) {
      return json({ error: rpcError?.message || rpcData?.error || 'Failed to delete vehicle' }, 400)
    }
    
    if (rpcData && rpcData.auth_user_id) {
      targetAuthUserId = rpcData.auth_user_id;
    } else {
      return json({ success: true, message: `Vehicle deleted, no auth user to revoke` })
    }
  }

  if (!targetAuthUserId) {
    return json({ error: 'auth_user_id not resolved' }, 400)
  }

  // Verificar que el objetivo pertenece a la misma organización que el administrador
  const { data: deviceData } = await supabaseAdmin
    .from('devices')
    .select('organization_id')
    .eq('auth_user_id', targetAuthUserId)
    .single()

  if (deviceData && deviceData.organization_id !== profile?.organization_id) {
    return json({ error: 'Forbidden: Device organization mismatch' }, 403)
  }

  // Verificar que el objetivo es un dispositivo
  const { data: targetUser, error: targetError } = await supabaseAdmin.auth.admin.getUserById(targetAuthUserId)
  if (targetError || !targetUser?.user) {
    return json({ error: 'Target user not found' }, 404)
  }

  const role = targetUser.user.app_metadata?.role
  if (role !== 'device') {
    return json({ error: 'Cannot delete non-device users via this function' }, 403)
  }

  // Eliminar físicamente el usuario de Auth (esto revoca todas las sesiones y JWTs inmediatamente)
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetAuthUserId)
  
  if (deleteError) {
    console.error(`Error deleting user ${targetAuthUserId}:`, deleteError)
    return json({ error: 'Failed to delete user' }, 500)
  }

  return json({ success: true, message: `Vehicle and user deleted successfully` })
})
