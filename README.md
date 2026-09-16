# GPS Fleet Monitor

Panel web y aplicación Android para monitorear dispositivos GPS en tiempo real. El proyecto combina React/Vite, Supabase, Leaflet y un servicio Android en foreground para enviar la ubicación periódicamente, incluso con la pantalla apagada.

## Qué incluye

- Panel web protegido con Supabase Auth.
- Mapa con seguimiento de dispositivos y estado online/offline.
- Registro de dispositivos en `devices`.
- Historial de posiciones en `gps_locations`.
- Datos de latitud, longitud, velocidad, precisión, rumbo y batería.
- Alertas, geocercas, historial de rutas y comandos de vehículo.
- Aplicación Android con envío GPS cada 30 segundos.
- Tests unitarios y build de producción con Vite.

> Los comandos `activate`, `stop` e `immobilize` se registran en `vehicle_commands`. El APK del teléfono no puede cortar físicamente la ignición; para eso hace falta un módulo GPS/relé instalado en la moto.

## Estructura

```text
.
├── supabase_setup.sql       # Tablas, índices, RLS y Realtime
└── gps-dashboard/
    ├── src/                 # Panel React y lógica GPS/Supabase
    └── android/             # Proyecto Android generado con Capacitor
```

## Desarrollo local

Requisitos: Node.js 20 o superior y un proyecto Supabase.

```bash
cd gps-dashboard
npm install
npm run dev
```

Para ejecutar las validaciones:

```bash
npm test
npm run build
npm run lint
```

Configura las variables en `gps-dashboard/.env` o en el proveedor de despliegue. Usa solamente la clave publishable/anon:

```text
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_publishable
```

No subas `.env`, `service_role`, contraseñas, keystores ni archivos de configuración privados.

## Configuración de Supabase

1. Abre el proyecto Supabase correcto.
2. Ejecuta completo [`supabase_setup.sql`](supabase_setup.sql) en SQL Editor.
3. Activa Authentication con Email.
4. Crea el usuario real del panel desde Authentication > Users.
5. Crea una organización y relaciona el UUID del usuario en `public.profiles` con rol `owner` o `admin`.
6. Configura las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Vercel para Production, Preview y Development.
7. Haz Redeploy desde `main`.

El flujo esperado es:

```text
APK -> devices + gps_locations -> panel React -> mapa y estado offline
```

Un dispositivo se considera offline después de aproximadamente 90 segundos sin actualizar `last_seen`.

## APK Android

El proyecto Android está en `gps-dashboard/android`. Para generar un APK debug:

```bash
cd gps-dashboard
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

El archivo resultante queda en:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

En el teléfono se deben conceder ubicación precisa, notificaciones y funcionamiento en segundo plano, además de desactivar la optimización de batería para la aplicación.

## Despliegue

El panel puede desplegarse como aplicación Vite estática. El dominio publicado debe mostrar primero el acceso de Supabase; el dashboard no debe contener credenciales reales dentro del repositorio.

## Estado del proyecto

Este repositorio contiene el panel, la integración Supabase y el proyecto Android. El APK debug puede generarse localmente; la publicación en Play Store requiere una clave de firma privada que debe mantenerse fuera de Git.

## Colaboración

- Trabaja siempre en una rama y entrega cambios a través de un Pull Request contra `main`; nunca hagas push directo a `main`.
- Antes de enviar la rama ejecuta `npm test`, `npm run lint` y `npm run build`.
- No grafiques ni elimines `vite.config.js` ni los archivos de test: alterarlos rompe la validación.
- Consulta [ENTREGA_COMPANERA.md](ENTREGA_COMPANERA.md) para el flujo completo (Supabase, Vercel, APK y reglas de ramas/PR).
