import { supabase } from './supabase';

export const updateVehicleStatus = async (vehicleId, status) => {
  if (!supabase) return { remote: false };

  const { data, error } = await supabase
    .from('vehicles')
    .update({ status, last_update: new Date().toISOString() })
    .eq('id', vehicleId)
    .select('id');

  if (error) return { remote: false, error };
  if (!data || data.length === 0) return { remote: false, error: new Error('Ninguna fila afectada') };
  return { remote: true };
};

export const sendVehicleCommand = async (vehicleId, command, deviceId = null) => {
  if (!supabase) return { remote: false };

  const { data, error } = await supabase
    .from('vehicle_commands')
    .insert({
      vehicle_id: vehicleId,
      device_id: deviceId,
      command,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
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
