# 9 nov 2026 — Fase 1: seguridad y base de la API

Rama: `fase/1-seguridad`.

## Migración

`supabase/migrations/0002_reconciliar_y_seguridad.sql` — **PENDIENTE de correr.** La corre Aldo en el SQL Editor. Mensaje esperado: `0002 OK: seguridad aplicada y ataque simulado bloqueado`. Si sale `FRENO`, no se guarda nada.

## Hallazgos sobre la base real

- `handle_new_user` copiaba el `rol` de los metadatos del `signUp`: cualquiera podía registrarse como admin. No estaba en la lista original.
- `PUBLIC` tenía `EXECUTE` en las funciones: revocar solo a `anon` y `authenticated` no alcanzaba.
- `auth.users` es de `supabase_auth_admin`: `postgres` no puede hacer `DROP TRIGGER` ahí. El trigger se crea solo si falta.
- La página de registro insertaba en `perfiles` una fila que el trigger ya había creado.
- 2 usuarios en Auth y 1 perfil. La 0002 crea el perfil faltante como `cliente`.

## Qué se hizo

- **Base (0002):** `es_admin()` exige rol admin y `activo = true`; `proteger_campos_perfil` impide a un no admin cambiar `rol`, `activo` o `email`; políticas sin `FOR ALL` ni `DELETE`; avisos de Supabase corregidos; pruebas dentro de la transacción que simulan a un no admin sin dejar cambios.
- **API:** `src/lib/api/` (cliente de servidor, sesión, respuestas, validación), `GET /api/salud`, `GET /api/usuarios`, `PATCH /api/usuarios/:id`.
- **Middleware:** `/admin/**` con rol verificado en servidor; `/pedidos`, `/carrito`, `/cuenta` con sesión; cuenta desactivada ve un aviso.
- **Pantallas:** `/admin/usuarios` real, `/cuenta`, `/cuenta-desactivada`, `/auth/recuperar`, `/auth/restablecer`, modal propio.
- **Otros:** encabezados de seguridad, `fechaHoyLocal()`, `formatoBs()`, ids del carrito como `string`, zod.

## Evidencia

- tsc, lint (4 warnings previos) y build sin errores.
- Servidor real sin sesión: 401 en la API de usuarios, 307 a login en rutas protegidas, 200 en `/api/salud`, 4 encabezados presentes.
- Copia temporal con sesión simulada: 403 por rol, cuenta desactivada y operación propia; 400 y 422 por datos; 404 y 200.
- 35 capturas en 1280, 412 y 360 px, sin scroll horizontal.

## Sin verificar

El SQL de la 0002 no se ejecutó nunca. Falta el 403 con sesión real, la recuperación de contraseña de punta a punta, `/cuenta` logueado y el registro real.

## Pasos manuales en Supabase

- Auth: mínimo de contraseña = 8.
- Auth → Redirect URLs: `http://localhost:3000/auth/restablecer` (y la de Render al desplegar).

## Decisiones

- El perfil se crea solo por trigger; `perfiles` no tiene política de INSERT.
- El admin tiene política UPDATE en `perfiles`, para no usar la service role.
- `distribuidor` sigue siendo elegible al registrarse: aún no da permisos.
- El email de `perfiles` también queda protegido.
- `npm audit` marca 14 vulnerabilidades, una de ellas en `next`. No se tocó porque implica actualizar Next.
