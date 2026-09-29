import { supabase, withAuthRetry } from './supabase';


export const deleteVehicle = async (entityId, kind = 'vehicle') => {
  if (!supabase) return { remote: false };

  return withAuthRetry(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        return { remote: false, error: new Error('No hay sesión activa') };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Configuración de Supabase URL no encontrada');
      }
      const isDevice = kind === 'device';
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-device-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify(isDevice ? { device_id: entityId } : { vehicle_id: entityId })
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        // B13: Preservar el código HTTP en el error para que withAuthRetry
        // pueda detectar 401 y renovar el token correctamente.
        const err = new Error(responseData.error || 'Error al eliminar el vehículo y dispositivo de forma segura')
        err.status = response.status
        throw err
      }

      return { remote: true };
    } catch (error) {
      console.error('Error al invocar la función de eliminación segura:', error);
      return { remote: false, error };
    }
  });
};

export const updateEntity = async (entityId, category, updates) => {
  if (!supabase) return { remote: false };

  return withAuthRetry(async () => {
    const table = category === 'vehicles' ? 'vehicles' : 'devices';
    const { error } = await supabase.from(table).update(updates).eq('id', entityId);

    if (error) return { remote: false, error };
    return { remote: true };
  });
};
