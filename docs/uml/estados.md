# Diagramas de estados

Los estados son restricciones `check` de la base y **solo cambian dentro de funciones SQL** que validan quién puede hacerlo y desde qué estado. Cada cambio queda en la línea de tiempo (`seguimiento_pedido` o `seguimiento_orden_compra`).

## 1. Pedido

`cambiar_estado_pedido` (admin) solo confirma y despacha por flota. Preparar y empacar se hacen **solo** con las funciones del almacén (`empezar_preparacion`, `empacar_pedido`, 0017). Desde la **0018 nadie marca «entregado» sin prueba**: a domicilio y en tienda hace falta el **código de 4 dígitos del cliente** (`entregar_pedido`); por flota lo confirma el cliente («Recibí mi pedido») o el admin con una nota (`confirmar_recepcion`). Un pedido con QR o transferencia no pasa de `pendiente` hasta que su pago esté verificado.

```mermaid
stateDiagram-v2
  [*] --> pendiente : crear_pedido<br/>(QR o transferencia)
  [*] --> confirmado : crear_pedido<br/>(efectivo al recibir, 0019)
  pendiente --> confirmado : pago verificado
  confirmado --> preparando : almacén o admin<br/>empezar_preparacion
  state zona <<choice>>
  preparando --> zona : empacar_pedido<br/>(todo marcado, sin faltantes abiertos)<br/>genera el código de entrega
  zona --> listo_para_recoger : recojo en tienda
  zona --> empacado : a domicilio o por flota
  empacado --> despachado : repartidor «Tomar y salir» (domicilio)<br/>admin con flota y guía (provincia)
  listo_para_recoger --> entregado : almacén o admin<br/>código del cliente + quién recoge
  despachado --> entregado : repartidor con el código (domicilio)<br/>cliente o admin con nota (flota)
  state pagado <<choice>>
  entregado --> pagado
  pagado --> completado : pago verificado (en el mismo momento)
  pagado --> entregado_espera : efectivo por rendir
  entregado_espera --> completado : admin «Recibí el efectivo»
  pendiente --> cancelado : el cliente (sin comprobante) o el admin
  confirmado --> cancelado : admin, o el cliente si es<br/>efectivo al recibir y el almacén no empezó
  preparando --> cancelado : admin
  empacado --> cancelado : admin
  completado --> [*]
  cancelado --> [*]
```

- `entregado_espera` no es otro estado: es `entregado` con el efectivo de efectivo al recibir todavía en manos del repartidor o del almacén. Se dibuja aparte para que se lea.
- **Código de entrega:** 5 intentos fallidos lo bloquean; el pedido no se entrega hasta que el admin lo desbloquea con una nota. El cliente lo ve en «Mis pedidos»; el repartidor, el almacén y el admin nunca.
- **Efectivo al recibir:** antes del código se registra el cobro (`registrar_cobro_entrega`, monto igual al total).
- Cancelar devuelve el stock al kardex (`devolucion`) y cierra los faltantes abiertos. Un pedido despachado ya no se cancela.
- En `preparando`, un faltante reportado frena el empaque hasta que el admin lo resuelve («Repuesto, continuar»). El cliente ve solo «Revisando un producto de tu pedido».

## 2. Pago

```mermaid
stateDiagram-v2
  [*] --> pendiente : crear_pedido
  pendiente --> en_revision : el cliente sube el comprobante<br/>(QR o transferencia)
  en_revision --> verificado : el admin aprueba
  en_revision --> rechazado : el admin rechaza con motivo
  rechazado --> en_revision : el cliente sube otro comprobante
  pendiente --> por_rendir : efectivo al recibir: cobra el repartidor<br/>o el almacén (monto = total)
  por_rendir --> verificado : el admin «Recibí el efectivo»
  pendiente --> verificado : efectivo al recibir: cobra el admin
  en_revision --> reembolso_pendiente : la tienda cancela el pedido
  verificado --> reembolso_pendiente : la tienda cancela el pedido
  reembolso_pendiente --> reembolsado : el admin lo marca devuelto
  verificado --> [*]
  reembolsado --> [*]
```

- `por_rendir` es `pendiente` con `cobrado_en` lleno (0018): se ve como «Efectivo por rendir» en `/admin/pagos`.
- Funciones: `registrar_comprobante`, `verificar_pago`, `registrar_cobro_entrega`, `confirmar_efectivo`, `cancelar_pedido` y `marcar_reembolsado`.
- Al verificar, la línea de tiempo y la recibo de compra dicen «Pago verificado por <nombre> · <fecha y hora>».
- El monto es siempre el total del pedido, lo pone la base.
- Si se cancela un pedido con el pago `pendiente` o `rechazado`, el pago queda como estaba: no hubo plata que devolver.

## 3. Orden de compra

```mermaid
stateDiagram-v2
  [*] --> borrador : crear_ordenes_compra (admin)
  borrador --> enviada : enviar_orden_compra (admin)
  enviada --> aceptada : aceptar_orden_compra<br/>(distribuidor, con fecha estimada)
  aceptada --> despachada : despachar_orden_compra<br/>(distribuidor, transportista y guía)
  despachada --> recibida : recibir_orden_compra<br/>(admin, entra al kardex)
  enviada --> rechazada : rechazar_orden_compra<br/>(distribuidor, con motivo)
  aceptada --> rechazada : rechazar_orden_compra
  borrador --> cancelada : cancelar_orden_compra<br/>(admin, con motivo)
  enviada --> cancelada : cancelar_orden_compra
  aceptada --> cancelada : cancelar_orden_compra
  recibida --> [*]
  rechazada --> [*]
  cancelada --> [*]
```

- Una orden despachada ya no se cancela: se recibe, aunque no llegue nada (todo queda como faltante).
- El distribuidor nunca ve los borradores.
- Telegram avisa al admin al pasar a aceptada, rechazada o despachada, salvo que el proveedor sea de prueba.
