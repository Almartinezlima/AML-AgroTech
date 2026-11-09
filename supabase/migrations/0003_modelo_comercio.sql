-- 0003_modelo_comercio.sql
--
-- POR QUÉ
--   La tienda necesita pedidos reales con pago, envío, seguimiento e inventario
--   controlado. Todo lo que toca varias tablas va en funciones transaccionales.
--
-- REQUIERE
--   Haber corrido antes la 0002 (usa public.es_admin()).
--
-- QUÉ HACE
--   1. productos: sku, imagen_url, checks y trigger que protege el stock.
--   2. zonas_envio con las 5 zonas iniciales.
--   3. pedidos: código AML-000001, totales, zona, dirección, método y estado de pago.
--   4. pagos, envios, seguimiento_pedido y movimientos_inventario (solo lectura vía RLS).
--   5. Funciones: crear_pedido, cancelar_pedido, cambiar_estado_pedido,
--      registrar_comprobante, verificar_pago, registrar_movimiento, resumen_dashboard.
--   6. Storage: bucket público productos y bucket privado comprobantes.
--   7. Asigna sku a los productos existentes, sin tocar precios ni nombres.
--   8. Verifica todo, incluida una compra simulada que no deja cambios.
--
-- QUÉ NO TOCA
--   Precios, nombres ni stock de los productos. No borra datos.
--
-- CÓDIGOS DE ERROR (la API los traduce a HTTP)
--   AML01 stock insuficiente → 409     AML04 no encontrado          → 404
--   AML02 datos inválidos    → 422     AML05 estado no permitido    → 409
--   AML03 sin permiso        → 403     AML06 sin sesión             → 401
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

do $$
begin
  if to_regprocedure('public.es_admin()') is null then
    raise exception 'FRENO: primero hay que correr la migración 0002';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Productos
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.productos add column if not exists sku text;
alter table public.productos add column if not exists imagen_url text;

create unique index if not exists productos_sku_key on public.productos (sku);

alter table public.productos drop constraint if exists productos_stock_no_negativo;
alter table public.productos add constraint productos_stock_no_negativo check (stock >= 0);

alter table public.productos drop constraint if exists productos_precio_positivo;
alter table public.productos add constraint productos_precio_positivo check (precio > 0);

-- SKU por categoría: AGR-001, RIE-001, CAN-001, HER-001, SEM-001.
-- Solo a los que no tienen, continuando la numeración existente.
with sin_sku as (
  select
    p.id,
    upper(left(translate(coalesce(c.nombre, 'GEN'), 'áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN'), 3)) as prefijo,
    p.nombre
  from public.productos p
  left join public.categorias c on c.id = p.categoria_id
  where p.sku is null
),
numerados as (
  select
    s.id,
    s.prefijo,
    row_number() over (partition by s.prefijo order by s.nombre, s.id)
      + coalesce((
          select max(substring(x.sku from '[0-9]+$')::integer)
          from public.productos x
          where x.sku like s.prefijo || '-%'
        ), 0) as numero
  from sin_sku s
)
update public.productos p
set sku = n.prefijo || '-' || lpad(n.numero::text, 3, '0')
from numerados n
where p.id = n.id;

-- El stock solo cambia por funciones que dejan rastro en el kardex.
-- Las funciones corren como postgres, así que pasan; la API y el navegador no.
create or replace function public.proteger_stock_producto()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    if tg_op = 'INSERT' and new.stock <> 0 then
      raise exception 'El stock inicial se registra como entrada de inventario.'
        using errcode = 'AML02';
    end if;

    if tg_op = 'UPDATE' and new.stock is distinct from old.stock then
      raise exception 'El stock solo cambia con movimientos de inventario.'
        using errcode = 'AML02';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists proteger_stock_producto on public.productos;
create trigger proteger_stock_producto
  before insert or update on public.productos
  for each row execute function public.proteger_stock_producto();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Zonas de envío
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.zonas_envio (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  tipo text not null check (tipo in ('recojo', 'urbano', 'provincia')),
  costo numeric(10,2) not null default 0 check (costo >= 0),
  dias_min integer not null default 0 check (dias_min >= 0),
  dias_max integer not null default 0,
  permite_contra_entrega boolean not null default false,
  activo boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  constraint zonas_envio_dias_validos check (dias_max >= dias_min)
);

alter table public.zonas_envio enable row level security;

drop policy if exists zonas_lectura_publica on public.zonas_envio;
drop policy if exists zonas_select_admin on public.zonas_envio;
drop policy if exists zonas_insert_admin on public.zonas_envio;
drop policy if exists zonas_update_admin on public.zonas_envio;

create policy zonas_lectura_publica on public.zonas_envio
  for select to anon, authenticated
  using (activo = true);

create policy zonas_select_admin on public.zonas_envio
  for select to authenticated
  using ((select public.es_admin()));

create policy zonas_insert_admin on public.zonas_envio
  for insert to authenticated
  with check ((select public.es_admin()));

create policy zonas_update_admin on public.zonas_envio
  for update to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

insert into public.zonas_envio (nombre, tipo, costo, dias_min, dias_max, permite_contra_entrega, orden)
values
  ('Recojo en tienda (Sucre)', 'recojo', 0, 0, 0, true, 1),
  ('Sucre urbano', 'urbano', 15, 1, 1, true, 2),
  ('Villa Charcas', 'provincia', 35, 2, 3, false, 3),
  ('Culpina', 'provincia', 35, 2, 3, false, 4),
  ('Incahuasi', 'provincia', 40, 2, 4, false, 5)
on conflict (nombre) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Pedidos
-- ─────────────────────────────────────────────────────────────────────────────
create sequence if not exists public.pedidos_codigo_seq;

alter table public.pedidos add column if not exists codigo text;
alter table public.pedidos add column if not exists subtotal numeric(10,2) not null default 0;
alter table public.pedidos add column if not exists costo_envio numeric(10,2) not null default 0;
alter table public.pedidos add column if not exists zona_envio_id uuid references public.zonas_envio(id);
alter table public.pedidos add column if not exists direccion_entrega text;
alter table public.pedidos add column if not exists metodo_pago text;
alter table public.pedidos add column if not exists estado_pago text not null default 'pendiente';

alter table public.pedidos
  alter column codigo set default 'AML-' || lpad(nextval('public.pedidos_codigo_seq')::text, 6, '0');

-- Por si existiera algún pedido antiguo sin código
update public.pedidos
set codigo = 'AML-' || lpad(nextval('public.pedidos_codigo_seq')::text, 6, '0')
where codigo is null;

create unique index if not exists pedidos_codigo_key on public.pedidos (codigo);
create index if not exists pedidos_usuario_idx on public.pedidos (usuario_id, created_at desc);

alter table public.pedidos alter column codigo set not null;

update public.pedidos set estado = 'preparando' where estado = 'preparado';

alter table public.pedidos drop constraint if exists pedidos_estado_check;
alter table public.pedidos add constraint pedidos_estado_check
  check (estado in ('pendiente', 'confirmado', 'preparando', 'despachado', 'entregado', 'cancelado'));

alter table public.pedidos drop constraint if exists pedidos_metodo_pago_check;
alter table public.pedidos add constraint pedidos_metodo_pago_check
  check (metodo_pago is null or metodo_pago in ('qr', 'transferencia', 'contra_entrega'));

alter table public.pedidos drop constraint if exists pedidos_estado_pago_check;
alter table public.pedidos add constraint pedidos_estado_pago_check
  check (estado_pago in ('pendiente', 'en_revision', 'verificado', 'rechazado'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Pagos, envíos, seguimiento y kardex
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null unique references public.pedidos(id),
  metodo text not null check (metodo in ('qr', 'transferencia', 'contra_entrega')),
  monto numeric(10,2) not null check (monto >= 0),
  comprobante_path text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'en_revision', 'verificado', 'rechazado')),
  motivo_rechazo text,
  revisado_por uuid references auth.users(id),
  revisado_en timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.envios (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null unique references public.pedidos(id),
  zona_envio_id uuid references public.zonas_envio(id),
  transportista text,
  numero_guia text,
  estado text not null default 'por_despachar'
    check (estado in ('por_despachar', 'en_camino', 'entregado')),
  despachado_en timestamptz,
  entregado_en timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.seguimiento_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id),
  estado text not null,
  nota text,
  creado_por uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists seguimiento_pedido_idx on public.seguimiento_pedido (pedido_id, created_at);

create table if not exists public.movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id),
  tipo text not null check (tipo in ('entrada', 'salida', 'ajuste', 'devolucion')),
  cantidad integer not null check (cantidad > 0),
  stock_anterior integer not null check (stock_anterior >= 0),
  stock_nuevo integer not null check (stock_nuevo >= 0),
  motivo text,
  pedido_id uuid references public.pedidos(id),
  usuario_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists movimientos_producto_idx
  on public.movimientos_inventario (producto_id, created_at desc);

alter table public.pagos enable row level security;
alter table public.envios enable row level security;
alter table public.seguimiento_pedido enable row level security;
alter table public.movimientos_inventario enable row level security;

-- Solo lectura desde fuera: toda escritura pasa por las funciones de abajo
revoke all on public.pagos from anon, authenticated;
revoke all on public.envios from anon, authenticated;
revoke all on public.seguimiento_pedido from anon, authenticated;
revoke all on public.movimientos_inventario from anon, authenticated;
grant select on public.pagos to authenticated;
grant select on public.envios to authenticated;
grant select on public.seguimiento_pedido to authenticated;
grant select on public.movimientos_inventario to authenticated;

drop policy if exists pagos_select_propio on public.pagos;
drop policy if exists pagos_select_admin on public.pagos;
create policy pagos_select_propio on public.pagos
  for select to authenticated
  using (exists (
    select 1 from public.pedidos p
    where p.id = pagos.pedido_id and p.usuario_id = (select auth.uid())
  ));
create policy pagos_select_admin on public.pagos
  for select to authenticated
  using ((select public.es_admin()));

drop policy if exists envios_select_propio on public.envios;
drop policy if exists envios_select_admin on public.envios;
create policy envios_select_propio on public.envios
  for select to authenticated
  using (exists (
    select 1 from public.pedidos p
    where p.id = envios.pedido_id and p.usuario_id = (select auth.uid())
  ));
create policy envios_select_admin on public.envios
  for select to authenticated
  using ((select public.es_admin()));

drop policy if exists seguimiento_select_propio on public.seguimiento_pedido;
drop policy if exists seguimiento_select_admin on public.seguimiento_pedido;
create policy seguimiento_select_propio on public.seguimiento_pedido
  for select to authenticated
  using (exists (
    select 1 from public.pedidos p
    where p.id = seguimiento_pedido.pedido_id and p.usuario_id = (select auth.uid())
  ));
create policy seguimiento_select_admin on public.seguimiento_pedido
  for select to authenticated
  using ((select public.es_admin()));

-- El kardex es información interna de la tienda: solo lo ve el admin
drop policy if exists movimientos_select_admin on public.movimientos_inventario;
create policy movimientos_select_admin on public.movimientos_inventario
  for select to authenticated
  using ((select public.es_admin()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Funciones auxiliares (internas, no se llaman desde fuera)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.aml_usuario_activo()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid := (select auth.uid());
begin
  if v_id is null then
    raise exception 'Debes iniciar sesión.' using errcode = 'AML06';
  end if;

  if not exists (select 1 from public.perfiles p where p.id = v_id and p.activo = true) then
    raise exception 'Tu cuenta está desactivada.' using errcode = 'AML03';
  end if;

  return v_id;
end;
$$;

create or replace function public.aml_admin_activo()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid := public.aml_usuario_activo();
begin
  if not public.es_admin() then
    raise exception 'No tienes permiso para esta acción.' using errcode = 'AML03';
  end if;

  return v_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. crear_pedido
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.crear_pedido(
  p_items jsonb,
  p_zona_id uuid,
  p_direccion text,
  p_telefono text,
  p_metodo_pago text,
  p_notas text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_usuario_activo();
  v_zona record;
  v_fila record;
  v_producto record;
  v_pedido_id uuid;
  v_codigo text;
  v_subtotal numeric(10,2) := 0;
  v_linea numeric(10,2);
  v_total numeric(10,2);
  v_telefono text := nullif(btrim(p_telefono), '');
  v_direccion text := nullif(btrim(p_direccion), '');
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío.' using errcode = 'AML02';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'El pedido tiene demasiados productos.' using errcode = 'AML02';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) e
    where coalesce(jsonb_typeof(e->'cantidad'), '') <> 'number'
       or coalesce(e->>'producto_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or (e->>'cantidad')::numeric <> trunc((e->>'cantidad')::numeric)
       or (e->>'cantidad')::numeric < 1
       or (e->>'cantidad')::numeric > 100000
  ) then
    raise exception 'Hay un producto con datos inválidos.' using errcode = 'AML02';
  end if;

  if p_metodo_pago is null or p_metodo_pago not in ('qr', 'transferencia', 'contra_entrega') then
    raise exception 'El método de pago no es válido.' using errcode = 'AML02';
  end if;

  if v_telefono is null then
    raise exception 'El teléfono es obligatorio.' using errcode = 'AML02';
  end if;

  select z.id, z.tipo, z.costo, z.permite_contra_entrega
  into v_zona
  from public.zonas_envio z
  where z.id = p_zona_id and z.activo = true;

  if not found then
    raise exception 'La zona de envío no está disponible.' using errcode = 'AML04';
  end if;

  if p_metodo_pago = 'contra_entrega' and not v_zona.permite_contra_entrega then
    raise exception 'Esta zona no permite pago contra entrega.' using errcode = 'AML02';
  end if;

  if v_zona.tipo <> 'recojo' and v_direccion is null then
    raise exception 'La dirección de entrega es obligatoria.' using errcode = 'AML02';
  end if;

  insert into public.pedidos (
    usuario_id, estado, total, subtotal, costo_envio, zona_envio_id,
    direccion_entrega, telefono_contacto, notas, metodo_pago, estado_pago
  )
  values (
    v_usuario, 'pendiente', 0, 0, v_zona.costo, v_zona.id,
    v_direccion, v_telefono, nullif(btrim(p_notas), ''), p_metodo_pago, 'pendiente'
  )
  returning id, codigo into v_pedido_id, v_codigo;

  -- Se bloquea en orden de id para que dos compras simultáneas no se traben
  for v_fila in
    select
      (e->>'producto_id')::uuid as producto_id,
      sum((e->>'cantidad')::integer)::integer as cantidad
    from jsonb_array_elements(p_items) e
    group by 1
    order by 1
  loop
    select p.id, p.nombre, p.precio, p.stock, p.activo
    into v_producto
    from public.productos p
    where p.id = v_fila.producto_id
    for update;

    if not found then
      raise exception 'Un producto del carrito ya no existe.'
        using errcode = 'AML01',
              detail = jsonb_build_object('producto_id', v_fila.producto_id, 'disponible', 0)::text;
    end if;

    if not v_producto.activo then
      raise exception 'El producto "%" ya no está disponible.', v_producto.nombre
        using errcode = 'AML01',
              detail = jsonb_build_object('producto_id', v_producto.id, 'disponible', 0)::text;
    end if;

    if v_producto.stock < v_fila.cantidad then
      raise exception 'No hay stock suficiente de "%". Disponible: %.', v_producto.nombre, v_producto.stock
        using errcode = 'AML01',
              detail = jsonb_build_object('producto_id', v_producto.id, 'disponible', v_producto.stock)::text;
    end if;

    v_linea := round(v_producto.precio * v_fila.cantidad, 2);
    v_subtotal := v_subtotal + v_linea;

    insert into public.pedido_items (
      pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal
    )
    values (v_pedido_id, v_producto.id, v_producto.nombre, v_producto.precio, v_fila.cantidad, v_linea);

    update public.productos p
    set stock = v_producto.stock - v_fila.cantidad
    where p.id = v_producto.id;

    insert into public.movimientos_inventario (
      producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, pedido_id, usuario_id
    )
    values (
      v_producto.id, 'salida', v_fila.cantidad, v_producto.stock,
      v_producto.stock - v_fila.cantidad, 'Venta ' || v_codigo, v_pedido_id, v_usuario
    );
  end loop;

  v_total := v_subtotal + v_zona.costo;

  update public.pedidos p
  set subtotal = v_subtotal, total = v_total
  where p.id = v_pedido_id;

  insert into public.pagos (pedido_id, metodo, monto)
  values (v_pedido_id, p_metodo_pago, v_total);

  insert into public.envios (pedido_id, zona_envio_id)
  values (v_pedido_id, v_zona.id);

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (v_pedido_id, 'pendiente', 'Pedido creado', v_usuario);

  return jsonb_build_object('id', v_pedido_id, 'codigo', v_codigo, 'total', v_total);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. cancelar_pedido
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.cancelar_pedido(p_pedido_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_usuario_activo();
  v_es_admin boolean := public.es_admin();
  v_pedido record;
  v_item record;
  v_stock integer;
  v_motivo text := nullif(btrim(p_motivo), '');
begin
  select p.id, p.codigo, p.estado, p.usuario_id
  into v_pedido
  from public.pedidos p
  where p.id = p_pedido_id
  for update;

  if not found or (not v_es_admin and v_pedido.usuario_id is distinct from v_usuario) then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  if v_es_admin then
    if v_pedido.estado not in ('pendiente', 'confirmado') then
      raise exception 'Este pedido ya no se puede cancelar.' using errcode = 'AML05';
    end if;
  elsif v_pedido.estado <> 'pendiente' then
    raise exception 'Solo puedes cancelar un pedido pendiente.' using errcode = 'AML05';
  end if;

  for v_item in
    select i.producto_id, i.cantidad
    from public.pedido_items i
    where i.pedido_id = p_pedido_id and i.producto_id is not null
    order by i.producto_id
  loop
    select p.stock into v_stock
    from public.productos p
    where p.id = v_item.producto_id
    for update;

    update public.productos p
    set stock = v_stock + v_item.cantidad
    where p.id = v_item.producto_id;

    insert into public.movimientos_inventario (
      producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, pedido_id, usuario_id
    )
    values (
      v_item.producto_id, 'devolucion', v_item.cantidad, v_stock, v_stock + v_item.cantidad,
      'Cancelación ' || v_pedido.codigo, p_pedido_id, v_usuario
    );
  end loop;

  update public.pedidos p set estado = 'cancelado' where p.id = p_pedido_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (p_pedido_id, 'cancelado', coalesce(v_motivo, 'Pedido cancelado'), v_usuario);

  return jsonb_build_object('id', p_pedido_id, 'estado', 'cancelado');
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. cambiar_estado_pedido
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.cambiar_estado_pedido(
  p_pedido_id uuid,
  p_estado text,
  p_nota text,
  p_transportista text,
  p_numero_guia text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_pedido record;
  v_tipo_zona text;
  v_siguiente text;
  v_transportista text := nullif(btrim(p_transportista), '');
  v_guia text := nullif(btrim(p_numero_guia), '');
begin
  select p.id, p.estado, p.metodo_pago, p.estado_pago, p.zona_envio_id
  into v_pedido
  from public.pedidos p
  where p.id = p_pedido_id
  for update;

  if not found then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  if p_estado = 'cancelado' then
    raise exception 'Para cancelar usa la acción Cancelar pedido.' using errcode = 'AML05';
  end if;

  v_siguiente := case v_pedido.estado
    when 'pendiente' then 'confirmado'
    when 'confirmado' then 'preparando'
    when 'preparando' then 'despachado'
    when 'despachado' then 'entregado'
  end;

  if v_siguiente is null or p_estado is distinct from v_siguiente then
    raise exception 'Un pedido % no puede pasar a %.', v_pedido.estado, coalesce(p_estado, 'ese estado')
      using errcode = 'AML05';
  end if;

  if p_estado in ('confirmado', 'preparando', 'despachado')
     and v_pedido.metodo_pago is distinct from 'contra_entrega'
     and v_pedido.estado_pago <> 'verificado' then
    raise exception 'El pago de este pedido todavía no está verificado.' using errcode = 'AML05';
  end if;

  if p_estado = 'despachado' then
    select z.tipo into v_tipo_zona
    from public.zonas_envio z
    where z.id = v_pedido.zona_envio_id;

    if v_tipo_zona = 'provincia' and (v_transportista is null or v_guia is null) then
      raise exception 'Para despachar a provincia indica la empresa de flota y el número de guía.'
        using errcode = 'AML02';
    end if;

    update public.envios e
    set estado = 'en_camino',
        despachado_en = now(),
        transportista = v_transportista,
        numero_guia = v_guia
    where e.pedido_id = p_pedido_id;
  end if;

  if p_estado = 'entregado' then
    update public.envios e
    set estado = 'entregado', entregado_en = now()
    where e.pedido_id = p_pedido_id;

    -- Al entregar contra entrega, la tienda ya cobró
    if v_pedido.metodo_pago = 'contra_entrega' then
      update public.pagos pa
      set estado = 'verificado', revisado_por = v_admin, revisado_en = now()
      where pa.pedido_id = p_pedido_id;

      update public.pedidos p set estado_pago = 'verificado' where p.id = p_pedido_id;
    end if;
  end if;

  update public.pedidos p set estado = p_estado where p.id = p_pedido_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (p_pedido_id, p_estado, nullif(btrim(p_nota), ''), v_admin);

  return jsonb_build_object('id', p_pedido_id, 'estado', p_estado);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. registrar_comprobante
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.registrar_comprobante(p_pedido_id uuid, p_path text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_usuario_activo();
  v_pedido record;
  v_pago record;
begin
  select p.id, p.estado, p.usuario_id
  into v_pedido
  from public.pedidos p
  where p.id = p_pedido_id
  for update;

  if not found or v_pedido.usuario_id is distinct from v_usuario then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  if v_pedido.estado = 'cancelado' then
    raise exception 'Este pedido está cancelado.' using errcode = 'AML05';
  end if;

  -- El archivo tiene que estar en la carpeta de este usuario y este pedido
  if p_path is null
     or left(p_path, length(v_usuario::text || '/' || p_pedido_id::text || '/'))
        <> v_usuario::text || '/' || p_pedido_id::text || '/'
     or position('..' in p_path) > 0 then
    raise exception 'La ubicación del comprobante no es válida.' using errcode = 'AML02';
  end if;

  select pa.id, pa.metodo, pa.estado
  into v_pago
  from public.pagos pa
  where pa.pedido_id = p_pedido_id
  for update;

  if not found then
    raise exception 'El pedido no tiene un pago asociado.' using errcode = 'AML04';
  end if;

  if v_pago.metodo = 'contra_entrega' then
    raise exception 'Un pago contra entrega no necesita comprobante.' using errcode = 'AML05';
  end if;

  if v_pago.estado not in ('pendiente', 'rechazado') then
    raise exception 'Este pago ya tiene un comprobante en revisión o verificado.' using errcode = 'AML05';
  end if;

  update public.pagos pa
  set comprobante_path = p_path, estado = 'en_revision', motivo_rechazo = null,
      revisado_por = null, revisado_en = null
  where pa.id = v_pago.id;

  update public.pedidos p set estado_pago = 'en_revision' where p.id = p_pedido_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (p_pedido_id, v_pedido.estado, 'Comprobante de pago subido', v_usuario);

  return jsonb_build_object('pago_id', v_pago.id, 'estado', 'en_revision');
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. verificar_pago
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.verificar_pago(p_pago_id uuid, p_aprobado boolean, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_pago record;
  v_pedido record;
  v_motivo text := nullif(btrim(p_motivo), '');
  v_estado_pedido text;
begin
  if p_aprobado is null then
    raise exception 'Indica si el pago se aprueba o se rechaza.' using errcode = 'AML02';
  end if;

  if not p_aprobado and v_motivo is null then
    raise exception 'Para rechazar un pago indica el motivo.' using errcode = 'AML02';
  end if;

  -- Primero el pedido y después el pago, igual que en registrar_comprobante
  select pa.pedido_id into v_pago
  from public.pagos pa
  where pa.id = p_pago_id;

  if not found then
    raise exception 'El pago no existe.' using errcode = 'AML04';
  end if;

  select p.id, p.estado
  into v_pedido
  from public.pedidos p
  where p.id = v_pago.pedido_id
  for update;

  select pa.id, pa.estado, pa.pedido_id
  into v_pago
  from public.pagos pa
  where pa.id = p_pago_id
  for update;

  if v_pedido.estado = 'cancelado' then
    raise exception 'Este pedido está cancelado.' using errcode = 'AML05';
  end if;

  if v_pago.estado <> 'en_revision' then
    raise exception 'Este pago no está en revisión.' using errcode = 'AML05';
  end if;

  v_estado_pedido := v_pedido.estado;

  if p_aprobado then
    update public.pagos pa
    set estado = 'verificado', motivo_rechazo = null, revisado_por = v_admin, revisado_en = now()
    where pa.id = p_pago_id;

    if v_pedido.estado = 'pendiente' then
      v_estado_pedido := 'confirmado';
    end if;

    update public.pedidos p
    set estado_pago = 'verificado', estado = v_estado_pedido
    where p.id = v_pedido.id;

    insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
    values (v_pedido.id, v_estado_pedido, 'Pago verificado', v_admin);
  else
    update public.pagos pa
    set estado = 'rechazado', motivo_rechazo = v_motivo, revisado_por = v_admin, revisado_en = now()
    where pa.id = p_pago_id;

    update public.pedidos p set estado_pago = 'rechazado' where p.id = v_pedido.id;

    insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
    values (v_pedido.id, v_estado_pedido, 'Pago rechazado: ' || v_motivo, v_admin);
  end if;

  return jsonb_build_object(
    'id', p_pago_id,
    'estado', case when p_aprobado then 'verificado' else 'rechazado' end,
    'estado_pedido', v_estado_pedido
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. registrar_movimiento
-- ─────────────────────────────────────────────────────────────────────────────
-- entrada: p_cantidad positiva. ajuste: positiva suma, negativa resta.
create or replace function public.registrar_movimiento(
  p_producto_id uuid,
  p_tipo text,
  p_cantidad integer,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_producto record;
  v_nuevo integer;
  v_motivo text := nullif(btrim(p_motivo), '');
begin
  if p_tipo is null or p_tipo not in ('entrada', 'ajuste') then
    raise exception 'El tipo de movimiento no es válido.' using errcode = 'AML02';
  end if;

  if p_cantidad is null or p_cantidad = 0 or (p_tipo = 'entrada' and p_cantidad < 0) then
    raise exception 'La cantidad no es válida.' using errcode = 'AML02';
  end if;

  if v_motivo is null then
    raise exception 'El motivo es obligatorio.' using errcode = 'AML02';
  end if;

  select p.id, p.stock
  into v_producto
  from public.productos p
  where p.id = p_producto_id
  for update;

  if not found then
    raise exception 'El producto no existe.' using errcode = 'AML04';
  end if;

  v_nuevo := v_producto.stock + p_cantidad;

  if v_nuevo < 0 then
    raise exception 'El stock no puede quedar negativo. Disponible: %.', v_producto.stock
      using errcode = 'AML02';
  end if;

  update public.productos p set stock = v_nuevo where p.id = p_producto_id;

  insert into public.movimientos_inventario (
    producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id
  )
  values (p_producto_id, p_tipo, abs(p_cantidad), v_producto.stock, v_nuevo, v_motivo, v_admin);

  return jsonb_build_object('producto_id', p_producto_id, 'stock_anterior', v_producto.stock, 'stock_nuevo', v_nuevo);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. resumen_dashboard
-- ─────────────────────────────────────────────────────────────────────────────
-- Los días y meses se cortan en hora de Bolivia, no en UTC.
create or replace function public.resumen_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_ahora timestamp := now() at time zone 'America/La_Paz';
  v_hoy timestamptz := date_trunc('day', v_ahora) at time zone 'America/La_Paz';
  v_mes timestamptz := date_trunc('month', v_ahora) at time zone 'America/La_Paz';
begin
  return jsonb_build_object(
    'ventas_hoy', (
      select jsonb_build_object('total', coalesce(sum(p.total), 0), 'pedidos', count(*))
      from public.pedidos p
      where p.estado <> 'cancelado' and p.created_at >= v_hoy
    ),
    'ventas_mes', (
      select jsonb_build_object('total', coalesce(sum(p.total), 0), 'pedidos', count(*))
      from public.pedidos p
      where p.estado <> 'cancelado' and p.created_at >= v_mes
    ),
    'ventas_7_dias', (
      select coalesce(jsonb_agg(jsonb_build_object('fecha', d.dia::date, 'total', d.total) order by d.dia), '[]'::jsonb)
      from (
        select
          s.dia,
          coalesce((
            select sum(p.total)
            from public.pedidos p
            where p.estado <> 'cancelado'
              and (p.created_at at time zone 'America/La_Paz')::date = s.dia::date
          ), 0) as total
        from generate_series(date_trunc('day', v_ahora) - interval '6 days', date_trunc('day', v_ahora), interval '1 day') as s(dia)
      ) d
    ),
    'pedidos_por_estado', (
      select coalesce(jsonb_agg(jsonb_build_object('estado', e.estado, 'total', e.total) order by e.total desc), '[]'::jsonb)
      from (
        select p.estado, count(*) as total
        from public.pedidos p
        group by p.estado
      ) e
    ),
    'top_productos', (
      select coalesce(jsonb_agg(jsonb_build_object('nombre', t.nombre, 'cantidad', t.cantidad, 'ingresos', t.ingresos) order by t.cantidad desc), '[]'::jsonb)
      from (
        select i.nombre_producto as nombre, sum(i.cantidad) as cantidad, sum(i.subtotal) as ingresos
        from public.pedido_items i
        join public.pedidos p on p.id = i.pedido_id
        where p.estado <> 'cancelado'
        group by i.nombre_producto
        order by sum(i.cantidad) desc
        limit 5
      ) t
    ),
    'stock_bajo', (
      select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'nombre', b.nombre, 'stock', b.stock, 'stock_minimo', b.stock_minimo, 'icono', b.icono) order by b.stock), '[]'::jsonb)
      from (
        select p.id, p.nombre, p.stock, p.stock_minimo, p.icono
        from public.productos p
        where p.activo = true and p.stock <= p.stock_minimo
        order by p.stock
        limit 10
      ) b
    ),
    'total_stock_bajo', (
      select count(*) from public.productos p where p.activo = true and p.stock <= p.stock_minimo
    ),
    'pagos_en_revision', (
      select count(*)
      from public.pagos pa
      join public.pedidos p on p.id = pa.pedido_id
      where pa.estado = 'en_revision' and p.estado <> 'cancelado'
    ),
    'cobrado', (
      select coalesce(sum(pa.monto), 0)
      from public.pagos pa
      join public.pedidos p on p.id = pa.pedido_id
      where pa.estado = 'verificado' and p.estado <> 'cancelado'
    ),
    'por_cobrar', (
      select coalesce(sum(pa.monto), 0)
      from public.pagos pa
      join public.pedidos p on p.id = pa.pedido_id
      where pa.estado <> 'verificado' and p.estado <> 'cancelado'
    ),
    'valor_inventario', (
      select coalesce(sum(p.stock * p.precio), 0) from public.productos p where p.activo = true
    )
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. Permisos de ejecución
-- ─────────────────────────────────────────────────────────────────────────────
revoke execute on function public.proteger_stock_producto() from public, anon, authenticated;
revoke execute on function public.aml_usuario_activo() from public, anon, authenticated;
revoke execute on function public.aml_admin_activo() from public, anon, authenticated;

revoke execute on function public.crear_pedido(jsonb, uuid, text, text, text, text) from public, anon;
revoke execute on function public.cancelar_pedido(uuid, text) from public, anon;
revoke execute on function public.cambiar_estado_pedido(uuid, text, text, text, text) from public, anon;
revoke execute on function public.registrar_comprobante(uuid, text) from public, anon;
revoke execute on function public.verificar_pago(uuid, boolean, text) from public, anon;
revoke execute on function public.registrar_movimiento(uuid, text, integer, text) from public, anon;
revoke execute on function public.resumen_dashboard() from public, anon;

grant execute on function public.crear_pedido(jsonb, uuid, text, text, text, text) to authenticated;
grant execute on function public.cancelar_pedido(uuid, text) to authenticated;
grant execute on function public.cambiar_estado_pedido(uuid, text, text, text, text) to authenticated;
grant execute on function public.registrar_comprobante(uuid, text) to authenticated;
grant execute on function public.verificar_pago(uuid, boolean, text) to authenticated;
grant execute on function public.registrar_movimiento(uuid, text, integer, text) to authenticated;
grant execute on function public.resumen_dashboard() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. Storage
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('productos', 'productos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('comprobantes', 'comprobantes', false, 3145728, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists productos_lectura_publica on storage.objects;
drop policy if exists productos_insert_admin on storage.objects;
drop policy if exists productos_update_admin on storage.objects;
drop policy if exists comprobantes_insert_propio on storage.objects;
drop policy if exists comprobantes_select_propio on storage.objects;
drop policy if exists comprobantes_select_admin on storage.objects;

create policy productos_lectura_publica on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'productos');

create policy productos_insert_admin on storage.objects
  for insert to authenticated
  with check (bucket_id = 'productos' and (select public.es_admin()));

create policy productos_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'productos' and (select public.es_admin()))
  with check (bucket_id = 'productos' and (select public.es_admin()));

create policy comprobantes_insert_propio on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy comprobantes_select_propio on storage.objects
  for select to authenticated
  using (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy comprobantes_select_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'comprobantes' and (select public.es_admin()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. Verificaciones de estructura
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_tabla text;
  v_firma text;
  v_firmas text[] := array[
    'public.crear_pedido(jsonb, uuid, text, text, text, text)',
    'public.cancelar_pedido(uuid, text)',
    'public.cambiar_estado_pedido(uuid, text, text, text, text)',
    'public.registrar_comprobante(uuid, text)',
    'public.verificar_pago(uuid, boolean, text)',
    'public.registrar_movimiento(uuid, text, integer, text)',
    'public.resumen_dashboard()'
  ];
begin
  foreach v_tabla in array array['zonas_envio', 'pagos', 'envios', 'seguimiento_pedido', 'movimientos_inventario'] loop
    if to_regclass(format('public.%I', v_tabla)) is null then
      raise exception 'FRENO: falta la tabla %', v_tabla;
    end if;
    if not (select relrowsecurity from pg_catalog.pg_class where oid = format('public.%I', v_tabla)::regclass) then
      raise exception 'FRENO: la tabla % no tiene RLS', v_tabla;
    end if;
  end loop;

  if exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('pagos', 'envios', 'seguimiento_pedido', 'movimientos_inventario')
      and cmd <> 'SELECT'
  ) then
    raise exception 'FRENO: pagos, envíos, seguimiento o kardex tienen políticas de escritura';
  end if;

  foreach v_tabla in array array['pagos', 'envios', 'seguimiento_pedido', 'movimientos_inventario'] loop
    if has_table_privilege('authenticated', format('public.%I', v_tabla), 'INSERT, UPDATE, DELETE, TRUNCATE')
       or has_table_privilege('anon', format('public.%I', v_tabla), 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE') then
      raise exception 'FRENO: la tabla % tiene permisos de escritura desde el navegador', v_tabla;
    end if;
  end loop;

  foreach v_firma in array v_firmas loop
    if not (select prosecdef from pg_catalog.pg_proc where oid = v_firma::regprocedure) then
      raise exception 'FRENO: % no es security definer', v_firma;
    end if;
    if not exists (
      select 1
      from pg_catalog.pg_proc p
      cross join lateral unnest(p.proconfig) as c(valor)
      where p.oid = v_firma::regprocedure
        and c.valor in ('search_path=""', 'search_path=''''', 'search_path=')
    ) then
      raise exception 'FRENO: % no tiene search_path vacío', v_firma;
    end if;
    if has_function_privilege('anon', v_firma, 'EXECUTE') then
      raise exception 'FRENO: anon puede ejecutar %', v_firma;
    end if;
    if not has_function_privilege('authenticated', v_firma, 'EXECUTE') then
      raise exception 'FRENO: authenticated no puede ejecutar %', v_firma;
    end if;
  end loop;

  if has_function_privilege('authenticated', 'public.aml_usuario_activo()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.aml_admin_activo()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.proteger_stock_producto()', 'EXECUTE') then
    raise exception 'FRENO: una función interna es ejecutable desde el navegador';
  end if;

  if exists (select 1 from public.productos where sku is null) then
    raise exception 'FRENO: quedaron productos sin sku';
  end if;

  if (select count(*) from public.zonas_envio) < 5 then
    raise exception 'FRENO: faltan zonas de envío';
  end if;

  if not exists (select 1 from storage.buckets where id = 'productos' and public = true) then
    raise exception 'FRENO: el bucket productos debe ser público';
  end if;
  if not exists (select 1 from storage.buckets where id = 'comprobantes' and public = false) then
    raise exception 'FRENO: el bucket comprobantes debe ser privado';
  end if;

  if (select count(*) from pg_catalog.pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname in (
          'productos_lectura_publica', 'productos_insert_admin', 'productos_update_admin',
          'comprobantes_insert_propio', 'comprobantes_select_propio', 'comprobantes_select_admin'
        )) <> 6 then
    raise exception 'FRENO: faltan políticas de storage';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. Prueba real: compra y cancelación simuladas (no deja ningún cambio)
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_cliente uuid;
  v_producto uuid;
  v_zona uuid;
  v_stock integer;
  v_stock_tras_compra integer;
  v_stock_tras_cancelar integer;
  v_resultado jsonb;
  v_pedido uuid;
  v_pagos integer;
  v_envios integer;
  v_kardex integer;
  v_seguimiento integer;
  v_total numeric;
  v_precio numeric;
  v_costo numeric;
  v_bloqueado boolean := false;
  v_probado boolean := false;
begin
  select id into v_cliente
  from public.perfiles
  where rol <> 'admin' and activo = true
  order by created_at
  limit 1;

  select id, stock, precio into v_producto, v_stock, v_precio
  from public.productos
  where activo = true and stock >= 1
  order by nombre
  limit 1;

  select id, costo into v_zona, v_costo
  from public.zonas_envio
  where tipo = 'recojo' and activo = true and permite_contra_entrega = true
  order by orden
  limit 1;

  if v_cliente is null or v_producto is null or v_zona is null then
    raise exception 'FRENO: faltan datos para la prueba (cliente, producto con stock o zona)';
  end if;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_cliente::text, 'role', 'authenticated')::text,
    true
  );

  -- Prueba 1: un cliente no puede tocar el stock directamente ni registrar movimientos
  begin
    set local role authenticated;
    perform public.registrar_movimiento(v_producto, 'entrada', 5, 'prueba');
  exception
    when sqlstate 'AML03' then v_bloqueado := true;
  end;

  if not v_bloqueado then
    raise exception 'FRENO: un cliente pudo registrar un movimiento de inventario';
  end if;

  -- Prueba 2: compra y cancelación completas. Todo se deshace al terminar.
  begin
    set local role authenticated;

    v_resultado := public.crear_pedido(
      jsonb_build_array(jsonb_build_object('producto_id', v_producto, 'cantidad', 1)),
      v_zona, null, '70000000', 'contra_entrega', 'Prueba 0003'
    );
    v_pedido := (v_resultado->>'id')::uuid;
    v_total := (v_resultado->>'total')::numeric;

    reset role;

    select stock into v_stock_tras_compra from public.productos where id = v_producto;
    select count(*) into v_pagos from public.pagos where pedido_id = v_pedido;
    select count(*) into v_envios from public.envios where pedido_id = v_pedido;
    select count(*) into v_kardex from public.movimientos_inventario where pedido_id = v_pedido and tipo = 'salida';
    select count(*) into v_seguimiento from public.seguimiento_pedido where pedido_id = v_pedido;

    set local role authenticated;
    perform public.cancelar_pedido(v_pedido, 'Prueba 0003');
    reset role;

    select stock into v_stock_tras_cancelar from public.productos where id = v_producto;

    v_probado := true;
    raise exception using errcode = 'AML00', message = 'deshacer prueba';
  exception
    when sqlstate 'AML00' then null;
  end;

  if not v_probado then
    raise exception 'FRENO: la compra simulada no terminó';
  end if;
  if v_stock_tras_compra <> v_stock - 1 then
    raise exception 'FRENO: la compra no descontó el stock';
  end if;
  if v_stock_tras_cancelar <> v_stock then
    raise exception 'FRENO: la cancelación no devolvió el stock';
  end if;
  if v_pagos <> 1 or v_envios <> 1 or v_kardex <> 1 or v_seguimiento <> 1 then
    raise exception 'FRENO: el pedido no creó su pago, envío, kardex y seguimiento';
  end if;
  if v_total is distinct from v_precio + v_costo then
    raise exception 'FRENO: el total calculado no coincide con el precio real';
  end if;

  -- nextval no se deshace con la transacción: si no hay pedidos, el primero será AML-000001
  if not exists (select 1 from public.pedidos) then
    perform setval('public.pedidos_codigo_seq', 1, false);
  end if;

  perform set_config('request.jwt.claims', '', true);

  raise notice '0003 OK: modelo de comercio aplicado y compra simulada correcta';
end;
$$;

commit;

-- Mensaje visible en la pestaña Results del SQL Editor
select '0003 OK: modelo de comercio aplicado y compra simulada correcta' as resultado;

-- CONSULTAS DE COMPROBACIÓN (solo lectura, correr aparte):
--   select nombre, tipo, costo, dias_min, dias_max, permite_contra_entrega from public.zonas_envio order by orden;
--   select sku, nombre, precio, stock from public.productos order by sku;
--   select id, public, file_size_limit from storage.buckets;
--   select tablename, policyname, cmd from pg_policies where schemaname = 'public'
--     and tablename in ('zonas_envio', 'pagos', 'envios', 'seguimiento_pedido', 'movimientos_inventario') order by 1, 2;
