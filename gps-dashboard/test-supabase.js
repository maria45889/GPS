import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qhcozmhixcxcmthivxmt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-cDV8NnBmn2M8NgLRSMqJA__t_l0J1J';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDatabase() {
  console.log('--- VERIFICANDO CONEXIÓN A SUPABASE ---');
  console.log('URL:', SUPABASE_URL);

  const { data, error } = await supabase.from('gps_locations').select('id').limit(1);

  if (error) {
    if (error.code === '42P01' || error.message.includes('Could not find the table')) {
      console.error('❌ La tabla gps_locations NO EXISTE. ¡Debes ejecutar supabase_setup.sql en el SQL Editor de Supabase!');
    } else {
      console.log('✅ La conexión funciona, pero ocurrió un error de permisos (esperado para usuario anónimo):', error.message);
      console.log('👉 Esto significa que el SQL ya se ejecutó y las políticas de seguridad están activas.');
    }
  } else {
    console.log('✅ Conexión exitosa y la tabla gps_locations existe. Datos:', data);
  }
}
checkDatabase();
