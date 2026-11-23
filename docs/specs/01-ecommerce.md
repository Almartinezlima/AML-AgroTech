# 01 — E-commerce

Rama real: `fase/2-comercio` (recibo de compra: `fase/7-nota-venta`). ✅ Programado. Migraciones corridas en la base real y probado E2E.

## Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| ✅ HU-E01 | Como **visitante** quiero ver el catálogo con foto, precio en Bs., unidad y disponibilidad para saber qué hay sin llamar a la tienda | Alta |
| ✅ HU-E02 | Como **visitante** quiero buscar, filtrar por categoría y ordenar por precio o nombre para encontrar rápido lo que necesito | Alta |
| ✅ HU-E03 | Como **visitante** quiero ver la ficha de un producto (descripción, uso, presentación, stock) para decidir mi compra | Alta |
| ✅ HU-E04 | Como **cliente** quiero agregar productos al carrito y que no se pierda al recargar la página | Alta |
| ✅ HU-E05 | Como **cliente** quiero confirmar mi compra eligiendo la zona de envío y ver el total con envío antes de pagar con QR | Alta |
| ✅ HU-E06 | Como **cliente** quiero ver mis pedidos con su estado, pago y seguimiento | Alta |
| ✅ HU-E07 | Como **cliente** quiero cancelar un pedido mientras esté pendiente | Media |
| ✅ HU-E08 | Como **administrador** quiero crear, editar, activar/desactivar productos con imagen | Alta |
| ✅ HU-E09 | Como **administrador** quiero ver todos los pedidos con filtros por estado | Alta |
| ✅ HU-E10 | Como **administrador** quiero un panel con ventas del día/mes, pedidos por estado, productos más vendidos y alertas, con datos reales | Alta |
| ✅ HU-E11 | Como **cliente** quiero descargar el recibo de compra de mi pedido en PDF para mostrarlo al recoger o guardarlo; el **administrador** también lo descarga desde el panel | Media |

## Criterios de aceptación clave

- **HU-E04:** el carrito se guarda en `localStorage`, uno por cuenta (y uno de invitado que se suma al iniciar sesión); los ids son `string` (uuid); no permite cantidad mayor al stock ni menor a 1. Se vacía **solo** cuando el pedido se crea, y sigue vacío al recargar o volver con Atrás.
- **HU-E05:**
  - Pide sesión; si no hay, lleva a login y vuelve al checkout.
  - El total lo calcula **el servidor** (`crear_pedido`): si el navegador manda otro precio, se ignora.
  - Si un producto no tiene stock suficiente → `409` con el nombre del producto, y el carrito se ajusta.
  - Al crear: pedido con código legible (`AML-000001`), stock descontado y movimiento de salida en el kardex, todo en una transacción.
  - Pantalla de éxito con el código y el siguiente paso (pagar con QR y subir la foto del pago).
- **Compra en 3 clics (fase 9E, HU-E12):**
  1. Carrito → «Ir a pagar».
  2. `/checkout` es **una sola pantalla**: zona y datos recordados de la última compra, y «Pagas con QR». «Confirmar pedido · Bs. X» va dentro del cuadro «Tu compra» (sticky); en celular, en una **barra fija abajo** con el total. El total exacto lo pide al servidor al elegir la zona (`/api/pedidos/cotizar`).
  3. `/checkout/exito`: el QR grande con el monto y, **justo debajo**, la subida de la foto del pago con «Enviar». Ya no existe «Ya pagué».
  - Barra de pasos: Carrito → Datos y pago → Pagar → Listo.
  - **Errores junto a cada campo** (borde rojo, mensaje debajo, `aria-invalid`); al confirmar, la vista va al primer error y le da el foco. Los errores que no son de un campo (sin stock, sesión vencida) van junto al botón, nunca arriba.
  - Solo se paga con QR: la pantalla dice «Pagas con QR», sin elegir forma de pago.
- **HU-E06:** `/pedidos` lista los pedidos del usuario; `/pedidos/[id]` muestra items, totales, pago, envío y línea de tiempo.
- **HU-E07:** cancelar devuelve el stock (movimiento `devolucion`) y queda en el seguimiento.
- **HU-E08:** sin borrado físico; imagen subida al bucket `productos` (jpg/png/webp, máx. 2 MB); precio > 0.
- **HU-E10:** ninguna cifra inventada; todo sale de `/api/dashboard`, con los datos de todas las cuentas. Incluye la tarjeta «Margen promedio» (ver [`08-abastecimiento.md`](08-abastecimiento.md)).
- **HU-E11:** `GET /api/pedidos/{id}/nota`, PDF hecho en el servidor con pdfkit. Dice «Recibo de compra — documento sin valor fiscal» (no es factura).
  - Disponible desde que el pedido se **confirma**. Pendiente: `409`. Cancelado que se llegó a confirmar: sale con la marca **ANULADA**. Cancelado sin confirmar nunca: `409`.
  - Solo el dueño o el admin. Pedido ajeno o inexistente: `404` (no revela que existe). Sin sesión: `401`.
  - Trae la tienda, el código, la fecha y hora de Bolivia, el cliente, la entrega (dirección o quién recoge con su CI), los productos con su unidad, el envío, el total, el pago, el estado y un QR con el enlace al pedido.

| HU | Historia (fase 9E) |
|---|---|
| HU-E12 | Como **cliente** quiero comprar con QR en 3 clics: confirmar en una sola pantalla con mis datos recordados y subir la foto del pago justo debajo del QR |

## Pantallas

`/`, `/catalogo`, `/producto/[id]`, `/carrito`, `/checkout`, `/checkout/exito`, `/pedidos`, `/pedidos/[id]` (botón «Descargar recibo de compra (PDF)»), `/admin`, `/admin/productos`, `/admin/pedidos` («Recibo PDF»). Desde la 9E el PDF se llama **Recibo de compra** (sin valor fiscal) y el archivo `Recibo-AML-….pdf`; la ruta sigue siendo `/api/pedidos/{id}/nota`.
