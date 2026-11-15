# AML AgroTech — Estado

**Actualizado:** 14 nov 2026 (rama `master`; la fase 6B se unió con el PR #5). Revisado contra el código, el deploy y la base real de Supabase.

> ✅ Migraciones `0001` a `0011` corridas en la base real (la `0011`, limpieza de pruebas E2E, el 14 nov 2026).
>
> ✅ Deploy activo en Render: https://aml-agrotech.onrender.com (plan gratis: la primera visita tras un rato sin uso tarda unos 45 s en despertar; abrirla unos minutos antes de la demo).

**Fase 6 + 6B (diseño de feria y correcciones de la auditoría):** tema **claro** (crema, tarjetas blancas, verde de la marca, trigo), letra mínima de 14 px, fotos reales de los 33 productos, portada con la foto propia de Villa Charcas, carrito sin cuenta, checkout con resumen y pasos clicables, comprobante con cámara y vista previa, búsqueda sin tildes, reembolsos, recojo "Listo para recoger" y nombre/CI de quien recoge en flota. Brief en [`DISENO.md`](DISENO.md); auditoría en [`sesiones/2026-11-09_auditoria.md`](sesiones/2026-11-09_auditoria.md).

## Resumen por pilar

| Pilar | Estado | Qué hay | Qué falta |
|---|---|---|---|
| E-commerce | ✅ Probado E2E | Catálogo y portada con datos reales, ficha, carrito persistente, checkout en 3 pasos, pedidos con línea de tiempo, cancelación, panel con cifras reales; recorrido admin probado E2E (10 nov) | Paginar `/admin/pedidos` |
| Seguridad | ✅ Probada E2E | Roles protegidos en base (`es_admin`, `proteger_campos_perfil`), RLS reescrita, middleware con rol verificado en servidor, `/admin/usuarios` real, recuperación de contraseña segura (solo con enlace de recuperación), mensajes de Auth reales, carrito por cuenta, `/cuenta`, encabezados de seguridad | En Supabase Auth: mínimo de contraseña 8 y Redirect URLs |
| Pagos | ✅ Probado E2E | QR y cuenta de demostración, contra entrega, comprobante en bucket privado, verificación con motivo de rechazo, reembolsos | Probar el rechazo en E2E |
| Distribución | ✅ Probada E2E | Zonas editables, flota y guía, panel de envíos, recojo "Listo para recoger", WhatsApp | Definir `NEXT_PUBLIC_WHATSAPP_TIENDA`; confirmar los costos de referencia |
| Almacenamiento | ✅ Probado E2E | Kardex, entradas y ajustes, stock protegido, niveles, alertas, CSV, valor del inventario | — |
| API REST | 🟢 Programada | `src/app/api/**`, OpenAPI en `docs/api/openapi.yaml`, Swagger en `/api-docs` | — |
| Pruebas | ✅ 31/31 en verde (14 nov) | Playwright: seguridad, registro, compra, pagos, distribución, inventario, admin, 360 px. Desde la fase 2B solo usan 2 cuentas fijas (admin y cliente `@amlagrotech.test`) y cada prueba anula lo que crea; el panel oculta los datos de prueba con el interruptor "Mostrar datos de prueba" ([`PRUEBAS.md`](PRUEBAS.md)). Corrida de la fase 4 (14 nov): 31/31 en 3,4 min y base intacta (huella de stock idéntica, los 6 pedidos de la corrida cancelados, 0 abiertos del cliente fijo) | Ordenar las 126 cuentas viejas en la fase de cierre; GitHub Actions |
| Deploy | ✅ Activo | Render: https://aml-agrotech.onrender.com | Next 14.2.35 es el último 14.2.x y `npm audit` aún marca una crítica en `next`: solo se arregla con Next 16 (cambio mayor), después de la feria |

## Base de datos real (14 nov 2026)

- Migraciones `0001` a `0011` corridas. Buckets `productos` (público) y `comprobantes` (privado).
- Datos (conteo del 14 nov): 36 productos, 8 zonas activas (Sucre inactiva), 126 cuentas de prueba viejas `e2e+…@amlagrotech.test` con 49 pedidos (26 pendientes, 13 entregados, 10 cancelados). Se ocultan en el panel y se ordenan en la fase de cierre.
- "Confirm email" apagado (para la feria).

## Plan de fases

| Fase | Rama | Pilar |
|---|---|---|
| 0 | `fase/0-reglas` | Reglas, skills y especificación ✅ |
| 1 | `fase/1-seguridad` | Seguridad + base de la API ✅ programada |
| 2 | `fase/2-comercio` | E-commerce, API REST, Swagger, inventario, pagos y distribución ✅ programada (reemplaza a las fases 2 a 5) |
| 2B | `fase/2b-calidad` | Arreglos de autenticación + pruebas E2E con Playwright ✅ |
| 2A | `fase/2a-zonas` | Zonas: distritos de Villa Charcas, Incahuasi y Culpina; Sucre inactiva ✅ (PR #10) |
| 2B | `fase/2b-pruebas-limpias` | Pruebas E2E sin basura: 2 cuentas fijas, limpieza al terminar, interruptor de datos de prueba en el panel (migración 0011) ✅ (PR #11; E2E 31/31) |
| 3 | `fase/3-diseno` | Diseño unificado: tokens en una sola fuente, letra chica más grande en celular, panel admin con cifras y filtros, 0 scroll horizontal en 360 px ([sesión](sesiones/2026-11-14_fase-3-diseno.md)) ✅ (PR #12) |
| 4 | `fase/4-compra-facil` | Compra fácil: botones que dicen adónde llevan ("Ir a pagar" / "Seguir comprando"), pasos visibles, mensajes simples, datos recordados de la última compra, QR de demostración con el monto exacto y estados simples para el cliente. Sin migración ([sesión](sesiones/2026-11-14_fase-4-compra-facil.md)) — en revisión |
| 6 | `fase/6-diseno` | Diseño de feria: fotos reales, color por categoría, tipografía y portada ✅ |
| 6B | `fase/6-diseno` | Correcciones de la auditoría + tema claro ✅ (unida a `master`, PR #5) |
| 6 | `fase/6-pulido` | Cuentas demo, README, celular |
| 7 | — | Deploy en Render ✅ + Lab 10 ✅ entregado (Grupo 20) |
| 8 | — | UML en StarUML + documento |
