# 10 nov 2026 — Fase 6B: correcciones de la auditoría y tema claro

Rama `fase/6-diseno` (no se unió a `master`). Base: informe [`2026-11-09_auditoria.md`](2026-11-09_auditoria.md).

## Migraciones (escritas, **sin correr**: las corre Aldo, en este orden)

| Orden | Archivo | Qué hace | Mensaje esperado |
|---|---|---|---|
| 1 | `0005_zonas_villa_charcas.sql` | Deja por escrito las 5 zonas tal como están hoy en la base (por id); cualquier otra queda inactiva | `0005 OK: 5 zonas de envío desde Villa Charcas` |
| 2 | `0006_cancelacion_y_pagos.sql` | Cliente cancela solo con pedido y pago pendientes; si el admin cancela algo pagado o en revisión → `reembolso_pendiente` → `reembolsado` (`marcar_reembolsado`); dashboard con reembolsos | `0006 OK: cancelación protegida y reembolsos (pendiente → reembolsado)` |
| 3 | `0007_recojo_y_flota.sql` | Estado `listo_para_recoger` para recojo; columnas `recoge_nombre` / `recoge_ci`; `crear_pedido` con 2 parámetros nuevos | `0007 OK: recojo con "Listo para recoger" y flota con nombre y CI de quien recoge` |

Si aparece `FRENO`, no se guardó nada: pasar el mensaje.

**Compatibilidad:** el código funciona antes y después de las migraciones:
- La API de pedidos reintenta `crear_pedido` con la firma vieja si la base todavía no tiene la nueva (`PGRST202`). En ese caso, quién recoge va dentro de la dirección.
- Las consultas de pedidos repiten sin `recoge_nombre`/`recoge_ci` si esas columnas no existen (`42703`).

## Qué se corrigió

| Punto | Cambio |
|---|---|
| 1 Zonas | Migración 0005 (estado real de la base, por id) |
| 2 Cancelación | 0006 + UI: el botón "Cancelar pedido" se oculta si ya hay comprobante, con aviso "escríbenos por WhatsApp". Reembolso visible para el cliente (aviso en su pedido) y en `/admin/pagos` ("Marcar como reembolsado" con modal propio). Los pedidos cancelados con reembolso aparecen en `/admin/pagos`. Dashboard: "Reembolsos pendientes" |
| 3 Búsqueda | `src/lib/ecommerce/busqueda.ts`: sin tildes, en nombre, descripción, categoría y SKU, todas las palabras, con sinónimos de campo ("abono" → fertilizantes) |
| 4 Recojo y flota | Recojo: … preparando → **Listo para recoger** → entregado (`siguienteEstado` por tipo de zona; pestaña "Para recoger en tienda" en Envíos). Flota: nombre y CI de quien recoge (checkout, resumen, detalle, panel) |
| 5 Carrito sin cuenta | `/carrito` público; "Iniciar sesión y comprar" / "Crear cuenta gratis" con `?siguiente=/checkout`; login ⇄ registro conservan `?siguiente=` (`useConsultaSiguiente`) |
| 6 Checkout | Resumen lateral fijo (escritorio) y plegable (celular) desde el paso 1; pasos hechos clicables |
| 7 Comprobante | `SubirComprobante`: "Subir foto del comprobante" (cámara en celular), "Elegir archivo o PDF", vista previa, "Elegir otro" |
| 8 Carrito | Sincronizado entre pestañas (evento `storage`); "Quitar" con "Deshacer" (6 s) |
| 9 Catálogo y ficha | Con la API caída ya no dice "0 productos"; filtro, orden y búsqueda en la URL; ficha con "Otros productos de la categoría"; producto inexistente → "No encontramos este producto" + "Ver catálogo"; `not-found.tsx` con la marca |
| 10 Tema claro | Tokens nuevos en `tailwind.config.ts` (contrastes medidos), reemplazo de todos los colores fijos del tema oscuro, insignias y línea de tiempo con texto oscuro del estado, gráficos claros, hero con velo suave |
| 11 Letra y toque | `text-xs` = 14 px y `text-sm` = 15 px en la escala; menú 16 px; botones de 44 px (incluidos − y + del carrito) |
| 12 Portada celular | Destacados en carrusel horizontal (portada a 375 px: **8.313 → 5.977 px**), menos espacio entre secciones, números 1 2 3 enteros, zonas de igual altura, etiquetas "Recojo / En el pueblo / Por flota" |
| 13 /api-docs | `swagger-legible.css`: métodos y etiquetas con contraste AA (medido: sin fallas) |

También: un error de contraste que dejaba el texto "Agregado" oscuro sobre verde oscuro, y el campo del buscador del hero, que había quedado blanco sobre blanco con el cambio de tema (corregidos).

## Evidencia

- `npx tsc --noEmit` y `npm run lint`: sin errores ni warnings.
- Build de producción en `.next-e2e`: compila.
- `npm run test:e2e:prod`: **25 pasaron · 0 fallaron · 4 omitidas** (las 4 necesitan la cuenta admin: `.env.test.local` sigue con las variables vacías). Archivo nuevo `tests/e2e/fase-6b.spec.ts` (6 pruebas).
- Capturas antes/después en 1280 y 375 px (portada, catálogo, ficha, carrito, checkout, pedido): `.auditoria/6b-antes/` y `.auditoria/6b-final/` (excluidas de git). `/api-docs`: `.auditoria/6b-final-apidocs/`. **Sin captura del dashboard** por falta de credenciales de admin.
- Docs actualizados: CLAUDE.md (tema claro), `DISENO.md`, `specs/00-vision.md`, `specs/03-pagos.md`, `specs/04-distribucion.md`, `api/openapi.yaml` (estados nuevos, `recoge_*`, `POST /pagos/{id}/reembolso`), `ESTADO.md`, LEEME de migraciones.

## Pendientes

1. Aldo corre 0005 → 0006 → 0007.
2. Completar `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` en `.env.test.local` para correr las pruebas de admin y capturar el dashboard.
3. Datos E2E creados en esta sesión: cuentas `e2e+aud…@amlagrotech.test` y pedidos con nota "E2E: capturas 6B" o "E2E: pedido de prueba automática".
