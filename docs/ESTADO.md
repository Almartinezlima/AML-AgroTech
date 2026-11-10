# AML AgroTech — Estado

**Actualizado:** 9 nov 2026 (rama `fase/2b-calidad`). Revisado contra el código y la base real de Supabase.

> ✅ Las migraciones `0002` y `0003` ya están corridas en la base real. La tienda se probó de punta a punta con **23 pruebas E2E en verde** (`npm run test:e2e:prod`, ver [`PRUEBAS.md`](PRUEBAS.md)).

## Resumen por pilar

| Pilar | Estado | Qué hay | Qué falta |
|---|---|---|---|
| E-commerce | ✅ Probado E2E | Catálogo y portada con datos reales, ficha, carrito persistente, checkout en 3 pasos, pedidos con línea de tiempo, cancelación, panel con cifras reales | Ocultar datos `e2e+…` en el panel |
| Seguridad | ✅ Probada E2E | Roles protegidos en base (`es_admin`, `proteger_campos_perfil`), RLS reescrita, middleware con rol verificado en servidor, `/admin/usuarios` real, recuperación de contraseña segura (solo con enlace de recuperación), mensajes de Auth reales, carrito por cuenta, `/cuenta`, encabezados de seguridad | En Supabase Auth: mínimo de contraseña 8 y Redirect URLs |
| Pagos | ✅ Probado E2E | QR y cuenta de demostración, contra entrega, comprobante en bucket privado, verificación con motivo de rechazo | Probar el rechazo en E2E |
| Distribución | ✅ Probada E2E | Zonas editables, flota y guía, panel de envíos, WhatsApp | Definir `NEXT_PUBLIC_WHATSAPP_TIENDA`; confirmar los costos de referencia |
| Almacenamiento | ✅ Probado E2E | Kardex, entradas y ajustes, stock protegido, niveles, alertas, CSV, valor del inventario | — |
| API REST | 🟢 Programada | `src/app/api/**`, OpenAPI en `docs/api/openapi.yaml`, Swagger en `/api-docs` | — |
| Pruebas | ✅ 23 E2E | Playwright: seguridad, compra, pagos, distribución, inventario, 360 px | Correrlas en GitHub Actions (gratis) |
| Deploy | 🔴 No existe | — | Render (actualizar Next por `npm audit`) |

## Base de datos real (9 nov 2026)

- Migraciones `0001`, `0002` y `0003` corridas. Buckets `productos` (público) y `comprobantes` (privado).
- Datos: 33 productos, 5 zonas de envío, 3 cuentas reales, más las cuentas y pedidos de prueba (`e2e+…@amlagrotech.test`) que dejan las pruebas E2E.
- "Confirm email" apagado (para la feria).

## Plan de fases

| Fase | Rama | Pilar |
|---|---|---|
| 0 | `fase/0-reglas` | Reglas, skills y especificación ✅ |
| 1 | `fase/1-seguridad` | Seguridad + base de la API ✅ programada |
| 2 | `fase/2-comercio` | E-commerce, API REST, Swagger, inventario, pagos y distribución ✅ programada (reemplaza a las fases 2 a 5) |
| 2B | `fase/2b-calidad` | Arreglos de autenticación + pruebas E2E con Playwright ✅ |
| 6 | `fase/6-pulido` | Cuentas demo, README, celular |
| 7 | — | Deploy en Render + Lab 10 |
| 8 | — | UML en StarUML + documento |
