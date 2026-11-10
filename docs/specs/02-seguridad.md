# 02 — Seguridad

Fase: `fase/1-seguridad`. ✅ Programada. Depende de correr la migración `0002` (pendiente) y de la prueba con sesión real.

## Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| ✅ HU-S01 | Como **visitante** quiero registrarme con nombre, correo, teléfono y contraseña para comprar | Alta |
| ✅ HU-S02 | Como **usuario** quiero iniciar y cerrar sesión, y que mi sesión se mantenga al recargar | Alta |
| ✅ HU-S03 | Como **usuario** quiero recuperar mi contraseña por correo | Media |
| ✅ HU-S04 | Como **administrador** quiero ver los usuarios, cambiar su rol y desactivar cuentas | Alta |
| ✅ HU-S05 | Como **dueño de la tienda** quiero que nadie pueda hacerse administrador por su cuenta ni ver datos de otros | Alta |
| ✅ HU-S06 | Como **cliente** quiero editar mi nombre y teléfono en "Mi cuenta" | Media |

## Criterios de aceptación

- **HU-S05 (crítico):**
  - Un trigger `proteger_campos_perfil` impide que un usuario no admin cambie `rol` o `activo` (ni el suyo ni el de otros). Probado desde la consola del navegador: el intento falla.
  - `es_admin()` (`security definer`, `search_path = ''`) se usa en todas las políticas de admin.
  - `pedidos`, `pedido_items`: el cliente solo **lee** lo suyo; ya no hay `FOR ALL`. Las escrituras pasan por funciones SQL / API.
  - Middleware: `/admin/**` exige rol `admin` verificado en el servidor (no solo sesión); si no, redirige a `/`.
  - Cuenta con `activo = false` no puede comprar (API responde 403) y ve un aviso.
  - Se corrigen los avisos de Supabase: `search_path` en funciones, `handle_new_user` no ejecutable por `anon`/`authenticated`.
  - Encabezados de seguridad en `next.config.mjs`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, HSTS.
- **API:** helper `requerirSesion()` / `requerirAdmin()` en `src/lib/api/`; toda ruta declara quién puede llamarla. 401 sin sesión, 403 sin permiso.
- **HU-S04:** `/admin/usuarios` con datos reales, búsqueda, cambio de rol y activar/desactivar vía `PATCH /api/usuarios/:id`. El admin no puede quitarse su propio rol de admin.
- **Contraseñas:** mínimo 8 caracteres en el registro.
- **Migración de reconciliación:** `0002` deja el repo igual a la base real (`perfiles.activo`, `handle_new_user`).

## Pantallas

`/auth/login`, `/auth/registro`, `/auth/recuperar`, `/auth/restablecer`, `/cuenta`, `/admin/usuarios`.
