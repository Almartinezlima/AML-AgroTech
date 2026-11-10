# 04 — Distribución

Rama real: `fase/2-comercio`. ✅ Programado. Depende de correr la migración `0003` (pendiente) y de la prueba con sesión real.

## Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| ✅ HU-D01 | Como **cliente** quiero elegir dónde recibir mi pedido (recojo en tienda, mi pueblo o Sucre) y ver el costo y el tiempo estimado | Alta |
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
  | Recojo en tienda (Villa Charcas) | recojo | Bs. 0 | mismo día | Sí |
  | Villa Charcas (entrega en el pueblo) | urbano | Bs. 10 | 0–1 día | Sí |
  | Culpina | provincia | Bs. 10 | 1–2 días | No |
  | Incahuasi | provincia | Bs. 10 | 1–2 días | No |
  | Sucre (recojo en la terminal de buses) | provincia | Bs. 15 | 1–2 días | No |

  *Tienda en Villa Charcas. Costos definidos por Aldo el 9 nov 2026; actualizados en la base.*

  *Costos de referencia, a confirmar por Aldo.*
- Entrega en el pueblo: dirección y teléfono. **Por flota** (Culpina, Incahuasi, Sucre terminal): **nombre y CI de quien recoge** la encomienda y teléfono (migración 0007). Recojo en tienda: solo teléfono.
- Estados del pedido:
  - Recojo en tienda: pendiente → confirmado → preparando → **listo para recoger** → entregado (sin "despachado").
  - Pueblo y flota: pendiente → confirmado → preparando → despachado (por flota: empresa y número de guía obligatorios) → entregado.
- El admin ve quién recoge en `/admin/pedidos` y en el detalle; `/admin/envios` tiene la pestaña "Para recoger en tienda".
- Transiciones válidas (`cambiar_estado_pedido` las valida): pendiente→confirmado→preparando→despachado→entregado; cancelado solo desde pendiente o confirmado.
- Pasar a `despachado` en provincia exige transportista y número de guía.
- Cada cambio queda en `seguimiento_pedido` con fecha, hora y quién lo hizo; el cliente lo ve como línea de tiempo con colores de estado.
- WhatsApp: enlace `wa.me` con el código del pedido en el mensaje; el número de la tienda vive en una variable de entorno, no en el código.

## Pantallas

`/checkout` (paso de entrega), `/pedidos/[id]` (línea de tiempo), `/admin/envios`, `/admin/zonas`.
