# Diagramas de secuencia

Dos recorridos de punta a punta, con las rutas y funciones reales.

## 1. Realizar pedido (CU-08)

Desde «Elegir cómo pagar» en `/checkout` hasta la pantalla de éxito. El total lo calcula siempre la base; el navegador solo manda productos y cantidades.

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

  C->>N: Elige zona, datos de entrega y «Elegir cómo pagar»
  N->>A: POST /api/pedidos/cotizar (items, zona_id)
  A->>A: requerirSesion() y validación zod
  A->>DB: select zona activa y productos (precio, stock)
  DB-->>A: filas con RLS
  A-->>N: 200 subtotal, costo_envio, total
  N-->>C: Paso Pago con el total del servidor

  C->>N: Elige QR, transferencia o contra entrega y «Confirmar pedido»
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
    N-->>C: Aviso y vuelve a «Datos y envío»
  else Hay stock
    DB->>DB: Inserta pedido AML-…, items, pago, envío y seguimiento
    DB->>DB: Descuenta stock y anota la salida en el kardex
    DB->>DB: COMMIT
    DB->>Q: Trigger aml_aviso_pedido_nuevo encola el mensaje (si la cuenta no es de prueba)
    DB-->>A: id, codigo, total
    deactivate DB
    A-->>N: 201 id, codigo, total
    N->>K: limpiarCarrito() guarda el carrito vacío en el momento
    N->>A: GET /api/pedidos/{id} (pantalla de éxito)
    A-->>N: Pedido con el siguiente paso
    N-->>C: «¡Pedido registrado!» con instrucciones de pago
    Q-)T: sendMessage «Pedido nuevo» al chat del admin
  end
```

Después, si eligió QR o transferencia, el cliente sube el comprobante (`POST /api/pagos/{id}/comprobante` → `registrar_comprobante`, pago `en_revision`, aviso «Comprobante por revisar») y el admin lo aprueba o rechaza (`PATCH /api/pagos/{id}/verificar` → `verificar_pago`).

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
