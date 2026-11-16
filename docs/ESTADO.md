# AML AgroTech — Estado

**Actualizado:** 15 nov 2026 (rama `docs/uml-revision`; las fases 7, 8A y 8A-2 se unieron con los PR #17, #18 y #19). Revisado contra el código y las migraciones. Diagramas UML en [`uml/`](uml/README.md).

> ✅ Migraciones `0001` a `0015` corridas en la base real (la `0012`, avisos por Telegram; la `0013` y la `0014`, proveedores y demostración, el 14 nov 2026; la `0015`, órdenes de compra, el 15 nov 2026). Token y chat del admin en Supabase Vault.
>
> ✅ Deploy activo en Render: https://aml-agrotech.onrender.com (plan gratis: la primera visita tras un rato sin uso tarda unos 45 s en despertar; abrirla unos minutos antes de la demo).

**Fase 6 + 6B (diseño de feria y correcciones de la auditoría):** tema **claro** (crema, tarjetas blancas, verde de la marca, trigo), letra mínima de 14 px, fotos reales de los 33 productos, portada con la foto propia de Villa Charcas, carrito sin cuenta, checkout con resumen y pasos clicables, comprobante con cámara y vista previa, búsqueda sin tildes, reembolsos, recojo "Listo para recoger" y nombre/CI de quien recoge en flota. Brief en [`DISENO.md`](DISENO.md); auditoría en [`sesiones/2026-11-09_auditoria.md`](sesiones/2026-11-09_auditoria.md).

## Resumen por pilar

| Pilar | Estado | Qué hay | Qué falta |
|---|---|---|---|
| E-commerce | ✅ Probado E2E | Catálogo y portada con datos reales, ficha, carrito persistente, checkout en 3 pasos, pedidos con línea de tiempo, cancelación, nota de venta en PDF (fase 7), panel con cifras reales; recorrido admin probado E2E (10 nov) | Paginar `/admin/pedidos` |
| Seguridad | ✅ Probada E2E | Roles protegidos en base (`es_admin`, `proteger_campos_perfil`), RLS reescrita, middleware con rol verificado en servidor, `/admin/usuarios` real, recuperación de contraseña segura (solo con enlace de recuperación), mensajes de Auth reales, carrito por cuenta, `/cuenta`, encabezados de seguridad | En Supabase Auth: mínimo de contraseña 8 y Redirect URLs |
| Pagos | ✅ Probado E2E | QR de cobro real de la tienda (BNB, sin monto: el cliente escribe el monto que le muestra la app), transferencia con cuenta de demostración, contra entrega, comprobante en bucket privado, verificación con motivo de rechazo, reembolsos | Probar el rechazo en E2E; cargar la cuenta real de transferencia |
| Distribución | ✅ Probada E2E | Zonas editables, flota y guía, panel de envíos, recojo "Listo para recoger", WhatsApp | Definir `NEXT_PUBLIC_WHATSAPP_TIENDA`; confirmar los costos de referencia |
| Almacenamiento | ✅ Probado E2E | Kardex, entradas y ajustes, stock protegido, niveles, alertas, CSV, valor del inventario | — |
| Abastecimiento | ✅ Probado E2E | Proveedores (rol distribuidor) con presentaciones y fraccionamiento, órdenes de compra, recepción al kardex con costo promedio ponderado, margen, avisos por Telegram ([`specs/08-abastecimiento.md`](specs/08-abastecimiento.md)) | Mostrar el costo unitario en el kardex |
| API REST | ✅ Programada | 42 rutas y 50 operaciones en `src/app/api/**`, todas en `docs/api/openapi.yaml` (revisado el 15 nov), Swagger en `/api-docs` | — |
| UML | 🟡 En revisión | Casos de uso, clases, componentes, despliegue, secuencia y estados en Mermaid ([`uml/`](uml/README.md)) | Revisar en GitHub que se dibujen |
| Pruebas | ✅ 43/43 en verde (fase 7, 15 nov) | Playwright: seguridad, registro, compra, pagos, distribución, inventario, abastecimiento, nota de venta, admin, 360 px. Solo usan cuentas fijas `@amlagrotech.test` y cada prueba anula lo que crea ([`PRUEBAS.md`](PRUEBAS.md)). Historial de corridas: fase 4 31/31, fase 5 31/31, fase 6A 35/35, fase 6B 41/41, fase 7 **43/43 en 10,9 min**, siempre con la base intacta (huella de stock 3179, `costos_producto` vacía, 0 avisos de Telegram de prueba). La fase 8A-2 cambió `compra.spec` (carrito vacío tras el pedido) y quitó el interruptor de las pruebas: **todavía no se corrió** | Correr la suite completa con lo de la 8A-2; GitHub Actions |
| Deploy | ✅ Activo | Render: https://aml-agrotech.onrender.com | Next 14.2.35 es el último 14.2.x y `npm audit` aún marca una crítica en `next`: solo se arregla con Next 16 (cambio mayor), después de la feria |

## Base de datos real (15 nov 2026)

- Migraciones `0001` a `0015` corridas. Buckets `productos` (público) y `comprobantes` (privado). Extensiones `pg_net` y `pg_cron`; trabajo `aml-resumen-diario` (00:00 UTC = 20:00 de Bolivia). Secretos en Vault: `aml_telegram_token`, `aml_telegram_chat_admin`.
- Datos: antes de la revisión del 16 nov la base quedó limpia: 0 pedidos, 0 órdenes de compra y sin datos de prueba. Quedan los 36 productos, las 8 zonas activas (Sucre inactiva) y los 2 proveedores de demostración (`0014`, cuentas `@amlagrotech.test`).
- El panel admin muestra **siempre** los datos de todas las cuentas (desde la 8A-2 no hay interruptor). Los avisos de Telegram y el resumen de las 20:00 siguen sin contar las cuentas de prueba, así que las órdenes de los 2 proveedores de demostración no avisan.
- "Confirm email" apagado (para la feria).

## Excepción a "nunca hard-delete" (0015)

`anular_orden_compra_prueba` es **la única función que borra una fila**: si la orden de prueba que anula fue la **primera recepción** de un producto, borra la fila de ese producto en `costos_producto`, para que el producto vuelva a no tener costo (y el margen vuelva a "estimado"). Se acepta porque:

- `costos_producto` es un **dato calculado** (el promedio ponderado de las recepciones), no un registro de negocio;
- el **rastro queda completo en el kardex**: la entrada «Compra OC-…» con su costo y el ajuste «Limpieza E2E OC-…»;
- solo pasa en la **limpieza de pruebas**: la función es solo del admin y solo acepta órdenes de proveedores `@amlagrotech.test`. La API (`authenticated`) sigue **sin `delete`** sobre `costos_producto`, y un FRENO de la 0015 lo verifica.

## Plan de fases

| Fase | Rama | Pilar |
|---|---|---|
| 0 | `fase/0-reglas` | Reglas, skills y especificación ✅ |
| 1 | `fase/1-seguridad` | Seguridad + base de la API ✅ programada |
| 2 | `fase/2-comercio` | E-commerce, API REST, Swagger, inventario, pagos y distribución ✅ programada (reemplaza a las fases 2 a 5) |
| 2B | `fase/2b-calidad` | Arreglos de autenticación + pruebas E2E con Playwright ✅ |
| 2A | `fase/2a-zonas` | Zonas: distritos de Villa Charcas, Incahuasi y Culpina; Sucre inactiva ✅ (PR #10) |
| 2B | `fase/2b-pruebas-limpias` | Pruebas E2E sin basura: 2 cuentas fijas, limpieza al terminar, interruptor de datos de prueba en el panel (migración 0011; el interruptor se quitó en la 8A-2) ✅ (PR #11; E2E 31/31) |
| 3 | `fase/3-diseno` | Diseño unificado: tokens en una sola fuente, letra chica más grande en celular, panel admin con cifras y filtros, 0 scroll horizontal en 360 px ([sesión](sesiones/2026-11-14_fase-3-diseno.md)) ✅ (PR #12) |
| 4 | `fase/4-compra-facil` | Compra fácil: botones que dicen adónde llevan ("Ir a pagar" / "Seguir comprando"), pasos visibles, mensajes simples, datos recordados de la última compra, QR de demostración (reemplazado por el QR real de BNB en la 8A) con el monto exacto y estados simples para el cliente. Sin migración ([sesión](sesiones/2026-11-14_fase-4-compra-facil.md)) ✅ (PR #13) |
| 5 | `fase/5-telegram` | Avisos por Telegram al admin: pedido nuevo, comprobante por revisar, stock en el mínimo o agotado (sin repetir) y resumen diario a las 20:00 de Bolivia, desde la base con pg_net + pg_cron y secretos en Vault; las cuentas de prueba no avisan. Comprobante desde la galería con la foto achicada a JPG. Migración 0012 ([sesión](sesiones/2026-11-14_fase-5-telegram.md)) ✅ (PR #14) |
| 6A | `fase/6a-distribuidor` | Distribuidor = proveedor mayorista: rol asignado solo por el admin (registro solo de clientes), fichas de proveedores y presentaciones con fraccionamiento (unidades de venta que trae) y precio mayorista; panel `/distribuidor` y `/admin/abastecimiento/distribuidores`; costos en tabla solo del admin; 2 proveedores de demostración `.test`. Migraciones 0013 y 0014 ([sesión](sesiones/2026-11-14_fase-6a-distribuidor.md)) — corridas, E2E 35/35 ✅ (PR #15) |
| 6B | `fase/6b-abastecimiento` | Órdenes de compra (borrador → enviada → aceptada → despachada → recibida, o rechazada/cancelada), recepción con fraccionamiento al kardex, costo promedio ponderado, margen y avisos de Telegram de las órdenes. Migración 0015 ([sesión](sesiones/2026-11-14_fase-6b-abastecimiento.md)) — corrida el 15 nov, E2E 41/41 ✅ (PR #16) |
| 7 | `fase/7-nota-venta` | Nota de venta en PDF (sin valor fiscal) por pedido: `GET /api/pedidos/{id}/nota` con pdfkit en el servidor, desde que se confirma; cancelado que se llegó a confirmar → marca ANULADA; ajeno 404, pendiente 409. Botón en el detalle y «Nota PDF» en el panel. Sin migración ([sesión](sesiones/2026-11-15_fase-7-nota-venta.md)) — E2E 43/43 ✅ (PR #17) |
| 8A | `fase-8a-revision` | Para la revisión: QR de cobro real de BNB por defecto, pasos de ayuda y estados vacíos en `/distribuidor` y `/admin/abastecimiento`, README del proyecto y capturas a 1280 y 360 px ✅ (PR #18) |
| 8A-2 | `fase-8a-carrito` | El carrito se vacía solo al crear el pedido y sigue vacío al recargar o volver con Atrás; sin interruptor «Mostrar datos de prueba» (el panel muestra todo); botón «Mis pedidos» en la pantalla de éxito; montos una sola vez en el paso Pago. Sin migración ✅ (PR #19; E2E sin correr) |
| 8B | `docs/uml-revision` | Documentación: HU y CU de abastecimiento, nota de venta y avisos; diagramas UML en Mermaid ([`uml/`](uml/README.md)); OpenAPI revisada contra las 42 rutas. Sin código — en revisión |
| 6 | `fase/6-diseno` | Diseño de feria: fotos reales, color por categoría, tipografía y portada ✅ |
| 6B | `fase/6-diseno` | Correcciones de la auditoría + tema claro ✅ (unida a `master`, PR #5) |
| 6 | `fase/6-pulido` | Cuentas demo y celular (el README se hizo en la 8A) |
| 7 | — | Deploy en Render ✅ + Lab 10 ✅ entregado (Grupo 20) |
| 8 | — | Documento final de la materia (los diagramas UML están en la 8B) |
