# AML AgroTech — Arquitectura

Revisada contra el código y las migraciones `0001` a `0020` (17 nov 2026, fase 9F: solo QR, sin rol almacén y repartidores externos). Los diagramas UML (casos de uso, clases, componentes, despliegue, secuencia y estados) están en [`uml/`](uml/README.md).

## 1. Estilo

Aplicación web en capas con **web services REST** propios:

```
┌───────────────────────────── Nodo: Navegador (cliente) ─────────────────────────────┐
│  React 18 + Next.js 14 (páginas, componentes, contextos de sesión y de carrito)     │
└───────────────┬──────────────────────────────────────────────────┬──────────────────┘
                │ HTTPS · JSON (API REST)                          │ HTTPS (supabase-js:
┌───────────────▼──────────── Nodo: Render (Web Service Node.js) ──┐│ login y perfil propio)
│  Next.js server                                                   ││
│   ├─ Middleware: sesión + rol por ruta                            ││
│   ├─ API REST  src/app/api/**  (Route Handlers)                   ││
│   │    valida con zod · verifica sesión/rol · llama a funciones SQL│
│   ├─ Recibo de compra en PDF (pdfkit)                                ││
│   └─ Renderizado de páginas                                       ││
└───────────────┬───────────────────────────────────────────────────┘│
                │ HTTPS (supabase-js, clave anon + JWT del usuario)  │
┌───────────────▼──────────── Nodo: Supabase (sa-east-1) ────────────▼────────────────┐
│  Auth (usuarios, JWT) · Postgres (tablas + RLS + funciones transaccionales + triggers)│
│  Storage (bucket público `productos`, bucket privado `comprobantes`) · Vault          │
│  pg_net (avisos después del commit) · pg_cron (resumen diario 20:00 de Bolivia)       │
└───────────────┬──────────────────────────────────────────────────────────────────────┘
                │ HTTPS (pg_net)
┌───────────────▼──────────── Telegram Bot API → chat del administrador ──────────────┐
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Principio:** la seguridad se aplica en **tres capas**: middleware (rutas), API (sesión, rol y datos) y base (RLS + funciones). Si una falla, las otras siguen protegiendo. La app usa siempre la clave pública (`anon`) con el JWT del usuario; nunca la `service_role`.

Diagramas: [componentes](uml/componentes.md) y [despliegue](uml/despliegue.md).

## 2. Pila de desarrollo

| Capa | Tecnología | Por qué |
|---|---|---|
| Lenguaje | TypeScript (estricto) | Tipos en todo el proyecto |
| Frontend | React 18 + Next.js 14 (App Router) | Páginas y API en un solo proyecto |
| Estilos | Tailwind CSS 3 | Diseño propio y responsive (sin librería de componentes) |
| Íconos y gráficos | react-icons (Lucide) · Recharts | Interfaz y gráficos del panel |
| API | Next.js Route Handlers (REST) + zod | Web services propios, validación de datos |
| Base de datos | PostgreSQL (Supabase) | Relacional, RLS, funciones transaccionales, triggers |
| Autenticación | Supabase Auth (JWT en cookies, `@supabase/ssr`) | Sesión segura |
| Archivos | Supabase Storage | Fotos de productos y comprobantes |
| Secretos | Supabase Vault | Token del bot de Telegram, fuera del repo y de Render |
| Avisos | Telegram Bot API desde Postgres (`pg_net` + `pg_cron`) | Avisos al admin aunque Render duerma |
| PDF | pdfkit + qrcode (en el servidor) | Recibo de compra |
| Documentación API | OpenAPI 3 + Swagger UI (`/api-docs`) | Probar la API en vivo |
| Pruebas | Playwright (E2E) | Recorridos reales contra la app compilada |
| Control de versiones | Git + GitHub | Ramas por fase y Pull Requests |
| Despliegue | Render (Web Service) | Pedido por el docente; publica solo al unir a `master` |
| Modelado | Mermaid ([`uml/`](uml/README.md)) | Diagramas UML como texto, dibujados por GitHub |
| Desarrollo asistido | Claude Code (SDD) | Especificación → código |

## 3. Modelo de datos

21 tablas en `public`. El diagrama de clases con multiplicidad está en [`uml/clases.md`](uml/clases.md).

```
perfiles (id=auth.users.id, nombre, email, rol[admin|cliente|distribuidor|repartidor], telefono, activo)
categorias (id, nombre, icono, descripcion, activo)
productos (id, sku, nombre, descripcion, precio, stock, stock_minimo, unidad, categoria_id, icono, imagen_url, activo,
           composicion, cultivos, modo_uso, dosis, banda_toxicologica,
           precio_referencia, fuente_precio, fecha_precio, tendencia_precio)
zonas_envio (id, nombre, tipo[recojo|urbano|provincia], costo, dias_min, dias_max, permite_contra_entrega (siempre false desde la 0020), activo, orden)
pedidos (id, codigo, usuario_id, estado, subtotal, costo_envio, total, zona_envio_id,
         direccion_entrega, recoge_nombre, recoge_ci, telefono_contacto, notas, metodo_pago, estado_pago,
         preparacion_por, preparacion_en, empacado_por, empacado_en, bultos,
         repartidor_id, aceptado_en, pago_repartidor_id,                      ← reparto externo (0020)
         despachado_por, despachado_en, entregado_por, entregado_en, recibe_nombre, recibe_ci,
         completado_en, conforme_en)                                          ← quién entregó a quién (0018)
pedido_items (id, pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal,
              marcado_por, marcado_en)                                        ← casilla "en la caja"
faltantes_pedido (id, pedido_id, pedido_item_id, nota, reportado_por, created_at,
                  resuelto_en, resuelto_por, nota_resolucion)                 ← solo admin por RLS
pagos (id, pedido_id, metodo, monto, comprobante_path, estado, motivo_rechazo, revisado_por, revisado_en,
       cobrado_por, cobrado_en, monto_cobrado)                               ← efectivo (0018), solo pedidos viejos
codigos_entrega (pedido_id, codigo, intentos_fallidos, bloqueado_en, desbloqueado_por, desbloqueado_en,
                 usado_en)                                                    ← RLS sin políticas: nadie la lee
calificaciones_entrega (id, pedido_id, usuario_id, estrellas, comentario, created_at)  ← dueño y admin
envios (id, pedido_id, zona_envio_id, transportista, numero_guia, estado, despachado_en, entregado_en)
seguimiento_pedido (id, pedido_id, estado, nota, creado_por, created_at, faltante_id)  ← línea de tiempo
repartidores_estado (usuario_id, disponible, cambiado_en)                    ← RLS sin políticas (0020)
pagos_repartidor (id, repartidor_id, monto, entregas, pagado_por, pagado_en) ← RLS sin políticas (0020)
movimientos_inventario (id, producto_id, tipo[entrada|salida|ajuste|devolucion], cantidad,
                        stock_anterior, stock_nuevo, motivo, pedido_id, usuario_id, created_at,
                        costo_unitario, orden_compra_id, costo_promedio_anterior)   ← kardex
distribuidores (id, usuario_id, nombre_comercial, ciudad[Sucre|Santa Cruz], telefono, nit, dias_entrega, activo)
presentaciones_distribuidor (id, distribuidor_id, producto_id, nombre, unidades_por_presentacion,
                             precio_mayorista, disponible, dias_entrega, activo)
costos_producto (producto_id, costo_promedio, costo_ultimo, actualizado_en)   ← solo admin
ordenes_compra (id, codigo, distribuidor_id, estado, total, total_recibido, fecha_estimada,
                transportista, guia, motivo, nota_recepcion, creado_por, enviada_en … cerrada_en)
orden_compra_items (id, orden_compra_id, presentacion_id, producto_id, cantidad, nombre_presentacion,
                    unidades_por_presentacion, precio_unitario, cantidad_recibida, faltante)
seguimiento_orden_compra (id, orden_compra_id, estado, nota, creado_por, created_at)
```

### Estados

Diagramas en [`uml/estados.md`](uml/estados.md).

- **Pedido:**
  - recojo en tienda: `pendiente` → `confirmado` → `preparando` → *(Listo para salir)* → `listo_para_recoger` → *(el admin con el código)* → `completado`;
  - a domicilio: … → `empacado` («Listo para salir»; aviso al grupo de repartidores) → *(un repartidor acepta y «Recogí el pedido»)* → `despachado` → *(código)* → `completado`;
  - por flota: … → `empacado` → *(flota y guía)* → `despachado` → *(Recibí mi pedido o nota del admin)* → `completado`;
  - preparar y dejar listo solo el admin con sus funciones (0020); entregar solo con el código de 4 dígitos del cliente (0018), que nadie más que el dueño ve;
  - `completado` = entregado + pago verificado; como desde la 9F todo se paga con QR antes de preparar, pasan juntos;
  - `cancelado` desde `pendiente` (cliente o admin) o `confirmado`, `preparando` y `empacado` (admin).
- **Pago:** `pendiente` → `en_revision` (subió comprobante) → `verificado` | `rechazado` (puede volver a subir). Si la tienda cancela con el pago en revisión o verificado: `reembolso_pendiente` → `reembolsado`. Solo QR desde la 0020.
- **Envío:** `por_despachar` → `listo_para_recoger` o `en_camino` → `entregado`.
- **Orden de compra:** `borrador` → `enviada` → `aceptada` → `despachada` → `recibida`; `rechazada` (proveedor, desde enviada o aceptada); `cancelada` (admin, desde borrador, enviada o aceptada).
- Un pedido **no pasa a `confirmado` hasta que el pago QR esté `verificado`**.
- **Pago al repartidor:** entrega completada sin `pago_repartidor_id` = por cobrar; «Pagado» (`pagar_repartidor`) crea una fila en `pagos_repartidor` y marca esas entregas.

### Funciones SQL transaccionales

Toda escritura que mueve stock, dinero o estados pasa por una de estas funciones, en una sola transacción. Las tablas de pedidos, pagos, kardex y órdenes de compra no tienen `insert`/`update` directo para la API.

| Función | Qué hace |
|---|---|
| `crear_pedido(items, zona, direccion, telefono, metodo_pago, notas, recoge_nombre, recoge_ci)` | Bloquea los productos, lee precios reales, valida stock, calcula subtotal + envío, crea pedido + items + pago + envío + seguimiento, descuenta stock y registra la salida en el kardex. Solo QR (0020): cualquier otro método → AML02 |
| `cancelar_pedido(pedido_id, motivo)` | Valida quién y desde qué estado, devuelve stock (kardex `devolucion`), deja el pago en reembolso pendiente si correspondía y registra el seguimiento. El cliente cancela solo si está pendiente (0020) |
| `cambiar_estado_pedido(pedido_id, estado, nota, transportista, guia)` | Solo admin: confirma y despacha por flota. Desde la 0017 no prepara ni empaca; desde la 0018 no despacha a domicilio ni marca entregado |
| `empezar_preparacion` · `marcar_item_pedido` · `empacar_pedido(pedido_id, bultos)` | Solo admin (0020): preparando con responsable, casilla por producto, «Listo para salir» (exige todo marcado y sin faltantes; a domicilio avisa al grupo de repartidores) |
| `reportar_faltante` · `resolver_faltante` | El admin reporta y resuelve; el cliente ve «Revisando un producto de tu pedido» |
| `cola_almacen()` · `detalle_preparacion(pedido_id)` | Cola y detalle de «Por preparar» (solo admin) |
| `linea_tiempo_pedido(pedido_id)` | Seguimiento con el nombre corto y el rol de quién hizo cada paso (dueño, admin o el repartidor que lleva el pedido). La nota de un faltante, completa solo para el admin |
| `mi_codigo_entrega(pedido_id)` · `mis_codigos_entrega()` | El código de entrega, **solo para el dueño** (ni el admin lo ve) |
| `cambiar_disponibilidad(bool)` · `panel_repartidor()` | Repartidor: «Estoy disponible» y todo su panel (disponibles sin datos del cliente, mis entregas, ganado, por cobrar) |
| `aceptar_entrega(pedido_id)` · `liberar_entrega(pedido_id)` | El repartidor acepta (bloquea la fila: el primero se la lleva); el admin la libera si no aparece |
| `cola_reparto()` · `detalle_entrega(pedido_id)` | Entregas en curso (admin) y datos para entregar (admin o el repartidor que la aceptó). Nunca el código |
| `tomar_pedido` · `entregar_pedido(pedido_id, codigo, nombre, ci)` | «Recogí el pedido» (solo quien la aceptó) y entrega con código (5 intentos; un intento fallido responde sin error para que quede contado) |
| `desbloquear_codigo_entrega` · `confirmar_recepcion` · `calificar_entrega` | Admin desbloquea con nota; flota la confirma el cliente o el admin; el cliente califica |
| `deudas_repartidores()` · `pagar_repartidor(repartidor_id, monto)` | Solo admin: lo que se debe a cada repartidor y «Pagado» (frena si el monto cambió) |
| `registrar_comprobante(pedido_id, path)` | Pago a `en_revision` (solo el dueño) |
| `verificar_pago(pago_id, aprobado, motivo)` | Aprueba (y confirma el pedido) o rechaza con motivo (solo admin) |
| `marcar_reembolsado(pago_id, nota)` | Cierra un reembolso pendiente (solo admin) |
| `registrar_movimiento(producto_id, tipo, cantidad, motivo)` | Entrada o ajuste de inventario con kardex (solo admin) |
| `resumen_dashboard(incluir_pruebas)` | Cifras del panel (solo admin; la API pide todas las cuentas) |
| `crear_ordenes_compra(lineas)` · `guardar_linea_orden_compra(...)` | Arma los borradores (uno por proveedor) y edita sus líneas |
| `enviar_` · `cancelar_` · `aceptar_` · `rechazar_` · `despachar_orden_compra(...)` | Cambios de estado de la orden, cada uno con su rol |
| `recibir_orden_compra(orden_id, lineas, nota)` | Entrada fraccionada al kardex con costo, costo promedio ponderado y faltantes |
| `es_admin()` · `es_distribuidor()` · `es_repartidor()` | Rol del usuario actual (exacto y activo), para las políticas y las funciones |
| `anular_pedido_prueba` · `anular_orden_compra_prueba` | Limpieza de las pruebas E2E (solo admin, solo cuentas `@amlagrotech.test`) |
| `aml_enviar_telegram` · `aml_enviar_telegram_a` y triggers `aml_aviso_*` | Avisos por Telegram al admin y al grupo de repartidores (sin `execute` para la API) |

## 4. API REST (contrato)

Base: `/api`. Respuestas `{ data }` o `{ error: { codigo, mensaje } }`. **63 rutas y 71 operaciones**, todas en [`api/openapi.yaml`](api/openapi.yaml); se pueden probar en vivo en `/api-docs`.

| Método | Ruta | Quién | Pilar |
|---|---|---|---|
| GET | `/api/salud` | Público | Despliegue |
| GET | `/api/openapi` | Público | Despliegue |
| GET | `/api/productos` · `/api/productos/:id` | Público | E-commerce |
| POST | `/api/productos` | Admin | E-commerce |
| PATCH | `/api/productos/:id` | Admin | E-commerce |
| POST | `/api/productos/imagen` | Admin | E-commerce |
| GET | `/api/categorias` | Público | E-commerce |
| GET | `/api/zonas-envio` | Público | Distribución |
| POST | `/api/zonas-envio` | Admin | Distribución |
| PATCH | `/api/zonas-envio/:id` | Admin | Distribución |
| POST | `/api/pedidos/cotizar` | Sesión | E-commerce |
| POST | `/api/pedidos` | Sesión (cuenta activa) | E-commerce |
| GET | `/api/pedidos` | Sesión (los propios) / Admin con `?alcance=todos` | E-commerce |
| GET | `/api/pedidos/ultima-entrega` | Sesión | E-commerce |
| GET | `/api/pedidos/:id` | Dueño / Admin | E-commerce |
| GET | `/api/pedidos/:id/nota` | Dueño / Admin (PDF) | E-commerce |
| POST | `/api/pedidos/:id/cancelar` | Dueño (si pendiente) / Admin | E-commerce |
| PATCH | `/api/pedidos/:id/estado` | Admin | Distribución |
| POST | `/api/pedidos/:id/anular-prueba` | Admin (solo pruebas E2E) | Pruebas |
| GET | `/api/pagos` | Admin | Pagos |
| POST | `/api/pagos/:id/comprobante` | Dueño del pedido | Pagos |
| PATCH | `/api/pagos/:id/verificar` | Admin | Pagos |
| POST | `/api/pagos/:id/reembolso` | Admin | Pagos |
| GET · POST | `/api/inventario/movimientos` | Admin | Almacenamiento |
| GET | `/api/dashboard` | Admin | Todos |
| GET | `/api/margen` | Admin | Almacenamiento |
| GET | `/api/usuarios` | Admin | Seguridad |
| PATCH | `/api/usuarios/:id` | Admin (rol, activo) | Seguridad |
| GET · POST | `/api/distribuidores` | Admin | Almacenamiento |
| PATCH | `/api/distribuidores/:id` | Admin | Almacenamiento |
| GET | `/api/distribuidor/ficha` | Distribuidor | Almacenamiento |
| GET · POST | `/api/distribuidor/presentaciones` | Distribuidor | Almacenamiento |
| PATCH | `/api/distribuidor/presentaciones/:id` | Distribuidor dueño | Almacenamiento |
| GET | `/api/distribuidor/ordenes` | Distribuidor | Almacenamiento |
| GET | `/api/abastecimiento/reponer` | Admin | Almacenamiento |
| GET · POST | `/api/ordenes-compra` | Admin | Almacenamiento |
| GET | `/api/ordenes-compra/:id` | Admin / Distribuidor dueño (vista reducida) | Almacenamiento |
| PATCH | `/api/ordenes-compra/:id/lineas` | Admin (borrador) | Almacenamiento |
| POST | `/api/ordenes-compra/:id/enviar` · `/cancelar` · `/recibir` | Admin | Almacenamiento |
| POST | `/api/ordenes-compra/:id/aceptar` · `/rechazar` · `/despachar` | Distribuidor dueño | Almacenamiento |
| GET | `/api/almacen/pedidos` · `/api/almacen/pedidos/:id` | Admin («Por preparar») | Distribución |
| POST | `/api/almacen/pedidos/:id/preparar` · `/faltante` · `/empacar` («Listo para salir») | Admin | Distribución |
| PATCH | `/api/almacen/items/:id` | Admin | Distribución |
| POST | `/api/faltantes/:id/resolver` | Admin | Almacenamiento |
| GET | `/api/repartidor/panel` | Repartidor | Distribución |
| PATCH | `/api/repartidor/disponibilidad` | Repartidor | Distribución |
| GET | `/api/entregas` | Admin (entregas en curso) | Distribución |
| GET | `/api/entregas/:id` | Repartidor que la aceptó / Admin | Distribución |
| POST | `/api/entregas/:id/aceptar` | Repartidor disponible | Distribución |
| POST | `/api/entregas/:id/tomar` («Recogí el pedido») | Repartidor que la aceptó / Admin | Distribución |
| POST | `/api/entregas/:id/entregar` | Repartidor (domicilio) / Admin (recojo y domicilio) | Distribución |
| POST | `/api/entregas/:id/liberar` | Admin | Distribución |
| GET | `/api/repartidores` | Admin | Distribución |
| POST | `/api/repartidores/:id/pagar` | Admin | Distribución |
| POST | `/api/entregas/:id/desbloquear` | Admin | Seguridad |
| POST | `/api/pedidos/:id/recibido` | Dueño (flota) / Admin con nota | Distribución |
| POST | `/api/pedidos/:id/calificacion` | Dueño | E-commerce |
| GET | `/api/calificaciones` | Admin | E-commerce |
| POST | `/api/ordenes-compra/:id/anular-prueba` | Admin (solo pruebas E2E) | Pruebas |

Códigos de error comunes: `400` datos inválidos, `401` sin sesión, `403` sin permiso o cuenta desactivada, `404` no existe (o no es tuyo), `409` conflicto de estado, de stock o duplicado, `422` dato rechazado por la base (también `CODIGO_INCORRECTO`, con los intentos que quedan), `409` `CODIGO_BLOQUEADO` a los 5 intentos, `503` la base no responde o falta una migración. Los errores de las funciones SQL (`AML01` a `AML06`) se traducen a estos códigos en `src/lib/api/respuestas.ts`.

## 5. Estructura de carpetas

```
src/
  app/
    (públicas)        page.tsx, catalogo/, producto/[id]/, carrito/, auth/, api-docs/
    (cliente)         checkout/, checkout/exito/, pedidos/, pedidos/[id]/, cuenta/, cuenta-desactivada/
    admin/            page.tsx, productos/, inventario/, pedidos/, pagos/, envios/, zonas/, usuarios/,
                      abastecimiento/ (distribuidores/, ordenes/[id]/), margen/,
                      preparar/ (cola, pedidos/[id]/ preparar y entregar en tienda, pedidos/[id]/etiqueta/),
                      repartidores/ (en curso, lo que se debe y pagos)
    distribuidor/     page.tsx, ordenes/[id]/
    repartidor/       page.tsx (disponible, Telegram, mis entregas, disponibles, ganado), pedidos/[id]/ (recoger y entregar)
    api/              63 rutas (ver la tabla de arriba)
  components/         ui/, layout/, admin/, compra/, pagos/, abastecimiento/, almacen/, entrega/
  context/            AuthContext, CarritoContext
  lib/                supabase.ts (navegador), api/ (sesión, validación, respuestas, cliente),
                      auth/, ecommerce/ (incluye el recibo de compra), abastecimiento/, almacen/, entrega/, utils.ts
  middleware.ts       sesión y rol por ruta
  types/              tipos de la base y de la API
supabase/migrations/  0001 a 0019
tests/e2e/            pruebas Playwright
docs/                 esta documentación (specs/, api/, uml/)
```
