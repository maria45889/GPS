import { supabase } from './supabase';

export const updateVehicleStatus = async (vehicleId, status) => {
  if (!supabase) return { remote: false };

  const { error } = await supabase
    .from('vehicles')
    .update({ status, last_update: new Date().toISOString() })
    .eq('id', vehicleId);

  if (error) return { remote: false, error };
  return { remote: true };
};

export const sendVehicleCommand = async (vehicleId, command) => {
  if (!supabase) return { remote: false };

  const { error } = await supabase.from('vehicle_commands').insert({
    vehicle_id: vehicleId,
    command,
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  if (error) return { remote: false, error };
  return { remote: true };
};

export const deleteVehicle = async (vehicleId) => {
  if (!supabase) return { remote: false };

  const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
  if (error) return { remote: false, error };
  return { remote: true };
};
