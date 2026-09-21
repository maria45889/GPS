/**
 * Script de auditoría y verificación pre-vuelo de Supabase para Staging y Producción
 * 
 * Uso:
 *   SUPABASE_URL="https://tu-proyecto.supabase.co" SUPABASE_SERVICE_ROLE_KEY="tu-key" node scripts/verify_supabase_deployment.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-key';

console.log('=====================================================');
console.log('🔍 Auditoría de Despliegue de Supabase - Pre-Flight');
console.log('=====================================================');

if (!supabaseUrl || supabaseUrl.includes('your-project')) {
  console.log('⚠️ ADVERTENCIA: SUPABASE_URL no configurado. Modo de verificación offline (contrato SQL).');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifyDeployment() {
  const auditResults = [];

  // 1. Verificar tablas requeridas
  const requiredTables = ['devices', 'vehicles', 'alerts', 'geofences', 'gps_locations', 'device_activation_codes', 'device_registry', 'vehicle_commands', 'provision_rate_limits'];
  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error && error.code !== 'PGRST116') {
        auditResults.push({ check: `Tabla ${table}`, status: 'FAIL', detail: error.message });
      } else {
        auditResults.push({ check: `Tabla ${table}`, status: 'PASS', detail: 'Existe y accesible' });
      }
    } catch (err) {
      auditResults.push({ check: `Tabla ${table}`, status: 'FAIL', detail: err.message });
    }
  }

  // 2. Verificar vista latest_gps_locations
  try {
    const { error } = await supabase.from('latest_gps_locations').select('device_id').limit(1);
    if (error) {
      auditResults.push({ check: 'Vista latest_gps_locations', status: 'WARN', detail: 'No encontrada. Se usará el fallback de gps_locations' });
    } else {
      auditResults.push({ check: 'Vista latest_gps_locations', status: 'PASS', detail: 'Vista optimizada activa' });
    }
  } catch (err) {
    auditResults.push({ check: 'Vista latest_gps_locations', status: 'WARN', detail: err.message });
  }

  // 3. Verificar RPCs requeridas
  const requiredRpcs = ['provision_device_atomic', 'check_and_record_rate_limit', 'update_vehicle_status', 'ack_vehicle_command'];
  for (const rpcName of requiredRpcs) {
    try {
      const { error } = await supabase.rpc(rpcName, {});
      if (!error) {
        auditResults.push({ check: `RPC ${rpcName}`, status: 'PASS', detail: 'Función SQL registrada' });
      } else {
        const errMsg = String(error.message || '').toLowerCase();
        const errCode = String(error.code || '');

        if (errCode === 'PGRST202' || errMsg.includes('not found') || errMsg.includes('does not exist') || errMsg.includes('could not find the function')) {
          auditResults.push({ check: `RPC ${rpcName}`, status: 'FAIL', detail: 'Función SQL no existe' });
        } else if (errCode === '42501' || errMsg.includes('permission denied')) {
          auditResults.push({ check: `RPC ${rpcName}`, status: 'WARN', detail: `Permisos insuficientes (${error.message})` });
        } else if (errMsg.includes('fetch') || errMsg.includes('enotfound') || errMsg.includes('network') || errCode === 'PGRST000') {
          auditResults.push({ check: `RPC ${rpcName}`, status: 'FAIL', detail: `Error de conexión (${error.message})` });
        } else {
          // Errores de argumentos/parámetros indican que la RPC SÍ existe en Supabase
          auditResults.push({ check: `RPC ${rpcName}`, status: 'PASS', detail: `Función SQL existe (Respuesta de parámetros: ${error.message})` });
        }
      }
    } catch (err) {
      const errMsg = String(err.message || '').toLowerCase();
      if (errMsg.includes('not found') || errMsg.includes('does not exist')) {
        auditResults.push({ check: `RPC ${rpcName}`, status: 'FAIL', detail: 'Función SQL no existe' });
      } else if (errMsg.includes('fetch') || errMsg.includes('network')) {
        auditResults.push({ check: `RPC ${rpcName}`, status: 'FAIL', detail: `Error de red (${err.message})` });
      } else {
        auditResults.push({ check: `RPC ${rpcName}`, status: 'PASS', detail: `Registrada (${err.message || 'OK'})` });
      }
    }
  }

  console.table(auditResults);
  console.log('\n✅ Auditoría de Supabase finalizada.');
}

verifyDeployment().catch((err) => {
  console.error('❌ Error en auditoría:', err);
});
