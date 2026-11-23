# 04 — Distribución

Rama real: `fase/2-comercio` (zonas: `fase/2a-zonas`; preparación 9C, entrega 9D y reparto externo 9F). ✅ Programado. Migraciones corridas en la base real.

La preparación está en [`10-preparacion-empaque.md`](10-preparacion-empaque.md), la entrega con código en [`11-entrega-cierre.md`](11-entrega-cierre.md) y los repartidores externos en [`12-reparto-externo.md`](12-reparto-externo.md).

## Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| ✅ HU-D01 | Como **cliente** quiero elegir dónde recibir mi pedido (recojo en tienda, a domicilio en mi distrito o por flota a mi municipio) y ver el costo y el tiempo estimado | Alta |
| ✅ HU-D02 | Como **cliente** quiero seguir mi pedido en una línea de tiempo (pendiente, confirmado, preparando, listo, en camino, completado) con quién hizo cada paso | Alta |
| ✅ HU-D03 | Como **cliente** de provincia quiero ver la empresa de flota y el número de guía para recoger mi encomienda | Alta |
| ✅ HU-D04 | Como **administrador** quiero un panel de despachos con los pedidos por preparar y por entregar | Alta |
| ✅ HU-D05 | Como **administrador** quiero registrar la flota y el número de guía al despachar a provincia | Alta |
| ✅ HU-D06 | Como **administrador** quiero crear y editar zonas de envío con su costo y tiempo | Media |
| ✅ HU-D07 | Como **cliente** quiero un botón de WhatsApp para coordinar la entrega con la tienda | Media |

## Criterios de aceptación

- Zonas (editables por el admin), en el orden del checkout. Migración `0010`:

  | Zona | Tipo | Costo (lo gana el repartidor) | Tiempo |
  |---|---|---|---|
  | Recojo en tienda (Villa Charcas) | recojo | Bs. 0 | mismo día |
  | Villa Charcas — Distrito 1 (el pueblo) | urbano | Bs. 15 | 0–1 día |
  | Distrito Pucara | urbano | Bs. 20 | 1–2 días |
  | Distrito Santa Elena | urbano | Bs. 25 | 1–2 días |
  | Distrito Supas | urbano | Bs. 30 | 2–3 días |
  | Distrito Kaisaka | urbano | Bs. 35 | 2–3 días |
  | Incahuasi | provincia | Bs. 20 | 1–2 días |
  | Culpina | provincia | Bs. 25 | 1–2 días |

  *A domicilio, el costo de envío lo gana el repartidor externo que acepta la entrega ([`12-reparto-externo.md`](12-reparto-externo.md)).*

  *Tienda en Villa Charcas. Costos definidos por Aldo el 14 nov 2026. Sucre (terminal de buses) quedó **inactiva**: no se borra porque hay pedidos viejos que la usan, y cada cliente sigue viendo la zona de sus pedidos (política `zonas_select_pedidos_propios`).*
- El checkout agrupa las zonas por tipo: **"Villa Charcas y sus distritos"** (recojo y a domicilio) y **"Otros municipios"** (por flota).
- **A domicilio** (Distrito 1 y distritos): dirección o comunidad y teléfono. **Por flota** (Incahuasi, Culpina): **nombre y CI de quien recoge** la encomienda y teléfono (migración 0007). Recojo en tienda: solo teléfono.
- Estados del pedido:
  - Recojo en tienda: pendiente → confirmado → preparando → **listo para recoger** → completado (el cliente dice su código y el admin entrega).
  - A domicilio: pendiente → confirmado → preparando → **listo para salir** (`empacado`; aviso al grupo de repartidores) → un repartidor acepta y la recoge → despachado → completado (con el código del cliente).
  - Por flota: pendiente → confirmado → preparando → listo para salir → despachado (empresa y número de guía obligatorios) → «Recibí mi pedido» → completado.
- El admin ve quién recoge en `/admin/pedidos` y en el detalle; `/admin/envios` tiene la pestaña "Para recoger en tienda".
- Transiciones: cada paso tiene su función (verificar el pago, `empezar_preparacion`, `empacar_pedido`, `aceptar_entrega`, `tomar_pedido`, `entregar_pedido`); `cambiar_estado_pedido` solo confirma y despacha por flota. El admin cancela hasta «Listo para salir»; el cliente, solo en pendiente.
- Pasar a `despachado` en provincia exige transportista y número de guía.
- Cada cambio queda en `seguimiento_pedido` con fecha, hora y quién lo hizo; el cliente lo ve como línea de tiempo con colores de estado.
- WhatsApp: enlace `wa.me` con el código del pedido en el mensaje; el número de la tienda vive en una variable de entorno, no en el código.

## Pantallas

`/checkout` (zona y datos de entrega), `/pedidos/[id]` (línea de tiempo y código), `/admin/preparar`, `/admin/envios`, `/admin/repartidores`, `/admin/zonas`, `/repartidor`.
