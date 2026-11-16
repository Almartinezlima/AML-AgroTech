# Diagrama de clases (modelo de datos)

Cada clase es una tabla real de Postgres (esquema `public`, migraciones `0001` a `0015`). Van los atributos principales; los `created_at` / `updated_at` se omiten salvo cuando son parte del negocio. Las operaciones `«SQL»` son las funciones transaccionales que cambian esa tabla: la API no escribe directo en las tablas de pedidos, pagos, kardex ni órdenes de compra (RLS sin `insert`/`update`), todo pasa por esas funciones.

| Clase | Tabla |
|---|---|
| Perfil | `perfiles` (1 a 1 con `auth.users` de Supabase Auth) |
| Categoria | `categorias` |
| Producto | `productos` |
| ZonaEnvio | `zonas_envio` |
| Pedido | `pedidos` |
| PedidoItem | `pedido_items` |
| Pago | `pagos` |
| Envio | `envios` |
| SeguimientoPedido | `seguimiento_pedido` |
| MovimientoInventario | `movimientos_inventario` (kardex) |
| Distribuidor | `distribuidores` |
| PresentacionDistribuidor | `presentaciones_distribuidor` |
| CostoProducto | `costos_producto` |
| OrdenCompra | `ordenes_compra` |
| OrdenCompraItem | `orden_compra_items` |
| SeguimientoOrdenCompra | `seguimiento_orden_compra` |

## 1. Tienda: catálogo, pedidos, pagos, envíos e inventario

```mermaid
classDiagram
  direction LR
  class Perfil {
    +uuid id
    +text nombre
    +text email
    +Rol rol
    +text telefono
    +bool activo
    +es_admin() bool «SQL»
  }
  class Categoria {
    +uuid id
    +text nombre
    +text icono
    +bool activo
  }
  class Producto {
    +uuid id
    +text sku
    +text nombre
    +numeric precio
    +int stock
    +int stock_minimo
    +text unidad
    +text imagen_url
    +text composicion
    +text banda_toxicologica
    +numeric precio_referencia
    +text tendencia_precio
    +bool activo
  }
  class ZonaEnvio {
    +uuid id
    +text nombre
    +TipoZona tipo
    +numeric costo
    +int dias_min
    +int dias_max
    +bool permite_contra_entrega
    +bool activo
  }
  class Pedido {
    +uuid id
    +text codigo
    +EstadoPedido estado
    +numeric subtotal
    +numeric costo_envio
    +numeric total
    +MetodoPago metodo_pago
    +EstadoPago estado_pago
    +text direccion_entrega
    +text recoge_nombre
    +text recoge_ci
    +text telefono_contacto
    +crear_pedido() «SQL»
    +cancelar_pedido() «SQL»
    +cambiar_estado_pedido() «SQL»
  }
  class PedidoItem {
    +uuid id
    +text nombre_producto
    +numeric precio_unitario
    +int cantidad
    +numeric subtotal
  }
  class Pago {
    +uuid id
    +MetodoPago metodo
    +numeric monto
    +text comprobante_path
    +EstadoPago estado
    +text motivo_rechazo
    +timestamptz revisado_en
    +registrar_comprobante() «SQL»
    +verificar_pago() «SQL»
    +marcar_reembolsado() «SQL»
  }
  class Envio {
    +uuid id
    +text transportista
    +text numero_guia
    +EstadoEnvio estado
    +timestamptz despachado_en
    +timestamptz entregado_en
  }
  class SeguimientoPedido {
    +uuid id
    +text estado
    +text nota
    +timestamptz created_at
  }
  class MovimientoInventario {
    +uuid id
    +TipoMovimiento tipo
    +int cantidad
    +int stock_anterior
    +int stock_nuevo
    +text motivo
    +numeric costo_unitario
    +timestamptz created_at
    +registrar_movimiento() «SQL»
  }
  Categoria "1" --> "0..*" Producto : agrupa
  Perfil "1" --> "0..*" Pedido : hace
  ZonaEnvio "1" --> "0..*" Pedido : se entrega en
  Pedido "1" *-- "1..*" PedidoItem : contiene
  Producto "1" --> "0..*" PedidoItem : se vende en
  Pedido "1" *-- "1" Pago : se paga con
  Pedido "1" *-- "1" Envio : se entrega con
  Pedido "1" *-- "1..*" SeguimientoPedido : línea de tiempo
  Producto "1" --> "0..*" MovimientoInventario : kardex
  Pedido "0..1" --> "0..*" MovimientoInventario : salida o devolución
  Perfil "0..1" --> "0..*" MovimientoInventario : registra
  Perfil "0..1" --> "0..*" Pago : revisa
```

## 2. Abastecimiento: proveedores y órdenes de compra

```mermaid
classDiagram
  direction LR
  class Perfil {
    +uuid id
    +Rol rol
    +es_distribuidor() bool «SQL»
  }
  class Producto {
    +uuid id
    +text nombre
    +numeric precio
    +int stock
    +text unidad
  }
  class Distribuidor {
    +uuid id
    +text nombre_comercial
    +Ciudad ciudad
    +text telefono
    +text nit
    +int dias_entrega
    +bool activo
  }
  class PresentacionDistribuidor {
    +uuid id
    +text nombre
    +int unidades_por_presentacion
    +numeric precio_mayorista
    +bool disponible
    +int dias_entrega
    +bool activo
  }
  class CostoProducto {
    +numeric costo_promedio
    +numeric costo_ultimo
    +timestamptz actualizado_en
  }
  class OrdenCompra {
    +uuid id
    +text codigo
    +EstadoOrden estado
    +numeric total
    +numeric total_recibido
    +date fecha_estimada
    +text transportista
    +text guia
    +text motivo
    +text nota_recepcion
    +crear_ordenes_compra() «SQL»
    +enviar_orden_compra() «SQL»
    +cancelar_orden_compra() «SQL»
    +aceptar_orden_compra() «SQL»
    +rechazar_orden_compra() «SQL»
    +despachar_orden_compra() «SQL»
    +recibir_orden_compra() «SQL»
  }
  class OrdenCompraItem {
    +uuid id
    +int cantidad
    +text nombre_presentacion
    +int unidades_por_presentacion
    +numeric precio_unitario
    +int cantidad_recibida
    +int faltante
    +guardar_linea_orden_compra() «SQL»
  }
  class SeguimientoOrdenCompra {
    +uuid id
    +text estado
    +text nota
    +timestamptz created_at
  }
  class MovimientoInventario {
    +uuid id
    +TipoMovimiento tipo
    +int cantidad
    +numeric costo_unitario
    +numeric costo_promedio_anterior
  }
  Perfil "1" --> "0..1" Distribuidor : cuenta del proveedor
  Distribuidor "1" o-- "0..*" PresentacionDistribuidor : vende
  Producto "1" --> "0..*" PresentacionDistribuidor : se compra como
  Producto "1" --> "0..1" CostoProducto : costo
  Distribuidor "1" --> "0..*" OrdenCompra : recibe
  OrdenCompra "1" *-- "1..*" OrdenCompraItem : líneas
  PresentacionDistribuidor "1" --> "0..*" OrdenCompraItem : se pide en
  Producto "1" --> "0..*" OrdenCompraItem : entra como
  OrdenCompra "1" *-- "1..*" SeguimientoOrdenCompra : línea de tiempo
  OrdenCompra "0..1" --> "0..*" MovimientoInventario : entrada al recibir
  Producto "1" --> "0..*" MovimientoInventario : kardex
```

## 3. Enumeraciones (restricciones `check` de la base)

```mermaid
classDiagram
  direction LR
  class Rol {
    <<enumeration>>
    admin
    cliente
    distribuidor
  }
  class TipoZona {
    <<enumeration>>
    recojo
    urbano
    provincia
  }
  class MetodoPago {
    <<enumeration>>
    qr
    transferencia
    contra_entrega
  }
  class EstadoPedido {
    <<enumeration>>
    pendiente
    confirmado
    preparando
    listo_para_recoger
    despachado
    entregado
    cancelado
  }
  class EstadoPago {
    <<enumeration>>
    pendiente
    en_revision
    verificado
    rechazado
    reembolso_pendiente
    reembolsado
  }
  class EstadoEnvio {
    <<enumeration>>
    por_despachar
    listo_para_recoger
    en_camino
    entregado
  }
  class TipoMovimiento {
    <<enumeration>>
    entrada
    salida
    ajuste
    devolucion
  }
  class Ciudad {
    <<enumeration>>
    Sucre
    Santa Cruz
  }
  class EstadoOrden {
    <<enumeration>>
    borrador
    enviada
    aceptada
    despachada
    recibida
    rechazada
    cancelada
  }
```

## Notas del modelo

- **Sin borrado físico:** productos, zonas, proveedores y presentaciones se desactivan (`activo = false`); el kardex y las líneas de tiempo solo reciben `insert`. La única excepción está documentada en [`../ESTADO.md`](../ESTADO.md) (limpieza de pruebas en `costos_producto`).
- **Precios congelados:** `PedidoItem.precio_unitario` y `OrdenCompraItem.precio_unitario` guardan el precio del momento; si el producto o la presentación cambian de precio después, el pedido o la orden no cambian.
- **Stock protegido:** `Producto.stock` solo cambia dentro de las funciones que registran un `MovimientoInventario` (trigger `proteger_stock_producto`) y nunca queda negativo.
- **Costo aparte:** `CostoProducto` es solo del admin, porque `Producto` se lee sin sesión.
