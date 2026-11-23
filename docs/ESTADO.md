# AML AgroTech — Estado

**Actualizado:** 22 nov 2026 (rama `docs/final`, cierre del proyecto). Revisado contra el código y la base real de Supabase. Diagramas UML en [`uml/`](uml/README.md); lo que queda para después de la feria, en [`MEJORAS_FUTURAS.md`](MEJORAS_FUTURAS.md).

> ✅ Migraciones `0001` a `0022` corridas en la base real. Vault con los 3 secretos de Telegram: token, chat del admin y chat del grupo de repartidores.
>
> ✅ Deploy activo en Render: https://aml-agrotech.onrender.com (plan gratis: la primera visita tras un rato sin uso tarda unos 45 s en despertar; abrirla unos minutos antes de la demo).
>
> ⚠️ El QR de cobro del BNB (`public/qr-bnb.jpg`) **vence el 23/11/2026**: renovarlo antes de la feria.

## Flujo final

- **Roles:** cliente, admin, repartidor y distribuidor. Solo el admin asigna roles; el registro crea siempre clientes.
- **Pago:** solo con QR. El cliente sube la foto del comprobante y el admin la verifica.
- **Preparación:** el admin prepara en «Por preparar» (marca cada producto, reporta faltantes) y deja «Listo para salir» con su etiqueta.
- **Entrega:**
  - recojo en tienda: el cliente dicta su código de 4 dígitos y el admin entrega;
  - a domicilio: un repartidor externo, avisado por el grupo de Telegram, acepta la entrega (el primero se la lleva), la recoge y la entrega con el código; gana el costo de envío y el admin le paga lo acumulado;
  - por flota: el admin despacha con empresa y guía y el cliente toca «Recibí mi pedido».
- **Abastecimiento:** el admin compra a los distribuidores con órdenes de compra y la recepción entra al kardex con su costo.

## Resumen por pilar

| Pilar | Estado | Qué hay | Qué falta |
|---|---|---|---|
| E-commerce | ✅ Probado E2E | Catálogo y portada con datos reales, ficha, carrito persistente, compra en una sola pantalla con datos recordados, pedidos con línea de tiempo (quién y cuándo), cancelación, recibo de compra en PDF, panel con cifras reales | Paginar `/admin/pedidos` |
| Seguridad | ✅ Probada E2E | Roles protegidos en base (`es_admin`, `proteger_campos_perfil`, `perfiles_rol_check`), RLS, middleware con rol verificado en servidor (`/admin`, `/distribuidor`, `/repartidor`), `/admin/usuarios`, recuperación de contraseña segura, código de entrega que solo ve el dueño, encabezados de seguridad | En Supabase Auth: mínimo de contraseña 8 y Redirect URLs. Seguridad a fondo en [`MEJORAS_FUTURAS.md`](MEJORAS_FUTURAS.md) |
| Pagos | ✅ Programado | **Solo QR**: QR de cobro real de la tienda (BNB) grande y con «Ver en grande», comprobante en bucket privado, verificación con motivo de rechazo, reembolsos, pago al repartidor | Renovar el QR del BNB (vence el 23/11/2026) |
| Distribución | ✅ Programada | Zonas editables, «Por preparar» del admin, código de entrega de 4 dígitos, recojo con el código, flota con guía y «Recibí mi pedido», **repartidores externos** (disponible, aceptar atómico, recoger, entregar, ganado y por cobrar), aviso al grupo de Telegram, «Liberar entrega» y pago al repartidor en `/admin/repartidores`. Pantallas que se actualizan solas cada 10 s | Comprobar en Render que `NEXT_PUBLIC_TELEGRAM_GRUPO_REPARTIDORES` está cargada (si falta, no sale el botón «Unirme al grupo») |
| Almacenamiento | ✅ Probado E2E | Kardex, entradas y ajustes, stock protegido, niveles, alertas, CSV, valor del inventario | Mostrar el costo unitario en el kardex |
| Abastecimiento | ✅ Probado E2E | Proveedores (rol distribuidor) con presentaciones y fraccionamiento, órdenes de compra, recepción al kardex con costo promedio ponderado, margen, avisos por Telegram ([`specs/08-abastecimiento.md`](specs/08-abastecimiento.md)) | — |
| API REST | ✅ Programada | 63 rutas y 71 operaciones en `src/app/api/**`, todas en `docs/api/openapi.yaml` (revisado el 22 nov), Swagger en `/api-docs` | — |
| UML | ✅ Al día | Casos de uso, clases, componentes, despliegue, secuencia y estados en Mermaid ([`uml/`](uml/README.md)), revisados el 22 nov | — |
| Pruebas | 🟡 Suite escrita | Playwright: seguridad, registro, compra, pagos y flota, inventario, abastecimiento, recibo, reparto externo (9F), recojo (9G) y 360 px ([`PRUEBAS.md`](PRUEBAS.md)). Última corrida completa registrada: fase 7, **43/43**. Historial: fase 4 31/31, fase 5 31/31, fase 6A 35/35, fase 6B 41/41, fase 7 43/43 | Correr la suite completa con la 9F y la 9G, **solo con OK de Aldo**: la base ya tiene datos reales y cada corrida deja pedidos y órdenes cancelados de las cuentas `.test`. GitHub Actions |
| Deploy | ✅ Activo | Render: https://aml-agrotech.onrender.com | Next 14.2.35 es el último 14.2.x y `npm audit` aún marca una crítica en `next`: solo se arregla con Next 16 (cambio mayor), después de la feria |

## Base de datos real (22 nov 2026)

- **21 tablas** en `public`. Buckets `productos` (público) y `comprobantes` (privado). Extensiones `pg_net` y `pg_cron`; trabajo `aml-resumen-diario` (00:00 UTC = 20:00 de Bolivia). Secretos en Vault: `aml_telegram_token`, `aml_telegram_chat_admin` y `aml_telegram_chat_repartidores`.
- **Roles** (`perfiles_rol_check`): admin, cliente, distribuidor y repartidor. **8 cuentas:** 2 admin (la de Aldo y la de las E2E), 3 clientes, 2 distribuidores de demostración y 1 repartidor.
- **Limpieza del 17 nov (0022):** 0 pedidos, 0 órdenes, stock restaurado, contadores en 1, bucket `comprobantes` vacío y cuenta `almacen@amlagrotech.test` borrada.
- **Uso desde entonces** (base al 22 nov, sin tocar en este cierre):
  - 3 pedidos con QR a domicilio (20 nov): `AML-000001` y `AML-000002` completados, `AML-000003` pendiente. Ninguno es de cuentas de prueba.
  - 3 órdenes de compra despachadas, esperando recepción: `OC-000001` y `OC-000003` (Distribuidora Oriente Agro) y `OC-000002` (Agroinsumos del Sur).
  - **38 productos activos**: los 36 del catálogo base y 2 que cargó el admin el 20 nov («40-50-80», sin SKU, y «ridomil», `c-00054`). Revisar sus datos antes de la feria.
- 9 zonas (8 activas; Sucre inactiva).
- El panel admin muestra **siempre** los datos de todas las cuentas. Los avisos de Telegram y el resumen de las 20:00 no cuentan las cuentas de prueba.
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
| 8B | `docs/uml-revision` | Documentación: HU y CU de abastecimiento, nota de venta y avisos; diagramas UML en Mermaid ([`uml/`](uml/README.md)); OpenAPI revisada contra las rutas de entonces ✅ (PR #20) |
| 6 | `fase/6-diseno` | Diseño de feria: fotos reales, color por categoría, tipografía y portada ✅ |
| 6B | `fase/6-diseno` | Correcciones de la auditoría + tema claro ✅ (unida a `master`, PR #5) |
| 6 | `fase/6-pulido` | Cuentas demo y celular (el README se hizo en la 8A) |
| 7 | — | Deploy en Render ✅ + Lab 10 ✅ entregado (Grupo 20) |
| 8 | — | Documento final de la materia (los diagramas UML están en la 8B) |
| 9A | `fase/9a-imagenes` | Imágenes de productos que sube el admin (original + WebP de 800 px) ✅ (PR #21) |
| 9B | `fase/9b-google` | Inicio de sesión con Google ✅ (PR #22) |
| 9C | `fase/9c-cobro-almacen` | Preparación con responsable en cada paso, faltantes, «Listo para salir» y etiqueta. Migración 0017 ✅ (PR #23) |
| 9D | `fase/9d-entrega` | Entrega con código de 4 dígitos, completado y calificación. Migración 0018 ✅ (PR #24) |
| 9E | `fase/9e-compra-rapida` | Compra en 3 clics, visor del comprobante, recibo de compra ✅ (PR #25) |
| 9F | `fase/9f-flujo-final` | Flujo final: solo QR, el admin prepara, repartidores externos con Telegram, aceptar entrega y pago al repartidor. Migración 0020 ✅ (PR #26) |
| 9G | `fase/9g-pulir` | «Empezar a preparar» en la lista, aviso de recojo con el código, nombre ya escrito al entregar, pantallas que se actualizan cada 10 s, foto del comprobante a 1280 px. Migración 0021 (Telegram espera 10 s) ✅ (PR #27) |
| — | `docs/cierre` | Migración 0022: limpieza total antes de la feria ✅ (PR #28) |
| — | `docs/final` | Cierre: documentación revisada contra el código y la base, y [`MEJORAS_FUTURAS.md`](MEJORAS_FUTURAS.md) |
