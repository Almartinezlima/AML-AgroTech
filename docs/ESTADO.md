# AML AgroTech — Estado

**Actualizado:** 9 nov 2026 (rama `fase/2-comercio`). Revisado contra el código y la base real de Supabase.

> ⚠️ **Las migraciones `0002` y `0003` están PENDIENTES de correr, en ese orden.** Hasta entonces la base real sigue con los agujeros de seguridad de la 0001, y el catálogo y la tienda nueva no funcionan porque leen columnas y tablas de la 0003.

## Resumen por pilar

| Pilar | Estado | Qué hay | Qué falta |
|---|---|---|---|
| E-commerce | 🟢 Programado, falta correr la 0003 | Catálogo y portada con datos reales, ficha, carrito persistente, checkout en 3 pasos, pedidos con línea de tiempo, cancelación, panel con cifras reales | Prueba de punta a punta con sesión real |
| Seguridad | 🟢 Programada, falta correr la 0002 | Roles protegidos en base (`es_admin`, `proteger_campos_perfil`), RLS reescrita, middleware con rol verificado en servidor, `/admin/usuarios` real, recuperación de contraseña, `/cuenta`, encabezados de seguridad | Correr la 0002; en Supabase Auth: mínimo de contraseña 8 y Redirect URLs |
| Pagos | 🟢 Programado, falta correr la 0003 | QR y cuenta de demostración, contra entrega, comprobante en bucket privado, verificación con motivo de rechazo | Prueba con sesión real |
| Distribución | 🟢 Programada, falta correr la 0003 | Zonas editables, flota y guía, panel de envíos, WhatsApp | Definir `NEXT_PUBLIC_WHATSAPP_TIENDA`; confirmar los costos de referencia |
| Almacenamiento | 🟢 Programado, falta correr la 0003 | Kardex, entradas y ajustes, stock protegido, niveles, alertas, CSV, valor del inventario | Prueba con sesión real |
| API REST | 🟢 Programada | `src/app/api/**`, OpenAPI en `docs/api/openapi.yaml`, Swagger en `/api-docs` | — |
| Deploy | 🔴 No existe | — | Render (actualizar Next por `npm audit`) |

## Base de datos real (9 nov 2026)

- Tablas: `perfiles` (con `activo`), `categorias`, `productos`, `pedidos`, `pedido_items`. Todas con RLS.
- Funciones: `handle_new_user` (trigger de registro), `update_updated_at`.
- Datos: 33 productos, 5 categorías, 1 perfil (admin), 0 pedidos. Sin buckets de Storage.
- La `0002` y la `0003` todavía no se corrieron.

## Plan de fases

| Fase | Rama | Pilar |
|---|---|---|
| 0 | `fase/0-reglas` | Reglas, skills y especificación ✅ |
| 1 | `fase/1-seguridad` | Seguridad + base de la API ✅ programada |
| 2 | `fase/2-comercio` | E-commerce, API REST, Swagger, inventario, pagos y distribución ✅ programada (reemplaza a las fases 2 a 5) |
| 6 | `fase/6-pulido` | Cuentas demo, README, celular |
| 7 | — | Deploy en Render + Lab 10 |
| 8 | — | UML en StarUML + documento |
