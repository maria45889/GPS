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

// POST /api/geofences — crear geocerca
router.post('/', auth, async (req, res) => {
  const { name, latitude, longitude, radius } = req.body;
  
  if (!name || latitude == null || longitude == null || !radius) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }
  
  try {
    const geofence = await db.createGeofence(req.device.id, {
      name,
      latitude,
      longitude,
      radius
    });
    res.json(geofence);
  } catch (error) {
    console.error('Error creando geocerca:', error);
    res.status(500).json({ error: 'Error al crear geocerca' });
  }
});

// GET /api/geofences — obtener geocercas del dispositivo
router.get('/', auth, async (req, res) => {
  try {
    const geofences = await db.getGeofences(req.device.id);
    res.json(geofences);
  } catch (error) {
    console.error('Error obteniendo geocercas:', error);
    res.status(500).json({ error: 'Error al obtener geocercas' });
  }
});

// DELETE /api/geofences/:id — eliminar geocerca
router.delete('/:id', auth, async (req, res) => {
  const id = parseInt(req.params.id);
  
  try {
    const success = await db.deleteGeofence(id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Geocerca no encontrada' });
    }
  } catch (error) {
    console.error('Error eliminando geocerca:', error);
    res.status(500).json({ error: 'Error al eliminar geocerca' });
  }
});

// GET /api/geofences/:id/events — obtener eventos de una geocerca
router.get('/:id/events', auth, async (req, res) => {
  const id = parseInt(req.params.id);
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
  
  try {
    const events = await db.getGeofenceEvents(id, limit);
    res.json(events);
  } catch (error) {
    console.error('Error obteniendo eventos:', error);
    res.status(500).json({ error: 'Error al obtener eventos' });
  }
});

module.exports = router;