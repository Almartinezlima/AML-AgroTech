# 06 — Casos de uso

Catálogo de casos de uso de lo que la app hace hoy. Cada CU sale de una o más historias de usuario (HU) de los otros archivos de `specs/`. Los diagramas están en [`../uml/casos-de-uso.md`](../uml/casos-de-uso.md).

## Actores

| Actor | Tipo | Qué hace |
|---|---|---|
| Visitante | Persona | Mira el catálogo y arma el carrito sin cuenta |
| Cliente | Persona | Compra, paga, sigue sus pedidos |
| Administrador | Persona | Opera la tienda |
| Distribuidor | Persona | Proveedor mayorista: publica presentaciones y atiende órdenes de compra |
| Supabase | Sistema externo | Auth, base, archivos; dispara los avisos (`pg_net`, `pg_cron`) |
| Telegram | Sistema externo | Entrega los avisos al chat del admin |

Cliente, Administrador y Distribuidor **heredan** de Visitante (generalización): con sesión iniciada también pueden mirar el catálogo.

## Catálogo

| CU | Nombre | Actor principal | Pilar | HU |
|---|---|---|---|---|
| CU-01 | Registrarse | Visitante | Seguridad | HU-S01 |
| CU-02 | Iniciar / cerrar sesión | Cliente, Administrador, Distribuidor | Seguridad | HU-S02 |
| CU-03 | Recuperar contraseña | Visitante | Seguridad | HU-S03 |
| CU-04 | Gestionar usuarios y roles | Administrador | Seguridad | HU-S04, S05 |
| CU-05 | Explorar catálogo | Visitante | E-commerce | HU-E01, E02 |
| CU-06 | Ver ficha de producto | Visitante | E-commerce | HU-E03 |
| CU-07 | Gestionar carrito | Visitante, Cliente | E-commerce | HU-E04 |
| CU-08 | Realizar pedido (checkout) | Cliente | E-commerce | HU-E05 |
| CU-09 | Consultar mis pedidos | Cliente | E-commerce | HU-E06 |
| CU-10 | Cancelar pedido | Cliente, Administrador | E-commerce | HU-E07 |
| CU-11 | Gestionar productos | Administrador | E-commerce | HU-E08 |
| CU-12 | Ver panel de control | Administrador | Todos | HU-E10, P06, A06 |
| CU-13 | Pagar pedido (QR / transferencia / contra entrega) | Cliente | Pagos | HU-P01, P02 |
| CU-14 | Subir comprobante de pago | Cliente | Pagos | HU-P03, P05 |
| CU-15 | Verificar pago y reembolsar | Administrador | Pagos | HU-P04 |
| CU-16 | Elegir zona de envío | Cliente | Distribución | HU-D01 |
| CU-17 | Seguir pedido | Cliente | Distribución | HU-D02, D03, D07 |
| CU-18 | Gestionar pedidos y despachos | Administrador | Distribución | HU-E09, D04, D05 |
| CU-19 | Gestionar zonas de envío | Administrador | Distribución | HU-D06 |
| CU-20 | Registrar entrada / ajuste de inventario | Administrador | Almacenamiento | HU-A02 |
| CU-21 | Consultar kardex | Administrador | Almacenamiento | HU-A01, A03 |
| CU-22 | Ver alertas de stock | Administrador | Almacenamiento | HU-A05 |
| CU-23 | Gestionar proveedores | Administrador | Almacenamiento (abastecimiento) | HU-B01 |
| CU-24 | Gestionar presentaciones | Distribuidor | Almacenamiento (abastecimiento) | HU-B02 |
| CU-25 | Armar y enviar orden de compra | Administrador | Almacenamiento (abastecimiento) | HU-B03, B04 |
| CU-26 | Cancelar orden de compra | Administrador | Almacenamiento (abastecimiento) | HU-B04 |
| CU-27 | Responder orden de compra (aceptar / rechazar) | Distribuidor | Almacenamiento (abastecimiento) | HU-B05 |
| CU-28 | Despachar orden de compra | Distribuidor | Almacenamiento (abastecimiento) | HU-B06 |
| CU-29 | Recibir orden de compra | Administrador | Almacenamiento (abastecimiento) | HU-B07 |
| CU-30 | Seguir orden de compra | Administrador, Distribuidor | Almacenamiento (abastecimiento) | HU-B09 |
| CU-31 | Consultar margen | Administrador | Almacenamiento (abastecimiento) | HU-B08 |
| CU-32 | Descargar nota de venta (PDF) | Cliente, Administrador | E-commerce | HU-E11 |
| CU-33 | Avisar al administrador por Telegram | Supabase (secundario: Telegram) | Todos | HU-T01 a T05 |

Las HU de abastecimiento (HU-B…) están en [`08-abastecimiento.md`](08-abastecimiento.md) y las de avisos (HU-T…) en [`09-avisos-telegram.md`](09-avisos-telegram.md).

## Relaciones

### «include» (siempre pasa)

- CU-08 Realizar pedido **«include»** CU-16 Elegir zona de envío y CU-13 Pagar pedido.
- CU-08 **«include»** «Descontar stock» (interno, Almacenamiento: salida en el kardex).
- CU-10 Cancelar pedido **«include»** «Devolver stock» (interno: `devolucion` en el kardex).
  Si la tienda cancela un pedido con el pago en revisión o verificado, el pago pasa solo a «Reembolso pendiente»; después el admin lo marca reembolsado en CU-15.
- CU-25 Armar y enviar orden de compra **«include»** «Ver qué reponer» (proveedor más barato por unidad).
- CU-29 Recibir orden de compra **«include»** «Registrar entrada en el kardex» y «Actualizar costo promedio» (internos).
- Los CU del Administrador (CU-04, CU-11, CU-12, CU-15, CU-18 a CU-23, CU-25, CU-26, CU-29, CU-31) y del Distribuidor (CU-24, CU-27, CU-28, CU-30) **«include»** CU-02 Iniciar sesión con su rol. Los del Cliente (CU-08 a CU-10, CU-13, CU-14, CU-17, CU-32) piden sesión de cliente. En los diagramas esto va como nota para no cruzar líneas.

### «extend» (pasa solo si se cumple la condición)

- CU-14 Subir comprobante **«extend»** CU-13 Pagar pedido: solo con QR o transferencia.
- CU-32 Descargar nota de venta **«extend»** CU-09 Consultar mis pedidos: solo desde que el pedido se confirma.
- CU-33 Avisar por Telegram **«extend»**:
  - CU-08 Realizar pedido (pedido nuevo);
  - CU-14 Subir comprobante (comprobante por revisar);
  - CU-08 y CU-20 cuando el stock cruza su mínimo o llega a 0;
  - CU-27 y CU-28 (orden aceptada, rechazada o despachada).

  Condición: la cuenta no es de prueba y los secretos de Telegram están en Vault. El resumen de las 20:00 lo dispara `pg_cron`, sin otro CU.
