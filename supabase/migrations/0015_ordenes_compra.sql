-- 0015_ordenes_compra.sql
--
-- POR QUÉ
--   La tienda le compra a sus proveedores mayoristas (fase 6A) con órdenes de compra. Al
--   recibir, la mercadería entra al kardex fraccionada en la unidad de venta (bidón 20 L =
--   20 litros) y con su costo, y el costo del producto se lleva por promedio ponderado para
--   calcular el margen. Fase 6B (14 nov 2026).
--
-- QUÉ HACE
--   1. Tablas, con RLS y sin escritura directa (todo pasa por las funciones de abajo):
--      · ordenes_compra: código OC-000001, proveedor, estado, fechas, transportista y guía.
--      · orden_compra_items: una línea por presentación. Al ENVIAR se copian el nombre, las
--        unidades que trae y el precio (lo que se pidió no cambia si el proveedor cambia su
--        precio después). Una línea quitada del borrador queda en cantidad 0.
--      · seguimiento_orden_compra: la línea de tiempo.
--   2. Kardex: columnas opcionales costo_unitario, orden_compra_id y costo_promedio_anterior.
--      Las funciones que ya escriben en el kardex no cambian.
--   3. Estados: borrador → enviada → aceptada (fecha estimada) → despachada (transportista y
--      guía) → recibida. El proveedor puede rechazar (con motivo) una orden enviada o
--      aceptada. El admin cancela (con motivo) solo en borrador, enviada o aceptada: una
--      orden despachada ya no se cancela, se recibe (aunque no llegue nada).
--   4. Recepción única que cierra la orden. Por línea: unidades que entran = recibidas ×
--      unidades por presentación; costo unitario = precio ÷ unidades. Costo promedio
--      ponderado en costos_producto, con el último costo como referencia; la primera
--      recepción toma el costo recibido como punto de partida. Lo que no llegó queda como
--      faltante. Si no llegó nada, la orden queda recibida con todo como faltante, sin
--      entradas al kardex ni cambio de costo.
--   5. Telegram al admin cuando la orden pasa a aceptada, rechazada o despachada (no para
--      proveedores de prueba).
--   6. anular_orden_compra_prueba: limpieza de las E2E (solo admin, solo proveedores de
--      prueba). Si la orden se recibió, saca el stock con un ajuste "Limpieza E2E OC-…",
--      restaura el costo anterior y cancela la orden.
--
--   ÚNICA EXCEPCIÓN A "NUNCA HARD-DELETE": si la orden de prueba fue la PRIMERA recepción de
--   un producto, "restaurar el costo anterior" es que el producto vuelva a no tener costo, y
--   anular_orden_compra_prueba borra esa fila de costos_producto. Se acepta porque:
--   · costos_producto es un dato CALCULADO (un resumen del kardex), no un registro de negocio;
--   · el rastro queda completo en el kardex (la entrada con su costo y el ajuste de limpieza);
--   · solo lo hace esta función, solo con órdenes de proveedores de prueba. authenticated
--     sigue SIN delete sobre costos_producto (lo verifica un FRENO al final).
--
--   Quién ve qué:
--   · admin: todo.
--   · distribuidor: sus órdenes desde que se envían (nunca los borradores), sus líneas y su
--     línea de tiempo. Nunca stock, costos ni clientes.
--   · anon: nada.
--
-- QUÉ NO TOCA
--   No cambia los triggers de la 0012 (aml_aviso_stock solo mira cuando el stock baja: la
--   recepción lo sube). No toca pedidos, pagos ni productos fuera del stock que entra.
--
-- CUÁNDO CORRERLA
--   Antes de publicar el código de la fase 6B. Requiere la 0013 y la 0012.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tablas
-- ─────────────────────────────────────────────────────────────────────────────
create sequence if not exists public.ordenes_compra_codigo_seq;

create table if not exists public.ordenes_compra (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default 'OC-' || lpad(nextval('public.ordenes_compra_codigo_seq')::text, 6, '0'),
  distribuidor_id uuid not null references public.distribuidores (id),
  estado text not null default 'borrador'
    check (estado in ('borrador', 'enviada', 'aceptada', 'despachada', 'recibida', 'rechazada', 'cancelada')),
  -- En borrador se calcula con el precio vigente; desde que se envía, con el precio copiado
  total numeric(12,2) not null default 0 check (total >= 0),
  total_recibido numeric(12,2) check (total_recibido is null or total_recibido >= 0),
  fecha_estimada date,
  transportista text check (transportista is null or length(btrim(transportista)) between 2 and 80),
  guia text check (guia is null or length(btrim(guia)) between 1 and 60),
  -- Motivo del rechazo o de la cancelación
  motivo text check (motivo is null or length(btrim(motivo)) between 3 and 300),
  nota_recepcion text check (nota_recepcion is null or length(btrim(nota_recepcion)) <= 300),
  creado_por uuid references public.perfiles (id),
  enviada_en timestamptz,
  aceptada_en timestamptz,
  despachada_en timestamptz,
  recibida_en timestamptz,
  cerrada_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter sequence public.ordenes_compra_codigo_seq owned by public.ordenes_compra.codigo;

-- Un solo borrador por proveedor: "Armar orden" le suma líneas al que ya existe
create unique index if not exists ordenes_compra_un_borrador
  on public.ordenes_compra (distribuidor_id) where estado = 'borrador';

create index if not exists ordenes_compra_distribuidor
  on public.ordenes_compra (distribuidor_id, created_at desc);

create index if not exists ordenes_compra_estado
  on public.ordenes_compra (estado, created_at desc);

create table if not exists public.orden_compra_items (
  id uuid primary key default gen_random_uuid(),
  orden_compra_id uuid not null references public.ordenes_compra (id),
  presentacion_id uuid not null references public.presentaciones_distribuidor (id),
  producto_id uuid not null references public.productos (id),
  -- 0 = línea quitada del borrador (no se envía ni cuenta en el total)
  cantidad integer not null check (cantidad between 0 and 100000),
  -- Copias al enviar
  nombre_presentacion text,
  unidades_por_presentacion integer check (unidades_por_presentacion is null or unidades_por_presentacion >= 1),
  precio_unitario numeric(10,2) check (precio_unitario is null or precio_unitario > 0),
  -- Al recibir
  cantidad_recibida integer check (cantidad_recibida is null or cantidad_recibida >= 0),
  faltante integer check (faltante is null or faltante >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (orden_compra_id, presentacion_id),
  check (cantidad_recibida is null or cantidad_recibida <= cantidad)
);

create index if not exists orden_compra_items_orden on public.orden_compra_items (orden_compra_id);

create table if not exists public.seguimiento_orden_compra (
  id uuid primary key default gen_random_uuid(),
  orden_compra_id uuid not null references public.ordenes_compra (id),
  estado text not null,
  nota text,
  creado_por uuid references public.perfiles (id),
  created_at timestamptz not null default now()
);

create index if not exists seguimiento_orden_compra_idx
  on public.seguimiento_orden_compra (orden_compra_id, created_at);

drop trigger if exists ordenes_compra_updated_at on public.ordenes_compra;
create trigger ordenes_compra_updated_at
  before update on public.ordenes_compra
  for each row execute function public.update_updated_at();

drop trigger if exists orden_compra_items_updated_at on public.orden_compra_items;
create trigger orden_compra_items_updated_at
  before update on public.orden_compra_items
  for each row execute function public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Kardex: costo y orden de compra (opcionales)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.movimientos_inventario
  add column if not exists costo_unitario numeric(12,4) check (costo_unitario is null or costo_unitario >= 0),
  add column if not exists orden_compra_id uuid references public.ordenes_compra (id),
  -- Costo promedio del producto ANTES de esta entrada (null = no tenía costo)
  add column if not exists costo_promedio_anterior numeric(12,4) check (costo_promedio_anterior is null or costo_promedio_anterior >= 0);

create index if not exists movimientos_orden_compra_idx
  on public.movimientos_inventario (orden_compra_id) where orden_compra_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.ordenes_compra enable row level security;
alter table public.orden_compra_items enable row level security;
alter table public.seguimiento_orden_compra enable row level security;

-- Solo lectura desde fuera: toda escritura pasa por las funciones
revoke all on table public.ordenes_compra from anon, authenticated;
revoke all on table public.orden_compra_items from anon, authenticated;
revoke all on table public.seguimiento_orden_compra from anon, authenticated;
revoke all on sequence public.ordenes_compra_codigo_seq from anon, authenticated;
grant select on table public.ordenes_compra to authenticated;
grant select on table public.orden_compra_items to authenticated;
grant select on table public.seguimiento_orden_compra to authenticated;

drop policy if exists ordenes_compra_select_admin on public.ordenes_compra;
drop policy if exists ordenes_compra_select_propias on public.ordenes_compra;
create policy ordenes_compra_select_admin on public.ordenes_compra
  for select to authenticated
  using ((select public.es_admin()));
-- El proveedor ve sus órdenes desde que se envían; los borradores son de la tienda
create policy ordenes_compra_select_propias on public.ordenes_compra
  for select to authenticated
  using (distribuidor_id = (select public.aml_mi_distribuidor()) and estado <> 'borrador');

drop policy if exists orden_compra_items_select_admin on public.orden_compra_items;
drop policy if exists orden_compra_items_select_propias on public.orden_compra_items;
create policy orden_compra_items_select_admin on public.orden_compra_items
  for select to authenticated
  using ((select public.es_admin()));
create policy orden_compra_items_select_propias on public.orden_compra_items
  for select to authenticated
  using (exists (
    select 1 from public.ordenes_compra o
    where o.id = orden_compra_items.orden_compra_id
      and o.distribuidor_id = (select public.aml_mi_distribuidor())
      and o.estado <> 'borrador'
  ));

drop policy if exists seguimiento_oc_select_admin on public.seguimiento_orden_compra;
drop policy if exists seguimiento_oc_select_propio on public.seguimiento_orden_compra;
create policy seguimiento_oc_select_admin on public.seguimiento_orden_compra
  for select to authenticated
  using ((select public.es_admin()));
create policy seguimiento_oc_select_propio on public.seguimiento_orden_compra
  for select to authenticated
  using (
    seguimiento_orden_compra.estado <> 'borrador'
    and exists (
      select 1 from public.ordenes_compra o
      where o.id = seguimiento_orden_compra.orden_compra_id
        and o.distribuidor_id = (select public.aml_mi_distribuidor())
        and o.estado <> 'borrador'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Auxiliares internas
-- ─────────────────────────────────────────────────────────────────────────────
-- "1 litro", "60 litros", "50 unidades", "3 sacos 50kg" (se pluraliza la primera palabra)
create or replace function public.aml_plural_unidad(p_cantidad integer, p_unidad text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_unidad text := coalesce(nullif(btrim(p_unidad), ''), 'unidad');
  v_palabra text := split_part(v_unidad, ' ', 1);
  v_resto text := substr(v_unidad, length(v_palabra) + 1);
begin
  if p_cantidad = 1 then
    return p_cantidad || ' ' || v_unidad;
  end if;

  if v_palabra ~* '[aeiouáéíóú]$' then
    v_palabra := v_palabra || 's';
  elsif v_palabra ~* 'z$' then
    v_palabra := left(v_palabra, -1) || 'ces';
  else
    v_palabra := v_palabra || 'es';
  end if;

  return p_cantidad || ' ' || v_palabra || v_resto;
end;
$$;

-- Promedio ponderado: (stock × promedio + entran × costo) ÷ (stock + entran).
-- Sin costo anterior (o sin stock) arranca con el costo recibido.
create or replace function public.aml_costo_promedio(
  p_stock integer, p_promedio numeric, p_unidades integer, p_costo numeric
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select round(
    case
      when p_promedio is null or coalesce(p_stock, 0) <= 0 then p_costo
      else (p_stock * p_promedio + p_unidades * p_costo) / (p_stock + p_unidades)
    end, 4);
$$;

-- Total de la orden: en borrador con el precio vigente, después con el precio copiado
create or replace function public.aml_recalcular_total_oc(p_orden_id uuid)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total numeric(12,2);
begin
  select coalesce(sum(i.cantidad * coalesce(i.precio_unitario, pd.precio_mayorista)), 0)
  into v_total
  from public.orden_compra_items i
  join public.presentaciones_distribuidor pd on pd.id = i.presentacion_id
  where i.orden_compra_id = p_orden_id and i.cantidad > 0;

  update public.ordenes_compra o set total = v_total where o.id = p_orden_id;
  return v_total;
end;
$$;

-- Hoy en Bolivia (las fechas de calendario no se cortan en UTC)
create or replace function public.aml_hoy_bolivia()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/La_Paz')::date;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Admin: armar, editar el borrador, enviar, cancelar
-- ─────────────────────────────────────────────────────────────────────────────
-- p_lineas: [{ "presentacion_id": uuid, "cantidad": int }]. Junta por proveedor en su
-- borrador (lo crea si no hay). Si la presentación ya estaba, queda la cantidad nueva.
create or replace function public.crear_ordenes_compra(p_lineas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_linea record;
  v_orden uuid;
  v_ordenes uuid[] := '{}';
begin
  if p_lineas is null or jsonb_typeof(p_lineas) <> 'array' or jsonb_array_length(p_lineas) = 0 then
    raise exception 'Elige al menos un producto para la orden.' using errcode = 'AML02';
  end if;

  if jsonb_array_length(p_lineas) > 200 then
    raise exception 'Son demasiadas líneas para una sola vez.' using errcode = 'AML02';
  end if;

  for v_linea in
    select x.presentacion_id, x.cantidad, pd.distribuidor_id, pd.producto_id, pd.nombre,
           pd.activo, pd.disponible, d.activo as dist_activo
    from jsonb_to_recordset(p_lineas) as x(presentacion_id uuid, cantidad integer)
    left join public.presentaciones_distribuidor pd on pd.id = x.presentacion_id
    left join public.distribuidores d on d.id = pd.distribuidor_id
    order by pd.distribuidor_id, x.presentacion_id
  loop
    if v_linea.distribuidor_id is null then
      raise exception 'Una de las presentaciones no existe.' using errcode = 'AML04';
    end if;
    if not v_linea.activo or not v_linea.disponible or not v_linea.dist_activo then
      raise exception 'La presentación "%" ya no está disponible.', v_linea.nombre using errcode = 'AML02';
    end if;
    if v_linea.cantidad is null or v_linea.cantidad < 1 or v_linea.cantidad > 100000 then
      raise exception 'La cantidad de "%" no es válida.', v_linea.nombre using errcode = 'AML02';
    end if;

    select o.id into v_orden
    from public.ordenes_compra o
    where o.distribuidor_id = v_linea.distribuidor_id and o.estado = 'borrador'
    for update;

    if not found then
      insert into public.ordenes_compra (distribuidor_id, creado_por)
      values (v_linea.distribuidor_id, v_admin)
      returning id into v_orden;

      insert into public.seguimiento_orden_compra (orden_compra_id, estado, nota, creado_por)
      values (v_orden, 'borrador', 'Orden armada', v_admin);
    end if;

    insert into public.orden_compra_items (orden_compra_id, presentacion_id, producto_id, cantidad)
    values (v_orden, v_linea.presentacion_id, v_linea.producto_id, v_linea.cantidad)
    on conflict (orden_compra_id, presentacion_id) do update set cantidad = excluded.cantidad;

    if not v_orden = any (v_ordenes) then
      v_ordenes := v_ordenes || v_orden;
    end if;
  end loop;

  perform public.aml_recalcular_total_oc(o) from unnest(v_ordenes) as o;

  return (
    select jsonb_agg(jsonb_build_object('id', o.id, 'codigo', o.codigo, 'distribuidor_id', o.distribuidor_id) order by o.codigo)
    from public.ordenes_compra o where o.id = any (v_ordenes)
  );
end;
$$;

-- Cambia (o agrega) una línea del borrador. Cantidad 0 = quitarla.
create or replace function public.guardar_linea_orden_compra(
  p_orden_id uuid, p_presentacion_id uuid, p_cantidad integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_orden record;
  v_pres record;
  v_total numeric;
begin
  select o.id, o.estado, o.distribuidor_id into v_orden
  from public.ordenes_compra o where o.id = p_orden_id for update;

  if not found then
    raise exception 'La orden no existe.' using errcode = 'AML04';
  end if;
  if v_orden.estado <> 'borrador' then
    raise exception 'Solo se cambian las líneas de un borrador.' using errcode = 'AML05';
  end if;
  if p_cantidad is null or p_cantidad < 0 or p_cantidad > 100000 then
    raise exception 'La cantidad no es válida.' using errcode = 'AML02';
  end if;

  select pd.id, pd.producto_id, pd.distribuidor_id, pd.nombre, pd.activo, pd.disponible into v_pres
  from public.presentaciones_distribuidor pd where pd.id = p_presentacion_id;

  if not found or v_pres.distribuidor_id <> v_orden.distribuidor_id then
    raise exception 'Esa presentación no es de este proveedor.' using errcode = 'AML02';
  end if;
  if p_cantidad > 0 and (not v_pres.activo or not v_pres.disponible) then
    raise exception 'La presentación "%" ya no está disponible.', v_pres.nombre using errcode = 'AML02';
  end if;

  insert into public.orden_compra_items (orden_compra_id, presentacion_id, producto_id, cantidad)
  values (p_orden_id, p_presentacion_id, v_pres.producto_id, p_cantidad)
  on conflict (orden_compra_id, presentacion_id) do update set cantidad = excluded.cantidad;

  v_total := public.aml_recalcular_total_oc(p_orden_id);
  return jsonb_build_object('id', p_orden_id, 'total', v_total);
end;
$$;

create or replace function public.enviar_orden_compra(p_orden_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_orden record;
  v_mala text;
  v_total numeric;
begin
  select o.id, o.estado, o.distribuidor_id, d.activo as dist_activo into v_orden
  from public.ordenes_compra o
  join public.distribuidores d on d.id = o.distribuidor_id
  where o.id = p_orden_id for update of o;

  if not found then
    raise exception 'La orden no existe.' using errcode = 'AML04';
  end if;
  if v_orden.estado <> 'borrador' then
    raise exception 'Esta orden ya se envió.' using errcode = 'AML05';
  end if;
  if not v_orden.dist_activo then
    raise exception 'El proveedor está desactivado.' using errcode = 'AML02';
  end if;
  if not exists (select 1 from public.orden_compra_items i where i.orden_compra_id = p_orden_id and i.cantidad > 0) then
    raise exception 'La orden no tiene productos.' using errcode = 'AML02';
  end if;

  select pd.nombre || ' (' || pr.nombre || ')' into v_mala
  from public.orden_compra_items i
  join public.presentaciones_distribuidor pd on pd.id = i.presentacion_id
  join public.productos pr on pr.id = i.producto_id
  where i.orden_compra_id = p_orden_id and i.cantidad > 0 and (not pd.activo or not pd.disponible)
  limit 1;

  if v_mala is not null then
    raise exception 'La presentación "%" ya no está disponible: quítala de la orden.', v_mala using errcode = 'AML02';
  end if;

  -- Se copia lo que se pidió: si el proveedor cambia su precio después, la orden no cambia
  update public.orden_compra_items i
  set nombre_presentacion = pd.nombre,
      unidades_por_presentacion = pd.unidades_por_presentacion,
      precio_unitario = pd.precio_mayorista
  from public.presentaciones_distribuidor pd
  where pd.id = i.presentacion_id and i.orden_compra_id = p_orden_id and i.cantidad > 0;

  v_total := public.aml_recalcular_total_oc(p_orden_id);

  update public.ordenes_compra o set estado = 'enviada', enviada_en = now() where o.id = p_orden_id;

  insert into public.seguimiento_orden_compra (orden_compra_id, estado, nota, creado_por)
  values (p_orden_id, 'enviada', 'Orden enviada al proveedor', v_admin);

  return jsonb_build_object('id', p_orden_id, 'estado', 'enviada', 'total', v_total);
end;
$$;

-- Solo en borrador, enviada o aceptada. Una orden despachada ya está en camino: se recibe.
create or replace function public.cancelar_orden_compra(p_orden_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_motivo text := nullif(btrim(p_motivo), '');
  v_estado text;
begin
  if v_motivo is null or length(v_motivo) < 3 or length(v_motivo) > 300 then
    raise exception 'Escribe el motivo de la cancelación (3 a 300 caracteres).' using errcode = 'AML02';
  end if;

  select o.estado into v_estado from public.ordenes_compra o where o.id = p_orden_id for update;

  if not found then
    raise exception 'La orden no existe.' using errcode = 'AML04';
  end if;
  if v_estado not in ('borrador', 'enviada', 'aceptada') then
    raise exception 'Una orden % no se puede cancelar.', v_estado using errcode = 'AML05';
  end if;

  update public.ordenes_compra o
  set estado = 'cancelada', motivo = v_motivo, cerrada_en = now()
  where o.id = p_orden_id;

  insert into public.seguimiento_orden_compra (orden_compra_id, estado, nota, creado_por)
  values (p_orden_id, 'cancelada', v_motivo, v_admin);

  return jsonb_build_object('id', p_orden_id, 'estado', 'cancelada');
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Proveedor: aceptar, rechazar, despachar (solo sus órdenes)
-- ─────────────────────────────────────────────────────────────────────────────
-- Una orden de otro proveedor (o un borrador) no existe para él: 404, no 403
create or replace function public.aml_orden_del_distribuidor(p_orden_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dist uuid;
  v_estado text;
begin
  perform public.aml_usuario_activo();
  v_dist := public.aml_mi_distribuidor();

  if v_dist is null then
    raise exception 'No tienes permiso para esta acción.' using errcode = 'AML03';
  end if;

  select o.estado into v_estado
  from public.ordenes_compra o
  where o.id = p_orden_id and o.distribuidor_id = v_dist and o.estado <> 'borrador'
  for update;

  if not found then
    raise exception 'La orden no existe.' using errcode = 'AML04';
  end if;

  return v_estado;
end;
$$;

create or replace function public.aceptar_orden_compra(p_orden_id uuid, p_fecha_estimada date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text := public.aml_orden_del_distribuidor(p_orden_id);
begin
  if v_estado <> 'enviada' then
    raise exception 'Esta orden ya está %.', v_estado using errcode = 'AML05';
  end if;
  if p_fecha_estimada is null or p_fecha_estimada < public.aml_hoy_bolivia()
     or p_fecha_estimada > public.aml_hoy_bolivia() + 180 then
    raise exception 'Elige una fecha de entrega desde hoy y dentro de 6 meses.' using errcode = 'AML02';
  end if;

  update public.ordenes_compra o
  set estado = 'aceptada', fecha_estimada = p_fecha_estimada, aceptada_en = now()
  where o.id = p_orden_id;

  insert into public.seguimiento_orden_compra (orden_compra_id, estado, nota, creado_por)
  values (p_orden_id, 'aceptada', 'Entrega estimada: ' || to_char(p_fecha_estimada, 'DD/MM/YYYY'), (select auth.uid()));

  return jsonb_build_object('id', p_orden_id, 'estado', 'aceptada');
end;
$$;

-- Se puede rechazar una orden enviada o ya aceptada (si después no tiene cómo cumplir)
create or replace function public.rechazar_orden_compra(p_orden_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text := public.aml_orden_del_distribuidor(p_orden_id);
  v_motivo text := nullif(btrim(p_motivo), '');
begin
  if v_estado not in ('enviada', 'aceptada') then
    raise exception 'Esta orden ya está %.', v_estado using errcode = 'AML05';
  end if;
  if v_motivo is null or length(v_motivo) < 3 or length(v_motivo) > 300 then
    raise exception 'Escribe el motivo del rechazo (3 a 300 caracteres).' using errcode = 'AML02';
  end if;

  update public.ordenes_compra o
  set estado = 'rechazada', motivo = v_motivo, cerrada_en = now()
  where o.id = p_orden_id;

  insert into public.seguimiento_orden_compra (orden_compra_id, estado, nota, creado_por)
  values (p_orden_id, 'rechazada', v_motivo, (select auth.uid()));

  return jsonb_build_object('id', p_orden_id, 'estado', 'rechazada');
end;
$$;

create or replace function public.despachar_orden_compra(p_orden_id uuid, p_transportista text, p_guia text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text := public.aml_orden_del_distribuidor(p_orden_id);
  v_transportista text := nullif(btrim(p_transportista), '');
  v_guia text := nullif(btrim(p_guia), '');
begin
  if v_estado <> 'aceptada' then
    raise exception 'Primero acepta la orden.' using errcode = 'AML05';
  end if;
  if v_transportista is null or length(v_transportista) < 2 or length(v_transportista) > 80 then
    raise exception 'Escribe el transportista (2 a 80 caracteres).' using errcode = 'AML02';
  end if;
  if v_guia is null or length(v_guia) > 60 then
    raise exception 'Escribe el número de guía (hasta 60 caracteres).' using errcode = 'AML02';
  end if;

  update public.ordenes_compra o
  set estado = 'despachada', transportista = v_transportista, guia = v_guia, despachada_en = now()
  where o.id = p_orden_id;

  insert into public.seguimiento_orden_compra (orden_compra_id, estado, nota, creado_por)
  values (p_orden_id, 'despachada', v_transportista || ' · guía ' || v_guia, (select auth.uid()));

  return jsonb_build_object('id', p_orden_id, 'estado', 'despachada');
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Admin: recepción
-- ─────────────────────────────────────────────────────────────────────────────
-- p_lineas: [{ "item_id": uuid, "cantidad_recibida": int }], una por cada línea de la orden.
-- Todas en 0 = no llegó nada: la orden queda recibida con todo como faltante.
create or replace function public.recibir_orden_compra(p_orden_id uuid, p_lineas jsonb, p_nota text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_orden record;
  v_nota text := nullif(btrim(p_nota), '');
  v_item record;
  v_producto record;
  v_promedio_anterior numeric(12,4);
  v_unidades integer;
  v_costo numeric(12,4);
  v_promedio numeric(12,4);
  v_total_recibido numeric(12,2) := 0;
  v_lineas_faltante integer := 0;
  v_llego integer := 0;
  v_nota_seguimiento text;
begin
  select o.id, o.codigo, o.estado into v_orden
  from public.ordenes_compra o where o.id = p_orden_id for update;

  if not found then
    raise exception 'La orden no existe.' using errcode = 'AML04';
  end if;
  if v_orden.estado <> 'despachada' then
    raise exception 'Solo se recibe una orden despachada.' using errcode = 'AML05';
  end if;
  if v_nota is not null and length(v_nota) > 300 then
    raise exception 'La nota de recepción es muy larga (máximo 300 caracteres).' using errcode = 'AML02';
  end if;
  if p_lineas is null or jsonb_typeof(p_lineas) <> 'array' then
    raise exception 'Indica lo que llegó de cada línea.' using errcode = 'AML02';
  end if;

  -- Una cantidad por cada línea de la orden, ni más ni menos
  if exists (
    select 1 from public.orden_compra_items i
    where i.orden_compra_id = p_orden_id and i.cantidad > 0
      and (select count(*) from jsonb_to_recordset(p_lineas) as x(item_id uuid, cantidad_recibida integer)
           where x.item_id = i.id) <> 1
  ) or exists (
    select 1 from jsonb_to_recordset(p_lineas) as x(item_id uuid, cantidad_recibida integer)
    where not exists (
      select 1 from public.orden_compra_items i
      where i.id = x.item_id and i.orden_compra_id = p_orden_id and i.cantidad > 0
    )
  ) then
    raise exception 'Indica lo que llegó de cada línea de la orden.' using errcode = 'AML02';
  end if;

  for v_item in
    select i.id, i.producto_id, i.cantidad, i.nombre_presentacion, i.unidades_por_presentacion,
           i.precio_unitario, x.cantidad_recibida
    from public.orden_compra_items i
    join jsonb_to_recordset(p_lineas) as x(item_id uuid, cantidad_recibida integer) on x.item_id = i.id
    where i.orden_compra_id = p_orden_id and i.cantidad > 0
    order by i.producto_id, i.id
  loop
    if v_item.cantidad_recibida is null or v_item.cantidad_recibida < 0 or v_item.cantidad_recibida > v_item.cantidad then
      raise exception 'Lo recibido de "%" va de 0 a %.', v_item.nombre_presentacion, v_item.cantidad using errcode = 'AML02';
    end if;

    update public.orden_compra_items i
    set cantidad_recibida = v_item.cantidad_recibida, faltante = v_item.cantidad - v_item.cantidad_recibida
    where i.id = v_item.id;

    if v_item.cantidad_recibida < v_item.cantidad then
      v_lineas_faltante := v_lineas_faltante + 1;
    end if;

    continue when v_item.cantidad_recibida = 0;

    v_llego := v_llego + 1;
    v_unidades := v_item.cantidad_recibida * v_item.unidades_por_presentacion;
    v_costo := round(v_item.precio_unitario / v_item.unidades_por_presentacion, 4);
    v_total_recibido := v_total_recibido + v_item.cantidad_recibida * v_item.precio_unitario;

    select p.id, p.stock, p.unidad into v_producto
    from public.productos p where p.id = v_item.producto_id for update;

    -- null si el producto todavía no tiene costo
    v_promedio_anterior := null;
    select c.costo_promedio into v_promedio_anterior
    from public.costos_producto c where c.producto_id = v_item.producto_id for update;

    v_promedio := public.aml_costo_promedio(v_producto.stock, v_promedio_anterior, v_unidades, v_costo);

    update public.productos p set stock = v_producto.stock + v_unidades where p.id = v_item.producto_id;

    -- clock_timestamp: dos líneas del mismo producto quedan ordenadas en el kardex
    insert into public.movimientos_inventario (
      producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id,
      costo_unitario, orden_compra_id, costo_promedio_anterior, created_at
    )
    values (
      v_item.producto_id, 'entrada', v_unidades, v_producto.stock, v_producto.stock + v_unidades,
      'Compra ' || v_orden.codigo || ': ' || v_item.cantidad_recibida || ' ' || v_item.nombre_presentacion ||
        ' = ' || public.aml_plural_unidad(v_unidades, v_producto.unidad),
      v_admin, v_costo, p_orden_id, v_promedio_anterior, clock_timestamp()
    );

    insert into public.costos_producto (producto_id, costo_promedio, costo_ultimo, actualizado_en)
    values (v_item.producto_id, v_promedio, v_costo, now())
    on conflict (producto_id) do update
      set costo_promedio = excluded.costo_promedio, costo_ultimo = excluded.costo_ultimo, actualizado_en = now();
  end loop;

  v_nota_seguimiento := case
    when v_llego = 0 then 'No llegó nada: todo quedó como faltante'
    when v_lineas_faltante = 0 then 'Recibida completa'
    else 'Recibida con faltante en ' || v_lineas_faltante || ' línea' || case when v_lineas_faltante = 1 then '' else 's' end
  end || coalesce('. ' || v_nota, '');

  update public.ordenes_compra o
  set estado = 'recibida', recibida_en = now(), cerrada_en = now(),
      total_recibido = v_total_recibido, nota_recepcion = v_nota
  where o.id = p_orden_id;

  insert into public.seguimiento_orden_compra (orden_compra_id, estado, nota, creado_por)
  values (p_orden_id, 'recibida', v_nota_seguimiento, v_admin);

  return jsonb_build_object(
    'id', p_orden_id, 'estado', 'recibida', 'total_recibido', v_total_recibido,
    'lineas_con_faltante', v_lineas_faltante, 'lineas_recibidas', v_llego
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Limpieza de las E2E
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.anular_orden_compra_prueba(p_orden_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_orden record;
  v_prod record;
  v_primera record;
  v_stock integer;
  v_ultimo numeric(12,4);
begin
  select o.id, o.codigo, o.estado, d.usuario_id into v_orden
  from public.ordenes_compra o
  join public.distribuidores d on d.id = o.distribuidor_id
  where o.id = p_orden_id
  for update of o;

  if not found then
    raise exception 'La orden no existe.' using errcode = 'AML04';
  end if;

  if not public.aml_es_cuenta_prueba(v_orden.usuario_id) then
    raise exception 'Solo se pueden anular órdenes de proveedores de prueba (@amlagrotech.test).' using errcode = 'AML03';
  end if;

  if v_orden.estado in ('cancelada', 'rechazada') then
    return jsonb_build_object('id', p_orden_id, 'estado', v_orden.estado, 'ya_estaba_cerrada', true);
  end if;

  if v_orden.estado = 'recibida' then
    for v_prod in
      select m.producto_id, sum(m.cantidad)::integer as unidades
      from public.movimientos_inventario m
      where m.orden_compra_id = p_orden_id and m.tipo = 'entrada'
      group by m.producto_id
      order by m.producto_id
    loop
      -- La primera entrada de esta orden para el producto guarda el costo de antes
      select m.created_at, m.costo_promedio_anterior into v_primera
      from public.movimientos_inventario m
      where m.orden_compra_id = p_orden_id and m.tipo = 'entrada' and m.producto_id = v_prod.producto_id
      order by m.created_at, m.id
      limit 1;

      -- Si después entró otra compra con costo, volver atrás pisaría un costo real
      if exists (
        select 1 from public.movimientos_inventario m
        where m.producto_id = v_prod.producto_id
          and m.costo_unitario is not null
          and m.orden_compra_id is distinct from p_orden_id
          and m.created_at > v_primera.created_at
          and not exists (
            select 1 from public.ordenes_compra x where x.id = m.orden_compra_id and x.estado = 'cancelada'
          )
      ) then
        raise exception 'No se puede anular %: después entró otra compra del mismo producto.', v_orden.codigo
          using errcode = 'AML05';
      end if;

      select p.stock into v_stock from public.productos p where p.id = v_prod.producto_id for update;

      if v_stock < v_prod.unidades then
        raise exception 'No se puede anular %: ya se vendió parte de lo recibido.', v_orden.codigo
          using errcode = 'AML05';
      end if;

      update public.productos p set stock = v_stock - v_prod.unidades where p.id = v_prod.producto_id;

      insert into public.movimientos_inventario (
        producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id, orden_compra_id
      )
      values (
        v_prod.producto_id, 'ajuste', v_prod.unidades, v_stock, v_stock - v_prod.unidades,
        'Limpieza E2E ' || v_orden.codigo, v_admin, p_orden_id
      );

      if v_primera.costo_promedio_anterior is null then
        -- ÚNICA EXCEPCIÓN a "nunca hard-delete" (ver el encabezado): era la primera
        -- recepción del producto, así que vuelve a no tener costo. Dato calculado; el
        -- rastro queda en el kardex.
        delete from public.costos_producto c where c.producto_id = v_prod.producto_id;
      else
        -- El último costo de antes: la compra anterior que no se anuló
        select m.costo_unitario into v_ultimo
        from public.movimientos_inventario m
        where m.producto_id = v_prod.producto_id
          and m.costo_unitario is not null
          and m.created_at < v_primera.created_at
          and not exists (
            select 1 from public.ordenes_compra x where x.id = m.orden_compra_id and x.estado = 'cancelada'
          )
        order by m.created_at desc, m.id desc
        limit 1;

        update public.costos_producto c
        set costo_promedio = v_primera.costo_promedio_anterior,
            costo_ultimo = coalesce(v_ultimo, v_primera.costo_promedio_anterior),
            actualizado_en = now()
        where c.producto_id = v_prod.producto_id;
      end if;
    end loop;
  end if;

  update public.ordenes_compra o
  set estado = 'cancelada', motivo = 'Anulada: orden de prueba automática (E2E)', cerrada_en = now()
  where o.id = p_orden_id;

  insert into public.seguimiento_orden_compra (orden_compra_id, estado, nota, creado_por)
  values (p_orden_id, 'cancelada', 'Anulada: orden de prueba automática (E2E)', v_admin);

  return jsonb_build_object('id', p_orden_id, 'estado', 'cancelada', 'estaba', v_orden.estado);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Aviso por Telegram al admin
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.aml_trg_aviso_orden_compra()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  v_titulo text;
  v_detalle text;
begin
  select d.nombre_comercial, d.usuario_id into v
  from public.distribuidores d where d.id = new.distribuidor_id;

  if not found or public.aml_es_cuenta_prueba(v.usuario_id) then
    return null;
  end if;

  if new.estado = 'aceptada' then
    v_titulo := '✅ Orden aceptada ';
    v_detalle := 'Entrega estimada: ' || coalesce(to_char(new.fecha_estimada, 'DD/MM/YYYY'), '-');
  elsif new.estado = 'rechazada' then
    v_titulo := '❌ Orden rechazada ';
    v_detalle := 'Motivo: ' || coalesce(new.motivo, '-');
  elsif new.estado = 'despachada' then
    v_titulo := '🚚 Orden despachada ';
    v_detalle := 'Transportista: ' || coalesce(new.transportista, '-') || E'\n' || 'Guía: ' || coalesce(new.guia, '-');
  else
    return null;
  end if;

  perform public.aml_enviar_telegram(
    v_titulo || new.codigo || E'\n' ||
    'Proveedor: ' || v.nombre_comercial || E'\n' ||
    v_detalle || E'\n' ||
    'Total: ' || public.aml_formato_bs(new.total) || E'\n' ||
    public.aml_hora_bolivia(now()) || E'\n' ||
    public.aml_url_sitio() || '/admin/abastecimiento/ordenes/' || new.id
  );
  return null;
exception when others then
  raise warning 'Aviso de orden de compra omitido (SQLSTATE %)', sqlstate;
  return null;
end;
$$;

drop trigger if exists aml_aviso_orden_compra on public.ordenes_compra;
create trigger aml_aviso_orden_compra
  after update of estado on public.ordenes_compra
  for each row
  when (new.estado in ('aceptada', 'rechazada', 'despachada') and old.estado is distinct from new.estado)
  execute function public.aml_trg_aviso_orden_compra();

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Permisos de las funciones
-- ─────────────────────────────────────────────────────────────────────────────
-- Internas: nadie desde fuera
revoke execute on function public.aml_plural_unidad(integer, text) from public, anon, authenticated;
revoke execute on function public.aml_costo_promedio(integer, numeric, integer, numeric) from public, anon, authenticated;
revoke execute on function public.aml_recalcular_total_oc(uuid) from public, anon, authenticated;
revoke execute on function public.aml_hoy_bolivia() from public, anon, authenticated;
revoke execute on function public.aml_orden_del_distribuidor(uuid) from public, anon, authenticated;
revoke execute on function public.aml_trg_aviso_orden_compra() from public, anon, authenticated;

-- Las llama la API con la sesión del usuario; el rol y el estado se validan adentro
revoke execute on function public.crear_ordenes_compra(jsonb) from public, anon;
revoke execute on function public.guardar_linea_orden_compra(uuid, uuid, integer) from public, anon;
revoke execute on function public.enviar_orden_compra(uuid) from public, anon;
revoke execute on function public.cancelar_orden_compra(uuid, text) from public, anon;
revoke execute on function public.aceptar_orden_compra(uuid, date) from public, anon;
revoke execute on function public.rechazar_orden_compra(uuid, text) from public, anon;
revoke execute on function public.despachar_orden_compra(uuid, text, text) from public, anon;
revoke execute on function public.recibir_orden_compra(uuid, jsonb, text) from public, anon;
revoke execute on function public.anular_orden_compra_prueba(uuid) from public, anon;
grant execute on function public.crear_ordenes_compra(jsonb) to authenticated;
grant execute on function public.guardar_linea_orden_compra(uuid, uuid, integer) to authenticated;
grant execute on function public.enviar_orden_compra(uuid) to authenticated;
grant execute on function public.cancelar_orden_compra(uuid, text) to authenticated;
grant execute on function public.aceptar_orden_compra(uuid, date) to authenticated;
grant execute on function public.rechazar_orden_compra(uuid, text) to authenticated;
grant execute on function public.despachar_orden_compra(uuid, text, text) to authenticated;
grant execute on function public.recibir_orden_compra(uuid, jsonb, text) to authenticated;
grant execute on function public.anular_orden_compra_prueba(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. Verificaciones
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_tabla text;
  v_funcion text;
  v_columna text;
begin
  foreach v_tabla in array array['ordenes_compra', 'orden_compra_items', 'seguimiento_orden_compra'] loop
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = v_tabla and c.relrowsecurity
    ) then
      raise exception 'FRENO: % no tiene RLS.', v_tabla;
    end if;
    if has_table_privilege('anon', 'public.' || v_tabla, 'select') then
      raise exception 'FRENO: anon puede leer %.', v_tabla;
    end if;
    if has_table_privilege('authenticated', 'public.' || v_tabla, 'insert')
       or has_table_privilege('authenticated', 'public.' || v_tabla, 'update')
       or has_table_privilege('authenticated', 'public.' || v_tabla, 'delete') then
      raise exception 'FRENO: % se puede escribir o borrar desde la API.', v_tabla;
    end if;
  end loop;

  if (select count(*) from pg_policies where schemaname = 'public'
      and tablename in ('ordenes_compra', 'orden_compra_items', 'seguimiento_orden_compra')) <> 6 then
    raise exception 'FRENO: las políticas no son las 6 esperadas.';
  end if;

  if exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename in ('ordenes_compra', 'orden_compra_items', 'seguimiento_orden_compra')
      and (roles @> array['anon']::name[] or roles @> array['public']::name[] or cmd <> 'SELECT')
  ) then
    raise exception 'FRENO: hay una política abierta a anon/public o que no es de lectura.';
  end if;

  -- El proveedor nunca ve borradores
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ordenes_compra'
      and policyname = 'ordenes_compra_select_propias' and qual like '%borrador%'
  ) then
    raise exception 'FRENO: la política del proveedor no excluye los borradores.';
  end if;

  -- La única excepción a "nunca hard-delete" vive solo en anular_orden_compra_prueba
  if has_table_privilege('authenticated', 'public.costos_producto', 'delete')
     or has_table_privilege('anon', 'public.costos_producto', 'delete') then
    raise exception 'FRENO: costos_producto se puede borrar desde la API.';
  end if;
  if has_table_privilege('authenticated', 'public.costos_producto', 'insert')
     or has_table_privilege('authenticated', 'public.costos_producto', 'update') then
    raise exception 'FRENO: costos_producto se puede escribir desde la API.';
  end if;

  -- Kardex: columnas nuevas opcionales (las funciones viejas no las mandan)
  foreach v_columna in array array['costo_unitario', 'orden_compra_id', 'costo_promedio_anterior'] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'movimientos_inventario'
        and column_name = v_columna and is_nullable = 'YES'
    ) then
      raise exception 'FRENO: falta la columna opcional movimientos_inventario.%.', v_columna;
    end if;
  end loop;

  -- Los triggers de la 0003 y la 0012 siguen en su lugar
  if not exists (
    select 1 from pg_trigger
    where tgname = 'aml_aviso_stock' and tgrelid = 'public.movimientos_inventario'::regclass and tgenabled <> 'D'
  ) then
    raise exception 'FRENO: falta o está apagado el trigger aml_aviso_stock (0012).';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgname = 'proteger_stock_producto' and tgrelid = 'public.productos'::regclass and tgenabled <> 'D'
  ) then
    raise exception 'FRENO: falta o está apagado el trigger proteger_stock_producto (0003).';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgname = 'aml_aviso_orden_compra' and tgrelid = 'public.ordenes_compra'::regclass
  ) then
    raise exception 'FRENO: falta el trigger aml_aviso_orden_compra.';
  end if;

  foreach v_funcion in array array[
    'public.crear_ordenes_compra(jsonb)', 'public.guardar_linea_orden_compra(uuid,uuid,integer)',
    'public.enviar_orden_compra(uuid)', 'public.cancelar_orden_compra(uuid,text)',
    'public.aceptar_orden_compra(uuid,date)', 'public.rechazar_orden_compra(uuid,text)',
    'public.despachar_orden_compra(uuid,text,text)', 'public.recibir_orden_compra(uuid,jsonb,text)',
    'public.anular_orden_compra_prueba(uuid)', 'public.aml_recalcular_total_oc(uuid)',
    'public.aml_orden_del_distribuidor(uuid)', 'public.aml_trg_aviso_orden_compra()'
  ] loop
    if not exists (
      select 1 from pg_proc where oid = v_funcion::regprocedure and prosecdef
        and proconfig @> array['search_path=""']
    ) then
      raise exception 'FRENO: % no es security definer con search_path vacío.', v_funcion;
    end if;
    if has_function_privilege('anon', v_funcion, 'execute')
       or has_function_privilege('public', v_funcion, 'execute') then
      raise exception 'FRENO: anon o public pueden ejecutar %.', v_funcion;
    end if;
  end loop;

  foreach v_funcion in array array[
    'public.aml_plural_unidad(integer,text)', 'public.aml_costo_promedio(integer,numeric,integer,numeric)',
    'public.aml_recalcular_total_oc(uuid)', 'public.aml_hoy_bolivia()',
    'public.aml_orden_del_distribuidor(uuid)', 'public.aml_trg_aviso_orden_compra()'
  ] loop
    if has_function_privilege('authenticated', v_funcion, 'execute') then
      raise exception 'FRENO: la función interna % se puede llamar desde el navegador.', v_funcion;
    end if;
  end loop;

  -- Plural de la unidad de venta
  if public.aml_plural_unidad(1, 'litro') <> '1 litro'
     or public.aml_plural_unidad(60, 'litro') <> '60 litros'
     or public.aml_plural_unidad(50, 'unidad') <> '50 unidades'
     or public.aml_plural_unidad(3, 'saco 50kg') <> '3 sacos 50kg'
     or public.aml_plural_unidad(2, 'rollo 1000m') <> '2 rollos 1000m' then
    raise exception 'FRENO: aml_plural_unidad no pluraliza bien.';
  end if;

  -- Promedio ponderado: 12 a Bs. 70 + 60 a Bs. 80 = Bs. 78,3333; sin costo arranca con el recibido
  if public.aml_costo_promedio(12, 70, 60, 80) <> 78.3333
     or public.aml_costo_promedio(12, null, 60, 80) <> 80
     or public.aml_costo_promedio(0, 70, 60, 80) <> 80 then
    raise exception 'FRENO: aml_costo_promedio no calcula bien.';
  end if;

  if (select column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'ordenes_compra' and column_name = 'codigo') not like '%OC-%' then
    raise exception 'FRENO: el código de la orden no sale como OC-000001.';
  end if;

  raise notice '0015 OK: órdenes de compra con RLS, recepción con costo promedio y avisos. costos_producto sigue sin delete para la API.';
end;
$$;

commit;
