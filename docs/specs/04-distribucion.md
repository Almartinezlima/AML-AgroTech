# 04 — Distribución

Rama real: `fase/2-comercio`. ✅ Programado. Depende de correr la migración `0003` (pendiente) y de la prueba con sesión real.

## Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| ✅ HU-D01 | Como **cliente** quiero elegir dónde recibir mi pedido (recojo en tienda, Sucre urbano o mi pueblo) y ver el costo y el tiempo estimado | Alta |
| ✅ HU-D02 | Como **cliente** quiero seguir mi pedido en una línea de tiempo (pendiente, confirmado, preparando, despachado, entregado) | Alta |
| ✅ HU-D03 | Como **cliente** de provincia quiero ver la empresa de flota y el número de guía para recoger mi encomienda | Alta |
| ✅ HU-D04 | Como **administrador** quiero un panel de despachos con los pedidos por preparar y por entregar | Alta |
| ✅ HU-D05 | Como **administrador** quiero registrar la flota y el número de guía al despachar a provincia | Alta |
| ✅ HU-D06 | Como **administrador** quiero crear y editar zonas de envío con su costo y tiempo | Media |
| ✅ HU-D07 | Como **cliente** quiero un botón de WhatsApp para coordinar la entrega con la tienda | Media |

## Criterios de aceptación

- Zonas iniciales (editables por el admin):

  | Zona | Tipo | Costo ref. | Tiempo | Contra entrega |
  |---|---|---|---|---|
  | Recojo en tienda (Sucre) | recojo | Bs. 0 | mismo día | Sí |
  | Sucre urbano | urbano | Bs. 15 | 1 día | Sí |
  | Villa Charcas | provincia | Bs. 35 | 2–3 días | No |
  | Culpina | provincia | Bs. 35 | 2–3 días | No |
  | Incahuasi | provincia | Bs. 40 | 2–4 días | No |

  *Costos de referencia, a confirmar por Aldo.*
- Provincia y Sucre urbano exigen dirección/referencia y teléfono; recojo solo teléfono.
- Transiciones válidas (`cambiar_estado_pedido` las valida): pendiente→confirmado→preparando→despachado→entregado; cancelado solo desde pendiente o confirmado.
- Pasar a `despachado` en provincia exige transportista y número de guía.
- Cada cambio queda en `seguimiento_pedido` con fecha, hora y quién lo hizo; el cliente lo ve como línea de tiempo con colores de estado.
- WhatsApp: enlace `wa.me` con el código del pedido en el mensaje; el número de la tienda vive en una variable de entorno, no en el código.

## Pantallas

`/checkout` (paso de entrega), `/pedidos/[id]` (línea de tiempo), `/admin/envios`, `/admin/zonas`.
