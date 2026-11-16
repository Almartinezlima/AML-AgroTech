# 03 — Pagos

Rama real: `fase/2-comercio`. ✅ Programado. Migraciones corridas en la base real y probado E2E.

## Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| ✅ HU-P01 | Como **cliente** quiero elegir cómo pagar: QR, transferencia o contra entrega | Alta |
| ✅ HU-P02 | Como **cliente** quiero ver el QR (o los datos de la cuenta) con el monto exacto y el código del pedido como referencia | Alta |
| ✅ HU-P03 | Como **cliente** quiero subir la foto de mi comprobante para que la tienda verifique mi pago | Alta |
| ✅ HU-P04 | Como **administrador** quiero ver los pagos en revisión con su comprobante y aprobarlos o rechazarlos con motivo | Alta |
| ✅ HU-P05 | Como **cliente** quiero saber si mi pago fue verificado o rechazado (y por qué) y poder subir otro comprobante | Alta |
| ✅ HU-P06 | Como **administrador** quiero ver el total cobrado y por cobrar | Media |

## Criterios de aceptación

- Contra entrega solo aparece si la zona lo permite (`permite_contra_entrega`). Recojo en tienda (Villa Charcas) y entrega en el pueblo de Villa Charcas: sí. Culpina, Incahuasi y Sucre (por flota): no.
- **Cancelación y reembolsos (migración 0006):** el cliente solo cancela si el pedido y el pago siguen pendientes (sin comprobante). Si la tienda cancela un pedido con el pago verificado o en revisión, el pago pasa a **Reembolso pendiente**, y a **Reembolsado** cuando el admin lo marca en `/admin/pagos`. El cliente ve el aviso en su pedido.
- **QR:** es el QR de cobro real de la tienda (BNB), sin monto: `public/qr-bnb.jpg`, o la imagen de `NEXT_PUBLIC_QR_TIENDA_IMAGEN` si Render la define. La pantalla muestra el monto exacto en grande y el código del pedido como referencia; el cliente escribe ese monto al pagar.
- **Transferencia:** muestra una **cuenta de demostración** con el aviso «Cuenta de demostración: no realices pagos reales».
- No hay pasarela: ningún pago se confirma solo. El admin verifica cada comprobante a mano.
- Comprobante: jpg/png/webp/pdf, máx. 3 MB, al bucket **privado** `comprobantes/<usuario_id>/<pedido_id>/…`. Solo el dueño y el admin pueden verlo (URL firmada de corta duración).
- Al subir comprobante: pago `pendiente` → `en_revision` y se registra en el seguimiento.
- `verificar_pago`: aprobado → pago `verificado` y pedido `confirmado`; rechazado → pago `rechazado` con motivo obligatorio. Todo en transacción y en el seguimiento.
- Un pedido con pago QR/transferencia no puede despacharse si el pago no está `verificado`.
- El monto del pago es siempre el `total` del pedido (lo pone el servidor).

## Pantallas

`/checkout` (paso de pago), `/pedidos/[id]` (bloque de pago y subir comprobante), `/admin/pagos`.
