-- 0013_distribuidores.sql
--
-- POR QUÉ
--   El distribuidor deja de ser "un cliente que compra al por mayor" y pasa a ser el
--   PROVEEDOR mayorista (Sucre o Santa Cruz) que le vende a la tienda. Carga sus
--   presentaciones (bidón 20 L, bolsa 25 kg, caja 12 × 1 L…) con precio mayorista y días de
--   entrega, vinculadas a los productos de la tienda. Fase 6A (14 nov 2026).
--
-- QUÉ HACE
--   1. aml_es_cuenta_prueba: además de @amlagrotech.test reconoce la cuenta admin que usan
--      las E2E (por su id, no por el correo: el repo es público y el correo sirve para
--      entrar). Sus movimientos ya no avisan por Telegram ni cuentan en el resumen.
--   2. handle_new_user: toda cuenta nueva nace como cliente. El rol distribuidor lo asigna
--      solo el admin desde /admin/usuarios.
--   3. Tablas nuevas, con RLS:
--      · distribuidores: la ficha del proveedor, unida a su cuenta (usuario_id).
--      · presentaciones_distribuidor: lo que vende cada proveedor, con cuántas unidades de
--        venta de la tienda trae (el fraccionamiento: bidón 20 L = 20 litro).
--      · costos_producto: costo promedio y último costo de cada producto. Va aparte porque
--        productos se lee sin sesión (catálogo) y el costo es solo del admin. Se llena en
--        la fase 6B, con las recepciones.
--   4. Auxiliares es_distribuidor() y aml_mi_distribuidor() para las políticas.
--
--   Quién ve qué:
--   · distribuidor: su ficha (solo lectura) y sus presentaciones (ver, crear, editar).
--     Nunca las de otro proveedor, nunca costos_producto.
--   · admin: todo. Crea y edita las fichas.
--   · anon: nada de estas tablas.
--   Nada se borra: las fichas y presentaciones se desactivan (activo = false).
--
-- QUÉ NO TOCA
--   No cambia productos, pedidos, pagos ni el kardex. No cambia el rol de ninguna cuenta.
--
-- CUÁNDO CORRERLA
--   Antes de publicar el código de la fase 6A. Después: crear las 2 cuentas de los
--   distribuidores en Auth y correr la 0014.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Cuentas de prueba: también la cuenta admin de las E2E
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.aml_es_cuenta_prueba(p_usuario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_usuario_id = 'c8c5ac65-63bf-4b25-8ffc-e7ce4ab5cacb'::uuid  -- admin de las E2E
      or exists (
        select 1 from public.perfiles u
        where u.id = p_usuario_id and lower(u.email) like '%@amlagrotech.test'
      );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Toda cuenta nueva es cliente
-- ─────────────────────────────────────────────────────────────────────────────
-- El rol que mande el navegador se ignora: distribuidor y admin los asigna el admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, email, rol, telefono)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', 'Usuario'),
    new.email,
    'cliente',
    new.raw_user_meta_data->>'telefono'
  );

  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Tablas
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.distribuidores (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references public.perfiles (id),
  nombre_comercial text not null check (length(btrim(nombre_comercial)) between 2 and 120),
  ciudad text not null check (ciudad in ('Sucre', 'Santa Cruz')),
  telefono text check (telefono is null or length(btrim(telefono)) between 6 and 20),
  nit text check (nit is null or length(btrim(nit)) between 5 and 20),
  dias_entrega integer not null default 3 check (dias_entrega between 0 and 60),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.presentaciones_distribuidor (
  id uuid primary key default gen_random_uuid(),
  distribuidor_id uuid not null references public.distribuidores (id),
  producto_id uuid not null references public.productos (id),
  nombre text not null check (length(btrim(nombre)) between 2 and 80),
  -- Cuántas unidades de venta de la tienda trae (bidón 20 L de un producto que se vende por litro = 20)
  unidades_por_presentacion integer not null check (unidades_por_presentacion between 1 and 100000),
  precio_mayorista numeric(10,2) not null check (precio_mayorista > 0),
  disponible boolean not null default true,
  -- Si es null vale el de la ficha del distribuidor
  dias_entrega integer check (dias_entrega is null or dias_entrega between 0 and 60),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un mismo proveedor no repite el nombre de presentación de un producto (entre las activas)
create unique index if not exists presentaciones_distribuidor_unica
  on public.presentaciones_distribuidor (distribuidor_id, producto_id, nombre)
  where activo;

create index if not exists presentaciones_distribuidor_producto
  on public.presentaciones_distribuidor (producto_id) where activo;

-- 4 decimales: Bs. 1.250 / 12 = 104,1667; con 2 el promedio se desvía compra a compra
create table if not exists public.costos_producto (
  producto_id uuid primary key references public.productos (id),
  costo_promedio numeric(12,4) not null check (costo_promedio >= 0),
  costo_ultimo numeric(12,4) not null check (costo_ultimo >= 0),
  actualizado_en timestamptz not null default now()
);

drop trigger if exists distribuidores_updated_at on public.distribuidores;
create trigger distribuidores_updated_at
  before update on public.distribuidores
  for each row execute function public.update_updated_at();

drop trigger if exists presentaciones_distribuidor_updated_at on public.presentaciones_distribuidor;
create trigger presentaciones_distribuidor_updated_at
  before update on public.presentaciones_distribuidor
  for each row execute function public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Auxiliares para las políticas
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.es_distribuidor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.rol = 'distribuidor' and p.activo = true
  );
$$;

-- La ficha activa del distribuidor de la sesión (null si no es distribuidor o no tiene ficha)
create or replace function public.aml_mi_distribuidor()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select d.id
  from public.distribuidores d
  join public.perfiles p on p.id = d.usuario_id
  where d.usuario_id = (select auth.uid())
    and d.activo = true
    and p.rol = 'distribuidor'
    and p.activo = true;
$$;

-- La ficha solo puede apuntar a una cuenta con rol distribuidor
create or replace function public.validar_cuenta_distribuidor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.usuario_id is distinct from old.usuario_id then
    raise exception 'La cuenta de una ficha de distribuidor no se cambia.' using errcode = 'AML02';
  end if;

  if not exists (
    select 1 from public.perfiles p where p.id = new.usuario_id and p.rol = 'distribuidor'
  ) then
    raise exception 'La cuenta elegida no tiene el rol distribuidor.' using errcode = 'AML02';
  end if;

  return new;
end;
$$;

drop trigger if exists validar_cuenta_distribuidor on public.distribuidores;
create trigger validar_cuenta_distribuidor
  before insert or update on public.distribuidores
  for each row execute function public.validar_cuenta_distribuidor();

-- El distribuidor no mueve una presentación a otro proveedor ni a otro producto
create or replace function public.proteger_presentacion_distribuidor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.distribuidor_id is distinct from old.distribuidor_id
     or new.producto_id is distinct from old.producto_id then
    raise exception 'Una presentación no cambia de distribuidor ni de producto: crea una nueva.' using errcode = 'AML02';
  end if;

  return new;
end;
$$;

drop trigger if exists proteger_presentacion_distribuidor on public.presentaciones_distribuidor;
create trigger proteger_presentacion_distribuidor
  before update on public.presentaciones_distribuidor
  for each row execute function public.proteger_presentacion_distribuidor();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.distribuidores enable row level security;
alter table public.presentaciones_distribuidor enable row level security;
alter table public.costos_producto enable row level security;

-- Nadie sin sesión toca estas tablas
revoke all on table public.distribuidores from anon;
revoke all on table public.presentaciones_distribuidor from anon;
revoke all on table public.costos_producto from anon;
-- Nada se borra: ni siquiera el admin tiene delete
revoke delete, truncate on table public.distribuidores from authenticated;
revoke delete, truncate on table public.presentaciones_distribuidor from authenticated;
-- El costo lo escriben solo las funciones de la recepción (fase 6B)
revoke insert, update, delete, truncate on table public.costos_producto from authenticated;

drop policy if exists distribuidores_select_propio on public.distribuidores;
drop policy if exists distribuidores_select_admin on public.distribuidores;
drop policy if exists distribuidores_insert_admin on public.distribuidores;
drop policy if exists distribuidores_update_admin on public.distribuidores;

create policy distribuidores_select_propio on public.distribuidores
  for select to authenticated
  using (usuario_id = (select auth.uid()) and (select public.es_distribuidor()));

create policy distribuidores_select_admin on public.distribuidores
  for select to authenticated
  using ((select public.es_admin()));

create policy distribuidores_insert_admin on public.distribuidores
  for insert to authenticated
  with check ((select public.es_admin()));

create policy distribuidores_update_admin on public.distribuidores
  for update to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

drop policy if exists presentaciones_select_propias on public.presentaciones_distribuidor;
drop policy if exists presentaciones_select_admin on public.presentaciones_distribuidor;
drop policy if exists presentaciones_insert_propias on public.presentaciones_distribuidor;
drop policy if exists presentaciones_update_propias on public.presentaciones_distribuidor;

create policy presentaciones_select_propias on public.presentaciones_distribuidor
  for select to authenticated
  using (distribuidor_id = (select public.aml_mi_distribuidor()));

create policy presentaciones_select_admin on public.presentaciones_distribuidor
  for select to authenticated
  using ((select public.es_admin()));

create policy presentaciones_insert_propias on public.presentaciones_distribuidor
  for insert to authenticated
  with check (distribuidor_id = (select public.aml_mi_distribuidor()));

create policy presentaciones_update_propias on public.presentaciones_distribuidor
  for update to authenticated
  using (distribuidor_id = (select public.aml_mi_distribuidor()))
  with check (distribuidor_id = (select public.aml_mi_distribuidor()));

drop policy if exists costos_select_admin on public.costos_producto;
create policy costos_select_admin on public.costos_producto
  for select to authenticated
  using ((select public.es_admin()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Permisos de las funciones
-- ─────────────────────────────────────────────────────────────────────────────
revoke execute on function public.aml_es_cuenta_prueba(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.validar_cuenta_distribuidor() from public, anon, authenticated;
revoke execute on function public.proteger_presentacion_distribuidor() from public, anon, authenticated;
-- Las políticas las evalúan con el rol de la sesión: authenticated las necesita
revoke execute on function public.es_distribuidor() from public, anon;
revoke execute on function public.aml_mi_distribuidor() from public, anon;
grant execute on function public.es_distribuidor() to authenticated;
grant execute on function public.aml_mi_distribuidor() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Verificaciones
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_tabla text;
  v_funcion text;
begin
  -- La cuenta admin de las E2E cuenta como prueba; un admin real, no
  if not exists (select 1 from public.perfiles where id = 'c8c5ac65-63bf-4b25-8ffc-e7ce4ab5cacb') then
    raise exception 'FRENO: no existe la cuenta admin de las E2E (c8c5ac65…).';
  end if;
  if not public.aml_es_cuenta_prueba('c8c5ac65-63bf-4b25-8ffc-e7ce4ab5cacb') then
    raise exception 'FRENO: aml_es_cuenta_prueba no reconoce la cuenta admin de las E2E.';
  end if;
  if exists (
    select 1 from public.perfiles p
    where p.rol = 'admin' and p.id <> 'c8c5ac65-63bf-4b25-8ffc-e7ce4ab5cacb'
      and public.aml_es_cuenta_prueba(p.id)
  ) then
    raise exception 'FRENO: otra cuenta admin quedó marcada como prueba.';
  end if;

  -- handle_new_user ya no lee el rol del navegador
  if position('raw_user_meta_data->>''rol''' in pg_get_functiondef('public.handle_new_user()'::regprocedure)) > 0 then
    raise exception 'FRENO: handle_new_user todavía acepta el rol que manda el navegador.';
  end if;

  foreach v_tabla in array array['distribuidores', 'presentaciones_distribuidor', 'costos_producto'] loop
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = v_tabla and c.relrowsecurity
    ) then
      raise exception 'FRENO: % no tiene RLS.', v_tabla;
    end if;
    if has_table_privilege('anon', 'public.' || v_tabla, 'select') then
      raise exception 'FRENO: anon puede leer %.', v_tabla;
    end if;
    if has_table_privilege('authenticated', 'public.' || v_tabla, 'delete') then
      raise exception 'FRENO: % se puede borrar.', v_tabla;
    end if;
  end loop;

  if has_table_privilege('authenticated', 'public.costos_producto', 'insert')
     or has_table_privilege('authenticated', 'public.costos_producto', 'update') then
    raise exception 'FRENO: costos_producto se puede escribir desde la API.';
  end if;

  if (select count(*) from pg_policies where schemaname = 'public'
      and tablename in ('distribuidores', 'presentaciones_distribuidor', 'costos_producto')) <> 9 then
    raise exception 'FRENO: las políticas no son las 9 esperadas.';
  end if;

  if exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename in ('distribuidores', 'presentaciones_distribuidor', 'costos_producto')
      and (roles @> array['anon']::name[] or roles @> array['public']::name[])
  ) then
    raise exception 'FRENO: hay una política abierta a anon o public.';
  end if;

  foreach v_funcion in array array[
    'public.aml_es_cuenta_prueba(uuid)', 'public.handle_new_user()',
    'public.es_distribuidor()', 'public.aml_mi_distribuidor()'
  ] loop
    if not exists (
      select 1 from pg_proc where oid = v_funcion::regprocedure and prosecdef
        and proconfig @> array['search_path=""']
    ) then
      raise exception 'FRENO: % no es security definer con search_path vacío.', v_funcion;
    end if;
    if has_function_privilege('anon', v_funcion, 'execute') then
      raise exception 'FRENO: anon puede ejecutar %.', v_funcion;
    end if;
  end loop;

  if has_function_privilege('authenticated', 'public.aml_es_cuenta_prueba(uuid)', 'execute') then
    raise exception 'FRENO: aml_es_cuenta_prueba se puede llamar desde el navegador.';
  end if;

  raise notice '0013 OK: distribuidores, presentaciones y costos con RLS; registro solo como cliente; admin de las E2E marcado como prueba. Sigue: crear las 2 cuentas en Auth y correr la 0014.';
end;
$$;

commit;
