# 11 — Entrega con código y cierre del pedido (rol Repartidor)

Fase 9D. Migración `0018` (por correr: la ensaya y corre el chat del Proyecto). Programado y verificado con build, lint y capturas contra un Supabase de mentira; las pruebas con la base real van después de correr la 0018.

Responde a la observación del docente: «controlar la entrega del producto y finalizar el proceso». La idea de AML: **nadie marca «entregado» sin prueba de que el producto llegó**.

## Cómo funciona

- **Código de entrega de 4 dígitos.** Se genera al empacar (recojo y a domicilio; por flota no, porque en la terminal no hay a quién dárselo). Solo lo ve el **dueño** del pedido en «Mis pedidos», grande, con el texto «Dáselo a quien te entregue, solo cuando tengas tu pedido en la mano».
- **Nadie más lo ve.** Está en `codigos_entrega`, con RLS y **sin ninguna política**: ni el repartidor, ni el almacén, ni el admin lo leen. Solo el dueño lo obtiene con `mi_codigo_entrega()`; quien entrega lo escribe y `entregar_pedido` solo responde si coincide.
- **5 intentos.** Un código incorrecto no lanza error (si lo hiciera, la base desharía la cuenta del intento): responde con los intentos que quedan. Al quinto se bloquea, se avisa por Telegram y el pedido no se entrega hasta que el admin lo desbloquea con una nota.
- **Contra entrega: efectivo por rendir.** Antes del código se registra el cobro, que tiene que ser igual al total. Si cobró el repartidor o el almacén, el pago queda «por rendir»; el pedido queda `entregado` y pasa a `completado` cuando el admin toca «Recibí el efectivo» en `/admin/pagos`. Si cobró el admin, el pago queda verificado al momento.
- **Completado = entregado + pago verificado.** Con el pago ya verificado (QR o transferencia), entregar y completar pasan en el mismo momento. Desde ahí la nota de venta en PDF dice «NOTA FINAL».

## Roles

| Rol | Qué hace en la 9D | Panel |
|---|---|---|
| `repartidor` | Toma los pedidos a domicilio, cobra la contra entrega y entrega con el código | `/repartidor` (entra directo al iniciar sesión, también con Google) |
| `almacen` | Entrega en tienda (recojo) con el código, nombre y CI de quien recoge | `/almacen/pedidos/[id]` |
| `admin` | Todo lo anterior; desbloquea códigos, confirma entregas por flota con nota y recibe el efectivo | `/pedidos/[id]`, `/admin/pagos`, `/repartidor` |
| `cliente` | Ve su código, confirma «Recibí mi pedido» (flota) y califica la entrega | `/pedidos` |

Tres capas, como siempre: middleware (`/repartidor` solo repartidor o admin), API (`requerirRol`, 401 sin sesión y 403 con otro rol) y base (funciones que revisan el rol y cortan con `AML03`).

## Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| HU-EN01 | Como **cliente** quiero ver mi código de entrega en «Mis pedidos», para dárselo a quien me entregue solo cuando tenga el pedido en la mano | Alta |
| HU-EN02 | Como **repartidor** quiero ver la cola de pedidos a domicilio empacados, el más antiguo primero, con zona, dirección, teléfono (llamar y WhatsApp) y bultos | Alta |
| HU-EN03 | Como **repartidor** quiero tocar «Tomar y salir» para que quede registrado que yo llevo el pedido | Alta |
| HU-EN04 | Como **repartidor** quiero registrar el cobro de un pedido contra entrega antes de entregarlo | Alta |
| HU-EN05 | Como **repartidor** quiero entregar con el código del cliente y el nombre de quien recibe (CI opcional) | Alta |
| HU-EN06 | Como **almacén** o **administrador** quiero entregar en tienda con el código, el nombre y el CI de quien recoge | Alta |
| HU-EN07 | Como **administrador** quiero desbloquear un código bloqueado por 5 intentos, con una nota | Alta |
| HU-EN08 | Como **cliente** de una zona por flota quiero tocar «Recibí mi pedido»; como **administrador**, confirmarlo con una nota | Alta |
| HU-EN09 | Como **administrador** quiero confirmar «Recibí el efectivo» que cobró el repartidor, para cerrar el pedido | Alta |
| HU-EN10 | Como **cliente** quiero marcar «Recibí conforme» y calificar la entrega (1 a 5 estrellas y comentario) | Media |
| HU-EN11 | Como **administrador** quiero ver las calificaciones en el panel y enterarme por Telegram de las bajas | Media |
| HU-EN12 | Como **cliente** o **administrador** quiero ver en la línea de tiempo «Pago verificado por <nombre> · <fecha y hora>» y quién entregó a quién | Alta |
| HU-EN13 | Como **administrador** quiero ver en `/admin/pagos` el monto esperado en grande junto a la foto del comprobante | Media |

## Criterios de aceptación

- **Código (HU-EN01):** 4 dígitos, al azar seguro (`gen_random_uuid`, no `random()`). La API lo agrega a `GET /api/pedidos` y `GET /api/pedidos/{id}` **solo si quien pide es el dueño**; la base también lo exige (`mi_codigo_entrega` responde 404 a cualquier otro, incluido el admin). Se muestra en `empacado`, `listo_para_recoger` y `despachado`; bloqueado, el cliente ve «comunícate con la tienda».
- **Cola (HU-EN02):** `cola_reparto()`: a domicilio en `empacado` (todos) y en `despachado` (los propios; el admin ve todos), por fecha del pedido. Pestañas «Por salir · En camino». Pensada para 360 px, botones de 56 px.
- **Tomar y salir (HU-EN03):** solo desde `empacado` y a domicilio. Guarda `despachado_por` y `despachado_en`, el envío pasa a `en_camino` y la línea de tiempo dice «Salió a entregar». Si otro repartidor ya lo tomó: 409.
- **Cobro (HU-EN04):** solo contra entrega, una vez, con el pedido en camino (domicilio) o listo para recoger (tienda). El monto tiene que ser igual al total (si no, 422). Guarda `cobrado_por`, `cobrado_en` y `monto_cobrado`.
- **Entregar (HU-EN05, HU-EN06):** exige código de 4 dígitos, nombre de 3 a 120 letras (CI de 4 a 20, opcional; en tienda la pantalla lo pide), cobro registrado si es contra entrega y que el pedido sea de quien entrega (domicilio: el repartidor que lo tomó; recojo: almacén o admin). Código incorrecto: 422 `CODIGO_INCORRECTO` con los intentos que quedan; al quinto, 409 `CODIGO_BLOQUEADO`. Correcto: `entregado` (y `completado` si el pago está verificado), con `entregado_por`, `recibe_nombre`, `recibe_ci` y «Entregado a Juan Pérez» en la línea de tiempo.
- **Desbloquear (HU-EN07):** solo el admin, con nota de 3 a 300. Vuelve los intentos a 0 y lo anota en la línea de tiempo.
- **Flota (HU-EN08):** solo desde `despachado` y en zonas por flota. El cliente no escribe nada; el admin, una nota obligatoria. `cambiar_estado_pedido` ya no acepta `entregado`.
- **Efectivo (HU-EN09):** solo un pago contra entrega con cobro y todavía pendiente. Pasa a verificado con el nombre del admin y, si el pedido ya está entregado, lo completa.
- **Calificación (HU-EN10, HU-EN11):** solo el dueño, una vez, con el pedido `entregado` o `completado`. 1 a 5 estrellas, comentario hasta 200. Guarda `conforme_en` y lo anota en la línea de tiempo. El admin ve promedio, cantidad, bajas y las últimas en `/admin`. Con 1 o 2 estrellas avisa por Telegram.
- **Línea de tiempo (HU-EN12):** «Entregado a Juan Pérez · por Repartidor Demo (Repartidor) · 16/11 15:40». Los pagos verificados dicen «Pago verificado por Aldo Martínez · 16/11 09:12», y la nota PDF lo repite con el año. Los faltantes: el cliente (y el repartidor) ven «Revisando un producto de tu pedido» / «Producto repuesto, seguimos con tu pedido»; el admin y el almacén ven la nota completa. La nota interna ya no se guarda en `seguimiento_pedido` (que el cliente lee por RLS): queda solo en `faltantes_pedido`.
- **Pagos (HU-EN13):** la foto del comprobante va a la izquierda y el «Monto esperado» (total del pedido) en grande a la derecha. Filtro nuevo «Efectivo por rendir».
- **Telegram:** pedido entregado, código bloqueado y calificación baja. Las cuentas de prueba no avisan.

## Estados del pedido

```
recojo en tienda: … → listo_para_recoger → [código] → entregado → completado
a domicilio:      … → empacado → [Tomar y salir] → despachado → [cobro si contra entrega] → [código] → entregado → completado
por flota:        … → empacado → [flota y guía] → despachado → [Recibí mi pedido / admin con nota] → entregado → completado
```

Con el pago ya verificado, `entregado` y `completado` pasan en el mismo momento. Con efectivo por rendir, el pedido espera en `entregado` (grupo «Entregados por cerrar» en `/admin/envios`).

## Pantallas

`/repartidor` (cola), `/repartidor/pedidos/[id]` (cobro y código), `/pedidos` y `/pedidos/[id]` (código, «Recibí mi pedido», «Recibí conforme», panel de entrega del admin), `/almacen/pedidos/[id]` («Entregar en tienda»), `/admin/pagos` (monto esperado y efectivo por rendir), `/admin` (calificaciones), `/admin/envios` (entregados por cerrar).
