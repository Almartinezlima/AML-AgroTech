-- 0002_reconciliar_y_seguridad.sql
--
-- POR QUÉ
--   Hoy cualquier usuario puede hacerse admin de dos formas: con un UPDATE a su
--   propio perfil, o registrándose con rol = 'admin' en los metadatos del signUp.
--   Además el repo no coincide con la base real y hay avisos de Supabase abiertos.
--
-- QUÉ HACE
--   1. Reconcilia el repo con la base real: perfiles.activo, handle_new_user y su trigger.
--   2. Crea el perfil que le falta a la cuenta de Auth que no lo tiene (como cliente).
--   3. Crea public.es_admin() (exige rol = 'admin' Y activo = true).
--   4. Crea el trigger proteger_campos_perfil: un no admin no cambia rol, activo ni email.
--   5. Reescribe las políticas RLS de las 5 tablas. Sin FOR ALL y sin DELETE.
--   6. Arregla los avisos: search_path y permisos de ejecución.
--   7. Verifica todo, incluida una simulación real del ataque. Si algo falla: FRENO.
--
-- QUÉ NO TOCA
--   Productos, categorías y pedidos existentes. No borra datos.
--   La configuración de Auth (largo de contraseña, Redirect URLs) va en el panel.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Reconciliación de perfiles
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.perfiles add column if not exists activo boolean default true;
update public.perfiles set activo = true where activo is null;
alter table public.perfiles alter column activo set default true;
alter table public.perfiles alter column activo set not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Funciones de trigger existentes, ahora seguras
-- ─────────────────────────────────────────────────────────────────────────────
-- El rol que llega del navegador solo se acepta si es cliente o distribuidor.
-- Cualquier otro valor (incluido 'admin') queda como cliente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol text := new.raw_user_meta_data->>'rol';
begin
  if v_rol is null or v_rol not in ('cliente', 'distribuidor') then
    v_rol := 'cliente';
  end if;

  insert into public.perfiles (id, nombre, email, rol, telefono)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', 'Usuario'),
    new.email,
    v_rol,
    new.raw_user_meta_data->>'telefono'
  );

  return new;
end;
$$;

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- auth.users es de supabase_auth_admin: postgres no puede hacer DROP TRIGGER ahí.
-- Por eso se crea solo si falta, en vez de borrar y crear.
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_trigger
    where tgname = 'on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
      and not tgisinternal
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Cuentas de Auth sin perfil: se crea como cliente
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.perfiles (id, nombre, email, rol, telefono)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'nombre', 'Usuario'),
  u.email,
  'cliente',
  u.raw_user_meta_data->>'telefono'
from auth.users u
where u.email is not null
  and not exists (select 1 from public.perfiles p where p.id = u.id)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. es_admin(): security definer para leer perfiles sin recursión de RLS
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles p
    where p.id = (select auth.uid())
      and p.rol = 'admin'
      and p.activo = true
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. proteger_campos_perfil
-- ─────────────────────────────────────────────────────────────────────────────
-- Es security invoker a propósito: current_user debe ser quien hace el UPDATE.
-- Bloquea por defecto; solo pasan el admin y los roles internos (SQL Editor).
create or replace function public.proteger_campos_perfil()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.rol is distinct from old.rol
      or new.activo is distinct from old.activo
      or new.email is distinct from old.email)
     and current_user not in ('postgres', 'service_role', 'supabase_admin')
     and not public.es_admin()
  then
    raise exception 'proteger_campos_perfil: solo un administrador puede cambiar rol, activo o email'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists proteger_campos_perfil on public.perfiles;
create trigger proteger_campos_perfil
  before update on public.perfiles
  for each row execute function public.proteger_campos_perfil();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Permisos de ejecución
-- ─────────────────────────────────────────────────────────────────────────────
-- Hay que incluir PUBLIC: hoy tiene EXECUTE y anon/authenticated lo heredarían.
-- Los triggers siguen funcionando: EXECUTE solo se exige al crear el trigger.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.update_updated_at() from public, anon, authenticated;
revoke execute on function public.proteger_campos_perfil() from public, anon, authenticated;

-- authenticated la necesita para evaluar las políticas. anon nunca las evalúa.
revoke execute on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Políticas RLS
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.perfiles enable row level security;
alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_items enable row level security;

-- perfiles: se borran los nombres de la base real y los del archivo 0001.
-- Sin política de INSERT: el perfil lo crea siempre handle_new_user.
drop policy if exists perfil_insert on public.perfiles;
drop policy if exists perfil_select on public.perfiles;
drop policy if exists perfil_update on public.perfiles;
drop policy if exists perfiles_lectura_propia on public.perfiles;
drop policy if exists perfiles_actualizacion_propia on public.perfiles;
drop policy if exists perfiles_insercion_propia on public.perfiles;
drop policy if exists perfiles_select_propio on public.perfiles;
drop policy if exists perfiles_select_admin on public.perfiles;
drop policy if exists perfiles_update_propio on public.perfiles;
drop policy if exists perfiles_update_admin on public.perfiles;

create policy perfiles_select_propio on public.perfiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy perfiles_select_admin on public.perfiles
  for select to authenticated
  using ((select public.es_admin()));

create policy perfiles_update_propio on public.perfiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy perfiles_update_admin on public.perfiles
  for update to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- categorias: lectura pública de lo activo; el admin ve todo, crea y edita.
drop policy if exists categorias_admin on public.categorias;
drop policy if exists categorias_lectura_publica on public.categorias;
drop policy if exists categorias_select_admin on public.categorias;
drop policy if exists categorias_insert_admin on public.categorias;
drop policy if exists categorias_update_admin on public.categorias;

create policy categorias_lectura_publica on public.categorias
  for select to anon, authenticated
  using (activo = true);

create policy categorias_select_admin on public.categorias
  for select to authenticated
  using ((select public.es_admin()));

create policy categorias_insert_admin on public.categorias
  for insert to authenticated
  with check ((select public.es_admin()));

create policy categorias_update_admin on public.categorias
  for update to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- productos: igual que categorias.
drop policy if exists productos_admin on public.productos;
drop policy if exists productos_lectura_publica on public.productos;
drop policy if exists productos_select_admin on public.productos;
drop policy if exists productos_insert_admin on public.productos;
drop policy if exists productos_update_admin on public.productos;

create policy productos_lectura_publica on public.productos
  for select to anon, authenticated
  using (activo = true);

create policy productos_select_admin on public.productos
  for select to authenticated
  using ((select public.es_admin()));

create policy productos_insert_admin on public.productos
  for insert to authenticated
  with check ((select public.es_admin()));

create policy productos_update_admin on public.productos
  for update to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- pedidos y pedido_items: solo lectura. Las escrituras irán por funciones SQL (Fase 2).
drop policy if exists pedidos_usuario on public.pedidos;
drop policy if exists pedidos_admin on public.pedidos;
drop policy if exists pedidos_select_propio on public.pedidos;
drop policy if exists pedidos_select_admin on public.pedidos;

create policy pedidos_select_propio on public.pedidos
  for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy pedidos_select_admin on public.pedidos
  for select to authenticated
  using ((select public.es_admin()));

drop policy if exists items_via_pedido on public.pedido_items;
drop policy if exists pedido_items_select_propio on public.pedido_items;
drop policy if exists pedido_items_select_admin on public.pedido_items;

create policy pedido_items_select_propio on public.pedido_items
  for select to authenticated
  using (
    exists (
      select 1 from public.pedidos p
      where p.id = pedido_items.pedido_id
        and p.usuario_id = (select auth.uid())
    )
  );

create policy pedido_items_select_admin on public.pedido_items
  for select to authenticated
  using ((select public.es_admin()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Verificaciones de estructura
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_tabla text;
  v_funcion text;
  v_faltante text;
begin
  -- RLS encendida en las 5 tablas
  foreach v_tabla in array array['perfiles', 'categorias', 'productos', 'pedidos', 'pedido_items'] loop
    if not exists (
      select 1 from pg_catalog.pg_class
      where oid = format('public.%I', v_tabla)::regclass and relrowsecurity
    ) then
      raise exception 'FRENO: la tabla % no tiene RLS', v_tabla;
    end if;
  end loop;

  -- perfiles.activo
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'perfiles'
      and column_name = 'activo' and is_nullable = 'NO'
  ) then
    raise exception 'FRENO: perfiles.activo no existe o admite nulos';
  end if;

  -- Tiene que quedar al menos un admin activo, o nadie podría administrar
  if not exists (select 1 from public.perfiles where rol = 'admin' and activo = true) then
    raise exception 'FRENO: no queda ningún admin activo';
  end if;

  -- search_path vacío en las 4 funciones
  foreach v_funcion in array array['es_admin', 'handle_new_user', 'update_updated_at', 'proteger_campos_perfil'] loop
    if not exists (
      select 1
      from pg_catalog.pg_proc p
      cross join lateral unnest(p.proconfig) as c(valor)
      where p.oid = format('public.%I()', v_funcion)::regprocedure
        and c.valor in ('search_path=""', 'search_path=''''', 'search_path=')
    ) then
      raise exception 'FRENO: % no tiene search_path vacío', v_funcion;
    end if;
  end loop;

  -- security definer solo donde corresponde
  if not (select prosecdef from pg_catalog.pg_proc where oid = 'public.es_admin()'::regprocedure) then
    raise exception 'FRENO: es_admin no es security definer';
  end if;
  if (select prosecdef from pg_catalog.pg_proc where oid = 'public.proteger_campos_perfil()'::regprocedure) then
    raise exception 'FRENO: proteger_campos_perfil debe ser security invoker';
  end if;

  -- handle_new_user no puede volver a aceptar cualquier rol
  if position('not in (''cliente'', ''distribuidor'')' in
      (select prosrc from pg_catalog.pg_proc where oid = 'public.handle_new_user()'::regprocedure)) = 0 then
    raise exception 'FRENO: handle_new_user no filtra el rol';
  end if;

  -- Permisos de ejecución (has_function_privilege ya considera PUBLIC)
  foreach v_funcion in array array['handle_new_user', 'update_updated_at', 'proteger_campos_perfil'] loop
    if has_function_privilege('anon', format('public.%I()', v_funcion), 'EXECUTE')
       or has_function_privilege('authenticated', format('public.%I()', v_funcion), 'EXECUTE') then
      raise exception 'FRENO: % sigue siendo ejecutable desde el navegador', v_funcion;
    end if;
  end loop;

  if has_function_privilege('anon', 'public.es_admin()', 'EXECUTE') then
    raise exception 'FRENO: anon puede ejecutar es_admin';
  end if;
  if not has_function_privilege('authenticated', 'public.es_admin()', 'EXECUTE') then
    raise exception 'FRENO: authenticated no puede ejecutar es_admin';
  end if;

  -- Triggers
  if not exists (
    select 1 from pg_catalog.pg_trigger
    where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass and tgenabled <> 'D'
  ) then
    raise exception 'FRENO: falta el trigger on_auth_user_created';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_trigger
    where tgname = 'proteger_campos_perfil' and tgrelid = 'public.perfiles'::regclass and tgenabled <> 'D'
  ) then
    raise exception 'FRENO: falta el trigger proteger_campos_perfil';
  end if;

  -- Políticas: ningún FOR ALL ni DELETE, y perfiles sin INSERT
  if exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('perfiles', 'categorias', 'productos', 'pedidos', 'pedido_items')
      and cmd in ('ALL', 'DELETE')
  ) then
    raise exception 'FRENO: quedó una política FOR ALL o DELETE';
  end if;

  if exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'perfiles' and cmd = 'INSERT'
  ) then
    raise exception 'FRENO: perfiles no debe tener política de INSERT';
  end if;

  if exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public' and tablename in ('pedidos', 'pedido_items') and cmd <> 'SELECT'
  ) then
    raise exception 'FRENO: pedidos y pedido_items deben ser solo lectura';
  end if;

  select e.nombre into v_faltante
  from unnest(array[
    'perfiles_select_propio', 'perfiles_select_admin', 'perfiles_update_propio', 'perfiles_update_admin',
    'categorias_lectura_publica', 'categorias_select_admin', 'categorias_insert_admin', 'categorias_update_admin',
    'productos_lectura_publica', 'productos_select_admin', 'productos_insert_admin', 'productos_update_admin',
    'pedidos_select_propio', 'pedidos_select_admin',
    'pedido_items_select_propio', 'pedido_items_select_admin'
  ]) as e(nombre)
  where not exists (
    select 1 from pg_catalog.pg_policies p
    where p.schemaname = 'public' and p.policyname = e.nombre
  )
  limit 1;

  if v_faltante is not null then
    raise exception 'FRENO: falta la política %', v_faltante;
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Prueba real: se simula a un usuario no admin (no deja ningún cambio)
-- ─────────────────────────────────────────────────────────────────────────────
-- Cada intento corre en un sub-bloque: si falla, Postgres deshace ese bloque.
-- Si un ataque pasara, FRENO aborta toda la migración y tampoco queda nada.
do $$
declare
  v_cliente uuid;
  v_admin uuid;
  v_sql text;
  v_bloqueado boolean;
  v_filas integer;
  v_visibles integer;
  v_resultado boolean;
begin
  select id into v_cliente from public.perfiles where rol <> 'admin' order by created_at limit 1;
  select id into v_admin from public.perfiles where rol = 'admin' and activo = true order by created_at limit 1;

  if v_cliente is null then
    raise exception 'FRENO: no hay ningún perfil no admin para hacer la prueba';
  end if;

  -- A partir de aquí auth.uid() devuelve el id del cliente
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_cliente::text, 'role', 'authenticated')::text,
    true
  );

  -- Prueba 1: el cliente intenta cambiarse rol, activo y email
  foreach v_sql in array array[
    format('update public.perfiles set rol = %L where id = %L', 'admin', v_cliente),
    format('update public.perfiles set activo = false where id = %L', v_cliente),
    format('update public.perfiles set email = %L where id = %L', 'falso@ejemplo.com', v_cliente)
  ] loop
    v_bloqueado := false;
    begin
      set local role authenticated;
      execute v_sql;
    exception
      when insufficient_privilege then
        if sqlerrm like 'proteger_campos_perfil:%' then
          v_bloqueado := true;
        else
          raise;
        end if;
    end;

    if not v_bloqueado then
      raise exception 'FRENO: el trigger NO bloqueó a un no admin. Intento: %', v_sql;
    end if;
  end loop;

  -- Prueba 2: el cliente sí puede editar su teléfono (se deshace al terminar)
  v_filas := 0;
  begin
    set local role authenticated;
    update public.perfiles set telefono = '00000000' where id = v_cliente;
    get diagnostics v_filas = row_count;
    raise exception using errcode = 'AML00', message = 'deshacer prueba 2';
  exception
    when sqlstate 'AML00' then null;
  end;

  if v_filas <> 1 then
    raise exception 'FRENO: el cliente no puede editar su propio perfil';
  end if;

  -- Prueba 3: el cliente solo ve su propio perfil y es_admin() le da false
  set local role authenticated;
  select count(*) into v_visibles from public.perfiles;
  v_resultado := public.es_admin();
  reset role;

  if v_visibles <> 1 then
    raise exception 'FRENO: un cliente ve % perfiles en vez de 1', v_visibles;
  end if;
  if v_resultado then
    raise exception 'FRENO: es_admin() devolvió true para un cliente';
  end if;

  -- Prueba 4: es_admin() da true al admin activo
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_admin::text, 'role', 'authenticated')::text,
    true
  );

  if not public.es_admin() then
    raise exception 'FRENO: es_admin() devolvió false para el admin activo';
  end if;

  -- Prueba 5: es_admin() da false si ese admin está desactivado (se deshace)
  v_resultado := true;
  begin
    update public.perfiles set activo = false where id = v_admin;
    v_resultado := public.es_admin();
    raise exception using errcode = 'AML00', message = 'deshacer prueba 5';
  exception
    when sqlstate 'AML00' then null;
  end;

  if v_resultado then
    raise exception 'FRENO: es_admin() devolvió true para un admin desactivado';
  end if;

  -- Limpieza de la simulación
  perform set_config('request.jwt.claims', '', true);

  raise notice '0002 OK: seguridad aplicada y ataque simulado bloqueado';
end;
$$;

commit;

-- Mensaje visible en la pestaña Results del SQL Editor
select '0002 OK: seguridad aplicada y ataque simulado bloqueado' as resultado;
