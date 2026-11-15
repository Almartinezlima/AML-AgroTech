# Fase 6B — Abastecimiento: órdenes de compra, recepción y margen (14 nov 2026)

Rama `fase/6b-abastecimiento`, desde `master` con la fase 6A unida (PR #15). **Migración 0015** (la corre el chat del Proyecto; Claude Code no). Segunda mitad de la fase 6.

## Por qué

En la 6A el distribuidor pasó a ser el proveedor mayorista. Ahora la tienda le compra con órdenes de compra. Al recibir, la mercadería entra al kardex **fraccionada** en la unidad de venta (3 bidones de 20 L = 60 litros), con su costo, y el costo del producto se lleva por **promedio ponderado** para calcular el margen.

## Decisiones (Aldo, 14 nov)

- **Estados**:
  - camino normal: borrador → enviada → aceptada (el proveedor pone la fecha) → despachada (transportista y guía) → recibida;
  - rechazada: la rechaza el proveedor, con motivo, desde enviada o aceptada;
  - cancelada: la cancela el admin, con motivo, solo desde borrador, enviada o aceptada. **Una orden despachada no se cancela.**

  Todo cambio de estado pasa por funciones security definer que validan el rol y el estado.
- **Un solo borrador por proveedor**: «Armar orden» le suma líneas al que ya existe. Si la presentación ya estaba, queda la cantidad nueva.
- **Sin hard-delete**:
  - una línea quitada del borrador queda en cantidad 0 y no se envía;
  - **excepción única**: `anular_orden_compra_prueba` borra la fila de `costos_producto` cuando la orden de prueba fue la primera recepción del producto. Es un dato calculado y el rastro queda en el kardex. La API sigue sin `delete`, y lo verifica un FRENO. Está documentado en la 0015 y en `ESTADO.md`.
- **Recepción única**:
  - se recibe de 0 a lo pedido por línea, y lo que falta queda como faltante;
  - con todo en 0 la orden queda recibida y todo como faltante, sin kardex ni cambio de costo. El modal pide confirmar: «No llegó nada: se registra todo como faltante».
- **La limpieza no se hace** si después entró otra compra del mismo producto (pisaría un costo real) o si ya se vendió lo recibido.
- **El proveedor no ve borradores**, ni stock, costos o clientes.
- **Hoy no hay nada para reponer** (el producto más bajo está en 3× su mínimo). Por eso se agregó «Pedir otro producto», con el resto de lo que tiene proveedor.
- **Menú**: «Distribuidores» pasa a «Abastecimiento», con 2 pestañas (Reponer y órdenes · Distribuidores). Se suma «Margen».
- **Margen promedio**: promedio simple del % de margen entre los productos activos con costo, real o estimado.
- **Plural de la unidad de venta**: «trae 20 litros», «50 unidades», «3 sacos 50kg». Se pluraliza la primera palabra, con la misma regla en TypeScript y en SQL.

## Qué se hizo

- **0015** (`supabase/migrations/0015_ordenes_compra.sql`):
  - tablas `ordenes_compra` (OC-000001), `orden_compra_items` y `seguimiento_orden_compra`, solo de lectura por RLS;
  - en el kardex, las columnas opcionales `costo_unitario`, `orden_compra_id` y `costo_promedio_anterior`;
  - funciones `crear_ordenes_compra`, `guardar_linea_orden_compra`, `enviar_`, `cancelar_`, `aceptar_`, `rechazar_`, `despachar_` y `recibir_orden_compra`, y `anular_orden_compra_prueba`;
  - auxiliares `aml_plural_unidad` y `aml_costo_promedio`;
  - trigger de Telegram al aceptar, rechazar o despachar, que se salta los proveedores de prueba;
  - FRENOs al final, entre ellos:
    - el plural y el promedio con casos conocidos;
    - `aml_aviso_stock` y `proteger_stock_producto` intactos;
    - `costos_producto` sin `delete` para la API.
- **API** (en OpenAPI, etiqueta Abastecimiento):
  - `GET /api/abastecimiento/reponer`;
  - `GET|POST /api/ordenes-compra`;
  - `GET /api/ordenes-compra/:id`, que da al admin la vista completa y al proveedor una vista reducida;
  - `PATCH /api/ordenes-compra/:id/lineas`;
  - `POST /api/ordenes-compra/:id/{enviar,cancelar,recibir,anular-prueba}` (admin);
  - `POST /api/ordenes-compra/:id/{aceptar,rechazar,despachar}` (proveedor);
  - `GET /api/distribuidor/ordenes` y `GET /api/margen`.
- **Pantallas**:
  - `/admin/abastecimiento`;
  - `/admin/abastecimiento/ordenes/[id]`, con el editor del borrador, las acciones, la recepción en modal y la línea de tiempo;
  - `/admin/margen`;
  - la tarjeta «Margen promedio» en `/admin`;
  - «Órdenes de la tienda» en `/distribuidor`;
  - `/distribuidor/ordenes/[id]`.
- **Pruebas**:
  - `tests/e2e/abastecimiento.spec.ts`: 6 pruebas;
  - la limpieza de órdenes en `utilidades.ts` y en el barrido;
  - `tests/capturas/abastecimiento-6b.spec.ts`, que crea una orden en cada estado y las anula al final.

## Evidencia

- `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.
- **Migración**: el chat del Proyecto corrió la 0015 el **15 nov 2026** (pasaron todos los FRENOs). Antes ensayó el ciclo completo, que se deshizo solo: crear → enviar → aceptar → despachar → recibir con faltante → anular. Dio bien el stock, el costo promedio, el motivo del kardex y la limpieza.
- **E2E, primera corrida (`npm run test:e2e:prod`): 1/41.** Hubo dos problemas:
  - **El spec**: `getByText('OC-000001')` encontraba también el botón «Responder OC-000001». Se corrigió con `exact: true`.
  - **El servidor**: en la prueba 2, el `next start` que levanta Playwright se cayó sin dejar error, igual que en la primera corrida de la 6A. Desde ahí todo dio `ERR_CONNECTION_REFUSED`. La OC-000002 quedó enviada y la anuló el barrido de la corrida siguiente.
- **E2E, segunda corrida: 41/41 en 8,8 min** (el barrido, las 35 de siempre y las 6 de `abastecimiento.spec.ts`). Esta vez el servidor de producción (`.next-e2e`) se levantó aparte, con su salida a un archivo, y se usó `E2E_BASE_URL=http://localhost:3210`. No registró ningún error en toda la corrida ni en las capturas.
- **Capturas** (`tests/capturas/abastecimiento-6b.spec.ts`, `test-results/capturas/fase6b-*`): 14 pantallas a 1280, 412 y 360 px (42 capturas) con **0 scroll horizontal**:
  - abastecimiento con «Pedir otro producto»;
  - una orden en cada estado: borrador, enviada, aceptada, despachada, recibida con faltante, rechazada y cancelada;
  - el modal de recepción («= 60 litros · costo Bs. 82,00/litro · stock 150 → 210 · costo promedio sin costo → Bs. 82,00»);
  - margen y la tarjeta del panel;
  - el panel del proveedor y su orden enviada y aceptada.
- **Huella de la base** (consultas de solo lectura):

  | Dato | Antes (15 nov) | Después |
  |---|---|---|
  | Stock total | 3179 | **3179** |
  | Huella de stock | `e6bd1cc8…` | **`e6bd1cc8…`** (idéntica) |
  | `costos_producto` | vacía | **vacía** |
  | Presentaciones | `6f2c9fa4…` | **`6f2c9fa4…`** (idéntica) |
  | Pedidos | cancelado 37 · confirmado 1 · entregado 13 · pendiente 28 | cancelado **41** · confirmado 1 · entregado 13 · pendiente 28 |
  | Órdenes de compra | 0 | 16 canceladas + 3 rechazadas, todas de proveedores de prueba (0 de proveedores reales) |
  | Kardex | 181 filas | 205 filas: «Compra OC-…» 216 unidades = «Limpieza E2E OC-…» 216 unidades |
  | `pg_net` | 1 respuesta | **1** (ningún aviso de Telegram de prueba) |
  | Perfiles | 138 | 139 (la cuenta temporal de `registro.spec.ts`, desactivada como siempre) |

  Los 4 pedidos nuevos son de las corridas y quedaron cancelados (0 pedidos de prueba abiertos). Las 216 unidades son 3 recepciones de 72 (60 litros de Glifosato + 12 de Bravonil): una en la prueba sola, una en la suite completa y una en las capturas.

## Pendiente

- La caída del `next start` que lanza Playwright en Windows ya pasó 2 veces (6A y 6B), siempre en la primera corrida y sin dejar error. Mientras no se encuentre la causa, conviene correr con el servidor levantado aparte (`PRUEBAS.md`).

- El kardex del producto todavía no muestra el costo unitario de cada entrada (la columna ya existe).
- Los distribuidores de demostración son `.test`: sus órdenes no avisan por Telegram y quedan ocultas en la lista si el interruptor de datos de prueba está apagado. En la fase 8 se harán cuentas demo no-`.test` para la feria.
