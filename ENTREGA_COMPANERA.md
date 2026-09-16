# Entrega GPS: Supabase, Vercel y APK

## Como trabajar sin romper el proyecto

Reglas obligatorias antes de tocar cualquier archivo:

1. Nunca trabajes directo en `main`. Crea siempre una rama:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b fix/mi-cambio
   ```

2. Antes de enviar tu rama, valida que todo siga funcionando (si falla, corrije y repite):

   ```bash
   npm test
   npm run lint
   npm run build
   ```

3. Publica la rama y crea un Pull Request contra `main` desde GitHub. No hagas push directo a `main`.

4. No edites ni borres sin razonar:
   - `vite.config.js` y los archivos de test: eliminarlos/alterarlos rompe el proyecto (jsdom no esta instalado).
   - Componentes con otra IA: solo edita lo que te pidieron, no borres archivos "que no se usen" sin confirmar con Git (`.map-live-card`, `VideoFeed`, etc. ya se limpiaron).
   - Y nunca subas `.env`, keystores ni claves. Git tiene `.gitignore`; repasa `git status` antes de commitear.

5. Antes de un deploy a Vercel, deja que `main` sea la rama estable y haz el Redeploy desde `main`.

## Estado del codigo

Commit publicado en GitHub:

```text
2ea75d8 Completa monitoreo GPS, autenticacion y APK Android
```

Repositorio:

```text
https://github.com/maria45889/GPS.git
```

## 1. Supabase

1. Abrir el proyecto Supabase correcto.
2. Ir a SQL Editor.
3. Ejecutar completo el archivo `supabase_setup.sql`.
4. En Authentication > Providers, activar Email.
5. Crear el usuario administrador desde Authentication > Users.
6. Crear una organizacion y asociar el usuario en `public.profiles`.

Ejemplo despues de crear un usuario y una organizacion:

```sql
insert into public.organizations (name)
values ('Operacion principal')
returning id;

insert into public.profiles (user_id, organization_id, full_name, role)
values ('UUID_DEL_USUARIO_AUTH', 'UUID_DE_LA_ORGANIZACION', 'Administrador', 'owner');
```

No usar `admin/admin` en produccion. Crear un correo de administrador y una contrasena segura en Supabase Auth.

## 2. Variables de Vercel

En el proyecto de Vercel configurar para Production, Preview y Development:

```text
VITE_SUPABASE_URL=https://wsmqgjcfheraxorljhjc.supabase.co
VITE_SUPABASE_ANON_KEY=CLAVE_PUBLISHABLE_DEL_PROYECTO
```

Despues hacer Redeploy desde el commit `2ea75d8`.

El dominio publicado debe cargar primero el formulario de acceso. Si carga directamente el mapa sin login, Vercel esta sirviendo un build anterior.

## 3. Configuracion local

En `gps-dashboard/.env` usar la URL y clave publishable del proyecto. Nunca subir `.env`, claves privadas o keystores a Git.

```bash
cd gps-dashboard
npm install
npm test
npm run build
```

## 4. Generar APK instalable por WhatsApp

Para una prueba directa en un telefono Android se puede generar APK debug:

```bash
cd gps-dashboard
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

Archivo generado:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Ese APK se puede enviar por WhatsApp. En el telefono hay que permitir la instalacion desde esa fuente y conceder ubicacion precisa y notificaciones al abrirlo.

## 5. Firma para Play Store

El APK debug no sirve para Google Play. Para release se necesita una clave privada fuera del repositorio:

```bash
export GPS_RELEASE_STORE_FILE=/ruta/gps-release.jks
export GPS_RELEASE_STORE_PASSWORD='***'
export GPS_RELEASE_KEY_ALIAS='gps-tracker'
export GPS_RELEASE_KEY_PASSWORD='***'

cd gps-dashboard/android
./gradlew clean assembleRelease
```

El release solo debe generarse con esas variables. Nunca guardar las contrasenas en `build.gradle`.

## 6. Prueba completa

1. Ejecutar el SQL en Supabase.
2. Crear el usuario administrador.
3. Crear su perfil y organizacion.
4. Configurar variables de Vercel.
5. Redeployar Vercel.
6. Instalar el APK.
7. Abrir el APK y aceptar permisos.
8. Esperar el primer envio GPS.
9. Revisar `devices.last_seen` y `gps_locations` en Supabase.
10. Abrir el panel e iniciar sesion.
11. Confirmar que el dispositivo aparece en el mapa y pasa a offline si deja de enviar durante 90 segundos.

## Limitacion de control

El panel puede crear comandos en `vehicle_commands`. Para ejecutar una inmovilizacion fisica hace falta un modulo GPS/relay instalado en la moto y su protocolo de comunicacion. El celular por si solo no puede cortar fisicamente la ignicion.
