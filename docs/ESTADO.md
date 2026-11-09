# AML AgroTech — Estado

**Actualizado:** 9 nov 2026 (Fase 1, rama `fase/1-seguridad`). Revisado contra el código y la base real de Supabase.

> ⚠️ **La migración `0002_reconciliar_y_seguridad.sql` está PENDIENTE de correr.** Hasta que Aldo la ejecute, la base real sigue con los agujeros descritos en la sesión de la Fase 1.

## Resumen por pilar

| Pilar | Estado | Qué hay | Qué falta |
|---|---|---|---|
| E-commerce | 🟡 Parcial | Catálogo real (33 productos, 5 categorías) con búsqueda, filtro y orden; carrito en memoria | Pedido real en la base (hoy "Confirmar" solo muestra un número aleatorio), `/pedidos` sin conectar, carrito persistente, ficha de producto, imágenes, dashboard real (hoy con cifras inventadas), editar producto |
| Seguridad | 🟢 Programada, falta correr la 0002 | Roles protegidos en base (`es_admin`, `proteger_campos_perfil`), RLS reescrita, middleware con rol verificado en servidor, API base (`requerirSesion`/`requerirAdmin`), `/admin/usuarios` real, recuperación de contraseña, `/cuenta`, encabezados de seguridad | Correr la 0002; en Supabase Auth: mínimo de contraseña 8 y Redirect URLs |
| Pagos | 🔴 No existe | — | Todo |
| Distribución | 🔴 No existe | — | Todo |
| Almacenamiento | 🟡 Parcial | `/admin/inventario` muestra stock real con nivel | Kardex, entradas/salidas, descuento automático al vender, alertas |
| API REST | 🔴 No existe | — | Todo `src/app/api/**` + OpenAPI |
| Deploy | 🔴 No existe | — | Render |

## Base de datos real (9 nov 2026)

- Tablas: `perfiles` (con `activo`), `categorias`, `productos`, `pedidos`, `pedido_items`. Todas con RLS.
- Funciones: `handle_new_user` (trigger de registro), `update_updated_at`.
- Datos: 33 productos, 5 categorías, 1 perfil (admin), 0 pedidos. Sin buckets de Storage.
- ⚠️ `supabase/migrations/0001_init_schema.sql` **no coincide** con la base real (le falta `perfiles.activo` y `handle_new_user`). Se corrige en la Fase 1 con una migración de reconciliación.

## Plan de fases

| Fase | Rama | Pilar |
|---|---|---|
| 0 | `fase/0-reglas` | Reglas, skills y especificación ✅ |
| 1 | `fase/1-seguridad` | Seguridad + base de la API |
| 2 | `fase/2-ecommerce` | E-commerce + API REST + Swagger |
| 3 | `fase/3-almacenamiento` | Inventario y kardex |
| 4 | `fase/4-pagos` | Pagos |
| 5 | `fase/5-distribucion` | Distribución |
| 6 | `fase/6-pulido` | Dashboard, cuentas demo, README, celular |
| 7 | — | Deploy en Render + Lab 10 |
| 8 | — | UML en StarUML + documento |
