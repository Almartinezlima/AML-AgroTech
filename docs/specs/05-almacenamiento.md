# 05 — Almacenamiento (inventario)

Rama real: `fase/2-comercio`. ✅ Programado. Migraciones corridas en la base real y probado E2E. Las compras a proveedores (órdenes de compra, recepción, costo y margen) están en [`08-abastecimiento.md`](08-abastecimiento.md).

## Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| ✅ HU-A01 | Como **administrador** quiero ver el stock de cada producto con su nivel (normal, bajo, agotado) | Alta |
| ✅ HU-A02 | Como **administrador** quiero registrar entradas de mercadería (compra a proveedor) y ajustes (pérdida, vencimiento) con motivo | Alta |
| ✅ HU-A03 | Como **administrador** quiero ver el kardex de cada producto: cada entrada y salida con fecha, cantidad, saldo y quién la hizo | Alta |
| ✅ HU-A04 | Como **dueño** quiero que el stock baje solo al vender y vuelva al cancelar, sin errores ni ventas sin stock | Alta |
| ✅ HU-A05 | Como **administrador** quiero alertas de productos bajo su stock mínimo en el panel | Alta |
| ✅ HU-A06 | Como **administrador** quiero saber el valor total del inventario en Bs. | Media |

## Criterios de aceptación

- Tabla `movimientos_inventario` (kardex): tipo `entrada | salida | ajuste | devolucion`, cantidad, stock anterior, stock nuevo, motivo, pedido (si aplica), usuario y fecha. Desde la `0015`, las entradas de una orden de compra guardan además `costo_unitario`, `orden_compra_id` y `costo_promedio_anterior`. **Solo se inserta, nunca se edita ni se borra.**
- El stock de `productos` **solo cambia** mediante funciones SQL que registran el movimiento (`crear_pedido`, `cancelar_pedido`, `registrar_movimiento`, `recibir_orden_compra`); el trigger `proteger_stock_producto` rechaza cualquier otro cambio. El admin no edita el número de stock a mano en el formulario de producto.
- El stock nunca queda negativo (restricción `check (stock >= 0)` + bloqueo de fila al vender para evitar dos ventas simultáneas del último producto).
- Niveles: agotado (0), bajo (≤ stock mínimo), normal.
- Valor del inventario = Σ stock × precio.
- Exportar el kardex de un producto a CSV.

## Pantallas

`/admin/inventario` (lista + entrada/ajuste), `/admin/inventario/[productoId]` (kardex).
