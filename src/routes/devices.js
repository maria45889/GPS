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

// PUT /api/devices/:id — actualizar nombre del dispositivo
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Nombre requerido' });
  }
  
  try {
    const device = await db.updateDeviceName(id, name);
    if (!device) {
      return res.status(404).json({ error: 'no encontrado' });
    }
    
    res.json(device);
  } catch (error) {
    console.error('Error actualizando dispositivo:', error);
    res.status(500).json({ error: 'Error al actualizar dispositivo' });
  }
});

// GET /api/devices/:id/stats — estadísticas del dispositivo
router.get('/:id/stats', async (req, res) => {
  const id = parseInt(req.params.id);
  const device = await db.getDeviceById(id);
  
  if (!device) {
    return res.status(404).json({ error: 'no encontrado' });
  }
  
  const history = await db.getLocationHistory(id, 1000, 0);
  
  if (history.length === 0) {
    return res.json({
      deviceId: id,
      totalLocations: 0,
      avgAccuracy: null,
      maxSpeed: null,
      avgSpeed: null,
      batteryLevels: []
    });
  }
  
  const avgAccuracy = history.reduce((sum, loc) => sum + (loc.accuracy || 0), 0) / history.length;
  const speeds = history.map(loc => loc.speed || 0);
  const maxSpeed = Math.max(...speeds);
  const avgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
  const batteryLevels = history.filter(loc => loc.battery != null).map(loc => loc.battery);
  
  res.json({
    deviceId: id,
    totalLocations: history.length,
    avgAccuracy: Math.round(avgAccuracy * 10) / 10,
    maxSpeed: Math.round(maxSpeed * 3.6 * 10) / 10, // Convertir a km/h
    avgSpeed: Math.round(avgSpeed * 3.6 * 10) / 10, // Convertir a km/h
    batteryLevels
  });
});

module.exports = router;
