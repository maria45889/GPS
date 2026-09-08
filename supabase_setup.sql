-- ============================================
-- CONFIGURACIÓN DE SUPABASE PARA SISTEMA GPS
-- ============================================
-- Ejecutar este script en el SQL Editor de Supabase
-- ============================================

-- 1. Crear tabla para almacenar ubicaciones GPS
CREATE TABLE IF NOT EXISTS gps_locations (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    speed DECIMAL(7, 2),
    accuracy DECIMAL(7, 2),
    altitude DECIMAL(10, 2),
    bearing DECIMAL(7, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Nuevos campos para el panel mejorado
    battery_level DECIMAL(5, 2),           -- Nivel de batería del dispositivo (%)
    voltage DECIMAL(5, 2),                  -- Voltaje del dispositivo (V)
    apk_battery DECIMAL(5, 2),              -- Nivel de batería del APK (%)
    network_type VARCHAR(20),                -- Tipo de red (4G, 5G, WiFi, etc)
    ram_usage INTEGER,                       -- Uso de RAM del APK (MB)
    device_status VARCHAR(20),                -- Estado del dispositivo (moving, stopped)
    signal_strength INTEGER                   -- Fuerza de señal (0-4)
);

-- 2. Crear índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_gps_locations_device_id ON gps_locations(device_id);
CREATE INDEX IF NOT EXISTS idx_gps_locations_timestamp ON gps_locations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_gps_locations_device_timestamp ON gps_locations(device_id, timestamp DESC);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE gps_locations ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de seguridad para permitir acceso público
-- (Para desarrollo - en producción considerar autenticación)

-- Política para permitir inserciones desde cualquier origen
CREATE POLICY "Allow insert for all" ON gps_locations
    FOR INSERT
    WITH CHECK (true);

-- Política para permitir lecturas desde cualquier origen
CREATE POLICY "Allow select for all" ON gps_locations
    FOR SELECT
    USING (true);

-- Política para permitir suscripciones en tiempo real
CREATE POLICY "Allow realtime for all" ON gps_locations
    FOR SELECT
    USING (true);

-- 5. Crear función para limpiar datos antiguos (opcional)
CREATE OR REPLACE FUNCTION clean_old_gps_data()
RETURNS void AS $$
BEGIN
    DELETE FROM gps_locations
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 6. Crear función para obtener estadísticas de un dispositivo
CREATE OR REPLACE FUNCTION get_device_stats(device_id_param VARCHAR)
RETURNS TABLE (
    total_locations BIGINT,
    first_location TIMESTAMP WITH TIME ZONE,
    last_location TIMESTAMP WITH TIME ZONE,
    avg_speed DECIMAL(7, 2),
    max_speed DECIMAL(7, 2),
    total_distance DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_locations,
        MIN(timestamp) as first_location,
        MAX(timestamp) as last_location,
        AVG(speed) as avg_speed,
        MAX(speed) as max_speed,
        0 as total_distance -- TODO: Implementar cálculo de distancia real
    FROM gps_locations
    WHERE device_id = device_id_param;
END;
$$ LANGUAGE plpgsql;

-- 7. Insertar datos de prueba (opcional - para pruebas)
INSERT INTO gps_locations (device_id, latitude, longitude, speed, accuracy, altitude, bearing, timestamp)
VALUES 
    ('moto_001', 19.432608, -99.133209, 45.5, 10.2, 2240, 180.5, NOW() - INTERVAL '1 hour'),
    ('moto_001', 19.432700, -99.133300, 44.0, 11.5, 2242, 175.0, NOW() - INTERVAL '30 minutes'),
    ('moto_001', 19.432800, -99.133400, 46.2, 9.8, 2245, 185.0, NOW() - INTERVAL '15 minutes'),
    ('moto_001', 19.432900, -99.133500, 43.8, 10.5, 2248, 190.0, NOW() - INTERVAL '5 minutes');

-- 8. Habilitar Realtime para la tabla gps_locations
-- Esto permite que el panel web reciba actualizaciones en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE gps_locations;

-- 9. Verificar la configuración
SELECT 'Configuración completada' as status;
SELECT COUNT(*) as total_locations FROM gps_locations;