# Pruebas E2E (Playwright)

Pruebas de punta a punta que usan la app **como un usuario de verdad**: se registran por la pantalla, compran, suben comprobantes y el admin aprueba, despacha y mueve inventario. Corren contra la **base real de Supabase** (no hay base de pruebas aparte).

## 1. Preparar (una sola vez)

1. Instalar dependencias y el navegador:

   ```powershell
   npm install
   ```

   ```powershell
   npx playwright install chromium
   ```

2. Copiar `.env.test.example` como `.env.test.local` y completar la cuenta **admin** de prueba:

   ```
   E2E_ADMIN_EMAIL=...
   E2E_ADMIN_PASSWORD=...
   ```

   `.env.test.local` está en `.gitignore` y nunca se sube. Las pruebas **nunca** usan la service role.

3. En Supabase → Authentication → Sign In / Providers → Email: **"Confirm email" apagado**. Si está encendido, las pruebas que necesitan un cliente quedan **omitidas** (no fallidas) con un aviso, y no se manda ningún correo (la prueba lee la configuración pública de Auth antes de registrar a nadie).

## 2. Correr

| Comando | Qué hace | Cuándo |
|---|---|---|
| `npm run test:e2e:prod` | Compila en `.next-e2e`, levanta producción en el **3210** y lo apaga al terminar | **Recomendado.** Rápido (~2–3 min) y estable; no toca el `.next` de `npm run dev` |
| `npm run test:e2e` | Usa el `npm run dev` del **3000** (o lo levanta si no hay) | Mientras programás, con UN solo `npm run dev` abierto |
| `npm run test:e2e:ui` | Modo visual de Playwright para ver cada paso | Para depurar una prueba |

Una sola prueba: `npx playwright test seguridad` (o `compra`, `pagos`, `inventario`, `responsive`).

Reporte: `npx playwright show-report` (abre `playwright-report/`). Si algo falla quedan captura, video y traza en `test-results/`.

> ⚠️ **Nunca tengas dos `npm run dev` abiertos** (3000 y 3001): comparten la carpeta `.next` y las cookies de `localhost`, se pisan y la app falla de forma rara (404, sesiones mezcladas). Si pasa, cerrá las dos terminales y abrí una sola.

## 3. Qué prueba cada archivo (`tests/e2e/`)

| Archivo | Prueba |
|---|---|
| `seguridad.spec.ts` | Sin sesión `/admin`, `/pedidos`, `/carrito` → login con `?siguiente=`; API sin sesión → 401; cliente en `/admin` → `/`; cliente en `/api/usuarios` → 403; contraseña mala → "Correo o contraseña incorrectos"; `/auth/restablecer` con sesión normal o `code` falso → "Enlace inválido o vencido" sin formulario; vuelve a donde iba tras el login (e ignora destinos externos); el carrito de una cuenta no lo ve otra en el mismo navegador |
| `compra.spec.ts` | Registro → catálogo → 2 productos → recarga (el carrito sigue) → checkout a Villa Charcas (sin contra entrega, total = subtotal + 35) → código `AML-…` → aparece en Mis pedidos |
| `pagos-distribucion.spec.ts` | Cliente sube comprobante (PNG generado en la prueba) → admin aprueba → confirmado → preparando → despachado con flota y guía → entregado → el cliente ve la línea de tiempo completa |
| `inventario.spec.ts` | El stock baja al comprar y vuelve al cancelar; el kardex muestra "Venta AML-…" y "Cancelación AML-…"; el admin registra una entrada (+5) y luego un ajuste (−5) para dejar el stock como estaba |
| `responsive.spec.ts` | Inicio, catálogo, auth, carrito, checkout, pedidos y panel admin en **360 px** sin scroll horizontal |

## 4. Datos que dejan las pruebas

No se borra nada (regla del proyecto). Todo queda marcado para filtrarlo:

- Clientes: correo `e2e+<marca de tiempo>@amlagrotech.test`, nombre "Cliente E2E".
- Pedidos: nota "E2E: pedido de prueba automática", dirección "E2E — …", flota "Trans Copacabana (E2E)", guía `E2E-…`.
- Inventario: motivos "E2E: entrada de prueba" y "E2E: revierte la entrada de prueba".

Cada corrida completa crea unas 12 cuentas y 3 pedidos. Para la feria conviene que el panel (dashboard, listas) permita ocultar los datos `e2e+…`: queda como pendiente.

Consulta para verlos en el SQL Editor:

```sql
select p.codigo, p.estado, p.total, u.email
from public.pedidos p
join public.perfiles u on u.id = p.usuario_id
where u.email like 'e2e+%'
order by p.created_at desc;
```
