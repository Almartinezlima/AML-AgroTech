# 06 — Casos de uso

Base para el diagrama de casos de uso en StarUML y la plantilla Excel del docente. Las fichas completas (flujo básico, alternos, pre/poscondiciones) se terminan al final, con la app ya construida.

## Actores

Visitante · Cliente · Administrador · Distribuidor · Supabase (sistema externo).
Cliente y Administrador **heredan** de Visitante (generalización).

## Catálogo

| CU | Nombre | Actor principal | Pilar | HU |
|---|---|---|---|---|
| CU-01 | Registrarse | Visitante | Seguridad | HU-S01 |
| CU-02 | Iniciar / cerrar sesión | Visitante, Cliente, Admin | Seguridad | HU-S02 |
| CU-03 | Recuperar contraseña | Visitante | Seguridad | HU-S03 |
| CU-04 | Gestionar usuarios y roles | Administrador | Seguridad | HU-S04 |
| CU-05 | Explorar catálogo | Visitante | E-commerce | HU-E01, E02 |
| CU-06 | Ver ficha de producto | Visitante | E-commerce | HU-E03 |
| CU-07 | Gestionar carrito | Cliente | E-commerce | HU-E04 |
| CU-08 | Realizar pedido (checkout) | Cliente | E-commerce | HU-E05 |
| CU-09 | Consultar mis pedidos | Cliente | E-commerce | HU-E06 |
| CU-10 | Cancelar pedido | Cliente | E-commerce | HU-E07 |
| CU-11 | Gestionar productos | Administrador | E-commerce | HU-E08 |
| CU-12 | Ver panel de control | Administrador | Todos | HU-E10 |
| CU-13 | Pagar pedido (QR / transferencia / contra entrega) | Cliente | Pagos | HU-P01, P02 |
| CU-14 | Subir comprobante de pago | Cliente | Pagos | HU-P03, P05 |
| CU-15 | Verificar pago | Administrador | Pagos | HU-P04 |
| CU-16 | Elegir zona de envío | Cliente | Distribución | HU-D01 |
| CU-17 | Seguir pedido | Cliente | Distribución | HU-D02, D03 |
| CU-18 | Gestionar despachos | Administrador | Distribución | HU-D04, D05 |
| CU-19 | Gestionar zonas de envío | Administrador | Distribución | HU-D06 |
| CU-20 | Registrar entrada / ajuste de inventario | Administrador | Almacenamiento | HU-A02 |
| CU-21 | Consultar kardex | Administrador | Almacenamiento | HU-A03 |
| CU-22 | Ver alertas de stock | Administrador | Almacenamiento | HU-A05 |

## Relaciones

- CU-08 Realizar pedido **«include»** CU-16 Elegir zona de envío y CU-13 Pagar pedido.
- CU-08 **«include»** "Descontar stock" (interno, Almacenamiento).
- CU-14 Subir comprobante **«extend»** CU-13 (solo QR / transferencia).
- CU-10 Cancelar pedido **«include»** "Devolver stock".
- CU-04, CU-11, CU-15, CU-18, CU-19, CU-20, CU-21 **«include»** CU-02 Iniciar sesión (como admin).
