const { Router } = require('express');
const db = require('../db');

const router = Router();

// POST /api/devices/register — registrar un nuevo dispositivo
router.post('/register', async (req, res) => {
  const { name } = req.body;
  const device = await db.registerDevice(name || 'Mi dispositivo');
  res.json(device);
});

// GET /api/devices — listar dispositivos con última ubicación
router.get('/', async (req, res) => {
  const devices = await db.getAllDevices();
  
  // Agregar última ubicación para cada dispositivo
  const devicesWithLocation = await Promise.all(
    devices.map(async (device) => {
      const latest = await db.getLatestLocation(device.id);
      return { ...device, latest };
    })
  );
  
  res.json(devicesWithLocation);
});

// GET /api/devices/:id — info de dispositivo
router.get('/:id', async (req, res) => {
  const device = await db.getDeviceById(parseInt(req.params.id));
  if (!device) return res.status(404).json({ error: 'no encontrado' });

  const latest = await db.getLatestLocation(device.id);
  res.json({ ...device, latest });
});

// DELETE /api/devices/:id — eliminar dispositivo
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const success = await db.deleteDevice(id);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'no encontrado' });
  }
});

module.exports = router;
