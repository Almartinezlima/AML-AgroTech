# 01 — E-commerce

Rama real: `fase/2-comercio`. ✅ Programado. Depende de correr la migración `0003` (pendiente) y de la prueba con sesión real.

## Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| ✅ HU-E01 | Como **visitante** quiero ver el catálogo con foto, precio en Bs., unidad y disponibilidad para saber qué hay sin llamar a la tienda | Alta |
| ✅ HU-E02 | Como **visitante** quiero buscar, filtrar por categoría y ordenar por precio o nombre para encontrar rápido lo que necesito | Alta |
| ✅ HU-E03 | Como **visitante** quiero ver la ficha de un producto (descripción, uso, presentación, stock) para decidir mi compra | Alta |
| ✅ HU-E04 | Como **cliente** quiero agregar productos al carrito y que no se pierda al recargar la página | Alta |
| ✅ HU-E05 | Como **cliente** quiero confirmar mi compra eligiendo zona de envío y forma de pago, y ver el total con envío antes de pagar | Alta |
| ✅ HU-E06 | Como **cliente** quiero ver mis pedidos con su estado, pago y seguimiento | Alta |
| ✅ HU-E07 | Como **cliente** quiero cancelar un pedido mientras esté pendiente | Media |
| ✅ HU-E08 | Como **administrador** quiero crear, editar, activar/desactivar productos con imagen | Alta |
| ✅ HU-E09 | Como **administrador** quiero ver todos los pedidos con filtros por estado | Alta |
| ✅ HU-E10 | Como **administrador** quiero un panel con ventas del día/mes, pedidos por estado, productos más vendidos y alertas, con datos reales | Alta |

## Criterios de aceptación clave

- **HU-E04:** el carrito se guarda en `localStorage`; los ids son `string` (uuid); no permite cantidad mayor al stock ni menor a 1.
- **HU-E05:**
  - Pide sesión; si no hay, lleva a login y vuelve al checkout.
  - El total lo calcula **el servidor** (`crear_pedido`): si el navegador manda otro precio, se ignora.
  - Si un producto no tiene stock suficiente → `409` con el nombre del producto, y el carrito se ajusta.
  - Al crear: pedido con código legible (`AML-000001`), stock descontado y movimiento de salida en el kardex, todo en una transacción.
  - Pantalla de éxito con el código y el siguiente paso (pagar con QR / esperar contra entrega).
- **HU-E06:** `/pedidos` lista los pedidos del usuario; `/pedidos/[id]` muestra items, totales, pago, envío y línea de tiempo.
- **HU-E07:** cancelar devuelve el stock (movimiento `devolucion`) y queda en el seguimiento.
- **HU-E08:** sin borrado físico; imagen subida al bucket `productos` (jpg/png/webp, máx. 2 MB); precio > 0.
- **HU-E10:** ninguna cifra inventada; todo sale de `/api/dashboard`.

## Pantallas

`/`, `/catalogo`, `/producto/[id]`, `/carrito`, `/checkout`, `/checkout/exito`, `/pedidos`, `/pedidos/[id]`, `/admin`, `/admin/productos`, `/admin/pedidos`.
