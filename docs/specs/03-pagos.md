# 03 — Pagos

Rama real: `fase/2-comercio`. ✅ Programado. Migraciones corridas en la base real y probado E2E.
**Fase 9F (migración 0020): solo se paga con QR.** Efectivo al recibir y transferencia se dejaron de ofrecer; nada se borró (los pedidos viejos los conservan en su historial).

## Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| ✅ HU-P01 | Como **cliente** quiero pagar con QR desde la app de mi banco (desde la 9F es la única forma de pago) | Alta |
| ✅ HU-P02 | Como **cliente** quiero ver el QR grande y nítido con el monto exacto y el código del pedido como referencia | Alta |
| ✅ HU-P03 | Como **cliente** quiero subir la foto de mi comprobante para que la tienda verifique mi pago | Alta |
| ✅ HU-P04 | Como **administrador** quiero ver los pagos en revisión con su comprobante y aprobarlos o rechazarlos con motivo | Alta |
| ✅ HU-P05 | Como **cliente** quiero saber si mi pago fue verificado o rechazado (y por qué) y poder subir otro comprobante | Alta |
| ✅ HU-P06 | Como **administrador** quiero ver el total cobrado y por cobrar | Media |
| ✅ HU-P07 | Como **cliente** quiero ver en la línea de tiempo quién verificó o rechazó mi pago y a qué hora (fase 9C) | Alta |

HU-P08 (copiar los datos de la cuenta para transferir, 9C) quedó sin efecto en la 9F.

## Criterios de aceptación

- **Solo QR (0020).** El checkout no pregunta «¿Cómo quieres pagar?»: muestra «Pagas con QR». `crear_pedido` rechaza cualquier otro método («Solo se paga con QR.», 422) y `POST /api/pedidos` acepta solo `metodo_pago: "qr"` (si no viene, es QR). Ninguna zona permite efectivo (`permite_contra_entrega = false`; la columna queda, ya no se edita).
- **QR (9F, más grande):** es el QR de cobro real de la tienda (BNB), sin monto: `public/qr-bnb.jpg`, o la imagen de `NEXT_PUBLIC_QR_TIENDA_IMAGEN` si Render la define. Va arriba del todo, a todo el ancho en celular (hasta unos 450 px en escritorio), con el monto exacto en grande encima, «Ver en grande» (pantalla completa sobre fondo blanco, para escanearlo desde otro teléfono), «Guardar QR» y «Copiar monto». ⚠️ El QR del BNB tiene fecha de vencimiento impresa: hay que renovarlo antes de que venza.
- **Cancelación y reembolsos (0006, 0020):** el cliente solo cancela si el pedido y el pago siguen pendientes (sin comprobante). Si la tienda cancela un pedido con el pago verificado o en revisión, el pago pasa a **Reembolso pendiente**, y a **Reembolsado** cuando el admin lo marca en `/admin/pagos`.
- No hay pasarela: ningún pago se confirma solo. El admin verifica cada comprobante a mano.
- **Comprobante (foto del pago):** jpg/png/webp/pdf, máx. 3 MB, al bucket **privado** `comprobantes/<usuario_id>/<pedido_id>/…`. Solo el dueño y el admin pueden verlo (URL firmada de corta duración).
- Al subir comprobante: pago `pendiente` → `en_revision` y se registra en el seguimiento.
- `verificar_pago`: aprobado → pago `verificado` y pedido `confirmado` (entra a «Por preparar»); rechazado → pago `rechazado` con motivo obligatorio. Todo en transacción y en el seguimiento.
- **Rechazo y reintento:** el cliente ve el motivo y sube otro comprobante **en el mismo pedido** (`rechazado` → `en_revision`); Telegram vuelve a avisar al admin.
- **Quién y cuándo:** la línea de tiempo muestra «Pago verificado · por Aldo Martínez (Administrador) · 16/11 14:32» en hora de Bolivia.
- **Visor del comprobante (9E):** en `/admin/pagos` la foto se abre en grande con el **monto esperado** al lado y Aprobar / Rechazar.
- Ningún pedido se prepara ni se despacha sin el pago `verificado`. Como el QR ya está verificado al preparar, el repartidor **no cobra nada**: al entregar con el código el pedido queda `completado`.
- El monto del pago es siempre el `total` del pedido (lo pone el servidor).
- **Lo que se retiró en la 9F:** `POST /api/entregas/{id}/cobro`, `POST /api/pagos/{id}/efectivo`, el filtro «Efectivo por rendir» y las variables `NEXT_PUBLIC_BANCO_*`. En la base, `registrar_cobro_entrega` y `confirmar_efectivo` siguen existiendo pero nadie puede llamarlas.

## Pantallas

`/checkout` («Pagas con QR»), `/checkout/exito` (QR grande y foto del pago), `/pedidos/[id]` (bloque de pago y subir comprobante), `/admin/pagos` (visor).
