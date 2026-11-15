# Fase 5 — Avisos por Telegram al admin (14 nov 2026)

Rama `fase/5-telegram`, desde `master` con la fase 4 unida (PR #13). **Migración 0012** (Aldo la corre; Claude Code no).

## Por qué

El admin tiene que enterarse al momento de lo que pasa en la tienda sin estar mirando el panel. Los avisos van **solo al admin** (el aviso al cliente se descartó).

## Decisiones

- **Los avisos salen de la base** (triggers + `pg_net`), no de Next.js:
  - `pg_net` encola el mensaje y lo manda **después del commit**, en segundo plano. Si Telegram falla o tarda, la compra, el comprobante o el movimiento ya están guardados. Si la operación falla, el aviso no sale (la cola se deshace con la transacción). Timeout de 3 s. Cada función va envuelta en `exception when others` y solo deja un warning con el SQLSTATE, sin token ni datos del cliente.
  - Cubre todos los caminos (web, API, panel) y no depende de que Render esté despierto.
- **Resumen diario con `pg_cron`** a las 00:00 UTC = **20:00 de Bolivia** (Bolivia no cambia de hora). Se descartó GitHub Actions + endpoint: despierta Render (unos 45 s), el cron de GitHub se atrasa y se apaga tras 60 días sin actividad, y el endpoint necesitaría leer todos los pedidos sin sesión (la service role está prohibida). Costo cero en los dos casos.
- **Secretos en Supabase Vault**: `aml_telegram_token` y `aml_telegram_chat_admin`. No van en Render ni en el repo. Sin secretos, los avisos no hacen nada (es el interruptor para apagarlos). En `.env.local` quedan `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID_ADMIN` solo para pruebas locales. **Variables en Render: ninguna.**
- **Cuentas de prueba (`@amlagrotech.test`): no mandan nada** (sin marca [PRUEBA]). En el stock se mira quién hizo el movimiento y, si es una venta, de quién es el pedido. Si el origen no se conoce (sin usuario ni pedido), se avisa. El resumen no cuenta los datos de prueba, igual que el dashboard.
- **Stock sin repetir y sin columna nueva**: el aviso sale solo cuando el stock **cruza** el mínimo (de arriba a abajo) o llega a 0. Mientras siga bajo, no se repite. Si se repone y vuelve a bajar, avisa otra vez. Límite conocido: si el cruce lo provoca un pedido de prueba (que no avisa), una venta real posterior con el stock ya bajo tampoco avisa; el resumen de las 20:00 igual lo lista.
- **Seguridad**: todas las funciones son `security definer` con `search_path` vacío y sin `execute` para `public`, `anon` ni `authenticated`. El resumen no se puede llamar desde el navegador.
- **Enlace del pedido nuevo al panel**: `/admin/pedidos?codigo=AML-…` muestra solo ese pedido, con "Ver todos los pedidos".

## Qué se hizo

- `supabase/migrations/0012_avisos_telegram.sql`: extensiones `pg_net` y `pg_cron`; auxiliares `aml_formato_bs` (igual que `formatoBs`), `aml_hora_bolivia` y `aml_url_sitio`; `aml_enviar_telegram`; triggers `aml_aviso_pedido_nuevo` (diferido al commit, para leer el total final), `aml_aviso_comprobante` (pago que pasa a `en_revision`) y `aml_aviso_stock` (en `movimientos_inventario`); `aml_aviso_resumen_diario` y el trabajo `aml-resumen-diario`. Al final, verificaciones con FRENO.
- `src/app/admin/pedidos/page.tsx`: filtro `?codigo=` (con `Suspense` por `useSearchParams`).
- **Comprobante desde la galería** (pendiente de la fase 4). Antes, el botón principal tenía `capture` (solo cámara) y el otro incluía `application/pdf` en `accept`, por lo que Android abría "Archivos" en vez de la Galería. Ahora hay 3 caminos: "Sacar foto" (`capture="environment"`), "Elegir de la galería" (`accept="image/*"`, sin `capture`) y el enlace "Subir PDF" (`accept="application/pdf"`).
- `src/lib/pagos/imagen.ts`: la foto se achica en el celular a JPG de 1600 px como máximo (calidad 0,82 → 0,7 → 0,55 hasta quedar bajo 3 MB), respetando la orientación EXIF y con fondo blanco. Si el navegador no puede leer un HEIC, muestra un mensaje claro.

## Evidencia

- `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.
- `tests/capturas/comprobante-galeria.spec.ts`, a 412 y 360 px y sin scroll horizontal. **No toca la base**: muestra un pedido viejo del cliente fijo como pendiente solo en el navegador y bloquea la subida. Comprueba los `accept` y `capture` de los 3 inputs. Una foto de galería de 4000×3000 que pesaba 6,2 MB quedó en 1600×1200 JPG de 528 KB. El HEIC da su mensaje.
- Telegram: los 4 avisos de ejemplo (con el texto de la 0012 y datos inventados) llegaron al chat del admin.
- Base intacta: la misma huella de pedidos, pagos, kardex, seguimiento y stock antes y después de las capturas.

## Migración y E2E (14 nov 2026)

- Aldo corrió la 0012 y cargó los 2 secretos en Vault. El resumen de prueba (`select public.aml_aviso_resumen_diario();`) le llegó a Telegram.
- Comprobado en la base: 3 triggers `aml_aviso_*`, el trabajo `aml-resumen-diario` con `0 0 * * *` y `pg_net` con 1 sola respuesta (la del resumen de prueba).
- **Primera corrida: 29/31.** Fallaron `fase-6b` (comprobante que bloquea la cancelación) y `pagos-distribucion`, porque buscaban el botón viejo «Subir foto del comprobante». No era una falla de la app. Se cambiaron para elegir la foto con «Elegir foto del comprobante de la galería», que además prueba el camino nuevo con la compresión a JPG. Aun con las 2 fallas, la limpieza cerró todo: 4 pedidos cancelados y la misma huella de stock.
- **Segunda corrida: 31/31 en 6,6 min** (`npm run test:e2e:prod`).
- **Sin avisos de prueba:** entre las dos corridas se crearon 8 pedidos y 12 bajas de stock, todas de cuentas `@amlagrotech.test`, con comprobantes y aprobaciones. `pg_net` siguió con 1 sola respuesta y 0 en cola, así que ningún aviso salió a Telegram. Los triggers no rompieron ni la compra ni la subida del comprobante.
- **Base intacta:** la misma huella de stock (total 3179). Los 8 pedidos de las corridas quedaron cancelados, ninguno de una cuenta real y ningún pago abierto.
