# AML AgroTech — Arquitectura

## 1. Estilo

Aplicación web en capas con **web services REST**:

```
┌───────────────────────────── Nodo: Navegador (cliente) ─────────────────────────────┐
│  React 18 + Next.js 14 (páginas, componentes, contexto de carrito y sesión)         │
└──────────────────────────────────────┬──────────────────────────────────────────────┘
                                       │ HTTPS · JSON
┌──────────────────────────────────────▼──── Nodo: Render (Web Service Node.js) ──────┐
│  Next.js server                                                                      │
│   ├─ Middleware: sesión + rol por ruta                                               │
│   ├─ API REST  src/app/api/**  (Route Handlers)                                      │
│   │    valida con zod · verifica sesión/rol · llama a funciones SQL                  │
│   └─ Renderizado de páginas                                                          │
└──────────────────────────────────────┬──────────────────────────────────────────────┘
                                       │ HTTPS (supabase-js, clave anon + JWT del usuario)
┌──────────────────────────────────────▼──── Nodo: Supabase (sa-east-1) ──────────────┐
│  Auth (usuarios, JWT) · Postgres (tablas + RLS + funciones transaccionales)          │
│  Storage (bucket público `productos`, bucket privado `comprobantes`)                 │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Principio:** la seguridad se aplica en **tres capas**: middleware (rutas), API (sesión, rol y datos) y base (RLS + funciones). Si una falla, las otras siguen protegiendo.

## 2. Pila de desarrollo

| Capa | Tecnología | Por qué |
|---|---|---|
| Lenguaje | TypeScript (estricto) | Tipos en todo el proyecto |
| Frontend | React 18 + Next.js 14 (App Router) | Páginas y API en un solo proyecto |
| Estilos | Tailwind CSS | Diseño propio y responsive |
| API | Next.js Route Handlers (REST) + zod | Web services propios, validación de datos |
| Base de datos | PostgreSQL (Supabase) | Relacional, RLS, funciones transaccionales |
| Autenticación | Supabase Auth (JWT) | Sesión segura con cookies |
| Archivos | Supabase Storage | Imágenes y comprobantes |
| Documentación API | OpenAPI 3 + Swagger UI (`/api-docs`) | Probar la API en vivo |
| Control de versiones | Git + GitHub | Ramas por fase y Pull Requests |
| Despliegue | Render (Web Service) | Pedido por el docente |
| Modelado | StarUML | Diagramas UML |
| Desarrollo asistido | Claude Code (SDD) | Especificación → código |

## 3. Modelo de datos (objetivo)

```
perfiles (id=auth.users.id, nombre, email, rol, telefono, activo)
categorias (id, nombre, icono, descripcion, activo)
productos (id, sku, nombre, descripcion, precio, stock, stock_minimo, unidad, categoria_id, icono, imagen_url, activo)
zonas_envio (id, nombre, tipo[recojo|urbano|provincia], costo, dias_min, dias_max, permite_contra_entrega, activo)
pedidos (id, codigo, usuario_id, estado, subtotal, costo_envio, total, zona_envio_id,
         direccion_entrega, telefono_contacto, notas, metodo_pago, estado_pago)
pedido_items (id, pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal)
pagos (id, pedido_id, metodo, monto, comprobante_path, estado[pendiente|en_revision|verificado|rechazado],
       motivo_rechazo, revisado_por, revisado_en)
envios (id, pedido_id, zona_envio_id, transportista, numero_guia, estado, despachado_en, entregado_en)
seguimiento_pedido (id, pedido_id, estado, nota, creado_por, created_at)      ← línea de tiempo
movimientos_inventario (id, producto_id, tipo[entrada|salida|ajuste|devolucion], cantidad,
                        stock_anterior, stock_nuevo, motivo, pedido_id, usuario_id, created_at)  ← kardex
```

### Estados

- **Pedido:** `pendiente` → `confirmado` → `preparando` → `despachado` → `entregado` · (`cancelado` desde pendiente/confirmado)
- **Pago:** `pendiente` → `en_revision` (subió comprobante) → `verificado` | `rechazado` (puede volver a subir)
- **Envío:** `por_despachar` → `en_camino` → `entregado`
- Un pedido con pago QR/transferencia **no pasa a `confirmado` hasta que el pago esté `verificado`**. Contra entrega se confirma directo (solo zonas que lo permiten).

### Funciones SQL transaccionales

| Función | Qué hace en una sola transacción |
|---|---|
| `crear_pedido(items, zona, direccion, telefono, metodo_pago, notas)` | Lee precios reales, valida stock, calcula subtotal + envío, crea pedido + items + pago + envío + seguimiento, descuenta stock y registra salida en kardex |
| `cancelar_pedido(pedido_id, motivo)` | Cambia estado, devuelve stock (kardex `devolucion`), registra seguimiento |
| `registrar_movimiento(producto_id, tipo, cantidad, motivo)` | Entrada/ajuste de inventario con kardex (solo admin) |
| `cambiar_estado_pedido(pedido_id, estado, nota)` | Valida transición permitida y registra seguimiento (solo admin) |
| `verificar_pago(pago_id, aprobado, motivo)` | Marca pago y, si se aprueba, confirma el pedido (solo admin) |
| `es_admin()` | `true` si el usuario actual es admin activo (para políticas RLS) |

## 4. API REST (contrato)

Base: `/api`. Respuestas `{ data }` o `{ error: { codigo, mensaje } }`.

| Método | Ruta | Quién | Pilar |
|---|---|---|---|
| GET | `/api/productos` | Público | E-commerce |
| GET | `/api/productos/:id` | Público | E-commerce |
| POST | `/api/productos` | Admin | Almacenamiento |
| PATCH | `/api/productos/:id` | Admin | Almacenamiento |
| GET | `/api/categorias` | Público | E-commerce |
| GET | `/api/zonas-envio` | Público | Distribución |
| POST | `/api/pedidos` | Cliente | E-commerce |
| GET | `/api/pedidos` | Cliente (los suyos) / Admin (todos) | E-commerce |
| GET | `/api/pedidos/:id` | Dueño / Admin | E-commerce |
| POST | `/api/pedidos/:id/cancelar` | Dueño (si pendiente) / Admin | E-commerce |
| PATCH | `/api/pedidos/:id/estado` | Admin | Distribución |
| POST | `/api/pagos/:pedidoId/comprobante` | Dueño | Pagos |
| PATCH | `/api/pagos/:id/verificar` | Admin | Pagos |
| PATCH | `/api/envios/:id` | Admin | Distribución |
| GET | `/api/inventario/movimientos` | Admin | Almacenamiento |
| POST | `/api/inventario/movimientos` | Admin | Almacenamiento |
| GET | `/api/usuarios` | Admin | Seguridad |
| PATCH | `/api/usuarios/:id` | Admin (rol, activo) | Seguridad |
| GET | `/api/dashboard` | Admin | Todos |
| GET | `/api/salud` | Público | Despliegue |

## 5. Estructura de carpetas (objetivo)

```
src/
  app/
    (páginas públicas)  page.tsx, catalogo/, producto/[id]/, auth/
    (cliente)           carrito/, checkout/, pedidos/, pedidos/[id]/
    admin/              page.tsx, productos/, inventario/, pedidos/, pagos/, envios/, usuarios/, zonas/
    api/                productos/, pedidos/, pagos/, envios/, inventario/, usuarios/, dashboard/, salud/
    api-docs/           Swagger UI
  components/           ui/ (Boton, Modal, Badge, Skeleton…), layout/
  context/              AuthContext, CarritoContext
  lib/                  supabase/ (cliente navegador, servidor), api/ (respuestas, sesión, errores),
                        ecommerce/, pagos/, distribucion/, inventario/, utils.ts
  types/                tipos de la base y de la API
supabase/migrations/    NNNN_tema.sql
docs/                   esta documentación
```
