# 08 — Abastecimiento (proveedores y órdenes de compra)

Fases 6A y 6B. Migraciones `0013` (proveedores y presentaciones), `0014` (2 proveedores de demostración) y `0015` (órdenes de compra), corridas en la base real el 14 y 15 nov 2026. ✅ Programado y probado E2E (`distribuidor.spec.ts`, `abastecimiento.spec.ts`).

Es la parte de **Almacenamiento** que mira hacia atrás: la tienda le compra a sus proveedores mayoristas y la mercadería entra al kardex con su costo. El **distribuidor** es ese proveedor (Sucre o Santa Cruz): no reparte a clientes ni ve sus pedidos.

## Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| ✅ HU-B01 | Como **administrador** quiero registrar la ficha de cada proveedor (nombre comercial, ciudad, teléfono, NIT, días de entrega) y activarla o desactivarla, para saber a quién le compro | Alta |
| ✅ HU-B02 | Como **distribuidor** quiero publicar mis presentaciones (producto de la tienda, cuántas unidades trae y precio mayorista), editarlas, marcarlas sin stock o dejar de venderlas | Alta |
| ✅ HU-B03 | Como **administrador** quiero ver qué productos hay que reponer, con el proveedor más barato por unidad y una cantidad sugerida, y armar las órdenes de compra desde ahí | Alta |
| ✅ HU-B04 | Como **administrador** quiero ajustar el borrador de una orden, enviarla al proveedor o cancelarla con motivo | Alta |
| ✅ HU-B05 | Como **distribuidor** quiero ver las órdenes que me envía la tienda y aceptarlas con una fecha de entrega o rechazarlas con motivo | Alta |
| ✅ HU-B06 | Como **distribuidor** quiero marcar la orden como despachada con el transportista y el número de guía | Alta |
| ✅ HU-B07 | Como **administrador** quiero recibir la orden indicando lo que llegó de cada línea, para que el stock entre solo, fraccionado en la unidad de venta y con su costo | Alta |
| ✅ HU-B08 | Como **administrador** quiero ver el costo y el margen de cada producto y el margen promedio de la tienda | Media |
| ✅ HU-B09 | Como **administrador** o **distribuidor** quiero ver la línea de tiempo de cada orden (quién hizo qué y cuándo) | Media |

## Criterios de aceptación

- **Rol distribuidor (HU-B01):**
  - Lo asigna **solo el admin** en `/admin/usuarios`. El registro crea siempre clientes (`handle_new_user`).
  - La ficha solo puede apuntar a una cuenta con rol distribuidor y no cambia de cuenta (trigger `validar_cuenta_distribuidor`).
  - Ciudad: Sucre o Santa Cruz. Días de entrega entre 0 y 60.
  - Sin borrado: fichas y presentaciones se desactivan. Ni el admin tiene `delete` sobre estas tablas.
- **Presentaciones (HU-B02):**
  - `unidades_por_presentacion` va en la unidad de venta de la tienda. El formulario lo pregunta así: «¿Cuántos «litro» trae?» (bidón de 20 L de un producto por litro = 20).
  - Precio mayorista mayor a 0, con 2 decimales como máximo. La pantalla muestra el costo por unidad («= Bs. 68,00 por litro»).
  - Una presentación no cambia de proveedor ni de producto (trigger `proteger_presentacion_distribuidor`).
  - El distribuidor solo ve y toca lo suyo (RLS y filtro por `distribuidor_id` en la API). Nunca ve stock, costos ni clientes.
- **Reponer (HU-B03):**
  - «Para reponer» marca los productos activos con stock en su mínimo o hasta 1,5 veces el mínimo. Cada uno trae sus presentaciones, de la más barata por unidad a la más cara.
  - «Pedir otro producto» deja pedir el resto de los productos que tienen proveedor.
  - **Un solo borrador por proveedor**: «Armar orden» le suma líneas al que ya existe. Si la presentación ya estaba, queda la cantidad nueva.
- **Estados de la orden** (`OC-000001`, funciones SQL que validan rol y estado):
  - camino normal: borrador → enviada → aceptada → despachada → recibida;
  - **rechazada**: la rechaza el proveedor, con motivo (3 a 300 caracteres), desde enviada o aceptada;
  - **cancelada**: la cancela el admin, con motivo, desde borrador, enviada o aceptada. Una orden despachada ya no se cancela: se recibe, aunque no llegue nada.
- **Borrador (HU-B04):** una línea quitada queda en cantidad 0 y no se envía. Al **enviar** se copian a la línea el nombre de la presentación, las unidades que trae y el precio: lo pedido no cambia si el proveedor cambia su precio después.
- **Aceptar (HU-B05):** la fecha estimada va desde hoy (hora de Bolivia) hasta 6 meses. El distribuidor ve sus órdenes desde que se envían, nunca los borradores.
- **Despachar (HU-B06):** transportista (2 a 80 caracteres) y guía (1 a 60) obligatorios.
- **Recibir (HU-B07):** recepción única, solo de una orden despachada.
  - Por línea se recibe de 0 a lo pedido; lo que falta queda como **faltante**.
  - Unidades que entran = recibidas × unidades por presentación. Costo unitario = precio ÷ unidades.
  - Cada línea con algo recibido deja una **entrada** en el kardex («Compra OC-…») con su costo unitario y la orden.
  - Costo **promedio ponderado** en `costos_producto`, con el último costo como referencia. La primera recepción toma el costo recibido como punto de partida.
  - Si no llegó nada, la orden queda recibida con todo como faltante, sin kardex ni cambio de costo. La pantalla pide confirmarlo.
- **Margen (HU-B08):**
  - Margen = precio de venta − costo. Costo real = promedio ponderado. Si el producto todavía no tuvo ninguna recepción, se **estima** con el proveedor más barato por unidad, y la pantalla lo dice.
  - Margen promedio = promedio simple del % entre los productos activos con costo (real o estimado). Va en `/admin/margen` y en una tarjeta del panel.
  - `costos_producto` es solo del admin: `productos` se lee sin sesión y el costo no puede quedar a la vista.
- **Línea de tiempo (HU-B09):** cada cambio de estado queda en `seguimiento_orden_compra` con la nota, quién y cuándo.
- **Avisos:** al aceptar, rechazar o despachar, Telegram avisa al admin (ver [`09-avisos-telegram.md`](09-avisos-telegram.md)).

## Pantallas

`/admin/abastecimiento` (Reponer y órdenes), `/admin/abastecimiento/distribuidores`, `/admin/abastecimiento/ordenes/[id]`, `/admin/margen`, `/distribuidor`, `/distribuidor/ordenes/[id]`.

## API

`/api/distribuidores`, `/api/distribuidor/ficha`, `/api/distribuidor/presentaciones`, `/api/distribuidor/ordenes`, `/api/abastecimiento/reponer`, `/api/ordenes-compra/**`, `/api/margen`. Contrato en [`../api/openapi.yaml`](../api/openapi.yaml) (etiqueta Abastecimiento).
