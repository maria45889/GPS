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
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        return { remote: false, error: new Error('No hay sesión activa') };
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://tu-proyecto.supabase.co'}/functions/v1/delete-device-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({ vehicle_id: vehicleId })
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responseData.error || 'Error al eliminar el vehículo y dispositivo de forma segura');
      }

      return { remote: true };
    } catch (error) {
      console.error('Error al invocar la función de eliminación segura:', error);
      return { remote: false, error };
    }
  });
};

