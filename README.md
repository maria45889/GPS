# 🛵 Sistema de Rastreo GPS para Moto

Sistema completo de rastreo GPS con panel de monitoreo web accesible desde PC y móvil.

## 📋 Características

- ✅ Panel de monitoreo en tiempo real
- ✅ Mapa interactivo con OpenStreetMap
- ✅ Seguimiento de ubicación GPS
- ✅ Historial de rutas
- ✅ Responsive (funciona en PC y móvil)
- ✅ Base de datos gratis con Supabase
- ✅ APIs REST para integración con APK

## 🚀 Instalación

### 1. Clonar el repositorio
```bash
git clone git@github.com:maria45889/GPS.git
cd GPS
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Supabase

1. Crear cuenta en [Supabase](https://supabase.com/)
2. Crear un nuevo proyecto
3. En el dashboard de Supabase, ir a SQL Editor y ejecutar:

```sql
-- Crear tabla para almacenar ubicaciones GPS
CREATE TABLE gps_locations (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    speed DECIMAL(7, 2),
    accuracy DECIMAL(7, 2),
    altitude DECIMAL(10, 2),
    bearing DECIMAL(7, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas por device_id
CREATE INDEX idx_gps_locations_device_id ON gps_locations(device_id);

-- Crear índice para búsquedas por timestamp
CREATE INDEX idx_gps_locations_timestamp ON gps_locations(timestamp DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE gps_locations ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserciones desde cualquier IP (para el APK)
CREATE POLICY "Allow insert for all" ON gps_locations
    FOR INSERT
    WITH CHECK (true);

-- Política para permitir lecturas desde cualquier IP (para el panel web)
CREATE POLICY "Allow select for all" ON gps_locations
    FOR SELECT
    USING (true);
```

4. Obtener las credenciales:
   - Ir a Settings → API
   - Copiar `Project URL` y `anon public key`

### 4. Configurar variables de entorno

Crear archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales de Supabase:

```env
SUPABASE_URL=tu_supabase_url_aqui
SUPABASE_KEY=tu_supabase_key_aqui
PORT=3000
```

### 5. Iniciar el servidor

```bash
npm start
```

El panel estará disponible en: `http://localhost:3000`

## 📱 Para el APK

### Rutas de la API

#### Enviar ubicación GPS
```http
POST /api/gps/location
Content-Type: application/json

{
  "device_id": "moto_001",
  "latitude": 19.432608,
  "longitude": -99.133209,
  "speed": 45.5,
  "accuracy": 10.2,
  "altitude": 2240,
  "bearing": 180.5,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Obtener última ubicación
```http
GET /api/gps/latest/{device_id}
```

#### Obtener historial de ubicaciones
```http
GET /api/gps/locations/{device_id}?limit=100
```

#### Obtener lista de dispositivos
```http
GET /api/gps/devices
```

### Ejemplo de implementación en Android (Kotlin)

```kotlin
// Clase para enviar datos GPS
class GPSTracker(private val context: Context) {
    
    private val API_URL = "http://TU_IP_DEL_SERVIDOR:3000/api/gps/location"
    
    fun sendLocation(deviceId: String, location: Location) {
        val json = JSONObject().apply {
            put("device_id", deviceId)
            put("latitude", location.latitude)
            put("longitude", location.longitude)
            put("speed", location.speed * 3.6) // Convertir m/s a km/h
            put("accuracy", location.accuracy)
            put("altitude", location.altitude)
            put("bearing", location.bearing)
            put("timestamp", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
                .format(Date()))
        }
        
        Thread {
            try {
                val url = URL(API_URL)
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true
                
                val outputStream = conn.outputStream
                outputStream.write(json.toString().toByteArray())
                outputStream.flush()
                
                val responseCode = conn.responseCode
                Log.d("GPS", "Response code: $responseCode")
                
                conn.disconnect()
            } catch (e: Exception) {
                Log.e("GPS", "Error sending location", e)
            }
        }.start()
    }
}
```

## 🎮 Uso del Panel

1. Abrir `http://localhost:3000` en el navegador
2. Seleccionar el dispositivo del dropdown
3. El sistema iniciará el seguimiento automático
4. Ver ubicación en tiempo real en el mapa
5. Revisar historial de rutas en el panel lateral

## 📊 Estructura del Proyecto

```
GPS/
├── backend/
│   └── server.js          # Servidor Express
├── config/
│   └── supabase.js        # Configuración de Supabase
├── public/
│   └── index.html         # Panel de monitoreo web
├── routes/
│   └── gps.js             # Rutas de la API GPS
├── .env.example           # Ejemplo de variables de entorno
├── .env                   # Variables de entorno (crear este archivo)
├── package.json           # Dependencias del proyecto
└── README.md              # Este archivo
```

## 🔧 Variables de Entorno

- `SUPABASE_URL`: URL del proyecto de Supabase
- `SUPABASE_KEY`: Key pública de Supabase (anon key)
- `PORT`: Puerto del servidor (default: 3000)

## 🌐 Despliegue

### Para acceso desde móvil en la misma red:

1. Obtener la IP de tu PC:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig`

2. En el APK, usar la IP en lugar de `localhost`:
   ```
   http://192.168.1.X:3000/api/gps/location
   ```

### Para despliegue en la nube:

Puedes usar servicios gratuitos como:
- [Render](https://render.com/)
- [Railway](https://railway.app/)
- [Vercel](https://vercel.com/)

## 📱 Acceso Móvil

Para acceder al panel desde el móvil:
1. En el mismo archivo `.env`, cambiar el host a `0.0.0.0`
2. Acceder desde el móvil usando la IP de tu PC: `http://192.168.1.X:3000`

## 🔒 Seguridad

- Para producción, considera usar API keys adicionales
- Implementar autenticación para el panel web
- Usar HTTPS en lugar de HTTP

## 🐛 Troubleshooting

### Error de conexión a Supabase
- Verificar que las credenciales en `.env` sean correctas
- Asegurarse de que las políticas RLS estén configuradas correctamente

### El APK no envía datos
- Verificar que la URL del servidor sea correcta
- Revisar que el dispositivo esté en la misma red o que el servidor sea accesible públicamente
- Verificar los logs del servidor

### El mapa no carga
- Verificar conexión a internet
- Asegurarse de que OpenStreetMap esté accesible

## 📞 Soporte

Para problemas o preguntas, contactar al desarrollador.

## 📄 Licencia

ISC