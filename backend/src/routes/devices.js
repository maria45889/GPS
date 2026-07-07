const { Router } = require('express');
const db = require('../db');

const router = Router();

// POST /api/devices/register — registrar un nuevo dispositivo
router.post('/register', async (req, res) => {
  const { name } = req.body;
  const device = await db.registerDevice(name || 'Mi dispositivo');
  res.json(device);
});

// GET /api/devices — listar dispositivos
router.get('/', async (req, res) => {
  const devices = await db.getAllDevices();
  res.json(devices);
});

// GET /api/devices/:id — info de dispositivo
router.get('/:id', async (req, res) => {
  const device = await db.getDeviceById(parseInt(req.params.id));
  if (!device) return res.status(404).json({ error: 'no encontrado' });

  const latest = await db.getLatestLocation(device.id);
  res.json({ ...device, latest });
});

module.exports = router;
