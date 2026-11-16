# AML AgroTech — Arquitectura

Revisada contra el código y las migraciones `0001` a `0015` (15 nov 2026). Los diagramas UML (casos de uso, clases, componentes, despliegue, secuencia y estados) están en [`uml/`](uml/README.md).

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
│   ├─ Nota de venta en PDF (pdfkit)                                ││
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
| PDF | pdfkit + qrcode (en el servidor) | Nota de venta |
| Documentación API | OpenAPI 3 + Swagger UI (`/api-docs`) | Probar la API en vivo |
| Pruebas | Playwright (E2E) | Recorridos reales contra la app compilada |
| Control de versiones | Git + GitHub | Ramas por fase y Pull Requests |
| Despliegue | Render (Web Service) | Pedido por el docente; publica solo al unir a `master` |
| Modelado | Mermaid ([`uml/`](uml/README.md)) | Diagramas UML como texto, dibujados por GitHub |
| Desarrollo asistido | Claude Code (SDD) | Especificación → código |

## 3. Modelo de datos

16 tablas en `public`. El diagrama de clases con multiplicidad está en [`uml/clases.md`](uml/clases.md).

```
perfiles (id=auth.users.id, nombre, email, rol[admin|cliente|distribuidor], telefono, activo)
categorias (id, nombre, icono, descripcion, activo)
productos (id, sku, nombre, descripcion, precio, stock, stock_minimo, unidad, categoria_id, icono, imagen_url, activo,
           composicion, cultivos, modo_uso, dosis, banda_toxicologica,
           precio_referencia, fuente_precio, fecha_precio, tendencia_precio)
zonas_envio (id, nombre, tipo[recojo|urbano|provincia], costo, dias_min, dias_max, permite_contra_entrega, activo, orden)
pedidos (id, codigo, usuario_id, estado, subtotal, costo_envio, total, zona_envio_id,
         direccion_entrega, recoge_nombre, recoge_ci, telefono_contacto, notas, metodo_pago, estado_pago)
pedido_items (id, pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal)
pagos (id, pedido_id, metodo, monto, comprobante_path, estado, motivo_rechazo, revisado_por, revisado_en)
envios (id, pedido_id, zona_envio_id, transportista, numero_guia, estado, despachado_en, entregado_en)
seguimiento_pedido (id, pedido_id, estado, nota, creado_por, created_at)      ← línea de tiempo
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
  - recojo en tienda: `pendiente` → `confirmado` → `preparando` → `listo_para_recoger` → `entregado`;
  - en el pueblo o por flota: `pendiente` → `confirmado` → `preparando` → `despachado` → `entregado`;
  - `cancelado` desde `pendiente` (cliente o admin) o `confirmado` (admin).
- **Pago:** `pendiente` → `en_revision` (subió comprobante) → `verificado` | `rechazado` (puede volver a subir). Si la tienda cancela con el pago en revisión o verificado: `reembolso_pendiente` → `reembolsado`. Contra entrega pasa a `verificado` al entregar.
- **Envío:** `por_despachar` → `listo_para_recoger` o `en_camino` → `entregado`.
- **Orden de compra:** `borrador` → `enviada` → `aceptada` → `despachada` → `recibida`; `rechazada` (proveedor, desde enviada o aceptada); `cancelada` (admin, desde borrador, enviada o aceptada).
- Un pedido con pago QR o transferencia **no pasa a `confirmado` hasta que el pago esté `verificado`**. Contra entrega lo confirma el admin (solo en zonas que lo permiten).

### Funciones SQL transaccionales

Toda escritura que mueve stock, dinero o estados pasa por una de estas funciones, en una sola transacción. Las tablas de pedidos, pagos, kardex y órdenes de compra no tienen `insert`/`update` directo para la API.

| Función | Qué hace |
|---|---|
| `crear_pedido(items, zona, direccion, telefono, metodo_pago, notas, recoge_nombre, recoge_ci)` | Bloquea los productos, lee precios reales, valida stock, calcula subtotal + envío, crea pedido + items + pago + envío + seguimiento, descuenta stock y registra la salida en el kardex |
| `cancelar_pedido(pedido_id, motivo)` | Valida quién y desde qué estado, devuelve stock (kardex `devolucion`), deja el pago en reembolso pendiente si correspondía y registra el seguimiento |
| `cambiar_estado_pedido(pedido_id, estado, nota, transportista, guia)` | Valida la transición según la zona y el pago, y registra el seguimiento (solo admin) |
| `registrar_comprobante(pedido_id, path)` | Pago a `en_revision` (solo el dueño) |
| `verificar_pago(pago_id, aprobado, motivo)` | Aprueba (y confirma el pedido) o rechaza con motivo (solo admin) |
| `marcar_reembolsado(pago_id, nota)` | Cierra un reembolso pendiente (solo admin) |
| `registrar_movimiento(producto_id, tipo, cantidad, motivo)` | Entrada o ajuste de inventario con kardex (solo admin) |
| `resumen_dashboard(incluir_pruebas)` | Cifras del panel (solo admin; la API pide todas las cuentas) |
| `crear_ordenes_compra(lineas)` · `guardar_linea_orden_compra(...)` | Arma los borradores (uno por proveedor) y edita sus líneas |
| `enviar_` · `cancelar_` · `aceptar_` · `rechazar_` · `despachar_orden_compra(...)` | Cambios de estado de la orden, cada uno con su rol |
| `recibir_orden_compra(orden_id, lineas, nota)` | Entrada fraccionada al kardex con costo, costo promedio ponderado y faltantes |
| `es_admin()` · `es_distribuidor()` | Rol del usuario actual, para las políticas RLS |
| `anular_pedido_prueba` · `anular_orden_compra_prueba` | Limpieza de las pruebas E2E (solo admin, solo cuentas `@amlagrotech.test`) |
| `aml_enviar_telegram` y triggers `aml_aviso_*` | Avisos por Telegram (sin `execute` para la API) |

## 4. API REST (contrato)

Base: `/api`. Respuestas `{ data }` o `{ error: { codigo, mensaje } }`. **42 rutas y 50 operaciones**, todas en [`api/openapi.yaml`](api/openapi.yaml); se pueden probar en vivo en `/api-docs`.

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
| POST | `/api/ordenes-compra/:id/anular-prueba` | Admin (solo pruebas E2E) | Pruebas |

Códigos de error comunes: `400` datos inválidos, `401` sin sesión, `403` sin permiso o cuenta desactivada, `404` no existe (o no es tuyo), `409` conflicto de estado, de stock o duplicado, `422` dato rechazado por la base, `503` la base no responde o falta una migración. Los errores de las funciones SQL (`AML01` a `AML06`) se traducen a estos códigos en `src/lib/api/respuestas.ts`.

## 5. Estructura de carpetas

```
src/
  app/
    (públicas)        page.tsx, catalogo/, producto/[id]/, carrito/, auth/, api-docs/
    (cliente)         checkout/, checkout/exito/, pedidos/, pedidos/[id]/, cuenta/, cuenta-desactivada/
    admin/            page.tsx, productos/, inventario/, pedidos/, pagos/, envios/, zonas/, usuarios/,
                      abastecimiento/ (distribuidores/, ordenes/[id]/), margen/
    distribuidor/     page.tsx, ordenes/[id]/
    api/              42 rutas (ver la tabla de arriba)
  components/         ui/, layout/, admin/, compra/, pagos/, abastecimiento/
  context/            AuthContext, CarritoContext
  lib/                supabase.ts (navegador), api/ (sesión, validación, respuestas, cliente),
                      auth/, ecommerce/ (incluye la nota de venta), pagos/, abastecimiento/, utils.ts
  middleware.ts       sesión y rol por ruta
  types/              tipos de la base y de la API
supabase/migrations/  0001 a 0015
tests/e2e/            pruebas Playwright
docs/                 esta documentación (specs/, api/, uml/)
```
