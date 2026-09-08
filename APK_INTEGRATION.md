# 📱 Documentación para el APK Android (Arquitectura Serverless)

Este archivo contiene toda la información necesaria para integrar el APK con el sistema de rastreo GPS usando **Supabase directamente** (sin servidor backend).

## 🔗 URL de Supabase

### Endpoint Base
```
https://wsmqgjcfheraxorljhjc.supabase.co
```

### API REST
```
https://wsmqgjcfheraxorljhjc.supabase.co/rest/v1
```

## 🔑 Autenticación

El APK debe incluir los siguientes headers en todas las peticiones:

```
apikey: TU_SUPABASE_ANON_KEY
Authorization: Bearer TU_SUPABASE_ANON_KEY
Content-Type: application/json
```

**Importante:** Reemplaza `TU_SUPABASE_ANON_KEY` con la clave ANON de tu proyecto Supabase (disponible en Settings > API).

## 🛣️ Endpoints de Supabase

### 1. Enviar Ubicación GPS

**Endpoint:** `POST /rest/v1/gps_locations`

**Headers:**
```
apikey: TU_SUPABASE_ANON_KEY
Authorization: Bearer TU_SUPABASE_ANON_KEY
Content-Type: application/json
```

**Body (JSON):**
```json
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

**Campos Obligatorios:**
- `device_id`: Identificador único del dispositivo (string)
- `latitude`: Latitud en grados decimales (float)
- `longitude`: Longitud en grados decimales (float)

**Campos Opcionales:**
- `speed`: Velocidad en km/h (float)
- `accuracy`: Precisión en metros (float)
- `altitude`: Altitud en metros (float)
- `bearing`: Dirección en grados (0-360, float)
- `timestamp`: Fecha/hora en formato ISO 8601 (string)

**Respuesta Exitosa (201):**
```json
[
  {
    "id": 1,
    "device_id": "moto_001",
    "latitude": 19.432608,
    "longitude": -99.133209,
    "speed": 45.5,
    "accuracy": 10.2,
    "altitude": 2240,
    "bearing": 180.5,
    "timestamp": "2024-01-01T12:00:00Z",
    "created_at": "2024-01-01T12:00:00Z"
  }
]
```

**Respuesta de Error (400/500):**
```json
{
  "message": "Error details",
  "code": "PGRST116",
  "details": "..."
}
```

---

### 2. Obtener Última Ubicación

**Endpoint:** `GET /rest/v1/gps_locations?device_id=eq.{device_id}&order=timestamp.desc&limit=1`

**Ejemplo:**
```
GET /rest/v1/gps_locations?device_id=eq.moto_001&order=timestamp.desc&limit=1
```

**Headers:**
```
apikey: TU_SUPABASE_ANON_KEY
Authorization: Bearer TU_SUPABASE_ANON_KEY
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 100,
    "device_id": "moto_001",
    "latitude": 19.432608,
    "longitude": -99.133209,
    "speed": 45.5,
    "accuracy": 10.2,
    "altitude": 2240,
    "bearing": 180.5,
    "timestamp": "2024-01-01T12:00:00Z",
    "created_at": "2024-01-01T12:00:00Z"
  }
]
```

---

### 3. Obtener Historial de Ubicaciones

**Endpoint:** `GET /rest/v1/gps_locations?device_id=eq.{device_id}&order=timestamp.desc&limit={limit}`

**Parámetros:**
- `device_id`: Identificador del dispositivo (string)
- `limit`: Cantidad de registros a retornar (default: 50)

**Ejemplo:**
```
GET /rest/v1/gps_locations?device_id=eq.moto_001&order=timestamp.desc&limit=50
```

**Headers:**
```
apikey: TU_SUPABASE_ANON_KEY
Authorization: Bearer TU_SUPABASE_ANON_KEY
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 100,
    "device_id": "moto_001",
    "latitude": 19.432608,
    "longitude": -99.133209,
    "speed": 45.5,
    "accuracy": 10.2,
    "altitude": 2240,
    "bearing": 180.5,
    "timestamp": "2024-01-01T12:00:00Z",
    "created_at": "2024-01-01T12:00:00Z"
  },
  {
    "id": 99,
    "device_id": "moto_001",
    "latitude": 19.432500,
    "longitude": -99.133100,
    "speed": 44.0,
    "accuracy": 11.5,
    "altitude": 2238,
    "bearing": 175.0,
    "timestamp": "2024-01-01T11:55:00Z",
    "created_at": "2024-01-01T11:55:00Z"
  }
]
```

---

### 4. Obtener Lista de Dispositivos

**Endpoint:** `GET /rest/v1/gps_locations?select=device_id`

**Headers:**
```
apikey: TU_SUPABASE_ANON_KEY
Authorization: Bearer TU_SUPABASE_ANON_KEY
```

**Respuesta Exitosa (200):**
```json
[
  {"device_id": "moto_001"},
  {"device_id": "moto_002"},
  {"device_id": "moto_003"}
]
```

---

## 💻 Ejemplo de Implementación en Android

### Kotlin (Modern Android) - Con Supabase Directo

```kotlin
import android.content.Context
import android.location.Location
import android.os.Handler
import android.os.Looper
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.*

class GPSTracker(private val context: Context) {
    
    // Configuración de Supabase
    private val SUPABASE_URL = "https://wsmqgjcfheraxorljhjc.supabase.co"
    private val SUPABASE_KEY = "TU_SUPABASE_ANON_KEY" // Reemplazar con tu clave real
    private val API_BASE_URL = "$SUPABASE_URL/rest/v1/gps_locations"
    
    private val handler = Handler(Looper.getMainLooper())
    private var isTracking = false
    
    // Enviar ubicación a Supabase
    fun sendLocation(deviceId: String, location: Location) {
        Thread {
            try {
                val url = URL(API_BASE_URL)
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("apikey", SUPABASE_KEY)
                conn.setRequestProperty("Authorization", "Bearer $SUPABASE_KEY")
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true
                conn.connectTimeout = 10000
                conn.readTimeout = 10000
                
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
                
                val outputStream = OutputStreamWriter(conn.outputStream)
                outputStream.write(json.toString())
                outputStream.flush()
                outputStream.close()
                
                val responseCode = conn.responseCode
                println("GPS Response code: $responseCode")
                
                conn.disconnect()
            } catch (e: Exception) {
                println("Error sending location: ${e.message}")
            }
        }.start()
    }
    
    // Iniciar seguimiento periódico
    fun startPeriodicTracking(deviceId: String, intervalMs: Long = 5000) {
        isTracking = true
        handler.post(object : Runnable {
            override fun run() {
                if (isTracking) {
                    // Aquí deberías obtener la ubicación actual del GPS
                    // locationListener?.onLocationChanged(currentLocation)
                    handler.postDelayed(this, intervalMs)
                }
            }
        })
    }
    
    // Detener seguimiento
    fun stopTracking() {
        isTracking = false
        handler.removeCallbacksAndMessages(null)
    }
}
```

### Java (Traditional Android) - Con Supabase Directo

```java
import android.content.Context;
import android.location.Location;
import org.json.JSONObject;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class GPSTracker {
    
    private Context context;
    
    // Configuración de Supabase
    private String SUPABASE_URL = "https://wsmqgjcfheraxorljhjc.supabase.co";
    private String SUPABASE_KEY = "TU_SUPABASE_ANON_KEY"; // Reemplazar con tu clave real
    private String API_BASE_URL = SUPABASE_URL + "/rest/v1/gps_locations";
    
    public GPSTracker(Context context) {
        this.context = context;
    }
    
    public void sendLocation(String deviceId, Location location) {
        new Thread(() -> {
            try {
                URL url = new URL(API_BASE_URL);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("apikey", SUPABASE_KEY);
                conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_KEY);
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                
                JSONObject json = new JSONObject();
                json.put("device_id", deviceId);
                json.put("latitude", location.getLatitude());
                json.put("longitude", location.getLongitude());
                json.put("speed", location.getSpeed() * 3.6); // Convertir m/s a km/h
                json.put("accuracy", location.getAccuracy());
                json.put("altitude", location.getAltitude());
                json.put("bearing", location.getBearing());
                
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
                json.put("timestamp", sdf.format(new Date()));
                
                OutputStreamWriter outputStream = new OutputStreamWriter(conn.getOutputStream());
                outputStream.write(json.toString());
                outputStream.flush();
                outputStream.close();
                
                int responseCode = conn.getResponseCode();
                System.out.println("GPS Response code: " + responseCode);
                
                conn.disconnect();
            } catch (Exception e) {
                System.out.println("Error sending location: " + e.getMessage());
            }
        }).start();
    }
}
```

## ⚙️ Configuración del AndroidManifest.xml

No olvides agregar los permisos necesarios:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.gpstracker">
    
    <!-- Permisos de ubicación -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Para Android 10+ -->
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/AppTheme">
        
        <activity android:name=".MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        
    </application>
</manifest>
```

## 🔧 Configuración de URL

### Con Supabase, no necesitas configurar servidores:

La URL de Supabase es constante y funciona desde cualquier lugar:

```kotlin
private val SUPABASE_URL = "https://wsmqgjcfheraxorljhjc.supabase.co"
private val SUPABASE_KEY = "TU_SUPABASE_ANON_KEY"
private val API_BASE_URL = "$SUPABASE_URL/rest/v1/gps_locations"
```

**Ventajas:**
- ✅ Funciona desde cualquier lugar del mundo
- ✅ No necesitas IP local
- ✅ No necesitas desplegar servidor propio
- ✅ Supabase maneja la infraestructura

## 📱 Frecuencia de Envío

Recomendaciones según el caso de uso:

- **Rastreo en tiempo real**: Cada 5-10 segundos
- **Rastreo periódico**: Cada 30-60 segundos
- **Ahorro de batería**: Cada 2-5 minutos

## 🧪 Pruebas

### Probar la API con cURL:

```bash
# Enviar ubicación
curl -X POST https://wsmqgjcfheraxorljhjc.supabase.co/rest/v1/gps_locations \
  -H "apikey: TU_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer TU_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "test_device",
    "latitude": 19.432608,
    "longitude": -99.133209,
    "speed": 45.5,
    "accuracy": 10.2
  }'

# Obtener última ubicación
curl "https://wsmqgjcfheraxorljhjc.supabase.co/rest/v1/gps_locations?device_id=eq.test_device&order=timestamp.desc&limit=1" \
  -H "apikey: TU_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer TU_SUPABASE_ANON_KEY"

# Obtener historial
curl "https://wsmqgjcfheraxorljhjc.supabase.co/rest/v1/gps_locations?device_id=eq.test_device&order=timestamp.desc&limit=10" \
  -H "apikey: TU_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer TU_SUPABASE_ANON_KEY"

# Obtener dispositivos
curl "https://wsmqgjcfheraxorljhjc.supabase.co/rest/v1/gps_locations?select=device_id" \
  -H "apikey: TU_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer TU_SUPABASE_ANON_KEY"
```

## ⚠️ Notas Importantes

1. **ID del Dispositivo**: Usa un identificador único para cada moto/celular
2. **Conexión a Internet**: El APK necesita conexión constante para enviar datos
3. **Batería**: El GPS consume batería, considera optimizaciones
4. **Permisos**: En Android 10+, necesitas solicitar permisos de ubicación en tiempo de ejecución
5. **Background Service**: Para que funcione con la pantalla apagada, usa un Foreground Service

## 🚀 Próximos Pasos

1. Configurar Supabase según el supabase_setup.sql
2. Actualizar la clave ANON en el código del APK
3. Probar las APIs con cURL
4. Implementar el código en el APK
5. Probar el envío de datos desde el APK
6. Verificar en el panel web (desplegar en Vercel/Netlify o usar `npm run dev` localmente)

## 📞 Soporte

Para problemas con la integración del APK, revisar:
- Logs del servidor
- Logs de la aplicación Android
- Conexión de red
- Permisos de ubicación