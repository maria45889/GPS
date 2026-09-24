import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env manually to avoid dotenv
const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) acc[key.trim()] = value.join('=').trim();
  return acc;
}, {});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Iniciando sesión...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'JC.12345@gmail.com',
    password: '123456789'
  });

  if (error) {
    console.error('Error de login:', error.message);
    return;
  }

  console.log('Login exitoso. User ID:', data.user.id);
  
  console.log('Verificando perfil...');
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', data.user.id)
    .maybeSingle();
    
  if (profErr) {
    console.error('Error al consultar perfil:', profErr.message);
  } else if (!profile) {
    console.error('PERFIL NO ENCONTRADO. El usuario no tiene perfil de operador asignado.');
  } else {
    console.log('PERFIL ENCONTRADO:', profile);
  }
}

check();
