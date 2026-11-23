# 09 — Avisos por Telegram al administrador

Fases 5 y 6B. Migraciones `0012` (avisos de la tienda) y `0015` (avisos de órdenes de compra), corridas en la base real el 14 y 15 nov 2026. ✅ Programado y probado: los avisos de ejemplo llegaron al chat del admin y las E2E comprobaron que las cuentas de prueba no mandan ninguno.

El **sistema** avisa al admin de lo que pasa en la tienda sin que esté mirando el panel. Hay un segundo destino (0020): el **grupo de repartidores**, que solo recibe «🛵 Entrega disponible» (detalle y cómo crear el grupo en [`12-reparto-externo.md`](12-reparto-externo.md)).

## Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| ✅ HU-T01 | Como **administrador** quiero un aviso por Telegram cuando entra un pedido nuevo (código, cliente, zona, total y enlace) | Alta |
| ✅ HU-T02 | Como **administrador** quiero un aviso cuando un cliente sube un comprobante, para revisarlo pronto | Alta |
| ✅ HU-T03 | Como **administrador** quiero un aviso cuando un producto llega a su stock mínimo o se agota, sin que se repita mientras siga bajo | Alta |
| ✅ HU-T04 | Como **administrador** quiero un resumen del día a las 20:00 (pedidos, total vendido, pagos por revisar, envíos y productos bajos) | Media |
| ✅ HU-T05 | Como **administrador** quiero un aviso cuando un proveedor acepta, rechaza o despacha una orden de compra | Media |

## Criterios de aceptación

- **Salen de la base, no de Next.js:** triggers de Postgres que encolan el mensaje con `pg_net` (HTTP asíncrono; espera hasta 10 s desde la 0021: con 3 s se perdieron 3 avisos el 18/11).
  - El mensaje se manda **después del commit**. Si Telegram falla o tarda, la compra, el comprobante o el movimiento ya están guardados.
  - Si la operación falla, la cola se deshace con ella y no sale ningún aviso.
  - Cubren todos los caminos (web, API, panel) y no dependen de que Render esté despierto.
- **Ningún aviso rompe la operación:** cada función va dentro de `exception when others` y solo deja un warning con el SQLSTATE, sin token ni datos del cliente.
- **Secretos en Supabase Vault:** `aml_telegram_token`, `aml_telegram_chat_admin` y (9F) `aml_telegram_chat_repartidores`. Nunca en el repo ni en Render. Sin secretos, los avisos no hacen nada. `aml_enviar_telegram_a(secreto, texto)` solo acepta esos dos chats.
- **Seguridad:** todas las funciones son `security definer`, con `search_path` vacío y **sin** `execute` para `public`, `anon` ni `authenticated`. Nada se puede llamar desde el navegador.
- **HU-T01:** trigger `aml_aviso_pedido_nuevo` sobre `pedidos`, diferido al commit para leer el total final. El enlace lleva a `/admin/pedidos?codigo=AML-…`, que muestra solo ese pedido.
- **HU-T02:** trigger `aml_aviso_comprobante` sobre `pagos`, cuando el pago pasa a `en_revision`.
- **HU-T03:** trigger `aml_aviso_stock` sobre `movimientos_inventario`. Avisa solo cuando el stock **cruza** el mínimo de arriba a abajo o llega a 0. Si se repone sobre el mínimo y vuelve a bajar, avisa otra vez. No guarda estado.
- **HU-T04:** `aml_aviso_resumen_diario()`, que `pg_cron` corre con el trabajo `aml-resumen-diario` a las 00:00 UTC = **20:00 de Bolivia**. Lista hasta 10 productos bajos y cuántos más hay.
- **HU-T05:** trigger `aml_aviso_orden_compra` sobre `ordenes_compra` al pasar a aceptada (con la fecha estimada), rechazada (con el motivo) o despachada (con transportista y guía).
- **Cuentas de prueba** (`aml_es_cuenta_prueba`: correos `@amlagrotech.test` y la cuenta admin de las E2E): no mandan ningún aviso, y el resumen no las cuenta. En el stock se mira quién hizo el movimiento y, si es una venta, de quién es el pedido; si el origen no se conoce, se avisa.
  - Los 2 proveedores de la demo (migración `0014`) tienen cuentas `@amlagrotech.test`: sus órdenes **no** avisan por Telegram.

## Actores

**Supabase** (`pg_net`, `pg_cron`, Vault) dispara los avisos y **Telegram** (Bot API, sistema externo) los entrega al chat del admin y al grupo de repartidores.
