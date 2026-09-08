# 🛵 Sistema de Rastreo GPS para Moto (Serverless)

Sistema completo de rastreo GPS con panel de monitoreo web accesible desde PC y móvil. **Arquitectura 100% serverless con Supabase** - sin servidor backend necesario.

## 📋 Características

- ✅ Panel de monitoreo en tiempo real con Supabase Realtime
- ✅ Mapa interactivo con OpenStreetMap
- ✅ Seguimiento de ubicación GPS automático
- ✅ Historial de rutas
- ✅ Responsive (funciona en PC y móvil)
- ✅ **100% Serverless** - Sin servidor Node.js/Express
- ✅ Base de datos gratis con Supabase
- ✅ Despliegue estático fácil (Vercel/Netlify)
- ✅ Actualizaciones en tiempo real sin polling

## 🚀 Instalación

### 1. Clonar el repositorio
```bash
git clone git@github.com:maria45889/GPS.git
cd GPS
```

### 2. Configurar Supabase

1. Crear cuenta en [Supabase](https://supabase.com/)
2. Crear un nuevo proyecto
3. En el dashboard de Supabase, ir a SQL Editor y ejecutar el archivo `supabase_setup.sql`:

```bash
# O copiar el contenido de supabase_setup.sql en el SQL Editor
```

4. Obtener las credenciales:
   - Ir a Settings → API
   - Copiar `Project URL` y `anon public key`

### 3. Configurar el panel web

Editar `public/index.html` y reemplazar las credenciales de Supabase:

```javascript
// Líneas 268-270 en public/index.html
const SUPABASE_URL = 'https://wsmqgjcfheraxorljhjc.supabase.co'; // Tu URL real
const SUPABASE_KEY = 'TU_SUPABASE_ANON_KEY_REAL'; // Tu clave ANON real
```

### 4. Probar localmente (opcional)

```bash
npm install
npm run dev
```

El panel estará disponible en: `http://localhost:3000`

### 5. Desplegar en producción

**Opción A: Vercel (Recomendado)**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel
```

**Opción B: Netlify**
```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Desplegar
netlify deploy --prod
```

**Opción C: GitHub Pages**
- Subir el código a GitHub
- Habilitar GitHub Pages en el repositorio
- Configurar source branch a `main` y folder a `/public`

## 📱 Para el APK

El APK debe conectarse directamente a Supabase. Consulta el archivo `APK_INTEGRATION.md` para documentación completa.

### Endpoints de Supabase

#### Enviar ubicación GPS
```http
POST https://wsmqgjcfheraxorljhjc.supabase.co/rest/v1/gps_locations
apikey: TU_SUPABASE_ANON_KEY
Authorization: Bearer TU_SUPABASE_ANON_KEY
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
GET https://wsmqgjcfheraxorljhjc.supabase.co/rest/v1/gps_locations?device_id=eq.{device_id}&order=timestamp.desc&limit=1
apikey: TU_SUPABASE_ANON_KEY
Authorization: Bearer TU_SUPABASE_ANON_KEY
```

#### Obtener historial de ubicaciones
```http
GET https://wsmqgjcfheraxorljhjc.supabase.co/rest/v1/gps_locations?device_id=eq.{device_id}&order=timestamp.desc&limit=100
apikey: TU_SUPABASE_ANON_KEY
Authorization: Bearer TU_SUPABASE_ANON_KEY
```

### Ejemplo de implementación en Android (Kotlin)

```kotlin
// Clase para enviar datos GPS a Supabase
class GPSTracker(private val context: Context) {
    
    private val SUPABASE_URL = "https://wsmqgjcfheraxorljhjc.supabase.co"
    private val SUPABASE_KEY = "TU_SUPABASE_ANON_KEY"
    private val API_URL = "$SUPABASE_URL/rest/v1/gps_locations"
    
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
                conn.setRequestProperty("apikey", SUPABASE_KEY)
                conn.setRequestProperty("Authorization", "Bearer $SUPABASE_KEY")
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

1. Abrir la URL del panel (local o desplegado en Vercel/Netlify)
2. Seleccionar el dispositivo del dropdown
3. El sistema iniciará el seguimiento automático con Supabase Realtime
4. Ver ubicación en tiempo real en el mapa (actualizaciones instantáneas)
5. Revisar historial de rutas en el panel lateral

## 📊 Estructura del Proyecto

```
GPS/
├── public/
│   └── index.html         # Panel de monitoreo web (conecta directo a Supabase)
├── supabase_setup.sql     # Script SQL para configurar Supabase
├── APK_INTEGRATION.md     # Documentación para integración con APK
├── vercel.json            # Configuración para despliegue en Vercel
├── netlify.toml           # Configuración para despliegue en Netlify
├── package.json           # Dependencias (solo para desarrollo local)
└── README.md              # Este archivo
```

## 🔧 Configuración

- **SUPABASE_URL**: URL del proyecto de Supabase (configurada en `public/index.html`)
- **SUPABASE_KEY**: Key pública de Supabase (anon key, configurada en `public/index.html`)

## 🌐 Despliegue

### Despliegue en Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel
```

El panel estará disponible en: `https://tu-proyecto.vercel.app`

### Despliegue en Netlify

```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Desplegar
netlify deploy --prod
```

El panel estará disponible en: `https://tu-proyecto.netlify.app`

### Despliegue en GitHub Pages

1. Subir el código a GitHub
2. Ir a Settings → Pages
3. Configurar:
   - Source: Deploy from a branch
   - Branch: main
   - Folder: /public
4. El panel estará disponible en: `https://tu-usuario.github.io/GPS/`

## 📱 Acceso Móvil

Con la arquitectura serverless, el panel es accesible desde cualquier lugar:
- No necesitas configurar IP local
- Funciona con cualquier conexión a internet
- El APK también se conecta directamente a Supabase

## 🔒 Seguridad

- Para producción, considera usar Row Level Security (RLS) más restrictivo
- Implementar autenticación para el panel web con Supabase Auth
- Usar HTTPS (Vercel y Netlify lo proveen automáticamente)
- No exponer la `service_role_key` en el código del cliente

## 🐛 Troubleshooting

### Error de conexión a Supabase
- Verificar que las credenciales en `public/index.html` sean correctas
- Asegurarse de que las políticas RLS estén configuradas correctamente (ejecutar `supabase_setup.sql`)
- Verificar que Realtime esté habilitado en Supabase (Database > Replication)

### El APK no envía datos
- Verificar que la URL de Supabase sea correcta
- Revisar que los headers `apikey` y `Authorization` estén incluidos
- Verificar que la clave ANON sea correcta

### El panel no se actualiza en tiempo real
- Verificar que la tabla `gps_locations` esté en la publicación `supabase_realtime`
- Ejecutar: `ALTER PUBLICATION supabase_realtime ADD TABLE gps_locations;`
- Revisar la consola del navegador para errores de WebSocket

### El mapa no carga
- Verificar conexión a internet
- Asegurarse de que OpenStreetMap esté accesible

## 📞 Soporte

Para problemas o preguntas, contactar al desarrollador.

## 📄 Licencia

ISC