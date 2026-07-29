<div align="center">

# 📍 GPS Tracker App

**Aplicación de rastreo GPS en tiempo real con React Native y Node.js**

[![React Native](https://img.shields.io/badge/React_Native-0.61.5-blue.svg)](https://reactnative.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Sistema completo de rastreo GPS con aplicación móvil React Native y backend Node.js para seguimiento en tiempo real de ubicaciones.

</div>

---

## 📖 Descripción del Proyecto

GPS Tracker App es una aplicación completa de rastreo GPS que permite:

- **Rastreo en tiempo real** de dispositivos móviles
- **Historial de ubicaciones** almacenado en base de datos
- **Dashboard web** para visualización en mapa
- **Múltiples dispositivos** conectados simultáneamente
- **Rastreo en segundo plano** sin interrumpir el uso del dispositivo
- **Soporte offline** con cola de ubicaciones pendientes

---

## ✨ Funcionalidades Principales

### 📱 Aplicación Móvil (React Native)
- **Rastreo GPS en tiempo real** con alta precisión
- **Envío automático** de ubicaciones al servidor
- **Configuración flexible** de URL del servidor
- **Rastreo en segundo plano** (background location)
- **Cola offline** para ubicaciones cuando no hay conexión
- **Interfaz intuitiva** para monitoreo de estado

### 🖥️ Backend (Node.js)
- **API REST** para gestión de ubicaciones
- **Socket.IO** para comunicación en tiempo real
- **Base de datos SQLite** con sql.js
- **Simulador GPS** para pruebas
- **Rate limiting** y seguridad con Helmet
- **CORS configurado** para comunicación segura

### 🌐 Dashboard Web
- **Visualización en mapa** de ubicaciones en tiempo real
- **Historial de rutas** de dispositivos
- **Panel de administración** de dispositivos conectados
- **Estadísticas de uso** y métricas

---

## 🛠 Tecnologías Utilizadas

### Frontend (Móvil)
- **React Native 0.61.5** - Framework para apps móviles
- **TypeScript 5.x** - Tipado estático
- **Expo** - Desarrollo React Native
- **React Navigation** - Navegación en la app

### Backend
- **Node.js 18.x** - Entorno de ejecución
- **Express 4.21.0** - Framework web
- **Socket.IO 4.8.3** - Comunicación en tiempo real
- **SQLite (sql.js 1.12.0)** - Base de datos
- **Helmet 7.1.0** - Seguridad HTTP
- **CORS 2.8.5** - Cross-Origin Resource Sharing
- **express-rate-limit 8.5.2** - Limitación de solicitudes

### Comunicación
- **REST API** - Para operaciones CRUD
- **WebSockets (Socket.IO)** - Para actualizaciones en tiempo real
- **HTTP/HTTPS** - Protocolo de transporte

---

## 📁 Estructura del Proyecto

```
GPS APP/
├── GPS/                          # Aplicación React Native (móvil)
│   ├── src/                      # Código fuente TypeScript
│   │   ├── components/           # Componentes React Native
│   │   ├── screens/              # Pantallas de la app
│   │   ├── services/             # Servicios (GPS, API)
│   │   └── utils/                # Utilidades
│   ├── android/                  # Configuración Android
│   ├── ios/                      # Configuración iOS
│   ├── App.tsx                   # Componente principal
│   ├── package.json              # Dependencias móviles
│   └── tsconfig.json             # Configuración TypeScript
│
├── backend/                      # Servidor Node.js
│   ├── src/                      # Código fuente backend
│   │   ├── index.js              # Punto de entrada
│   │   ├── db.js                 # Configuración SQLite
│   │   ├── routes/               # Rutas API
│   │   └── simulator.js          # Simulador GPS para pruebas
│   ├── data/                     # Archivos de base de datos
│   ├── package.json              # Dependencias backend
│   ├── ecosystem.config.json     # Configuración PM2
│   └── deploy.sh                 # Script de despliegue
│
├── frontend/                     # Dashboard web (opcional)
│   ├── public/                   # Archivos estáticos
│   └── src/                      # Código fuente web
│
├── package.json                  # Dependencias raíz
├── README.md                     # Esta documentación
└── deploy.ps1                    # Script de despliegue (Windows)
```

---

## 📸 Capturas de Pantalla

> **Nota:** Las capturas de pantalla se agregarán próximamente.

### Aplicación Móvil
- [ ] Pantalla de inicio con configuración de servidor
- [ ] Dashboard de rastreo en tiempo real
- [ ] Historial de ubicaciones
- [ ] Configuración de preferencias

### Dashboard Web
- [ ] Mapa con ubicaciones en tiempo real
- [ ] Lista de dispositivos conectados
- [ ] Historial de rutas
- [ ] Panel de administración

---

## ⚙ Instalación y Ejecución

### Requisitos Previos

**Para el Backend:**
- Node.js 18.x o superior
- npm o yarn
- Git

**Para la App Móvil:**
- React Native CLI o Expo CLI
- Android Studio (para Android)
- Xcode (para iOS, solo macOS)
- Dispositivo físico o emulador

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/maria45889/GPS-APP.git
cd GPS-APP
```

### Paso 2: Configurar el Backend

1. Navegar al directorio del backend:
```bash
cd backend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno (opcional):
```bash
# El servidor usa configuración por defecto
# Puerto: 3000
# Base de datos: SQLite (data/gps.db)
```

4. Iniciar el servidor:
```bash
npm start
```

El servidor se ejecutará en `http://localhost:3000`

### Paso 3: Configurar la Aplicación Móvil

1. Navegar al directorio de la app:
```bash
cd GPS
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar la URL del servidor:
```bash
# Editar el archivo .env o configurar desde la app
# Por defecto: http://192.168.100.174:3000
# Para desarrollo local: http://YOUR_IP:3000
```

4. Iniciar Metro bundler:
```bash
npm start
```

5. Ejecutar en dispositivo/emulador:

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

### Paso 4: Acceder a la Aplicación

- **Backend API:** http://localhost:3000
- **Socket.IO:** ws://localhost:3000
- **App Móvil:** Configurar IP del servidor en la pantalla de inicio

---

## 🔧 Configuración

### Backend

El backend se configura automáticamente con valores por defecto:

```javascript
// Configuración en src/index.js
const PORT = process.env.PORT || 3000;
const DB_PATH = './data/gps.db';
```

### Aplicación Móvil

La URL del servidor se puede configurar:

1. **Desde la app:** Pantalla de inicio → Configurar servidor
2. **Archivo .env:** Crear archivo `.env` en la raíz de `GPS/`
```env
SERVER_URL=http://192.168.100.174:3000
```

### Simulador GPS

Para probar sin dispositivo físico:

```bash
cd backend
node src/simulator.js
```

---

## 🚀 Despliegue en Producción

### Backend en VPS

1. Copiar archivos al servidor:
```bash
scp -r backend/ user@server:/path/to/app
```

2. Instalar dependencias:
```bash
cd /path/to/app/backend
npm install --production
```

3. Usar PM2 para gestión de procesos:
```bash
npm install -g pm2
pm2 start src/index.js --name gps-tracker
pm2 save
pm2 startup
```

### App Móvil

**Android:**
```bash
cd GPS
cd android
./gradlew assembleRelease
```

**iOS:**
- Usar Xcode para archivar y subir a App Store

---

## 📊 Estado del Proyecto

### ✅ Funcionalidades Completas
- Rastreo GPS en tiempo real
- Backend con API REST
- Comunicación Socket.IO
- Base de datos SQLite
- Simulador GPS para pruebas
- Rastreo en segundo plano (Android)

### ⚠️ Funcionalidades En Desarrollo
- Dashboard web completo
- Autenticación de usuarios
- Geocercas y alertas
- Exportación de datos
- Notificaciones push

### ❌ Funcionalidades Pendientes
- App iOS completa
- Panel de administración avanzado
- Análisis de rutas
- Integración con mapas externos

---

## 🔮 Futuras Mejoras

### Roadmap

**Fase 1: Estabilidad**
- [ ] Mejorar manejo de errores
- [ ] Optimizar consumo de batería
- [ ] Tests unitarios y de integración

**Fase 2: Features**
- [ ] Autenticación de usuarios
- [ ] Geocercas con alertas
- [ ] Historial detallado con filtros
- [ ] Exportación de rutas (GPX, KML)

**Fase 3: Dashboard**
- [ ] Dashboard web completo con mapa
- [ ] Panel de administración
- [ ] Estadísticas y métricas
- [ ] Multi-tenancy

**Fase 4: Móvil**
- [ ] Completar versión iOS
- [ ] Notificaciones push
- [ ] Modo ahorro de batería
- [ ] Optimización para diferentes dispositivos

---

## 🤝 Contribución

Las contribuciones son bienvenidas. Para contribuir:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/NuevaFeature`)
3. Commit tus cambios (`git commit -m 'feat: agregar nueva feature'`)
4. Push a la rama (`git push origin feature/NuevaFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

---

## 👩‍💻 Autor

**María José Taco**

Desarrolladora Full Stack especializada en React Native y Node.js.

---

## 📞 Soporte

¿Tienes preguntas o sugerencias?

- 📧 Email: miniamigixv@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/maria45889/GPS-APP/issues)

---

<div align="center">

**⭐ Si te gusta este proyecto, ¡dale una estrella en GitHub! ⭐**

Made with ❤️ by María José Taco

</div>
