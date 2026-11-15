# Fase 3 — Diseño (14 nov 2026)

Rama `fase/3-diseno`, desde `master` con la 2B unida (PR #11). Solo presentación: no se tocaron la API, las consultas, `src/lib/**` ni la base.

## Qué se hizo

- **Tokens en una sola fuente.** Colores como variables `--color-*` en `src/app/globals.css` (canales RGB, para que funcione `bg-acento/10`) y expuestos en `tailwind.config.ts`. Nuevos: `borde-fuerte`, `texto-3` y los de estado `estado-pendiente|ok|camino|error` con su `-texto`. Tres sombras: `shadow-tarjeta`, `shadow-tarjeta-hover`, `shadow-flotante`. Se borraron las variables viejas `--bg-primary`, `--accent-green`, etc. (grep: nadie las usaba).
- **Letra chica más grande, sobre todo en celular.** `text-xs` 15 px en celular / 14 px desde 640 px; `text-sm` 16 px / 15 px. Con variables `--letra-xs` y `--letra-sm`: los ~160 usos cambian sin tocar cada archivo. Los títulos no cambian.
- **Patrón único** en `src/components/ui/estilos.ts`: `claseBoton(variante, tamaño)` reemplaza los `!px-3 !py-2 text-sm` sueltos (todos siguen con 44 px de alto), `claseBotonCantidad` (antes copiado en carrito y ficha), `claseFiltro` (antes copiado en catálogo, inventario y envíos), `claseFilaFiltros`, `claseEnlace`, `claseTituloAdmin`. `Insignia` usa los tokens de estado; `ListaUsuarios` tenía un verde del tema oscuro viejo (`bg-green-900 text-green-400`) y ahora usa la insignia común.
- **Panel admin.**
  - `EncabezadoAdmin` (título, para qué sirve, acciones) y `TarjetasResumen`/`Cifra` (ícono con tono, cifra en `font-titulo`) en todas las pantallas.
  - **Inventario:** stock bajo, agotados y valor del inventario arriba; filtros con su cantidad; desde 768 px filas en columnas (producto | stock | estado | acciones), en celular tarjetas.
  - **Pagos:** filtros por estado en chips (antes un `select`), cifras de la lista, tarjeta en tres partes (`TarjetaPago`).
  - **Envíos:** los 4 grupos son cifras que filtran.
  - **Pedidos (`ListaPedidosAdmin`):** tarjeta en tres partes con los datos en lista.
  - **Menú del panel:** en celular, una fila que se desplaza y centra la opción activa (antes 4 filas, unos 200 px).
- **Tienda:** sombras y tarjetas con los tokens, códigos de pedido en `font-titulo` (antes `font-mono`), botón de WhatsApp y de `/cuenta` con las clases comunes.
- **Web Interface Guidelines:** `touch-action: manipulation`, resaltado del toque en el verde de la marca, `theme-color` crema y "Guardando…" con el carácter de puntos suspensivos.
- **Docs pendientes de la 2B:** `LEEME.md` (0011 corrida), `ESTADO.md` y la nota de la 2B con la corrida E2E (31/31, base intacta).

## Evidencia

- `npx tsc --noEmit`, `npm run lint`, `npm run build`: sin errores. El build se hizo con `NEXT_DIST_DIR=.next-e2e` para no pisar el `.next` del `npm run dev` del puerto 3000.
- Capturas en 1280, 412 y 360 px (Playwright, script fuera del repo). Servidor de producción en el 3210. Login normal con las 2 cuentas fijas de `.env.test.local`, solo lectura: no se confirmó ningún pedido; el carrito vive en el localStorage del navegador de prueba. En el panel se encendió "Mostrar datos de prueba", que es una preferencia del navegador.
- **Scroll horizontal: 0 de 39 capturas.** Se midió `scrollWidth` **con la red de seguridad apagada** (`overflow-x: visible` forzado), más la lista de elementos que se salen del borde: ninguno.

| Pantalla | 1280 | 412 | 360 |
|---|---|---|---|
| Portada, catálogo, ficha, carrito | 1280 | 412 | 360 |
| Checkout, mis pedidos | 1280 | 412 | 360 |
| Admin: panel, inventario, pagos, envíos, pedidos, usuarios | 1280 | 412 | 360 |

## Para revisar

- En envíos los 4 grupos dan 0 porque hoy no hay pedidos en esos estados: ahí se ve el estado vacío.
- El servidor `npm run dev` del puerto 3000 responde 500: `Cannot find module './1682.js'` en `.next/server/webpack-runtime.js`. Es un `.next` desfasado entre `dev` y un `build`, no un error del código. Se arregla parando el dev, borrando `.next` y volviendo a levantar.
