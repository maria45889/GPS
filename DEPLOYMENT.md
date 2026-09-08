# 🚀 Guía de Despliegue

Guía paso a paso para desplegar el panel GPS en producción.

## 📋 Requisitos Previos

1. Cuenta en Supabase (gratis)
2. Cuenta en Vercel o Netlify (ambas gratuitas)
3. Credenciales de Supabase (URL y ANON key)

## 🔧 Paso 1: Configurar Supabase

### 1.1 Crear proyecto en Supabase
1. Ir a [supabase.com](https://supabase.com/)
2. Crear cuenta gratuita
3. Crear nuevo proyecto
4. Esperar a que el proyecto esté listo (2-3 minutos)

### 1.2 Ejecutar script SQL
1. Ir a SQL Editor en el dashboard de Supabase
2. Copiar el contenido de `supabase_setup.sql`
3. Pegar y ejecutar el script
4. Verificar que no haya errores

### 1.3 Habilitar Realtime
1. Ir a Database > Replication
2. Verificar que `gps_locations` esté en la publicación `supabase_realtime`
3. Si no está, ejecutar:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE gps_locations;
   ```

### 1.4 Obtener credenciales
1. Ir a Settings > API
2. Copiar:
   - `Project URL`
   - `anon public key`

## 🌐 Paso 2: Configurar el Panel Web

### 2.1 Actualizar credenciales en index.html
1. Abrir `public/index.html`
2. Buscar las líneas 268-270
3. Reemplazar con tus credenciales reales:

```javascript
const SUPABASE_URL = 'https://tu-proyecto-real.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Tu clave ANON real
```

## 📦 Paso 3: Desplegar en Vercel (Recomendado)

### 3.1 Instalar Vercel CLI
```bash
npm i -g vercel
```

### 3.2 Iniciar sesión
```bash
vercel login
```

### 3.3 Desplegar
```bash
cd GPS
vercel
```

Sigue las instrucciones:
- Set up and deploy? → Yes
- Which scope? → Tu cuenta
- Link to existing project? → No
- What's your project's name? → gps-panel (o el que prefieras)
- In which directory is your code located? → ./
- Want to override the settings? → No

### 3.4 Verificar despliegue
Vercel te dará una URL como: `https://gps-panel.vercel.app`

## 📦 Paso 4: Desplegar en Netlify (Alternativa)

### 4.1 Instalar Netlify CLI
```bash
npm i -g netlify-cli
```

### 4.2 Iniciar sesión
```bash
netlify login
```

### 4.3 Desplegar
```bash
cd GPS
netlify deploy --prod
```

Sigue las instrucciones:
- What would you like to do? → Create & deploy a new site
- Team? → Tu equipo o personal
- Site name? → gps-panel (o el que prefieras)
- Site path? → ./
- Build command? → (dejar vacío)
- Publish directory → public

### 4.4 Verificar despliegue
Netlify te dará una URL como: `https://gps-panel.netlify.app`

## 📦 Paso 5: Desplegar en GitHub Pages (Alternativa)

### 5.1 Subir a GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tu-usuario/GPS.git
git push -u origin main
```

### 5.2 Habilitar GitHub Pages
1. Ir al repositorio en GitHub
2. Settings > Pages
3. Configurar:
   - Source: Deploy from a branch
   - Branch: main
   - Folder: /public
4. Guardar cambios

### 5.3 Verificar despliegue
El panel estará en: `https://tu-usuario.github.io/GPS/`

## 📱 Paso 6: Configurar el APK

### 6.1 Actualizar credenciales en el APK
Revisa `APK_INTEGRATION.md` para las instrucciones completas.

Básicamente, el APK debe usar:
```kotlin
private val SUPABASE_URL = "https://tu-proyecto-real.supabase.co"
private val SUPABASE_KEY = "tu-clave-anon-real"
private val API_BASE_URL = "$SUPABASE_URL/rest/v1/gps_locations"
```

### 6.2 Headers requeridos
```kotlin
conn.setRequestProperty("apikey", SUPABASE_KEY)
conn.setRequestProperty("Authorization", "Bearer $SUPABASE_KEY")
conn.setRequestProperty("Content-Type", "application/json")
```

## ✅ Paso 7: Verificar Funcionamiento

### 7.1 Probar el panel web
1. Abrir la URL del despliegue
2. Verificar que el mapa cargue
3. Seleccionar un dispositivo (si hay datos)

### 7.2 Probar envío desde APK
1. Enviar datos GPS desde el APK
2. Verificar que aparezcan en el panel en tiempo real
3. Verificar la consola del navegador para errores

### 7.3 Probar Realtime
1. Abrir el panel en dos pestañas
2. Enviar datos desde el APK
3. Verificar que ambas pestañas se actualicen simultáneamente

## 🔒 Paso 8: Seguridad (Opcional para Producción)

### 8.1 Restringir políticas RLS
```sql
-- Eliminar políticas públicas
DROP POLICY "Allow insert for all" ON gps_locations;
DROP POLICY "Allow select for all" ON gps_locations;

-- Crear políticas más restrictivas
CREATE POLICY "Allow insert with device key" ON gps_locations
    FOR INSERT
    WITH CHECK (true); -- Agregar lógica de autenticación

CREATE POLICY "Allow select with device key" ON gps_locations
    FOR SELECT
    USING (true); -- Agregar lógica de autenticación
```

### 8.2 Implementar autenticación
Considera usar Supabase Auth para proteger el panel web.

## 📊 Monitoreo

### Verificar datos en Supabase
1. Ir a Table Editor en Supabase
2. Seleccionar tabla `gps_locations`
3. Ver datos en tiempo real

### Verificar logs de Realtime
1. Ir a Database > Replication en Supabase
2. Ver estadísticas de conexión

## 🐛 Troubleshooting

### El panel no carga
- Verificar que las credenciales en `index.html` sean correctas
- Revisar la consola del navegador para errores
- Verificar que Supabase esté accesible

### Las actualizaciones no son en tiempo real
- Verificar que Realtime esté habilitado en Supabase
- Ejecutar: `ALTER PUBLICATION supabase_realtime ADD TABLE gps_locations;`
- Revisar la consola del navegador para errores de WebSocket

### El APK no envía datos
- Verificar que los headers estén correctos
- Revisar que la URL de Supabase sea correcta
- Verificar que la clave ANON sea válida

## 🎉 ¡Listo!

Tu panel GPS está desplegado y funcionando en producción.
