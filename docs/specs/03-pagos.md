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
| HU-P07 | Como **cliente** quiero ver en la línea de tiempo quién verificó o rechazó mi pago y a qué hora (fase 9C) | Alta |
| HU-P08 | Como **cliente** quiero copiar con un toque el número de cuenta, el titular y la referencia para transferir sin errores (fase 9C) | Alta |

## Criterios de aceptación

- Contra entrega solo aparece si la zona lo permite (`permite_contra_entrega`). Recojo en tienda (Villa Charcas) y entrega en el pueblo de Villa Charcas: sí. Culpina, Incahuasi y Sucre (por flota): no.
- **Cancelación y reembolsos (migración 0006):** el cliente solo cancela si el pedido y el pago siguen pendientes (sin comprobante). Si la tienda cancela un pedido con el pago verificado o en revisión, el pago pasa a **Reembolso pendiente**, y a **Reembolsado** cuando el admin lo marca en `/admin/pagos`. El cliente ve el aviso en su pedido.
- **QR:** es el QR de cobro real de la tienda (BNB), sin monto: `public/qr-bnb.jpg`, o la imagen de `NEXT_PUBLIC_QR_TIENDA_IMAGEN` si Render la define. La pantalla muestra el monto exacto en grande y el código del pedido como referencia; el cliente escribe ese monto al pagar.
- **Transferencia (fase 9C):** la cuenta real sale de las variables `NEXT_PUBLIC_BANCO_NOMBRE`, `NEXT_PUBLIC_BANCO_TITULAR`, `NEXT_PUBLIC_BANCO_CUENTA` y `NEXT_PUBLIC_BANCO_TIPO`, con botón **Copiar** en el monto, la cuenta, el titular y la referencia.
  - Si falta alguna, el checkout **no ofrece transferencia** y `POST /api/pedidos` responde 422 (`METODO_NO_DISPONIBLE`). Nunca se muestran datos inventados.
  - Un pedido viejo con transferencia y sin cuenta configurada le pide al cliente los datos por WhatsApp.
  - Son `NEXT_PUBLIC_`: en Render se cargan **antes** del build.
- No hay pasarela: ningún pago se confirma solo. El admin verifica cada comprobante a mano.
- Comprobante: jpg/png/webp/pdf, máx. 3 MB, al bucket **privado** `comprobantes/<usuario_id>/<pedido_id>/…`. Solo el dueño y el admin pueden verlo (URL firmada de corta duración).
- Al subir comprobante: pago `pendiente` → `en_revision` y se registra en el seguimiento.
- `verificar_pago`: aprobado → pago `verificado` y pedido `confirmado`; rechazado → pago `rechazado` con motivo obligatorio. Todo en transacción y en el seguimiento.
- **Rechazo y reintento (revisado en la 9C):** el cliente ve el motivo en su pedido y sube otro comprobante **en el mismo pedido** (`rechazado` → `en_revision`); Telegram vuelve a avisar al admin. El comprobante anterior queda en Storage y el rechazo con su motivo queda en la línea de tiempo.
- **Quién y cuándo (fase 9C):** la línea de tiempo muestra «Pago verificado · por Aldo Martínez (Administrador) · 16/11 14:32» en hora de Bolivia (`linea_tiempo_pedido`, migración 0017).
- Un pedido con pago QR/transferencia no puede despacharse si el pago no está `verificado`.
- El monto del pago es siempre el `total` del pedido (lo pone el servidor).

## Pantallas

`/checkout` (paso de pago), `/pedidos/[id]` (bloque de pago y subir comprobante), `/admin/pagos`.
