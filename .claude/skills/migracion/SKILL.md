---
name: migracion
description: Cómo escribir una migración de la base de AML AgroTech (Supabase). Número, BEGIN/COMMIT, idempotente, RLS, funciones seguras, verificaciones que frenan y qué comprobar después. Usar siempre que haga falta una tabla, columna, política, función, trigger o bucket nuevo. Claude Code escribe el archivo; nunca lo corre.
---

# Escribir una migración

Reglas en CLAUDE.md: principios 3, 8 y 10, y "Reglas técnicas". Esto es el procedimiento.

## 1. Mirar antes de escribir

- Esquema real: las migraciones de `supabase/migrations/` en `master`. Si hace falta, consultar Supabase **solo para leer** (`information_schema`, `pg_policies`).
- Nombres de tablas y columnas, los reales. Nada inventado.

## 2. Número y nombre

- `supabase/migrations/NNNN_tema_corto.sql`, con NNNN = mayor existente + 1 (revisar también las ramas `fase/*` abiertas con `git ls-tree`).
- Si dos ramas usan el mismo número, avisar a Aldo.

## 3. Cómo se arma

1. **Encabezado comentado**: por qué, qué hace, qué NO toca, y "Se puede correr dos veces".
2. `begin;` … `commit;`
3. **Idempotente**: `create table if not exists`, `add column if not exists`, `create or replace function`, `drop policy if exists` antes de `create policy`, `drop trigger if exists` antes de `create trigger`, `on conflict do nothing` en datos semilla.
4. **Toda tabla nueva**: `enable row level security` + políticas explícitas con `(select auth.uid())` y `to authenticated` (o `anon` si es lectura pública).
5. **Funciones**: `set search_path = ''`, nombres calificados (`public.x`). `security definer` solo si hace falta. Si no son para el navegador: `revoke execute on function ... from public, anon, authenticated`.
6. **Admin**: usar `public.es_admin()` en las políticas (no repetir el `exists` sobre `perfiles`, que causa recursión).
7. **Storage**: buckets y sus políticas en `storage.objects` también van en migración.
8. **Nunca borrar datos reales** (productos, pedidos, perfiles). Cambios destructivos: PARAR y avisar.
9. **Verificaciones al final** en un bloque `do $$ … $$`: que exista lo creado, que tenga RLS, que las políticas sean las esperadas. Si algo no cuadra, `raise exception 'FRENO: …'` (no se guarda nada). Termina con `raise notice 'NNNN OK: …'`.

## 4. Lo que acompaña

- Fila nueva en `supabase/migrations/LEEME.md` (número, qué hace, fecha, si Aldo ya la corrió).
- Si cambia tipos: actualizar `src/types/`.

## 5. Nunca correrla

Claude Code **no la ejecuta** por ningún medio (ni conector, ni terminal, ni service role). Se le entrega a Aldo:
- La ruta del archivo y cuándo correrla (antes o después del código).
- El mensaje que tiene que ver (`NNNN OK: …`). Si ve `FRENO`, no se guardó nada: que pase el mensaje.
- Dos a cuatro consultas de solo lectura para comprobar.
