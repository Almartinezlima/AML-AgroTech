# Migraciones de AML AgroTech

Se corren **a mano** en el SQL Editor de Supabase, en orden. Claude Code las escribe; Aldo las ejecuta. Procedimiento: skill `migracion`.

| N.º | Archivo | Qué hace | Corrida |
|---|---|---|---|
| 0001 | `0001_init_schema.sql` | Esquema inicial (perfiles, categorías, productos, pedidos, items, RLS). ⚠️ No coincide del todo con la base real: lo corrige la 0002 | Sí (oct 2026) |
