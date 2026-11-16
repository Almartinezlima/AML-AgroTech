# Diagramas de estados

Los estados son restricciones `check` de la base y **solo cambian dentro de funciones SQL** que validan quién puede hacerlo y desde qué estado. Cada cambio queda en la línea de tiempo (`seguimiento_pedido` o `seguimiento_orden_compra`).

## 1. Pedido

`cambiar_estado_pedido` solo deja avanzar al siguiente estado del camino que corresponde a la zona. Un pedido con QR o transferencia no pasa de `pendiente` hasta que su pago esté verificado.

```mermaid
stateDiagram-v2
  [*] --> pendiente : crear_pedido
  pendiente --> confirmado : pago verificado (QR o transferencia)<br/>o el admin confirma (contra entrega)
  confirmado --> preparando : admin
  state zona <<choice>>
  preparando --> zona
  zona --> listo_para_recoger : recojo en tienda
  zona --> despachado : en el pueblo o por flota<br/>(flota con transportista y guía)
  listo_para_recoger --> entregado : admin, cuando el cliente recoge
  despachado --> entregado : admin
  pendiente --> cancelado : el cliente (sin comprobante) o el admin
  confirmado --> cancelado : admin
  entregado --> [*]
  cancelado --> [*]
```

- Cancelar devuelve el stock al kardex (`devolucion`).
- El cliente solo cancela si el pedido y el pago siguen pendientes. Si ya mandó el comprobante, tiene que pedírselo a la tienda.

## 2. Pago

```mermaid
stateDiagram-v2
  [*] --> pendiente : crear_pedido
  pendiente --> en_revision : el cliente sube el comprobante<br/>(QR o transferencia)
  en_revision --> verificado : el admin aprueba
  en_revision --> rechazado : el admin rechaza con motivo
  rechazado --> en_revision : el cliente sube otro comprobante
  pendiente --> verificado : contra entrega, al entregar el pedido
  en_revision --> reembolso_pendiente : la tienda cancela el pedido
  verificado --> reembolso_pendiente : la tienda cancela el pedido
  reembolso_pendiente --> reembolsado : el admin lo marca devuelto
  verificado --> [*]
  reembolsado --> [*]
```

- Funciones: `registrar_comprobante`, `verificar_pago`, `cancelar_pedido` y `marcar_reembolsado`.
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
