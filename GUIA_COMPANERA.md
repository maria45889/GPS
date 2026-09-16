# Guía para la compañera: ramas, pull y diseño del dashboard

Este es el flujo oficial. Si lo sigues tal cual, nada se rompe y yo puedo fusionar tus cambios a `main` sin conflicto.

---

## PARTE A — Tu flujo de trabajo (último entregado)

### Paso 1. Actualiza y crea tu rama (hazlo SIEMPRE)

Abre la terminal dentro de la carpeta del proyecto y ejecuta:

```bash
git checkout main
git pull origin main
git checkout -b tu-nombre-mejora
```

Ejemplo de nombre de rama: `maria-diseño-header`, `maria-mejora-mapa`. No uses `main` para trabajar nunca.

### Paso 2. Haz tus cambios

Usa tu IA como siempre, PERO respeta las reglas de la PARTE B. Revisa todo con:

```bash
git status
```

Si ves `gps-dashboard/.env` o cualquier archivo de claves, NO lo subas.

### Paso 3. Valida antes de subir (obligatorio)

```bash
npm test
npm run lint
npm run build
```

- `npm test` debe terminar en "12 passed" (o los que haya en ese momento).
- `npm run build` debe terminar con "✓ built".
- `npm run lint` puede mostrar warnings de "set-state-in-effect"; eso es normal y aceptado. Si muestra errores (red), corrígelos.

Si cualquiera de los tres falla, NO subas nada: primero corrígelo y repite.

### Paso 4. Sube tu rama

```bash
git status           # confirma que solo estén los archivos que tocaste
git add .
git commit -m "Describe en una frase qué cambiaste"
git push -u origin tu-rama
```

### Paso 5. Avísame

Créame el Pull Request en GitHub con **base `main`** (no des merge tú) o simplemente avísame el nombre de la rama. El merge lo hago yo.

### Si yo te digo que hay conflicto

```bash
git checkout tu-rama
git pull origin main
git push origin tu-rama
```

Resuelve los conflictos que marque tu editor (si toca muchos archivos, avísame y lo decidimos juntos) y vuelve a avisarme.

---

## PARTE B — Reglas de oro al cambiar el diseño (NO romper)

1. **No toques nunca**: `vite.config.js`, `package.json`, `src/test/*`, archivos `*.test.js`, `.env`, carpetas `android/*` (salvo que se te pida).
2. **No borres archivos ni componentes** "porque no parecen usados". Si crees que algo sobra, pregúntame primero. Yo ya hice una limpieza; los que quedan se usan.
3. **Trabaja sobre el tema oscuro actual** (`reference-dashboard`). No introduzcas un tema claro alternativo ni cambies la base del fondo.
4. **No rediseñes el Dashboard entero.** Su estructura es fija: `HeaderBar` (arriba: categoría Dispositivos/Motos, estado, salir) + panel izquierdo (info/control) + mapa (centro) + panel derecho (listas). Mejora secciones, no la arquitectura.
5. **Respeta la categoría** Dispositivos/Motos: si una tarjeta es de moto muestra datos de moto (placa, vel, control); si es del dispositivo GPS muestra batería, precisión y último reporte. No mezclarlos.
6. **Usa los estilos que ya existen** en `src/index.css`: colores, bordes, sombras y clases como `dashboard-*`, `neon-border`, `glass-panel`. Si necesitas algo nuevo, **añádelo al final del archivo** en vez de editar bloques existentes.
7. **Estados legibles**: un punto de color siempre acompañado de texto (En línea / Detenido / Offline). Nunca color a secas.
8. **Móvil**: el menú lateral es un drawer (`mobile-drawer`); no lo rompas ni lo ocultes.

---

## PARTE C — Cómo diseñar BIEN el dashboard (objetivo visual)

Pásale estas pautas a tu IA junto con tu pedido de diseño:

- **Paleta:** fondo marino oscuro `#07111c`; paneles `#0d1420`/`#11181d`; acentos cian `#67e8f9` para botones/links/enlaces; verde `#00e676` para "En línea"; ámbar `#f2c66d` para "Detenido"; gris `#8b9ba1` para "Offline".
- **Jerarquía:** números grandes y claros para los datos principales (velocidad, batería, precisión); labels cortos en mayúsculas con letter-spacing. No más de 2 tamaños tipográficos por sección.
- **El mapa domina:** paneles laterales de ancho fijo (~300-340 px), el centro es siempre el mapa.
- **Coherencia:** bordes redondeados de 8-12 px, sombras suaves, overlays con vidrio (blur). Nada de imágenes hero, ni videos de fondo, ni scroll infinito dentro de paneles.
- **Aire:** márgenes y espacios parejos; una tarjeta no debe pegarse con la otra. Menos es más.
- **Acciones:** un solo botón primario por tarjeta; las acciones destructivas (inmovilizar/eliminar) en rojo/ámbar y con confirmación.
- **No inventes datos:** lo que no llega del backend no se muestra con valores de ejemplo. Muestra "—" o esconde el campo.
- **Accesible:** contraste suficiente, botones tappables (>=40 px), navegable con teclado, `aria-label` en botones de icono.

### Ejemplo de pedido para su IA

> "Rediseña visualmente el panel derecho de lista de dispositivos del dashboard React ya existente. Respeta la estructura de Dashboard.jsx y la categoría (Dispositivos/Motos). Usa la paleta oscura existente (fondos #07111c y paneles #0d1420, acento cian #67e8f9, estados verde #00e676 / ámbar #f2c66d / gris #8b9ba1). Mejora jerarquía tipográfica, espaciado y los estados con punto de color + texto. No borres componentes, no toques vite.config.js ni tests. Los estilos nuevos agrégalos al final de src/index.css (clases prefijadas)."

---

## PARTE D — Merge que haré yo cuando avises

Comandos si la compañera solo te dio el nombre de la rama (sin PR):

```bash
git checkout main
git pull origin main
git fetch origin
git merge --no-ff origin/MI_RAYA
git push origin main
```

Si prefieres el botón de GitHub: PR abierto contra `main` → "Merge pull request". Si GitHub muestra "This branch has conflicts", dile a ella que ejecute el bloque "Si yo te digo que hay conflicto" de la PARTE A.