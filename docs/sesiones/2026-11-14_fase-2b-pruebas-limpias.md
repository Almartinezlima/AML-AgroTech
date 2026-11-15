# 14 nov 2026 — Fase 2B: pruebas E2E sin basura

Rama `fase/2b-pruebas-limpias` (desde `master` con el PR #10 de zonas).

## Problema

Cada corrida de las E2E registraba cuentas nuevas `e2e+<fecha>@amlagrotech.test` (ya hay 126) y dejaba pedidos abiertos en la base real (26 pendientes, 13 entregados), que se veían y se sumaban en el panel admin. Además `compra.spec.ts` seguía esperando Bs. 10 de envío a Culpina (desde la 0010 son Bs. 25).

## Qué se hizo

- **2 cuentas fijas** en `.env.test.local`: el admin de prueba y un cliente `@amlagrotech.test` (`E2E_CLIENTE_EMAIL` / `E2E_CLIENTE_PASSWORD`). Solo `registro.spec.ts` crea una cuenta (`e2e+registro-…`) y el admin la **desactiva** al terminar.
- **Limpieza automática** (fixture `limpieza` en `tests/e2e/utilidades.ts`): al terminar cada prueba, pase o falle, el admin anula los pedidos que la prueba creó con `POST /api/pedidos/{id}/anular-prueba`. El stock vuelve, el pago queda reembolsado y no queda nada abierto. La prueba de pagos y distribución comprueba que el stock vuelve exacto después de anular un pedido **entregado**.
- **Barrido inicial** (`tests/e2e/barrido.setup.ts`): antes de todo, cierra lo que dejó abierto una corrida cortada (solo del cliente fijo y de las cuentas `e2e+registro-…`; no toca los datos viejos).
- **Migración 0011**: `anular_pedido_prueba` (solo admin, solo cuentas `@amlagrotech.test`, cualquier estado, idempotente) y `resumen_dashboard(p_incluir_pruebas default false)`. Sin service role.
- **Panel**: interruptor "Mostrar datos de prueba", apagado por defecto y recordado en el navegador, en dashboard, pedidos, envíos, pagos y usuarios. Las APIs aceptan `?pruebas=1`. El kardex no se filtra.
- `compra.spec.ts` y `PRUEBAS.md` con los costos nuevos; `LEEME.md` con 0009 y 0010 corridas (verificado en Supabase) y 0011 pendiente.

## Evidencia

- `npx tsc --noEmit`, `npm run lint` y `npm run build`: sin errores.
- `npx playwright test --list`: 31 (barrido + 30 pruebas en 8 archivos).
- API sin sesión: `/api/dashboard`, `/api/usuarios`, `/api/pagos`, `/api/pedidos?alcance=todos` (con y sin `?pruebas=1`) y `POST /api/pedidos/{id}/anular-prueba` → 401 `NO_AUTENTICADO`.
- Capturas del panel: no se sacaron. `/admin/*` exige sesión y la skill `verificar` prohíbe crear sesiones por script; las revisa Aldo, y la corrida E2E mide el panel en 360 px.
- **Las E2E no se corrieron** (se corren una vez con el OK de Aldo).

## Resultado de la corrida (14 nov 2026)

Con el PR #11 unido, la `0011` corrida y la cuenta cliente creada, se corrieron las E2E una sola vez:

- **31/31 en verde** (barrido + 30 pruebas) en 6,4 min.
- **Base intacta**: stock idéntico antes y después, 0 pedidos de prueba abiertos, la cuenta de registro quedó desactivada y los pedidos AML-000052 a AML-000055 quedaron cancelados por la limpieza.

## Pasos de Aldo, en orden

1. Unir el PR (lo une Claude del chat) y esperar a que Render publique.
2. Correr `0011_limpieza_pruebas.sql` en el SQL Editor.
3. Registrar la cuenta cliente `@amlagrotech.test` y completar `.env.test.local`.
4. Correr las E2E una vez y comparar antes y después: cuentas `.test` activas, pedidos no cancelados y stock.

## Pendiente (fase de cierre)

Ordenar las 126 cuentas viejas y sus 49 pedidos (siguen en la base, ocultos en el panel).
