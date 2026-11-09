# Migraciones de AML AgroTech

Se corren **a mano** en el SQL Editor de Supabase, en orden. Claude Code las escribe; Aldo las ejecuta. Procedimiento: skill `migracion`.

| N.º | Archivo | Qué hace | Corrida |
|---|---|---|---|
| 0001 | `0001_init_schema.sql` | Esquema inicial (perfiles, categorías, productos, pedidos, items, RLS). ⚠️ No coincide del todo con la base real: lo corrige la 0002 | Sí (oct 2026) |
| 0002 | `0002_reconciliar_y_seguridad.sql` | Reconcilia el repo con la base real, crea `es_admin()` y `proteger_campos_perfil`, reescribe las políticas RLS y corrige los avisos de Supabase. Prueba dentro de la transacción que un no admin no puede cambiarse el rol | Pendiente (nov 2026) |
