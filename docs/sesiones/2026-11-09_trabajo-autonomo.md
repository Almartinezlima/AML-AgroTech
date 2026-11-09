# 9 nov 2026 — Informe del trabajo autónomo

> **Importante, Aldo:** ningún SQL de hoy se ejecutó nunca, y ninguna pantalla se probó con una sesión real. El código compila y pasó las pruebas de abajo, pero la tienda recién funcionará después de correr las dos migraciones.

## 1. Qué quedó hecho

### Etapa A — Fase 1 (`fase/1-seguridad`)

Commit `2ad0646`: roles protegidos, API base, gestión de usuarios y recuperación de contraseña. Detalle en `2026-11-09_fase-1-seguridad.md`.

### Etapa B — Comercio (`fase/2-comercio`, creada desde `fase/1-seguridad`)

| Commit | Bloque |
|---|---|
| `c4c556f` | `feat(db)`: migración 0003 |
| `7219856` | `feat(api)`: API REST y contrato OpenAPI |
| `5efba5f` | `feat(ecommerce)`: carrito, ficha, checkout, catálogo y portada reales, `/api-docs` |
| `585c149` | `feat(pagos)`: QR de demostración, comprobantes, verificación |
| `1b0e77e` | `feat(distribucion)`: pedidos, envíos y zonas en administración |
| `c9d6e2e` | `feat(inventario)`: kardex, productos con imagen, panel con recharts |
| último | `docs(comercio)`: estado, specs e informe |

### Push pendiente

El `git push` se quedó esperando el inicio de sesión de Git Credential Manager, que necesita a alguien frente a la pantalla. Lo cancelé y **las ramas siguen solo en tu laptop** salvo que el intento final haya funcionado (ver el mensaje de cierre). Para subirlas, de a un comando:

```powershell
git push -u origin fase/1-seguridad
```

```powershell
git push -u origin fase/2-comercio
```

## 2. Migraciones a correr, EN ORDEN

En el SQL Editor de Supabase, pegando el archivo completo:

| Orden | Archivo | Mensaje esperado |
|---|---|---|
| 1 | `supabase/migrations/0002_reconciliar_y_seguridad.sql` | `0002 OK: seguridad aplicada y ataque simulado bloqueado` |
| 2 | `supabase/migrations/0003_modelo_comercio.sql` | `0003 OK: modelo de comercio aplicado y compra simulada correcta` |

Si aparece `FRENO` o un error, no se guardó nada: pásame el mensaje. Cada una prueba dentro de su transacción lo que hace (intento de hacerse admin; compra y cancelación) y no deja cambios. Las consultas de comprobación están al final de cada archivo o en la sesión de la Fase 1.

## 3. Pasos manuales

En Supabase:

- Auth → mínimo de contraseña = 8.
- Auth → Redirect URLs: agregar `http://localhost:3000/auth/restablecer` (y la de Render cuando exista).

En tu laptop (no toqué `.env.local`):

- Agrega `NEXT_PUBLIC_WHATSAPP_TIENDA=591XXXXXXXX` a `.env.local` con el número real. Sin esa variable, el botón de WhatsApp no aparece.
- Los buckets y sus políticas los crea la 0003.

## 4. Cómo probar el flujo completo

Con `npm run dev`, después de las dos migraciones. Usa dos navegadores: uno cliente y otro admin.

1. **Stock inicial (admin):** en `/admin/inventario`, elige un producto y anota su stock.
2. **Registro (cliente):** crea una cuenta en `/auth/registro` y entra. El perfil lo crea el trigger.
3. **Comprar:** agrega productos, recarga la página (el carrito sigue) y ve a `/checkout`. Elige Villa Charcas: la opción contra entrega no debe aparecer. Elige QR y confirma. Debes ver un código `AML-000001`.
4. **Stock y kardex (admin):** el stock bajó, y en el Kardex de ese producto hay una `Salida`.
5. **Comprobante (cliente):** en `/pedidos/<id>`, sube una imagen. El pago pasa a `En revisión`.
6. **Verificar (admin):** en `/admin/pagos`, abre el comprobante y aprueba. El pedido pasa a `Confirmado`. Prueba también rechazar en otro pedido: el motivo le aparece al cliente y puede subir otro.
7. **Despachar (admin):** en `/admin/envios`, pasa el pedido a `Preparando` y luego a `Despachado`. Sin flota y guía debe dar error en provincia. Después pásalo a `Entregado`.
8. **Línea de tiempo (cliente):** en `/pedidos/<id>` se ven todos los pasos, la flota y la guía.
9. **Cancelar:** crea otro pedido y cancélalo mientras está pendiente. El stock vuelve y el kardex muestra `Devolución`.
10. **Seguridad:** repite la prueba de consola de la Fase 1: un cliente no puede cambiarse el rol.

## 5. Decisiones que tomé sin preguntar

| Decisión | Por qué |
|---|---|
| El kardex lo ve solo el admin, aunque el prompt decía "dueño lee lo suyo" | Muestra saldos internos de la tienda y la spec lo define para el admin |
| Trigger `proteger_stock_producto` | Sin él, un admin podía cambiar el stock por fuera de la API, sin kardex. La spec exige que solo cambie por funciones |
| Productos nuevos nacen con stock 0 | Así la primera entrada queda registrada en el kardex |
| Contra entrega no se confirma sola: el admin la confirma | `crear_pedido` del prompt no la auto-confirma, y así el cliente puede cancelar mientras está pendiente |
| Al entregar contra entrega, el pago queda `verificado` | Es cuando la tienda cobra; así el panel suma bien lo cobrado |
| Un pago verificado de un pedido cancelado no se devuelve solo | No hay pasarela: la devolución es manual |
| `resumen_dashboard()` en SQL | Cortar días y meses en hora de Bolivia es más confiable en la base |
| Rutas extra: `POST /api/pedidos/cotizar`, `GET /api/pagos`, `POST /api/productos/imagen`, `POST`/`PATCH` de zonas, `GET /api/openapi` | Las pantallas pedidas las necesitan. Están en el OpenAPI |
| No creé `PATCH /api/envios/:id` | La flota y la guía van en `PATCH /api/pedidos/:id/estado`, que lo hace en una transacción |
| La ruta del comprobante vive en `pagos/[id]/comprobante`, con `id` = pedido | Next no acepta dos nombres de parámetro en el mismo nivel |
| Portada con productos reales | Tenía productos inventados y "Los más vendidos esta semana", que era falso |
| Gráficos en un solo verde | Ámbar y verde se confunden con daltonismo (lo marcó el validador). El estado va en texto |
| Validación de archivos por contenido real | Un archivo renombrado a `.jpg` no pasa |
| `/checkout` exige sesión y el login vuelve a donde estabas | Lo pide la spec HU-E05 |
| El rol `distribuidor` sigue elegible al registrarse | No da permisos todavía; hay que revisarlo cuando los tenga |

## 6. Pendiente o sin verificar

**Sin verificar**

- El SQL de la 0002 y la 0003 no se ejecutó nunca. Lo revisé línea por línea; los bloques de prueba lo comprobarán al correrlo.
- El flujo con sesión real, Storage real y las URL firmadas. Las pantallas se probaron con datos ficticios y los 403/409/422 con sesión simulada en una copia fuera del repo.
- El envío del correo de recuperación de contraseña.

**Evidencia**

- tsc y build sin errores; lint con 4 warnings previos de `exhaustive-deps`.
- Servidor real sin sesión: 401 en rutas protegidas, 307 a login con vuelta, OpenAPI 200.
- Copia con sesión simulada: 403 por rol, 201 al crear, 409 por stock con detalle, 422 por datos (incluye precio inyectado y editar stock a mano), CSV descargable.
- Capturas en 1280 y 360 px de 18 pantallas, sin scroll horizontal.

**Avisos**

- Antes de correr la 0003, el catálogo falla porque pide `sku` e `imagen_url`.
- `npm audit` marca vulnerabilidades, entre ellas en `next`. Conviene actualizar Next antes del deploy en Render; no lo hice porque cambia de versión.
- El kardex devuelve como máximo 2000 movimientos por consulta.
- Los costos de envío son los de referencia de la spec: confírmalos.
