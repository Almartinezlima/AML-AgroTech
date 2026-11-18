-- 0022_limpieza_total.sql
--
-- POR QUÉ
--   Antes de la feria la base tiene que quedar limpia: sin pedidos, órdenes de compra, comprobantes
--   ni cuentas de prueba sobrantes, y con el stock como estaba antes de esas ventas.
--
-- QUÉ HACE (todo en una transacción; si un FRENO salta, no se guarda nada)
--   1. Borra TODOS los pedidos y lo ligado: items, pagos, envíos, seguimiento, códigos de entrega,
--      calificaciones, faltantes y pagos a repartidores.
--   2. Borra TODAS las órdenes de compra y lo ligado (items y seguimiento).
--   3. Borra del kardex los movimientos de ventas, devoluciones y compras (los que tienen pedido u
--      orden de compra) y devuelve el stock de cada producto al valor que tenía antes de ellos.
--      Se quedan las entradas sueltas, como el «Stock inicial (migración 0008)».
--   4. Reinicia los contadores: el próximo pedido es AML-000001 y la próxima orden OC-000001.
--   5. Borra el schema respaldo_20261115.
--   6. Cuentas: deja SOLO estas y borra todas las demás (auth.users y, en cascada, perfiles):
--        aldomartinezlima@gmail.com      admin (Aldo)
--        aldo.mtz.lima@gmail.com         cliente (cuenta secundaria de Aldo, Google)
--        alenav161201@gmail.com          cliente (Miguel)
--        repartidor@amlagrotech.test     repartidor demo
--        distribuidor.sucre@amlagrotech.test, distribuidor.scz@amlagrotech.test   proveedores demo
--        admin@amlagrotech.com, cliente@amlagrotech.test   cuentas de las E2E (Aldo decidió mantenerlas)
--      Hoy eso borra solo almacen@amlagrotech.test.
--
-- QUÉ NO TOCA
--   Productos (salvo su stock), categorías, zonas de envío, distribuidores, presentaciones, costos,
--   Vault ni el bucket productos.
--
-- ANTES DE CORRERLA
--   Vaciar el bucket «comprobantes» desde Supabase → Storage → comprobantes → «Empty bucket».
--   Supabase no deja borrar archivos con SQL (quedarían huérfanos): si queda alguno, esta migración FRENA.
--
-- Se corre a mano en el SQL Editor de Supabase. Correrla dos veces no rompe nada (la segunda no
-- encuentra nada que borrar).

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. FRENOs previos y foto de lo que no se toca
-- ─────────────────────────────────────────────────────────────────────────────
create temp table aml_0022_quedan (email text primary key) on commit drop;
insert into aml_0022_quedan (email) values
  ('aldomartinezlima@gmail.com'),
  ('aldo.mtz.lima@gmail.com'),
  ('alenav161201@gmail.com'),
  ('repartidor@amlagrotech.test'),
  ('distribuidor.sucre@amlagrotech.test'),
  ('distribuidor.scz@amlagrotech.test'),
  ('admin@amlagrotech.com'),
  ('cliente@amlagrotech.test');

create temp table aml_0022_antes on commit drop as
select
  (select count(*) from public.productos) as productos,
  (select count(*) from public.categorias) as categorias,
  (select count(*) from public.zonas_envio) as zonas,
  (select count(*) from public.distribuidores) as distribuidores,
  (select count(*) from public.presentaciones_distribuidor) as presentaciones,
  (select count(*) from public.costos_producto) as costos,
  (select count(*) from vault.secrets) as secretos,
  (select count(*) from storage.objects where bucket_id = 'productos') as fotos_productos;

do $$
declare
  v_archivos integer;
  v_admin uuid;
begin
  if to_regclass('public.pagos_repartidor') is null then
    raise exception 'FRENO: falta correr la 0020 (pagos_repartidor no existe)';
  end if;

  select count(*) into v_archivos from storage.objects where bucket_id = 'comprobantes';
  if v_archivos > 0 then
    raise exception 'FRENO: el bucket comprobantes todavía tiene % archivo(s). Vacíalo desde Supabase → Storage → comprobantes → Empty bucket y vuelve a correr la 0022.', v_archivos;
  end if;

  -- La cuenta admin de Aldo tiene que existir y ser admin activa: nunca se queda la tienda sin admin
  select u.id into v_admin
  from auth.users u join public.perfiles p on p.id = u.id
  where lower(u.email) = 'aldomartinezlima@gmail.com' and p.rol = 'admin' and p.activo;
  if v_admin is null then
    raise exception 'FRENO: aldomartinezlima@gmail.com no existe o no es admin activo';
  end if;

  -- Los distribuidores demo tienen ficha y presentaciones: si faltaran, algo no cuadra
  if (select count(*) from auth.users where lower(email) in ('distribuidor.sucre@amlagrotech.test', 'distribuidor.scz@amlagrotech.test')) <> 2 then
    raise exception 'FRENO: falta alguna de las 2 cuentas de distribuidor demo';
  end if;

  -- Ninguna cuenta que se borra puede tener ficha de distribuidor (las presentaciones no se tocan)
  if exists (
    select 1 from public.distribuidores d join auth.users u on u.id = d.usuario_id
    where lower(u.email) not in (select email from aml_0022_quedan)
  ) then
    raise exception 'FRENO: una cuenta que se va a borrar tiene ficha de distribuidor';
  end if;
end;
$$;

-- Lo que se va a borrar, para el registro
do $$
declare
  v_cuentas text;
begin
  select string_agg(u.email, ', ' order by u.email) into v_cuentas
  from auth.users u where lower(u.email) not in (select email from aml_0022_quedan);

  raise notice '0022: pedidos %, órdenes de compra %, movimientos de kardex %, cuentas a borrar: %',
    (select count(*) from public.pedidos),
    (select count(*) from public.ordenes_compra),
    (select count(*) from public.movimientos_inventario where pedido_id is not null or orden_compra_id is not null),
    coalesce(v_cuentas, 'ninguna');
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Stock: se calcula ANTES de borrar el kardex
-- ─────────────────────────────────────────────────────────────────────────────
-- Efecto neto de cada producto: ventas restan, devoluciones y compras suman. El stock vuelve a
-- stock actual − efecto, que es el valor anterior a esos movimientos.
create temp table aml_0022_stock on commit drop as
select m.producto_id, sum(m.stock_nuevo - m.stock_anterior)::integer as efecto
from public.movimientos_inventario m
where m.pedido_id is not null or m.orden_compra_id is not null
group by m.producto_id;

do $$
begin
  if exists (
    select 1 from public.productos p join aml_0022_stock s on s.producto_id = p.id
    where p.stock - s.efecto < 0
  ) then
    raise exception 'FRENO: algún producto quedaría con stock negativo al deshacer las ventas';
  end if;
end;
$$;

-- Corre como postgres: proteger_stock_producto deja pasar a los roles internos
update public.productos p
set stock = p.stock - s.efecto
from aml_0022_stock s
where s.producto_id = p.id and s.efecto <> 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Pedidos y todo lo ligado (de las hojas hacia la raíz)
-- ─────────────────────────────────────────────────────────────────────────────
delete from public.calificaciones_entrega;
delete from public.codigos_entrega;
delete from public.seguimiento_pedido;          -- antes que faltantes (seguimiento.faltante_id)
delete from public.faltantes_pedido;
delete from public.movimientos_inventario where pedido_id is not null;
delete from public.pagos;
delete from public.envios;
delete from public.pedido_items;
delete from public.pedidos;                      -- antes que pagos_repartidor (pedidos.pago_repartidor_id)
delete from public.pagos_repartidor;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Órdenes de compra y lo ligado
-- ─────────────────────────────────────────────────────────────────────────────
delete from public.seguimiento_orden_compra;
delete from public.movimientos_inventario where orden_compra_id is not null;
delete from public.orden_compra_items;
delete from public.ordenes_compra;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Contadores: el próximo es AML-000001 y OC-000001
-- ─────────────────────────────────────────────────────────────────────────────
select setval('public.pedidos_codigo_seq', 1, false);
select setval('public.ordenes_compra_codigo_seq', 1, false);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Respaldo viejo
-- ─────────────────────────────────────────────────────────────────────────────
drop schema if exists respaldo_20261115 cascade;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Cuentas: solo las de la lista (perfiles, identidades y sesiones se van en cascada)
-- ─────────────────────────────────────────────────────────────────────────────
delete from public.repartidores_estado e
using auth.users u
where u.id = e.usuario_id and lower(u.email) not in (select email from aml_0022_quedan);

delete from auth.users u
where lower(u.email) not in (select email from aml_0022_quedan);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Verificaciones: si algo no cuadra, no se guarda nada
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_antes record;
  v_tabla text;
  v_n bigint;
  v_ultimo bigint;
  v_llamado boolean;
begin
  foreach v_tabla in array array[
    'pedidos', 'pedido_items', 'pagos', 'envios', 'seguimiento_pedido', 'codigos_entrega',
    'calificaciones_entrega', 'faltantes_pedido', 'pagos_repartidor',
    'ordenes_compra', 'orden_compra_items', 'seguimiento_orden_compra'
  ] loop
    execute format('select count(*) from public.%I', v_tabla) into v_n;
    if v_n <> 0 then
      raise exception 'FRENO: % todavía tiene % fila(s)', v_tabla, v_n;
    end if;
  end loop;

  if exists (select 1 from public.movimientos_inventario where pedido_id is not null or orden_compra_id is not null) then
    raise exception 'FRENO: quedaron movimientos de ventas o compras en el kardex';
  end if;

  -- Cada producto quedó igual a su último movimiento que se conserva (o sin movimientos)
  if exists (
    select 1 from public.productos p
    join lateral (
      select m.stock_nuevo from public.movimientos_inventario m
      where m.producto_id = p.id order by m.created_at desc, m.id desc limit 1
    ) ultimo on true
    where p.stock <> ultimo.stock_nuevo
  ) then
    raise exception 'FRENO: el stock de algún producto no coincide con su kardex';
  end if;

  if exists (select 1 from public.productos where stock < 0) then
    raise exception 'FRENO: hay stock negativo';
  end if;

  select s.last_value, s.is_called into v_ultimo, v_llamado from public.pedidos_codigo_seq s;
  if v_ultimo <> 1 or v_llamado then
    raise exception 'FRENO: el contador de pedidos no quedó en AML-000001';
  end if;
  select s.last_value, s.is_called into v_ultimo, v_llamado from public.ordenes_compra_codigo_seq s;
  if v_ultimo <> 1 or v_llamado then
    raise exception 'FRENO: el contador de órdenes no quedó en OC-000001';
  end if;

  if exists (select 1 from pg_namespace where nspname = 'respaldo_20261115') then
    raise exception 'FRENO: el schema respaldo_20261115 sigue existiendo';
  end if;

  if exists (select 1 from auth.users where lower(email) not in (select email from aml_0022_quedan)) then
    raise exception 'FRENO: quedó una cuenta fuera de la lista';
  end if;
  if exists (select 1 from public.perfiles p where not exists (select 1 from auth.users u where u.id = p.id)) then
    raise exception 'FRENO: quedó un perfil sin cuenta';
  end if;
  if (select count(*) from auth.users) <> (select count(*) from aml_0022_quedan q join auth.users u on lower(u.email) = q.email) then
    raise exception 'FRENO: el número de cuentas no cuadra con la lista';
  end if;

  -- Lo que no se toca sigue igual
  select * into v_antes from aml_0022_antes;
  if v_antes.productos <> (select count(*) from public.productos)
     or v_antes.categorias <> (select count(*) from public.categorias)
     or v_antes.zonas <> (select count(*) from public.zonas_envio)
     or v_antes.distribuidores <> (select count(*) from public.distribuidores)
     or v_antes.presentaciones <> (select count(*) from public.presentaciones_distribuidor)
     or v_antes.costos <> (select count(*) from public.costos_producto)
     or v_antes.secretos <> (select count(*) from vault.secrets)
     or v_antes.fotos_productos <> (select count(*) from storage.objects where bucket_id = 'productos') then
    raise exception 'FRENO: cambió algo que esta migración no debía tocar (productos, categorías, zonas, distribuidores, presentaciones, costos, Vault o fotos)';
  end if;

  raise notice '0022 OK: base limpia, % cuentas, contadores en AML-000001 y OC-000001', (select count(*) from auth.users);
end;
$$;

commit;
