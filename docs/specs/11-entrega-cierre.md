# 11 — Entrega con código y cierre del pedido

Fase 9D (migración `0018`), actualizada en la 9F (migración `0020`): el pago ya está hecho con QR (el repartidor no cobra nada), el admin entrega en tienda y los repartidores externos aceptan las entregas a domicilio (detalle en [`12-reparto-externo.md`](12-reparto-externo.md)).

Responde a la observación del docente: «controlar la entrega del producto y finalizar el proceso». La idea de AML: **nadie marca «entregado» sin prueba de que el producto llegó**.

## Cómo funciona

- **Código de entrega de 4 dígitos.** Se genera al tocar «Listo para salir» (recojo y a domicilio; por flota no). Solo lo ve el **dueño** del pedido en «Mis pedidos», con el texto «Dáselo a quien te entregue, solo cuando tengas tu pedido en la mano».
- **Nadie más lo ve.** Está en `codigos_entrega`, con RLS y **sin ninguna política**: ni el repartidor ni el admin lo leen. Solo el dueño lo obtiene con `mi_codigo_entrega()`; quien entrega lo escribe y `entregar_pedido` solo responde si coincide.
- **5 intentos.** Un código incorrecto responde con los intentos que quedan. Al quinto se bloquea, se avisa por Telegram y el pedido no se entrega hasta que el admin lo desbloquea con una nota.
- **Completado = entregado + pago verificado.** Todo se paga con QR antes de prepararse, así que al entregar con el código el pedido queda `completado` en el mismo momento. El recibo de compra dice «NOTA FINAL».

## Quién entrega

| Entrega | Quién | Cómo |
|---|---|---|
| Recojo en tienda | **admin** | El cliente llega y dice su código; el admin lo escribe con el nombre y CI de quien recoge (`/pedidos/[id]` o `/admin/preparar/pedidos/[id]`) |
| A domicilio | **repartidor** que aceptó la entrega | «Recogí el pedido» en la tienda → «Entregar» con el código y el nombre de quien recibe (`/repartidor/pedidos/[id]`) |
| Por flota | cliente o admin | El admin despacha con empresa y guía; el cliente toca «Recibí mi pedido» (o el admin lo confirma con una nota) |

Tres capas, como siempre: middleware (`/repartidor` solo el rol repartidor; el admin va a `/admin/repartidores`), API (401 sin sesión, 403 con otro rol) y base (funciones que revisan el rol y cortan con `AML03`).

## Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| HU-EN01 | Como **cliente** quiero ver mi código de entrega en «Mis pedidos», para dárselo a quien me entregue solo cuando tenga el pedido en la mano | Alta |
| HU-EN05 | Como **repartidor** quiero entregar con el código del cliente y el nombre de quien recibe (CI opcional) | Alta |
| HU-EN06 | Como **administrador** quiero entregar en tienda con el código, el nombre y el CI de quien recoge | Alta |
| HU-EN07 | Como **administrador** quiero desbloquear un código bloqueado por 5 intentos, con una nota | Alta |
| HU-EN08 | Como **cliente** de una zona por flota quiero tocar «Recibí mi pedido»; como **administrador**, confirmarlo con una nota | Alta |
| HU-EN10 | Como **cliente** quiero marcar «Recibí conforme» y calificar la entrega (1 a 5 estrellas y comentario) | Media |
| HU-EN11 | Como **administrador** quiero ver las calificaciones en el panel y enterarme por Telegram de las bajas | Media |
| HU-EN12 | Como **cliente** o **administrador** quiero ver en la línea de tiempo quién verificó el pago y quién entregó a quién | Alta |

Las historias del repartidor (aceptar, recoger, ganado y por cobrar) están en el spec 12. Los números HU-EN02, EN03, EN04 y EN09 no se usan.

## Criterios de aceptación

- **Código (HU-EN01):** 4 dígitos al azar seguro. La API lo agrega a `GET /api/pedidos` y `GET /api/pedidos/{id}` **solo si quien pide es el dueño**. Se muestra en `empacado`, `listo_para_recoger` y `despachado`. **Recojo (9G):** con el pedido listo, el bloque dice «Tu pedido está listo. Ve a la tienda y dicta este código:» con el número grande, en el detalle y en «Mis pedidos». El detalle del pedido se actualiza solo cada 10 s.
- **Entregar (HU-EN05, HU-EN06):** código de 4 dígitos y nombre de 3 a 120 letras (CI de 4 a 20; en tienda la pantalla lo pide). A domicilio solo entrega el repartidor que recogió el pedido (o el admin); en tienda, solo el admin. Código incorrecto: 422 `CODIGO_INCORRECTO`; al quinto, 409 `CODIGO_BLOQUEADO`. Correcto: `completado`, con `entregado_por`, `recibe_nombre` y «Entregado a Juan Pérez» en la línea de tiempo. La pantalla dice «Ya está pagado con QR: no cobres nada». El nombre de quien recibe viene escrito con el nombre del cliente y se puede cambiar (9G). Al terminar: «Entregado · registrado con tu nombre y hora».
- **Desbloquear (HU-EN07):** solo el admin, con nota de 3 a 300.
- **Flota (HU-EN08):** solo desde `despachado` y en zonas por flota.
- **Calificación (HU-EN10, HU-EN11):** solo el dueño, una vez, con el pedido entregado o completado. Con 1 o 2 estrellas avisa por Telegram.
- **Telegram al admin:** pedido entregado (con lo que gana el repartidor), código bloqueado y calificación baja. Las cuentas de prueba no avisan.

## Pantallas

`/repartidor/pedidos/[id]` (recoger y entregar), `/pedidos` y `/pedidos/[id]` (código, «Recibí mi pedido», «Recibí conforme», panel de entrega del admin con «Liberar entrega»), `/admin/preparar/pedidos/[id]` («Entregar en tienda»), `/admin` (calificaciones).
