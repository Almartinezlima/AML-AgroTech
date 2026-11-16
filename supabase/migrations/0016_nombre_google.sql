-- 0016_nombre_google.sql
--
-- POR QUÉ
--   Fase 9B: "Continuar con Google". Una cuenta creada con Google no trae 'nombre' en la
--   metadata (eso lo manda solo nuestro formulario de registro): Google manda 'full_name'
--   y 'name'. Con la versión de la 0013, esas cuentas nacían con el nombre "Usuario".
--
-- QUÉ HACE
--   1. handle_new_user toma el nombre en este orden: 'nombre' (registro con correo),
--      'full_name' y 'name' (Google). Recorta espacios, ignora valores vacíos, lo limita
--      a 120 caracteres y, si no hay ninguno, deja 'Usuario' como hoy.
--   2. El rol sigue fijo en 'cliente': nada de la metadata (que la escribe quien se
--      registra) puede cambiarlo. El rol distribuidor o admin lo asigna solo el admin.
--   3. Prueba dentro de la migración: crea un usuario de Google de mentira en auth.users,
--      revisa su perfil y deshace todo (no queda ninguna fila).
--
-- QUÉ NO TOCA
--   No cambia ningún perfil existente, ni el trigger on_auth_user_created (sigue llamando
--   a la misma función), ni RLS, ni roles. Una cuenta con correo que después entra con
--   Google NO pasa por aquí: Supabase vincula la identidad al mismo usuario (no hay
--   insert en auth.users) y su perfil queda igual.
--
-- CUÁNDO CORRERLA
--   Antes o después de publicar la 9B: el código funciona sin ella (la cuenta de Google
--   entraría como "Usuario"). Mejor antes de la primera prueba real con Google.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Perfil de cada cuenta nueva
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text;
begin
  v_nombre := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'nombre'), ''),
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'name'), ''),
    'Usuario'
  );

  insert into public.perfiles (id, nombre, email, rol, telefono)
  values (
    new.id,
    left(v_nombre, 120),
    new.email,
    'cliente',  -- siempre: el rol nunca sale de la metadata
    nullif(btrim(new.raw_user_meta_data->>'telefono'), '')
  );

  return new;
end;
$$;

-- Solo la llama el trigger de auth.users
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Verificaciones
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_id uuid := gen_random_uuid();
  v_nombre text;
  v_rol text;
  v_telefono text;
begin
  -- El trigger sigue activo sobre auth.users
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
      and tgenabled <> 'D'
  ) then
    raise exception 'FRENO: falta el trigger on_auth_user_created en auth.users';
  end if;

  -- Usuario de Google de mentira, que además intenta colarse como admin.
  -- El bloque interno se deshace con la excepción AMLOK: no queda ninguna fila.
  begin
    insert into auth.users (id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
    values (
      v_id, 'authenticated', 'authenticated', 'prueba.0016@amlagrotech.test',
      jsonb_build_object('full_name', '  Prueba Google 0016  ', 'name', 'Otro nombre', 'rol', 'admin'),
      jsonb_build_object('provider', 'google', 'providers', jsonb_build_array('google'))
    );

    select nombre, rol, telefono into v_nombre, v_rol, v_telefono
    from public.perfiles where id = v_id;

    if v_nombre is distinct from 'Prueba Google 0016' then
      raise exception 'FRENO: el nombre de Google no se tomó (quedó %)', coalesce(v_nombre, 'sin perfil');
    end if;
    if v_rol is distinct from 'cliente' then
      raise exception 'FRENO: la cuenta de Google nació con rol %', coalesce(v_rol, 'sin rol');
    end if;
    if v_telefono is not null then
      raise exception 'FRENO: la cuenta de Google nació con teléfono %', v_telefono;
    end if;

    raise exception using errcode = 'P0001', message = 'AMLOK';
  exception
    when raise_exception then
      if sqlerrm <> 'AMLOK' then raise; end if;
  end;

  if exists (select 1 from auth.users where id = v_id)
     or exists (select 1 from public.perfiles where id = v_id) then
    raise exception 'FRENO: la cuenta de prueba no se deshizo';
  end if;

  raise notice '0016 OK: handle_new_user toma el nombre de Google y crea siempre clientes';
end;
$$;

commit;
