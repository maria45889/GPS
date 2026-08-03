const { Router } = require('express');
const db = require('../db');

const router = Router();

// Auth middleware
async function auth(req, res, next) {
  const token = req.headers['x-device-token'];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  const device = await db.getDeviceByToken(token);
  if (!device) return res.status(401).json({ error: 'Token inválido' });

  req.device = device;
  next();
}

// POST /api/location — recibir ubicación desde el móvil
router.post('/', auth, async (req, res) => {
  const payloads = Array.isArray(req.body) ? req.body : [req.body];
  const results = [];

  for (const loc of payloads) {
    const { latitude, longitude, accuracy, altitude, speed, bearing, battery } = loc;

    if (latitude == null || longitude == null) {
      continue;
    }

    const id = await db.insertLocation(req.device.id, {
      latitude, longitude, accuracy, altitude, speed, bearing, battery
    });

    if (id) {
      results.push(id);
      if (req.io) {
        req.io.emit('new_location', {
          deviceId: req.device.id,
          location: { id, latitude, longitude, accuracy, altitude, speed, bearing, battery, timestamp: new Date().toISOString() }
        });
      }
    }
  }

  res.json({ status: 'ok', inserted: results.length });
});

// GET /api/location/latest — última ubicación del dispositivo autenticado
router.get('/latest', auth, async (req, res) => {
  const loc = await db.getLatestLocation(req.device.id);
  res.json(loc || { error: 'sin datos' });
});

// GET /api/location/latest-any — última ubicación de CUALQUIER dispositivo (para dashboard)
router.get('/latest-any', async (req, res) => {
  const loc = await db.getLatestLocationAny();
  res.json(loc || { error: 'sin datos' });
});

// GET /api/location/history — historial
router.get('/history', auth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 500, 5000);
  const offset = parseInt(req.query.offset) || 0;
  const history = await db.getLocationHistory(req.device.id, limit, offset);
  res.json(history);
});

// GET /api/location/export — exportar ubicaciones en formato GPX
router.get('/export', auth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 1000, 10000);
  const history = await db.getLocationHistory(req.device.id, limit, 0);
  
  if (history.length === 0) {
    return res.status(404).json({ error: 'No hay ubicaciones para exportar' });
  }

  // Generar GPX
  const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPS Tracker" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Track from ${req.device.name}</name>
    <trkseg>
`;
  
  const gpxPoints = history.map(loc => 
    `      <trkpt lat="${loc.latitude}" lon="${loc.longitude}">
        <ele>${loc.altitude || 0}</ele>
        <time>${loc.timestamp}</time>
        <speed>${loc.speed || 0}</speed>
      </trkpt>`
  ).join('\n');
  
  const gpxFooter = `    </trkseg>
  </trk>
</gpx>`;

  const gpx = gpxHeader + gpxPoints + gpxFooter;
  
  res.setHeader('Content-Type', 'application/gpx+xml');
  res.setHeader('Content-Disposition', `attachment; filename="track_${req.device.id}_${Date.now()}.gpx"`);
  res.send(gpx);
});

module.exports = router;
