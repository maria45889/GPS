# Guía de Desarrollo - GPS Tracker App

## 📋 Resumen de Trabajo Realizado

Este documento describe las mejoras y correcciones realizadas al proyecto GPS Tracker App.

### 🔧 Correcciones de Errores

#### App Móvil (React Native)
- **HomeScreen.tsx**: Corregido el uso incorrecto de AsyncStorage. Se importaron las funciones correctas de `storage.ts` en lugar de usar AsyncStorage directamente.
- **api.ts**: Corregido el endpoint de sincronización offline. Ahora usa el endpoint `/api/location` estándar que soporta arrays en lugar de un endpoint separado `/api/location/sync`.
- **tracker.ts**: Corregido el manejo de respuesta de sincronización para usar `inserted` en lugar de `synced`.

#### Backend (Node.js)
- Mejorado el manejo de errores en el servidor principal.
- Agregado middleware de manejo de errores global.

### 🚀 Mejoras de Código

#### Seguridad
- **backend/src/index.js**: Mejorada la configuración de CORS para aceptar origen desde variable de entorno.
- Agregado manejo de errores global con información detallada en desarrollo.

#### Manejo de Errores
- **GPS/src/tracker.ts**: Agregado try-catch en `ensureDeviceRegistered` y `trackingTask` para mejor manejo de errores.
- **GPS/src/api.ts**: Agregado manejo de errores en `registerDevice` con validación de respuesta HTTP.

#### Optimización
- Mejorada la gestión de recursos y limpieza de timers en la app móvil.

### ✨ Nuevas Funcionalidades

#### Backend
1. **Exportación GPX** (`/api/location/export`)
   - Permite exportar el historial de ubicaciones en formato GPX para uso en aplicaciones de mapas.

2. **Estadísticas de Dispositivos** (`/api/devices/:id/stats`)
   - Proporciona métricas: total de ubicaciones, precisión promedio, velocidad máxima y promedio, niveles de batería.

3. **Sistema de Geocercas**
   - Nueva tabla `geofences` para definir zonas geográficas.
   - Nueva tabla `geofence_events` para registrar entradas/salidas.
   - API completa: crear, listar, eliminar geocercas y ver eventos.
   - Endpoint: `/api/geofences`

4. **Actualización de Dispositivos** (`PUT /api/devices/:id`)
   - Permite actualizar el nombre de un dispositivo.

#### Frontend Web
1. **Exportación GPX**: Función en api.js para exportar ubicaciones.
2. **Estadísticas**: Función para obtener estadísticas del dispositivo.

### 📦 Scripts de Despliegue

#### deploy.ps1 (PowerShell)
Mejoras implementadas:
- Verificación de conexión SSH antes del despliegue.
- Creación automática del directorio de datos.
- Subida selectiva de archivos (solo los necesarios).
- Configuración de variables de entorno.
- Configuración de PM2 para inicio automático.
- Instrucciones de monitoreo adicionales.

### 🏗️ Estructura de Base de Datos Mejorada

#### Nuevas Tablas
- **geofences**: Almacena las geocercas definidas por dispositivo.
- **geofence_events**: Registra eventos de entrada/salida de geocercas.

#### Nuevos Índices
- `idx_geofences_device`: Para búsquedas rápidas de geocercas por dispositivo.
- `idx_geofence_events_geofence`: Para consultas de eventos por geocerca.

### 🔄 Comandos Útiles

#### Backend
```bash
cd backend
npm install
npm start  # Desarrollo
NODE_ENV=production npm start  # Producción
```

#### App Móvil
```bash
cd GPS
npm install
npm start  # Iniciar Metro
npm run android  # Ejecutar en Android
npm run ios  # Ejecutar en iOS
```

#### Frontend Web
```bash
cd frontend
npm install
npm run dev  # Desarrollo
npm run build  # Producción
```

#### Despliegue
```powershell
.\deploy.ps1 -ServerHost <IP-del-servidor> [-ServerUser <usuario>] [-RemotePath <ruta>] [-NodeEnv <entorno>] [-CorsOrigin <origen>]
```

**Parámetros del script de despliegue:**
- `-ServerHost`: IP o dominio del servidor remoto (requerido)
- `-ServerUser`: Usuario SSH (default: root)
- `-RemotePath`: Ruta remota del proyecto (default: /var/www/gps-tracker)
- `-NodeEnv`: Entorno Node.js (default: production)
- `-CorsOrigin`: Origen permitido para CORS (default: *)

**Ejemplo:**
```powershell
.\deploy.ps1 -ServerHost 192.168.1.100 -ServerUser ubuntu -CorsOrigin https://midominio.com
```

**Requisitos previos:**
- Conexión SSH al servidor remoto
- SCP instalado (o WinSCP para Windows)
- Node.js y npm instalados en el servidor
- PM2 se instalará automáticamente si no está presente

### 📊 Endpoints API

#### Dispositivos
- `POST /api/devices/register` - Registrar dispositivo
- `GET /api/devices` - Listar dispositivos
- `GET /api/devices/:id` - Obtener dispositivo
- `PUT /api/devices/:id` - Actualizar dispositivo
- `DELETE /api/devices/:id` - Eliminar dispositivo
- `GET /api/devices/:id/stats` - Estadísticas del dispositivo

#### Ubicaciones
- `POST /api/location` - Enviar ubicación(es)
- `GET /api/location/latest` - Última ubicación (autenticado)
- `GET /api/location/latest-any` - Última ubicación (cualquier dispositivo)
- `GET /api/location/history` - Historial de ubicaciones
- `GET /api/location/export` - Exportar GPX

#### Geocercas
- `POST /api/geofences` - Crear geocerca
- `GET /api/geofences` - Listar geocercas
- `DELETE /api/geofences/:id` - Eliminar geocerca
- `GET /api/geofences/:id/events` - Eventos de geocerca

### 🛡️ Variables de Entorno

#### Backend
- `PORT` - Puerto del servidor (default: 3000)
- `NODE_ENV` - Entorno (development/production)
- `CORS_ORIGIN` - Origen permitido para CORS (default: *)

### 📝 Notas Importantes

1. **Migración de Base de Datos**: Las nuevas tablas se crean automáticamente al iniciar el servidor gracias a `initSchema()`.

2. **Compatibilidad**: Los cambios realizados son backward compatible. No se eliminaron endpoints existentes.

3. **Seguridad**: Se recomienda configurar `CORS_ORIGIN` en producción.

4. **Performance**: Los nuevos índices mejoran el rendimiento de consultas frecuentes.

### 🚨 Errores Conocidos y Soluciones

1. **AsyncStorage Keys**: Si la app móvil muestra datos incorrectos, limpia los datos de la app ya que las claves cambiaron.
2. **Endpoint Sync**: El endpoint `/api/location/sync` ya no existe; usar `/api/location` con arrays.

### 🎯 Próximos Pasos Sugeridos

1. Implementar la lógica de detección de geocercas en el tracker móvil.
2. Agregar autenticación de usuarios para el dashboard web.
3. Implementar notificaciones push para eventos de geocercas.
4. Agregar exportación en otros formatos (KML, CSV).
5. Implementar modo de ahorro de batería mejorado.

---

**Última actualización**: 2026-08-02
**Estado del proyecto**: ✅ Funcional y mejorado