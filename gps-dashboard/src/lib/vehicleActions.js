import { supabase } from './supabase';

export const updateVehicleStatus = async (vehicleId, status) => {
  if (!supabase) return { remote: false };

  const { error } = await supabase.rpc('update_vehicle_status', {
    p_vehicle_id: vehicleId,
    p_status: status,
  });

  if (error) return { remote: false, error };
  return { remote: true };
};

export const sendVehicleCommand = async (vehicleId, command, deviceId = null) => {
  if (!deviceId) {
    return { remote: false, error: new Error('El vehículo no posee un dispositivo GPS asignado') };
  }
  if (!supabase) return { remote: false };

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
  return { remote: true };
};

export const deleteVehicle = async (vehicleId) => {
  if (!supabase) return { remote: false };

  const { data, error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', vehicleId)
    .select('id');

  if (error) return { remote: false, error };
  if (!data || data.length === 0) return { remote: false, error: new Error('Ninguna fila afectada') };
  return { remote: true };
};
