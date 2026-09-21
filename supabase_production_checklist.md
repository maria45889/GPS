# Guía y Checklist de Certificación para Despliegue en Producción

Esta guía contiene los pasos exactos para certificar la base de datos Supabase real y realizar el build y verificación del APK release de Android.

---

## 1. Verificación de la Instancia Supabase en Producción

### A. Ejecutar Migración SQL
Ejecutar el contenido completo de [`supabase_setup.sql`](file:///home/cesar/Documentos/GPS/supabase_setup.sql) en el Editor SQL del proyecto Supabase real. Esto creará:
- Tablas con RLS activado (`devices`, `vehicles`, `alerts`, `geofences`, `gps_locations`, `device_activation_codes`, `device_registry`, `vehicle_commands`, `provision_rate_limits`).
- Procedimiento atómico de aprovisionamiento `provision_device_atomic`.
- Limitador de tasa persistente `check_and_record_rate_limit`.
- Triggers automáticos de organización `set_gps_location_org_id` y `set_vehicle_command_org_id`.
- Vista de alto rendimiento `latest_gps_locations`.

### B. Publicación Realtime
En la consola de Supabase (Database -> Realtime), asegurar que las siguientes tablas pertenezcan a la publicación `supabase_realtime`:
- `vehicles`
- `devices`
- `alerts`
- `geofences`
- `latest_gps_locations` (o `gps_locations`)
- `vehicle_commands`

### C. Despliegue de Edge Function `provision-device`
Desplegar la Edge Function con Supabase CLI:
```bash
supabase functions deploy provision-device --project-ref <tu-project-ref>
supabase secrets set PROVISION_SECRET="tu-secreto-de-aprovisionamiento" --project-ref <tu-project-ref>
```

---

## 2. Firma del APK Release y Verificación Física

### A. Variables de Entorno de Firma
Para generar la versión firmada de producción, definir en `gradle.properties` o en las variables de entorno del servidor CI/CD:
```properties
GPS_RELEASE_STORE_FILE=/ruta/a/tu/keystore.jks
GPS_RELEASE_STORE_PASSWORD=tu_password_keystore
GPS_RELEASE_KEY_ALIAS=tu_alias_llave
GPS_RELEASE_KEY_PASSWORD=tu_password_alias
```

### B. Compilación Release
```bash
cd android
./gradlew clean
./gradlew :app:assembleRelease
```

### C. Verificación de Firma con `apksigner`
Confirmar que el paquete `.apk` resultante tenga una firma V2/V3/V4 válida:
```bash
apksigner verify --verbose app/build/outputs/apk/release/app-release.apk
```

---

## 3. Matriz de Pruebas de Integración y Recuperación

1. **Alta Inicial:** Escanear o ingresar un código de activación no usado -> el APK recibe credenciales `device-xxx@local.rideguard` y token JWT.
2. **Prueba de Borrado / Reinstalación:** Borrar datos de la app en Android -> al reabrir la app, enviar un código de activación **nuevo** -> el servidor actualiza la contraseña, reutiliza/asocia el dispositivo y el rastreo se reanuda inmediatamente.
3. **Bloqueo por Intento Inválido:** Si se borran los datos e intenta recuperarse solo con `device_id` o con el código viejo ya usado -> el servidor responde status 403 y no entrega credenciales.
4. **Resiliencia de Token JWT:** Dejar el panel web abierto en móvil durante más de 1 hora -> al caducar el token, `withAuthRetry` captura el error 401, consulta el nuevo token nativo y reintenta las peticiones sin mostrar pantalla de error ni cerrar el monitoreo.
