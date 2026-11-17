# 10 — Preparación y empaque (roles Almacén y Repartidor)

Fase 9C. Migración `0017` (por correr: la ensaya y corre el chat del Proyecto). Programado y verificado con build, lint y capturas; las pruebas con la base real se hacen después de correr la 0017.

Responde a dos observaciones del docente: «controlar la preparación y empaque del producto con roles específicos de usuario» y «completar de forma correcta el cobro con QR o depósito». La idea de AML: **cada paso tiene un responsable y queda registrado quién lo hizo y cuándo**.

## Roles

| Rol | Qué hace | Panel |
|---|---|---|
| `almacen` | Prepara y empaca los pedidos pagados, reporta faltantes, imprime etiquetas | `/almacen` |
| `repartidor` | Lleva los pedidos empacados y los entrega con el código del cliente (fase 9D, ver [`11-entrega-cierre.md`](11-entrega-cierre.md)) | `/repartidor` |
| `admin` | Todo lo anterior, más resolver faltantes y cancelar | `/admin` y `/almacen` |

- Los asigna **solo el admin** en `/admin/usuarios`. Nadie se asigna un rol solo: `proteger_campos_perfil` lo impide y `handle_new_user` crea siempre clientes (también con Google).
- `es_almacen()` y `es_repartidor()` exigen el rol exacto y la cuenta activa. `aml_personal_almacen()` deja pasar al almacén y al admin.
- **Sin lectura directa de tablas.** El almacén y el repartidor no tienen políticas RLS sobre pedidos, pagos, perfiles ni faltantes. Leen y escriben solo a través de funciones `security definer` que revisan el rol y devuelven lo justo para trabajar (código, cliente, teléfono, zona, dirección y productos). Nunca ven precios de costo, pagos ni el correo del cliente.
- Tres capas, como el resto: middleware (`/almacen` solo almacén o admin; `/repartidor` solo repartidor o admin), API (`requerirRol`, 401 sin sesión y 403 con otro rol) y base (funciones que cortan con `AML03`).

## Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| HU-AL01 | Como **almacén** quiero ver la cola de pedidos pagados (o contra entrega confirmados), el más antiguo primero, para saber qué preparar | Alta |
| HU-AL02 | Como **almacén** quiero tocar «Empezar a preparar» para que quede registrado que yo lo estoy preparando | Alta |
| HU-AL03 | Como **almacén** quiero marcar cada producto al ponerlo en la caja, para no olvidarme de ninguno | Alta |
| HU-AL04 | Como **almacén** quiero reportar un faltante con una nota, para que la tienda se entere al instante | Alta |
| HU-AL05 | Como **administrador** quiero resolver un faltante («Repuesto, continuar») con una nota, para que el almacén pueda seguir | Alta |
| HU-AL06 | Como **almacén** quiero marcar el pedido «Empacado» con la cantidad de bultos, para dejarlo listo para el repartidor o para que el cliente lo recoja | Alta |
| HU-AL07 | Como **almacén** quiero imprimir una etiqueta por bulto con el código, el QR, el cliente, el teléfono y el destino | Alta |
| HU-AL08 | Como **cliente** o **administrador** quiero ver en la línea de tiempo quién hizo cada paso y a qué hora | Alta |
| HU-AL09 | Como **administrador** quiero asignar los roles Almacén y Repartidor | Alta |
| HU-AL10 | Como **administrador** quiero poder cancelar un pedido en preparación o empacado, con el stock de vuelta al kardex | Media |

## Criterios de aceptación

- **Cola (HU-AL01):** pedidos `confirmado`, `preparando`, `empacado` y `listo_para_recoger`, ordenados por fecha del pedido. Pestañas «Por preparar · En preparación · Empacados». Cada tarjeta muestra el avance de la caja («2 de 3») y si hay un faltante sin resolver.
- **Empezar (HU-AL02):** solo desde `confirmado`, y con el pago verificado salvo contra entrega. Guarda `preparacion_por` y `preparacion_en` y deja «Preparación iniciada» en la línea de tiempo.
- **Casillas (HU-AL03):** solo con el pedido en `preparando`. Cada casilla guarda quién y cuándo (`marcado_por`, `marcado_en`); desmarcar las borra. Botones de 56 px de alto, cómodos con guantes.
- **Faltante (HU-AL04):** nota de 3 a 300 caracteres, producto opcional. Queda en `faltantes_pedido` y en la línea de tiempo, y avisa al admin por Telegram (salvo cuentas de prueba).
- **Resolver (HU-AL05):** solo el admin, desde el detalle del pedido. Nota obligatoria (3 a 300). Guarda `resuelto_en`, `resuelto_por` y `nota_resolucion`, y lo anota en la línea de tiempo. Nada se borra.
- **Empacado (HU-AL06):** exige **todos los productos marcados** y **ningún faltante abierto**. Bultos de 1 a 50. Recojo en tienda pasa a `listo_para_recoger` (y su envío también); a domicilio o por flota pasa a `empacado`. Guarda `empacado_por`, `empacado_en` y `bultos`.
- **Etiqueta (HU-AL07):** página imprimible `/almacen/pedidos/[id]/etiqueta`, de 10 × 15 cm, en negro sobre blanco: «Bulto N de M», código grande, QR con el código del pedido, cliente, teléfono, zona y dirección (o quién recoge en la flota, con su CI). Sale una etiqueta por hoja.
- **Línea de tiempo (HU-AL08):** `linea_tiempo_pedido` devuelve cada paso con el nombre corto de quien lo hizo («Aldo Martínez») y su rol. Se muestra «por Aldo Martínez (Administrador) · 16/11 14:32» en hora de Bolivia; los pasos del propio cliente dicen «por ti». La ven el dueño, el admin y el almacén (solo pedidos en su camino).
- **Roles (HU-AL09):** selector de rol en `/admin/usuarios` con Almacén y Repartidor; tarjeta «Personal» en el resumen.
- **Cancelar (HU-AL10):** el admin cancela en `pendiente`, `confirmado`, `preparando` y `empacado`. El stock vuelve al kardex (`devolucion`), un pago verificado o en revisión pasa a reembolso pendiente y los faltantes abiertos se cierran con la nota «Pedido cancelado».

## Estados del pedido

```
recojo en tienda:        pendiente → confirmado → preparando → [empacar] → listo_para_recoger → entregado
a domicilio o por flota: pendiente → confirmado → preparando → [empacar] → empacado → despachado → entregado
```

- `preparando` y el empaque solo se alcanzan con las funciones del almacén (`empezar_preparacion`, `empacar_pedido`). `cambiar_estado_pedido` (admin) ya no los acepta: así nunca se salta la casilla de cada producto ni el registro de quién lo hizo.
- Desde la **9D** (0018): a domicilio despacha el repartidor («Tomar y salir») y nadie marca «entregado» sin el código del cliente; el admin solo despacha por flota. Detalle en [`11-entrega-cierre.md`](11-entrega-cierre.md).
- Un pedido que ya estaba en `preparando` antes de la 0017 se sigue preparando en `/almacen`, sin migrar datos.

## Pantallas

`/almacen` (cola), `/almacen/pedidos/[id]` (preparar), `/almacen/pedidos/[id]/etiqueta` (imprimir), `/pedidos/[id]` (línea de tiempo con nombres; el admin ve los faltantes y los resuelve), `/admin/envios` (grupo «Empacados»), `/admin/usuarios` (roles nuevos).
