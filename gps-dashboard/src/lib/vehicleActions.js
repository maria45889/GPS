import { supabase, withAuthRetry } from './supabase';

export const updateVehicleStatus = async (vehicleId, status) => {
  if (!supabase) return { remote: false };

  return withAuthRetry(async () => {
    const { error } = await supabase.rpc('update_vehicle_status', {
      p_vehicle_id: vehicleId,
      p_status: status,
    });

    if (error) return { remote: false, error };
    return { remote: true };
  });
};

export const sendVehicleCommand = async (vehicleId, command, deviceId = null) => {
  if (!deviceId) {
    return { remote: false, error: new Error('El vehículo no posee un dispositivo GPS asignado') };
  }
  if (!supabase) return { remote: false };

  return withAuthRetry(async () => {
    let organizationId = null;
    try {
      const { data: userResp } = await supabase.auth.getUser();
      if (userResp?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('user_id', userResp.user.id)
          .maybeSingle();
        if (profile?.organization_id) {
          organizationId = profile.organization_id;
        }
      }
    } catch {
      // Ignorar si no se puede consultar perfil
    }

    const payload = {
      vehicle_id: vehicleId,
      device_id: deviceId,
      command,
      status: 'pending',
      created_at: new Date().toISOString(),
      ...(organizationId ? { organization_id: organizationId } : {}),
    };

    const { data, error } = await supabase
      .from('vehicle_commands')
      .insert(payload)
      .select('id');

    if (error) return { remote: false, error };
    if (!data || data.length === 0) return { remote: false, error: new Error('Comando no registrado') };
    return { remote: true, commandId: data[0].id };
  });
};

export const deleteVehicle = async (vehicleId) => {
  if (!supabase) return { remote: false };

  return withAuthRetry(async () => {
    const { data, error } = await supabase.rpc('delete_vehicle_cascade', {
      p_vehicle_id: vehicleId,
    });

    if (error) {
      // Fallback a eliminación directa si la RPC aún no está desplegada
      const { error: delError } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId)
        .select('id');
      if (delError) return { remote: false, error: delError };
      return { remote: true };
    }

    if (data && data.success === false) {
      return { remote: false, error: new Error(data.error || 'No se pudo eliminar el vehículo') };
    }

    return { remote: true, deviceId: data?.device_id };
  });
};

