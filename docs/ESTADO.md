# AML AgroTech — Estado

**Actualizado:** 10 nov 2026 (rama `fase/6-diseno`, fase 6B). Revisado contra el código y la base real de Supabase.

> ✅ Migraciones `0001` a `0004` corridas en la base real.
>
> ⏳ **Pendientes de correr, en este orden: `0005_zonas_villa_charcas.sql` → `0006_cancelacion_y_pagos.sql` → `0007_recojo_y_flota.sql`.** El código ya funciona antes de correrlas (la API reintenta con la forma vieja), pero hasta entonces no hay reembolsos, el cliente todavía puede cancelar con comprobante en la base, el recojo no tiene "Listo para recoger" y quién recoge en flota se guarda dentro de la dirección.

**Fase 6 + 6B (diseño de feria y correcciones de la auditoría):** tema **claro** (crema, tarjetas blancas, verde de la marca, trigo), letra mínima de 14 px, fotos reales de los 33 productos, portada con la foto propia de Villa Charcas, carrito sin cuenta, checkout con resumen y pasos clicables, comprobante con cámara y vista previa, búsqueda sin tildes, reembolsos, recojo "Listo para recoger" y nombre/CI de quien recoge en flota. Brief en [`DISENO.md`](DISENO.md); auditoría en [`sesiones/2026-11-09_auditoria.md`](sesiones/2026-11-09_auditoria.md).

## Resumen por pilar

| Pilar | Estado | Qué hay | Qué falta |
|---|---|---|---|
| E-commerce | ✅ Probado E2E | Catálogo y portada con datos reales, ficha, carrito persistente, checkout en 3 pasos, pedidos con línea de tiempo, cancelación, panel con cifras reales | Ocultar datos `e2e+…` en el panel; probar el recorrido admin E2E (faltan credenciales en `.env.test.local`) |
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
| 6 | `fase/6-diseno` | Diseño de feria: fotos reales, color por categoría, tipografía y portada ✅ |
| 6B | `fase/6-diseno` | Correcciones de la auditoría + tema claro ✅ (faltan correr 0005, 0006, 0007) |
| 6 | `fase/6-pulido` | Cuentas demo, README, celular |
| 7 | — | Deploy en Render + Lab 10 |
| 8 | — | UML en StarUML + documento |
