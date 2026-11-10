# 9 nov 2026 — Fase 6: diseño de feria

Rama `fase/6-diseno`, creada desde `fase/2b-calidad`. No se unió a `master`.

## 1. Cambio de rumbo

Primero se probó un diseño con íconos ilustrados (Game Icons) en vez de fotos. A Aldo no le gustó ("se ve muerto") y pidió **fotos reales**. Se descartó: no quedan íconos como imagen de producto ni emojis en la interfaz.

## 2. Qué se hizo

- **Herramientas** (commit propio, con su licencia en `.claude/skills/`): `frontend-design` (Anthropic), `web-design-guidelines` (Vercel Labs) y `playwright-cli` (Microsoft, viene con Playwright 1.65). Además `react-icons` (Lucide para la interfaz).
- **Fotos reales**:
  - 33 productos en `public/productos/<sku>.webp` (800×800 WebP). Envases de tienda agrícola (Agrizon) cuando había el producto o uno del mismo tipo — con marca exacta: Gramoxone, Oberon, Bravo 720 (= Bravonil 720), Jacto PJH, Pioneer, Urea 46 % —, y fotos libres de Wikimedia Commons/Openverse para el resto.
  - 5 categorías en `public/categorias/` y la portada (terrazas de un valle andino, Unsplash) en `public/portada/`.
  - Fuente, autor, licencia y nota de cada una en `docs/CREDITOS_IMAGENES.md` (enlaces de tienda verificados uno por uno).
- **Migración `0004_imagenes_productos.sql`**: `imagen_url = '/productos/<sku>.webp'` en los 33, sin pisar fotos subidas por el admin. **Pendiente de que Aldo la corra.**
- **Esquema de productos**: `imagen_url` acepta https o `/productos/<sku>.webp` (antes `z.url()` rechazaba las rutas locales y el admin no habría podido editar los productos).
- **Color por categoría** (`src/lib/categorias.ts`, `EtiquetaCategoria`): Semillas verde, Riego azul, Agroquímicos naranja, Herramientas tierra, Cañerías gris azulado.
- **Tarjeta de producto**: foto cuadrada de borde a borde, franja de color de la categoría, zoom y elevación al pasar, precio grande.
- **Portada de feria**: hero con foto, título, buscador (lleva a `/catalogo?q=`) y "Ver catálogo"; categorías con foto; vitrina de destacados (Jacto, Pioneer, aspersor, urea, con respaldo automático); "Cómo comprar" en 3 pasos; zonas reales de la base; footer con el Grupo 20 y créditos.
- **Sistema de diseño**: tokens en Tailwind, Bricolage Grotesque + Figtree (`next/font`), tono trigo `#d4b26a` para detalles, foco visible, enlace "Saltar al contenido", skeleton con brillo, avisos con ícono, marco común en las pantallas de acceso, respeto de "reducir movimiento".
- **Docs**: `docs/DISENO.md` (brief), CLAUDE.md (trigo, fotos, color por categoría, íconos), LEEME de migraciones (0002 y 0003 marcadas como corridas, 0004 pendiente).

## 3. Evidencia

- `npx tsc --noEmit` y `npm run lint`: sin errores ni warnings.
- Build de producción en `.next-e2e`: compila.
- `npm run test:e2e:prod`: **19 pasaron, 0 fallaron, 4 omitidas** (las 4 que necesitan la cuenta admin: en esta rama no hay credenciales en `.env.test.local`). En el camino falló una por un problema real (la foto de respaldo duplicaba el nombre en la miniatura del carrito): se arregló la app.
- Capturas 1280 y 360 px de portada, catálogo y ficha (antes y después). Las del "después" simulan la 0004 en el navegador de la prueba (`CAPTURAS_SIMULAR_0004=1`: datos reales + la `imagen_url` que pone la migración).

## 4. Pendientes para Aldo

1. Correr `supabase/migrations/0004_imagenes_productos.sql`.
2. Quitar el correo y la contraseña del admin de `.env.test.example` (está en git) y ponerlos en `.env.test.local`. Con eso vuelven a correr las 4 pruebas de admin.
3. Antes de comercializar: reemplazar las fotos marcadas como "Derechos del titular" (ver `CREDITOS_IMAGENES.md`).
