/**
 * Simulador de ubicaciones GPS para pruebas
 * Se auto-registra como dispositivo simulado y envía ubicaciones
 * en un recorrido por la ciudad.
 *
 * Uso: node src/simulator.js [nombre_del_dispositivo]
 */

const http = require('http');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const INTERVAL_MS = 5000;

// Varias rutas para simular distintos tipos de movimiento
const routes = {
  'quito-centro': [
    { lat: -0.2200, lng: -78.5120 }, { lat: -0.2210, lng: -78.5115 },
    { lat: -0.2220, lng: -78.5120 }, { lat: -0.2230, lng: -78.5130 },
    { lat: -0.2240, lng: -78.5140 }, { lat: -0.2250, lng: -78.5150 },
    { lat: -0.2260, lng: -78.5160 }, { lat: -0.2270, lng: -78.5170 },
    { lat: -0.2260, lng: -78.5180 }, { lat: -0.2250, lng: -78.5190 },
    { lat: -0.2240, lng: -78.5200 }, { lat: -0.2230, lng: -78.5190 },
  ],
  'new-york': [
    { lat: 40.7484, lng: -73.9856 }, { lat: 40.7490, lng: -73.9865 },
    { lat: 40.7500, lng: -73.9870 }, { lat: 40.7510, lng: -73.9860 },
    { lat: 40.7520, lng: -73.9850 }, { lat: 40.7530, lng: -73.9840 },
    { lat: 40.7540, lng: -73.9830 }, { lat: 40.7550, lng: -73.9840 },
    { lat: 40.7540, lng: -73.9850 }, { lat: 40.7530, lng: -73.9860 },
    { lat: 40.7520, lng: -73.9870 }, { lat: 40.7510, lng: -73.9865 },
  ],
  'madrid': [
    { lat: 40.4168, lng: -3.7038 }, { lat: 40.4175, lng: -3.7045 },
    { lat: 40.4185, lng: -3.7050 }, { lat: 40.4195, lng: -3.7040 },
    { lat: 40.4205, lng: -3.7030 }, { lat: 40.4215, lng: -3.7020 },
    { lat: 40.4205, lng: -3.7010 }, { lat: 40.4195, lng: -3.7020 },
    { lat: 40.4185, lng: -3.7030 }, { lat: 40.4175, lng: -3.7035 },
  ],
};

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['X-Device-Token'] = token;
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve(body); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function registerDevice(name) {
  console.log(`Registrando dispositivo simulado: "${name}"...`);
  const result = await apiRequest('POST', '/api/devices/register', { name });
  if (result.token) {
    console.log(`✅ Registrado con ID=${result.id}, Token=${result.token}`);
    return result.token;
  }
  console.error('❌ No se pudo registrar. ¿Está el servidor corriendo?');
  process.exit(1);
}

let currentIndex = 0;
let battery = 80;
let isRunning = false;
let routeName = 'quito-centro';
let route = routes[routeName];

function sendLocation(lat, lng, token) {
  const data = {
    latitude: lat,
    longitude: lng,
    accuracy: Math.floor(Math.random() * 15) + 3,
    altitude: routeName === 'quito-centro' ? 2800 + Math.floor(Math.random() * 50) : undefined,
    speed: Math.random() * 8,
    battery: Math.round(battery),
  };

  return apiRequest('POST', '/api/location', data, token).then(result => {
    const status = result?.status || 'ok';
    console.log(`[${new Date().toLocaleTimeString()}] ${lat.toFixed(4)}, ${lng.toFixed(4)} → ${status}`);
    return true;
  }).catch(err => {
    console.error(`[${new Date().toLocaleTimeString()}] Error: ${err.message}`);
    return false;
  });
}

function getNextLocation() {
  const point = route[currentIndex];
  currentIndex = (currentIndex + 1) % route.length;
  const variation = 0.00008;
  return {
    lat: point.lat + (Math.random() - 0.5) * variation,
    lng: point.lng + (Math.random() - 0.5) * variation,
  };
}

function updateBattery() {
  battery = Math.max(5, battery - 0.2);
  if (battery < 20 && Math.random() < 0.01) battery = 80;
}

async function startSimulation(token, deviceName) {
  if (isRunning) {
    console.log('La simulación ya está corriendo');
    return;
  }

  isRunning = true;
  console.log('\n═══════════════════════════════════════');
  console.log(`  Dispositivo: ${deviceName}`);
  console.log(`  Ruta: ${routeName}`);
  console.log(`  Intervalo: ${INTERVAL_MS}ms`);
  console.log('═══════════════════════════════════════\n');

  while (isRunning) {
    const location = getNextLocation();
    updateBattery();
    await sendLocation(location.lat, location.lng, token);
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
  }
}

function stopSimulation() {
  isRunning = false;
  console.log('\n🛑 Simulación detenida');
}

// CLI con argumentos: nombre y ruta opcionales
async function main() {
  const args = process.argv.slice(2);
  const name = args[0] || 'Simulado';
  routeName = args[1] || 'quito-centro';
  route = routes[routeName] || routes['quito-centro'];

  console.log(`📍 Simulador GPS — "${name}" (ruta: ${routeName})`);
  console.log(`🔗 Servidor: ${API_BASE}\n`);

  const token = await registerDevice(name);

  process.on('SIGINT', () => { stopSimulation(); process.exit(0); });
  process.on('SIGTERM', () => { stopSimulation(); process.exit(0); });

  await startSimulation(token, name);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
}

module.exports = { startSimulation, stopSimulation };
