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

// GET /api/location/latest — última ubicación
router.get('/latest', auth, async (req, res) => {
  const loc = await db.getLatestLocation(req.device.id);
  res.json(loc || { error: 'sin datos' });
});

// GET /api/location/history — historial
router.get('/history', auth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 500, 5000);
  const offset = parseInt(req.query.offset) || 0;
  const history = await db.getLocationHistory(req.device.id, limit, offset);
  res.json(history);
});

module.exports = router;
