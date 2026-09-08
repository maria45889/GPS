const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// POST /api/gps/location - Recibir datos GPS del APK
router.post('/location', async (req, res) => {
  try {
    const { device_id, latitude, longitude, speed, accuracy, altitude, bearing, timestamp } = req.body;

    // Validación básica
    if (!device_id || !latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        error: 'device_id, latitude y longitude son requeridos' 
      });
    }

    // Insertar datos en Supabase
    const { data, error } = await supabase
      .from('gps_locations')
      .insert([{
        device_id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        speed: speed ? parseFloat(speed) : null,
        accuracy: accuracy ? parseFloat(accuracy) : null,
        altitude: altitude ? parseFloat(altitude) : null,
        bearing: bearing ? parseFloat(bearing) : null,
        timestamp: timestamp || new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('Error guardando datos GPS:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al guardar datos GPS' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Ubicación guardada correctamente',
      data: data[0]
    });

  } catch (error) {
    console.error('Error en /api/gps/location:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /api/gps/locations/:device_id - Obtener historial de ubicaciones
router.get('/locations/:device_id', async (req, res) => {
  try {
    const { device_id } = req.params;
    const { limit = 100 } = req.query;

    const { data, error } = await supabase
      .from('gps_locations')
      .select('*')
      .eq('device_id', device_id)
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Error obteniendo ubicaciones:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al obtener ubicaciones' 
      });
    }

    res.json({ 
      success: true, 
      data: data || []
    });

  } catch (error) {
    console.error('Error en /api/gps/locations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /api/gps/latest/:device_id - Obtener la última ubicación
router.get('/latest/:device_id', async (req, res) => {
  try {
    const { device_id } = req.params;

    const { data, error } = await supabase
      .from('gps_locations')
      .select('*')
      .eq('device_id', device_id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error obteniendo última ubicación:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al obtener última ubicación' 
      });
    }

    res.json({ 
      success: true, 
      data: data
    });

  } catch (error) {
    console.error('Error en /api/gps/latest:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /api/gps/devices - Obtener lista de dispositivos
router.get('/devices', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('gps_locations')
      .select('device_id')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error obteniendo dispositivos:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al obtener dispositivos' 
      });
    }

    // Obtener dispositivos únicos
    const devices = [...new Set(data?.map(loc => loc.device_id) || [])];

    res.json({ 
      success: true, 
      data: devices
    });

  } catch (error) {
    console.error('Error en /api/gps/devices:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

module.exports = router;