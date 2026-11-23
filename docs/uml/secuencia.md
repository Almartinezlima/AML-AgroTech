# Diagramas de secuencia

Cuatro recorridos de punta a punta, con las rutas y funciones reales.

## 1. Realizar pedido (CU-08)

Compra en 3 clics: «Ir a pagar» en el carrito, «Confirmar pedido» en una sola pantalla y la foto del pago debajo del QR. Solo se paga con QR. El total lo calcula siempre la base; el navegador solo manda productos y cantidades.

```mermaid
sequenceDiagram
  autonumber
  actor C as Cliente
  participant N as Navegador<br/>/checkout
  participant K as CarritoContext<br/>localStorage
  participant A as API REST<br/>Next.js en Render
  participant DB as Postgres<br/>Supabase
  participant Q as pg_net
  participant T as Telegram

  C->>N: «Ir a pagar»: datos recordados y QR ya marcados; elige o cambia la zona
  N->>A: POST /api/pedidos/cotizar (items, zona_id)
  A->>A: requerirSesion() y validación zod
  A->>DB: select zona activa y productos (precio, stock)
  DB-->>A: filas con RLS
  A-->>N: 200 subtotal, costo_envio, total
  N-->>C: «Tu compra» con el total del servidor

  C->>N: «Confirmar pedido» (dentro de «Tu compra»; en celular, barra fija abajo)
  Note over N: Si falta un dato: borde rojo y mensaje debajo del campo,<br/>la vista va al primero y no se llama a la API
  N->>A: POST /api/pedidos (items, zona, entrega, metodo_pago)
  A->>A: requerirSesion() y validación zod
  A->>DB: rpc crear_pedido(...)
  activate DB
  Note over DB: Una sola transacción
  DB->>DB: Bloquea los productos y lee precios reales
  alt Falta stock de algún producto
    DB-->>A: error STOCK_INSUFICIENTE (producto, disponible)
    A-->>N: 409 con el producto y lo disponible
    N->>K: ajustarStock() (el carrito sigue)
    N-->>C: Aviso junto al botón; el carrito y el total se ajustan
  else Hay stock
    DB->>DB: Inserta pedido AML-…, items, pago QR, envío y seguimiento<br/>(solo QR; otro método → AML02, 422)
    DB->>DB: Descuenta stock y anota la salida en el kardex
    DB->>DB: COMMIT
    DB->>Q: Trigger aml_aviso_pedido_nuevo encola el mensaje (si la cuenta no es de prueba)
    DB-->>A: id, codigo, total
    deactivate DB
    A-->>N: 201 id, codigo, total
    N->>K: limpiarCarrito() guarda el carrito vacío en el momento
    N->>A: GET /api/pedidos/{id} (pantalla de éxito)
    A-->>N: Pedido con el siguiente paso
    N-->>C: QR con el monto y, debajo, «Sube la foto del pago» con «Enviar»
    Q-)T: sendMessage «Pedido nuevo» al chat del admin
  end
```

En la misma pantalla del QR el cliente sube la foto del pago (`POST /api/pagos/{id}/comprobante` → `registrar_comprobante`, pago `en_revision`, aviso «Comprobante por revisar») y el admin lo aprueba o rechaza (`PATCH /api/pagos/{id}/verificar` → `verificar_pago`).

## 2. Orden de compra (CU-25 a CU-29)

Del producto por reponer a la mercadería en el kardex con su costo.

```mermaid
sequenceDiagram
  autonumber
  actor AD as Administrador
  actor DI as Distribuidor
  participant A as API REST<br/>Next.js en Render
  participant DB as Postgres<br/>Supabase
  participant Q as pg_net
  participant T as Telegram

  AD->>A: GET /api/abastecimiento/reponer
  A->>DB: select productos y presentaciones activas
  A-->>AD: Para reponer, con el proveedor más barato por unidad
  AD->>A: POST /api/ordenes-compra (lineas)
  A->>DB: rpc crear_ordenes_compra(lineas)
  DB-->>A: Un borrador por proveedor (OC-…)
  AD->>A: POST /api/ordenes-compra/{id}/enviar
  A->>DB: rpc enviar_orden_compra(id)
  Note over DB: Copia nombre, unidades y precio a cada línea<br/>estado enviada y seguimiento

  DI->>A: GET /api/distribuidor/ordenes
  A-->>DI: Sus órdenes desde enviada (nunca borradores)
  alt Acepta
    DI->>A: POST /api/ordenes-compra/{id}/aceptar (fecha_estimada)
    A->>DB: rpc aceptar_orden_compra(id, fecha)
    DB->>Q: Trigger aml_aviso_orden_compra (si no es proveedor de prueba)
    Q-)T: «Orden aceptada» con la fecha estimada
    DI->>A: POST /api/ordenes-compra/{id}/despachar (transportista, guia)
    A->>DB: rpc despachar_orden_compra(id, transportista, guia)
    DB->>Q: Trigger aml_aviso_orden_compra
    Q-)T: «Orden despachada» con transportista y guía
    AD->>A: POST /api/ordenes-compra/{id}/recibir (cantidad_recibida por línea, nota)
    A->>DB: rpc recibir_orden_compra(id, lineas, nota)
    activate DB
    Note over DB: Una sola transacción
    loop Cada línea con algo recibido
      DB->>DB: Entrada al kardex = recibidas × unidades por presentación
      DB->>DB: Stock sube y costo promedio ponderado en costos_producto
    end
    DB->>DB: Faltantes, total recibido, estado recibida y seguimiento
    DB-->>A: Orden recibida
    deactivate DB
    A-->>AD: Stock y costo actualizados
  else Rechaza
    DI->>A: POST /api/ordenes-compra/{id}/rechazar (motivo)
    A->>DB: rpc rechazar_orden_compra(id, motivo)
    DB->>Q: Trigger aml_aviso_orden_compra
    Q-)T: «Orden rechazada» con el motivo
  end
```

El admin también puede cancelar la orden con motivo mientras esté en borrador, enviada o aceptada (`POST /api/ordenes-compra/{id}/cancelar`).

## 3. Preparar y dejar «Listo para salir» (CU-34 a CU-38 y CU-52; la hace el admin)

Del pedido pagado a la caja cerrada con su etiqueta y, a domicilio, el aviso al grupo de repartidores. Cada paso guarda quién y cuándo.

```mermaid
sequenceDiagram
  autonumber
  actor AD as Administrador
  participant A as API REST<br/>Next.js en Render
  participant DB as Postgres<br/>Supabase
  participant Q as pg_net
  participant T as Telegram

  AD->>A: GET /api/almacen/pedidos («Por preparar»)
  A->>DB: rpc cola_almacen()
  Note over DB: aml_personal_almacen(): solo admin, si no AML03 (403)
  DB-->>A: Pedidos por preparar (la pantalla pone el más nuevo arriba)
  AD->>A: «Empezar a preparar» en la lista: POST /api/almacen/pedidos/{id}/preparar
  A->>DB: rpc empezar_preparacion(id)
  Note over DB: confirmado → preparando<br/>preparacion_por, preparacion_en y seguimiento
  loop Cada producto que entra a la caja
    AD->>A: PATCH /api/almacen/items/{item} (marcado: true)
    A->>DB: rpc marcar_item_pedido(item, true)
  end
  opt Falta un producto
    AD->>A: POST /api/almacen/pedidos/{id}/faltante (nota, item_id)
    A->>DB: rpc reportar_faltante(id, item, nota)
    AD->>A: POST /api/faltantes/{faltante}/resolver (nota)
    A->>DB: rpc resolver_faltante(faltante, nota)
  end
  AD->>A: POST /api/almacen/pedidos/{id}/empacar (bultos) «Listo para salir»
  A->>DB: rpc empacar_pedido(id, bultos)
  activate DB
  Note over DB: Exige todo marcado y ningún faltante abierto (si no, AML05 → 409)
  alt Recojo en tienda
    DB->>DB: listo_para_recoger (pedido y envío) y código de entrega
  else A domicilio
    DB->>DB: empacado («Listo para salir») y código de entrega
    DB->>Q: Trigger aml_aviso_entrega_disponible (si no es cuenta de prueba)
    Q-)T: Grupo de repartidores: «🛵 Entrega disponible · zona · Ganas Bs. X · /repartidor»
  else Por flota
    DB->>DB: empacado (después el admin despacha con empresa y guía)
  end
  DB-->>A: Pedido listo
  deactivate DB
  AD->>A: GET /api/almacen/pedidos/{id} (página /etiqueta)
  A-->>AD: Datos de la etiqueta
  Note over AD: Imprime una etiqueta por bulto con el QR del código
```

El cliente ve cada paso en su pedido con el nombre de quién lo hizo (`GET /api/pedidos/{id}` → `linea_tiempo_pedido`).

## 4. Reparto externo: aceptar, recoger y entregar con código (CU-39, CU-40, CU-42, CU-47 a CU-51; fases 9D y 9F)

Del pedido «Listo para salir» a la entrega con prueba, el cierre y el pago al repartidor. Nadie marca «entregado» sin el código que solo tiene el cliente.

```mermaid
sequenceDiagram
  autonumber
  actor C as Cliente
  actor R1 as Repartidor 1
  actor R2 as Repartidor 2
  actor AD as Administrador
  participant A as API REST<br/>Next.js en Render
  participant DB as Postgres<br/>Supabase
  participant Q as pg_net
  participant T as Telegram

  C->>A: GET /api/pedidos/{id}
  A->>DB: rpc mi_codigo_entrega(id)
  Note over DB: Solo el dueño: a cualquier otro (también el admin) AML04 → 404
  A-->>C: «Tu código de entrega: 4827»
  R1->>A: PATCH /api/repartidor/disponibilidad (true)
  A->>DB: rpc cambiar_disponibilidad(true)
  R1->>A: GET /api/repartidor/panel (cada 10 s)
  A->>DB: rpc panel_repartidor()
  DB-->>A: Disponibles: zona, dirección, bultos, ganas (sin datos del cliente)
  par Los dos tocan «Aceptar»
    R1->>A: POST /api/entregas/{id}/aceptar
    A->>DB: rpc aceptar_entrega(id)
    Note over DB: select … for update: bloquea la fila<br/>sin repartidor → repartidor_id = R1, aceptado_en
    DB-->>A: aceptada
  and
    R2->>A: POST /api/entregas/{id}/aceptar
    A->>DB: rpc aceptar_entrega(id) (espera el bloqueo)
    DB-->>A: AML05 «Otro repartidor ya la tomó.»
    A-->>R2: 409 y la entrega desaparece de su lista
  end
  opt R1 no aparece
    AD->>A: POST /api/entregas/{id}/liberar
    A->>DB: rpc liberar_entrega(id)
    DB->>Q: Trigger aml_aviso_entrega_disponible
    Q-)T: Se publica otra vez en el grupo
  end
  R1->>A: POST /api/entregas/{id}/tomar «Recogí el pedido»
  A->>DB: rpc tomar_pedido(id)
  Note over DB: solo quien la aceptó · empacado → despachado<br/>despachado_por, despachado_en, envío en camino
  Note over C,R1: El cliente ya tiene el pedido en la mano y dicta su código (ya pagó con QR)
  R1->>A: POST /api/entregas/{id}/entregar (código, nombre, CI)
  A->>DB: rpc entregar_pedido(id, código, nombre, CI)
  activate DB
  alt Código incorrecto
    DB->>DB: intentos_fallidos + 1 (no lanza error: el intento queda guardado)
    A-->>R1: 422 CODIGO_INCORRECTO «Quedan N intentos»
    opt Quinto intento
      DB->>Q: Trigger aml_aviso_codigo_bloqueado
      A-->>R1: 409 CODIGO_BLOQUEADO
      AD->>A: POST /api/entregas/{id}/desbloquear (nota)
    end
  else Código correcto
    DB->>DB: entregado y completado en el mismo momento (pago QR verificado)
    DB->>Q: Trigger aml_aviso_entregado
    Q-)T: Admin: «Entregado AML-… · 🛵 Al repartidor: Bs. X»
    DB-->>A: ok true
  end
  deactivate DB
  AD->>A: GET /api/repartidores
  A->>DB: rpc deudas_repartidores()
  DB-->>A: Por repartidor: por pagar, entregas sin pagar, últimos pagos
  AD->>A: POST /api/repartidores/{R1}/pagar (monto que vio)
  A->>DB: rpc pagar_repartidor(R1, monto)
  Note over DB: monto distinto (otra entrega en el medio) → AML05 (409)<br/>si coincide: fila en pagos_repartidor (quién y cuándo) y marca las entregas
  C->>A: POST /api/pedidos/{id}/calificacion (estrellas, comentario)
  A->>DB: rpc calificar_entrega(id, estrellas, comentario)
```

- **Recojo en tienda:** el cliente llega y dice su código; entrega el admin desde el pedido («Entregar en tienda»), con nombre y CI de quien recoge.
- **Por flota:** no hay código ni repartidor. El admin despacha con empresa y guía; el cliente toca «Recibí mi pedido» (`POST /api/pedidos/{id}/recibido`) o el admin lo confirma con una nota.
- Las cuentas de prueba (`@amlagrotech.test`) no avisan por Telegram.
