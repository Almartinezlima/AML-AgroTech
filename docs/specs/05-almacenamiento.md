# 05 — Almacenamiento (inventario)

Rama real: `fase/2-comercio`. ✅ Programado. Depende de correr la migración `0003` (pendiente) y de la prueba con sesión real.

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

- Tabla `movimientos_inventario` (kardex): tipo `entrada | salida | ajuste | devolucion`, cantidad, stock anterior, stock nuevo, motivo, pedido (si aplica), usuario y fecha. **Solo se inserta, nunca se edita ni se borra.**
- El stock de `productos` **solo cambia** mediante funciones SQL que registran el movimiento (`crear_pedido`, `cancelar_pedido`, `registrar_movimiento`). El admin no edita el número de stock a mano en el formulario de producto.
- El stock nunca queda negativo (restricción `check (stock >= 0)` + bloqueo de fila al vender para evitar dos ventas simultáneas del último producto).
- Niveles: agotado (0), bajo (≤ stock mínimo), normal.
- Valor del inventario = Σ stock × precio.
- Exportar el kardex de un producto a CSV.

## Pantallas

`/admin/inventario` (lista + entrada/ajuste), `/admin/inventario/[productoId]` (kardex).
