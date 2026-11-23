# 10 — Preparación y «Listo para salir»

Fase 9C (migración `0017`), rehecha en la 9F (migración `0020`). Preparar, reportar faltantes, dejar el pedido listo e imprimir la etiqueta lo hace el **admin** en «Por preparar» (`/admin/preparar`).

Responde a la observación del docente: «controlar la preparación y empaque del producto». La idea de AML: **cada paso tiene un responsable y queda registrado quién lo hizo y cuándo**.

## Roles del flujo de compra

| Rol | Qué hace | Panel |
|---|---|---|
| `cliente` | Compra, paga con QR, da su código al recibir | `/pedidos` |
| `admin` | Verifica el pago, prepara, deja «Listo para salir», entrega en tienda, despacha por flota, paga a los repartidores | `/admin` (incluye `/admin/preparar` y `/admin/repartidores`) |
| `repartidor` | Persona externa: acepta entregas a domicilio, las recoge en la tienda y las entrega con el código (ver [`12-reparto-externo.md`](12-reparto-externo.md)) | `/repartidor` |

El rol `distribuidor` (proveedor mayorista, [`08-abastecimiento.md`](08-abastecimiento.md)) sigue igual: no es parte del flujo de compra.

- Los roles los asigna **solo el admin** en `/admin/usuarios`. `handle_new_user` crea siempre clientes (también con Google).
- Las funciones de preparación revisan el rol con `aml_personal_almacen()` (nombre heredado de la 0017), que deja pasar **solo al admin**.
- Las rutas de la API conservan el prefijo `/api/almacen/*` por nombre, pero son **solo para el admin** (`requerirAdmin`). La dirección vieja `/almacen` redirige a `/admin/preparar`.

## Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| HU-AL01 | Como **administrador** quiero ver la cola de pedidos pagados, el más nuevo arriba, para saber qué preparar | Alta |
| HU-AL02 | Como **administrador** quiero tocar «Empezar a preparar» para que quede registrado quién lo está preparando | Alta |
| HU-AL03 | Como **administrador** quiero marcar cada producto al ponerlo en la caja, para no olvidarme de ninguno | Alta |
| HU-AL04 | Como **administrador** quiero reportar un faltante con una nota; el cliente ve solo «Revisando un producto de tu pedido» | Alta |
| HU-AL05 | Como **administrador** quiero resolver un faltante («Repuesto, continuar») con una nota | Alta |
| HU-AL06 | Como **administrador** quiero tocar «Listo para salir» con la cantidad de bultos; a domicilio se avisa al grupo de repartidores | Alta |
| HU-AL07 | Como **administrador** quiero imprimir una etiqueta por bulto con el código, el QR, el cliente, el teléfono y el destino | Alta |
| HU-AL08 | Como **cliente** o **administrador** quiero ver en la línea de tiempo quién hizo cada paso y a qué hora | Alta |
| HU-AL09 | Como **administrador** quiero asignar el rol Repartidor a una persona que se registró como cliente | Alta |
| HU-AL10 | Como **administrador** quiero poder cancelar un pedido en preparación o listo para salir, con el stock de vuelta al kardex | Media |

## Criterios de aceptación

- **Cola (HU-AL01):** pedidos `confirmado`, `preparando`, `empacado` y `listo_para_recoger`, **el más nuevo arriba** (fase 9G). Pestañas «Por preparar · En preparación · Listos». Se actualiza sola cada 10 s y al volver a la pestaña.
- **Empezar (HU-AL02):** solo desde `confirmado` y con el pago verificado. Desde la 9G, cada pedido confirmado trae **«Empezar a preparar» en la lista**: empieza y abre el detalle (si falla, el motivo sale en la tarjeta). Guarda `preparacion_por` y `preparacion_en`.
- **Casillas (HU-AL03):** solo en `preparando`. Cada casilla guarda quién y cuándo. Botones de 56 px.
- **Faltante (HU-AL04):** nota de 3 a 300 caracteres, producto opcional. Queda en `faltantes_pedido`; el cliente ve «Revisando un producto de tu pedido».
- **Resolver (HU-AL05):** solo el admin, desde el detalle del pedido, con nota obligatoria. Nada se borra.
- **Listo para salir (HU-AL06):** `empacar_pedido` exige **todos los productos marcados** y **ningún faltante abierto**. Bultos de 1 a 50. Recojo pasa a `listo_para_recoger`; a domicilio o por flota, a `empacado` («Listo para salir» en pantalla). Genera el código de entrega (recojo y domicilio). La línea de tiempo dice «Listo para salir · 2 bultos». **A domicilio**, la base publica en el grupo de Telegram de repartidores (ver 12).
- **Etiqueta (HU-AL07):** `/admin/preparar/pedidos/[id]/etiqueta`, 10 × 15 cm, una por bulto. El menú del admin no sale al imprimir.
- **Línea de tiempo (HU-AL08):** «por Aldo Martínez (Administrador) · 16/11 14:32»; los pasos del cliente dicen «por ti». La ven el dueño, el admin y el repartidor que lleva el pedido.
- **Roles (HU-AL09):** selector en `/admin/usuarios` con Cliente, Administrador, Distribuidor y Repartidor; tarjeta «Repartidores» en el resumen.
- **Cancelar (HU-AL10):** el admin cancela en `pendiente`, `confirmado`, `preparando` y `empacado` (aunque un repartidor la haya aceptado). El stock vuelve al kardex y un pago verificado pasa a reembolso pendiente.

## Estados del pedido

```
recojo en tienda: pendiente → confirmado → preparando → [Listo para salir] → listo_para_recoger → [código] → completado
a domicilio:      pendiente → confirmado → preparando → [Listo para salir] → empacado → [repartidor] → despachado → [código] → completado
por flota:        pendiente → confirmado → preparando → [Listo para salir] → empacado → [flota y guía] → despachado → [Recibí mi pedido] → completado
```

`preparando` y `empacado` solo se alcanzan con `empezar_preparacion` y `empacar_pedido`; `cambiar_estado_pedido` no los acepta.

## Pantallas

`/admin/preparar` (cola), `/admin/preparar/pedidos/[id]` (preparar y, en recojo, «Entregar en tienda»), `/admin/preparar/pedidos/[id]/etiqueta` (imprimir), `/pedidos/[id]` (línea de tiempo; el admin resuelve faltantes), `/admin/envios` (grupo «Listo para salir»), `/admin/usuarios` (rol Repartidor).
