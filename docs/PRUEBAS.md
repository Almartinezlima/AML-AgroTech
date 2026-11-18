# Pruebas E2E (Playwright)

Pruebas de punta a punta que usan la app **como un usuario de verdad**: el cliente compra y sube comprobantes; el admin aprueba, despacha y mueve inventario. Corren contra la **base real de Supabase** (no hay base de pruebas aparte), así que **cada prueba deja la base como estaba** (fase 2B, 14 nov 2026): solo usan 2 cuentas fijas y cierran todo lo que crean.

## 1. Preparar (una sola vez)

1. Instalar dependencias y el navegador:

   ```powershell
   npm install
   ```

   ```powershell
   npx playwright install chromium
   ```

2. Correr la migración **0011** en el SQL Editor de Supabase (crea `anular_pedido_prueba`, que usa la limpieza).

3. Crear la **cuenta cliente de prueba** registrándose en la web con un correo **`@amlagrotech.test`** (por ejemplo `cliente@amlagrotech.test`). Ese dominio es obligatorio: solo los pedidos de esas cuentas se pueden anular, y no mandan avisos por Telegram.

4. Copiar `.env.test.example` como `.env.test.local` y completar las **2 cuentas fijas**:

   ```
   E2E_ADMIN_EMAIL=...
   E2E_ADMIN_PASSWORD=...
   E2E_CLIENTE_EMAIL=...@amlagrotech.test
   E2E_CLIENTE_PASSWORD=...
   # Fase 6A: los 2 distribuidores de demostración (migración 0014)
   E2E_DIST1_EMAIL=distribuidor.sucre@amlagrotech.test
   E2E_DIST1_PASSWORD=...
   E2E_DIST2_EMAIL=distribuidor.scz@amlagrotech.test
   E2E_DIST2_PASSWORD=...
   ```

   Las cuentas de los distribuidores se crean en Supabase Auth con esas contraseñas **antes** de correr la 0014. La cuenta admin de las E2E cuenta como prueba desde la 0013 (`aml_es_cuenta_prueba`, por su id): sus movimientos no avisan por Telegram ni cuentan en el resumen.

   `.env.test.local` está en `.gitignore` y nunca se sube. Las pruebas **nunca** usan la service role.

5. En Supabase → Authentication → Sign In / Providers → Email: **"Confirm email" apagado**. Si está encendido, la prueba de registro queda **omitida** (no fallida) con un aviso, y no se manda ningún correo.

## 2. Correr

| Comando | Qué hace | Cuándo |
|---|---|---|
| `npm run test:e2e:prod` | Compila **antes** en `.next-e2e` (`pretest:e2e:prod` → `scripts/compilar-e2e.mjs`), levanta producción en el **3210** (solo `next start`, con su salida en la terminal) y lo apaga al terminar | **Recomendado.** No toca el `.next` de `npm run dev` |
| `npm run test:e2e` | Usa el `npm run dev` del **3000** (o lo levanta si no hay) | Mientras programás, con UN solo `npm run dev` abierto |
| `npm run test:e2e:ui` | Modo visual de Playwright para ver cada paso | Para depurar una prueba |
| `E2E_BASE_URL=http://localhost:3210 npx playwright test` | Prueba contra un servidor ya levantado, sin levantar nada | **Si `test:e2e:prod` corta a la mitad con `ERR_CONNECTION_REFUSED`.** Primero `npx next build` con `NEXT_DIST_DIR=.next-e2e` y después, en otra terminal, `NEXT_DIST_DIR=.next-e2e npx next start -p 3210` (en PowerShell: `$env:NEXT_DIST_DIR='.next-e2e'`). Así fue la corrida de la 6B, 41/41 |

Una sola prueba: `npx playwright test seguridad` (o `compra`, `pagos`, `inventario`, `registro`, `responsive`, `distribuidor`, `abastecimiento`, `nota-venta`).

> ⚠️ En Windows, el `next start` que levantaba Playwright con `build && start` se cayó 2 veces sin dejar error (6A y 6B). Desde la fase 7 la compilación va aparte y la salida del servidor se ve en la terminal: si vuelve a caerse, queda el error. Si pasa, las pruebas siguientes dan `ERR_CONNECTION_REFUSED` y lo que quedó abierto lo anula el barrido de la corrida siguiente.

Reporte: `npx playwright show-report` (abre `playwright-report/`). Si algo falla quedan captura, video y traza en `test-results/`.

> ⚠️ **Nunca tengas dos `npm run dev` abiertos** (3000 y 3001): comparten la carpeta `.next` y las cookies de `localhost`, se pisan y la app falla de forma rara (404, sesiones mezcladas). Si pasa, cerrá las dos terminales y abrí una sola.

## 3. Qué prueba cada archivo (`tests/e2e/`)

| Archivo | Prueba |
|---|---|
| `barrido.setup.ts` | Corre **antes** de todo: anula los pedidos que el cliente fijo dejó abiertos en una corrida cortada, anula las órdenes de compra de los distribuidores de prueba que no estén canceladas ni rechazadas (de la más nueva a la más vieja) y desactiva las cuentas `e2e+registro-…` que quedaron activas. Ojo: también anula las órdenes que alguien haya armado a mano con los distribuidores `.test` |
| `seguridad.spec.ts` | Sin sesión `/admin`, `/pedidos`, `/checkout` → login con `?siguiente=`; API sin sesión → 401; cliente en `/admin` → `/`; cliente en `/api/usuarios` → 403; contraseña mala → "Correo o contraseña incorrectos"; `/auth/restablecer` con sesión normal o `code` falso → "Enlace inválido o vencido" sin formulario; vuelve a donde iba tras el login (e ignora destinos externos); el carrito del cliente no lo ve el admin en el mismo navegador |
| `registro.spec.ts` | Registro por la pantalla → entra directo al catálogo → al terminar el admin desactiva la cuenta, el panel no la lista y si intenta entrar ve "cuenta desactivada" |
| `compra.spec.ts` | Catálogo → 2 productos → recarga (el carrito sigue) → checkout con «Pagas con QR» y sin «¿Cómo quieres pagar?» (fase 9F) → Culpina (pide quién recoge, errores junto a cada campo, total = subtotal + Bs. 25) → código `AML-…` → el carrito queda vacío |
| `pagos-distribucion.spec.ts` | Cliente sube la foto del pago (PNG generado en la prueba) → el admin aprueba en `/admin/pagos` → prepara en «Por preparar» y toca «Listo para salir» → «Despachar por flota» con empresa y guía → el cliente toca «Recibí mi pedido» → completado; la línea de tiempo muestra cada paso → se anula y el stock vuelve |
| `inventario.spec.ts` | El stock baja al comprar y vuelve al cancelar; el kardex muestra "Venta AML-…" y "Cancelación AML-…"; el admin registra una entrada (+5) y luego un ajuste (−5) para dejar el stock como estaba |
| `fase-6b.spec.ts` | Búsqueda sin tildes, carrito sin cuenta, deshacer, sincronía entre pestañas, comprobante que bloquea la cancelación del cliente, páginas inexistentes |
| `distribuidor.spec.ts` | Fase 6A, no crea nada: el registro ya no ofrece la cuenta de distribuidor; un cliente no entra a `/distribuidor` (→ `/`) y su API le da 403; el distribuidor 1 ve solo sus presentaciones, no puede editar una del 2 (404), no lee `/api/distribuidores` (403) ni entra a `/admin`; «Marcar sin stock» se ve en el panel del admin y se revierte |
| `abastecimiento.spec.ts` | Fase 6B, con los 2 distribuidores de prueba: **circuito completo** (el admin arma por la pantalla con «Pedir otro producto» Glifosato 3 × Bidón 20 L y Bravonil 2 × Caja 12 × 1 L → envía con el aviso de WhatsApp armado → el distribuidor 1 acepta con fecha y despacha → una despachada no se cancela (409) → **recepción parcial**: 3 de 3 y 1 de 2, con la vista previa «= 60 litros · costo Bs. 82,00/litro · stock X → X+60» → stock +60 y +12, kardex «Compra OC-…: 3 Bidón 20 L = 60 litros», costo promedio ponderado → la limpieza devuelve stock y costo a como estaban); **rechazo** del distribuidor 2 con motivo que ve el admin, sin tocar stock; **cancelación** del admin con motivo y el distribuidor ya no puede aceptarla (409); **seguridad entre distribuidores** (el borrador no lo ve ni su dueño, la orden del 1 da 404 al 2 en GET y en cada acción, las acciones del admin dan 403 al proveedor, el proveedor no recibe stock, costos ni datos internos); **cliente sin acceso** (redirige y 403); **360 px** sin scroll en abastecimiento, la orden, margen, panel y el lado del proveedor |
| `nota-venta.spec.ts` | Fase 7 (al flujo de la 9F): **QR** verificado → el cliente baja el recibo con el botón y el admin con «Recibo PDF»; **QR** sin pagar o en revisión → 409; inventado 404, sin sesión 401, ajeno 404; al anularse sale ANULADO |
| `reparto.spec.ts` | Fase 9F, con `E2E_REPARTIDOR_*`: compra a Distrito 1 con QR → el cliente no entra a la API del repartidor (403) → el admin aprueba, prepara y deja «Listo para salir» y `/repartidor` lo lleva a `/admin/repartidores` → el repartidor no disponible no ve nada; disponible ve zona, dirección, bultos y «Ganas Bs. X» sin datos del cliente → acepta → el admin la libera → la vuelve a aceptar, «Recogí el pedido» (ya no se puede liberar: 409) → entrega con el código del cliente → completado → ganado y por cobrar → el admin ve la deuda y un «Pagado» con monto distinto da 409 (no se paga de verdad) → el repartidor vuelve a «No disponible» |
| `responsive.spec.ts` | Inicio, catálogo, auth, carrito, checkout, pedidos y panel admin (dashboard, pedidos, pagos, envíos, usuarios, inventario) en **360 px** sin scroll horizontal |

## 4. Limpieza: qué queda en la base después de una corrida

Las pruebas importan `test` desde `utilidades.ts`, que trae un fixture automático `limpieza`: al terminar cada prueba, **pase o falle**, el admin de prueba:

- **Anula** cada pedido que la prueba creó (`POST /api/pedidos/{id}/anular-prueba`, migración 0011): lo cancela en cualquier estado (también entregado), devuelve el stock con una "devolución" en el kardex (`Limpieza E2E AML-…`) y cierra el pago como reembolsado si hubo comprobante. Si ya estaba cancelado no devuelve stock dos veces.
- **Desactiva** la cuenta que creó la prueba de registro.
- **Anula** cada orden de compra que la prueba creó (`POST /api/ordenes-compra/{id}/anular-prueba`, migración 0015), de la más nueva a la más vieja. Si se recibió, saca lo que entró con un ajuste `Limpieza E2E OC-…` en el kardex y restaura el costo anterior; si era la primera recepción del producto, borra su fila de `costos_producto` (única excepción a "nunca hard-delete": es un dato calculado y el rastro queda en el kardex). No se puede anular si después entró otra compra del mismo producto o si ya se vendió lo recibido.

Resultado: **el stock queda igual, no queda ningún pedido abierto ni nada por cobrar**, y el panel no cuenta nada de esto. Como no se borra nada (regla del proyecto), sí quedan rastros históricos, marcados para filtrarlos:

- Unos 5 pedidos **cancelados** por corrida en la cuenta cliente fija, con nota "E2E: pedido de prueba automática".
- Sus filas en el kardex (venta + devolución) y en el seguimiento.
- El archivo del comprobante (PNG de 1×1 px) en el bucket privado: no hay política para borrarlo.
- 1 cuenta `e2e+registro-<marca de tiempo>@amlagrotech.test` **desactivada** por corrida.
- Motivos de inventario "E2E: entrada de prueba" y "E2E: revierte la entrada de prueba".
- Unas 6 órdenes de compra **canceladas o rechazadas** por corrida de los distribuidores de prueba, con su línea de tiempo, y en el kardex los pares «Compra OC-…» + «Limpieza E2E OC-…» por la misma cantidad.

### En el panel

Desde la fase 8A-2 el panel admin muestra **siempre** los datos de todas las cuentas, también las `@amlagrotech.test` (ya no hay interruptor «Mostrar datos de prueba» ni parámetro `?pruebas=1`). Lo que deja una corrida se reconoce por los textos «E2E» y «Limpieza E2E» y porque queda cancelado. Los avisos de Telegram y el resumen de las 20:00 siguen sin contar las cuentas de prueba.

### Datos viejos

Antes de la revisión del 16 nov la base quedó limpia: 0 pedidos y 0 órdenes de compra. Para ver si una corrida dejó algo de las cuentas de prueba, en el SQL Editor:

```sql
select p.codigo, p.estado, p.total, u.email
from public.pedidos p
join public.perfiles u on u.id = p.usuario_id
where u.email like '%@amlagrotech.test'
order by p.created_at desc;
```
