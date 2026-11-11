-- 0006_cancelacion_y_pagos.sql
--
-- POR QUÉ
--   La auditoría (9 nov 2026) encontró que el cliente podía cancelar un pedido que ya
--   había pagado (comprobante en revisión) y que, si el admin cancelaba un pedido con
--   pago verificado, el pago quedaba "verificado" sin ningún reembolso.
--
-- REQUIERE
--   0003 (funciones de comercio).
--
-- QUÉ HACE
--   1. Dos estados nuevos de pago: reembolso_pendiente y reembolsado
--      (en pagos.estado y en pedidos.estado_pago).
--   2. cancelar_pedido:
--        - Cliente: solo si el pedido está "pendiente" Y su pago está "pendiente"
--          (todavía no subió comprobante).
--        - Admin: pedidos pendientes o confirmados. Si el pago estaba "verificado" o
--          "en_revision", pasa a "reembolso_pendiente" y queda anotado en el seguimiento.
--   3. marcar_reembolsado(p_pago_id): solo admin, de reembolso_pendiente a reembolsado.
--   4. resumen_dashboard: agrega "reembolsos_pendientes" (cantidad y monto).
--   5. Verifica todo dentro de la transacción.
--
-- QUÉ NO TOCA
--   Pedidos ni pagos existentes (ninguno cambia de estado). No borra nada.
--
-- CÓDIGOS DE ERROR: los de la 0003 (AML04 no encontrado, AML05 estado no permitido).
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Estados nuevos de pago
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.pagos drop constraint if exists pagos_estado_check;
alter table public.pagos add constraint pagos_estado_check
  check (estado in ('pendiente', 'en_revision', 'verificado', 'rechazado', 'reembolso_pendiente', 'reembolsado'));

alter table public.pedidos drop constraint if exists pedidos_estado_pago_check;
alter table public.pedidos add constraint pedidos_estado_pago_check
  check (estado_pago in ('pendiente', 'en_revision', 'verificado', 'rechazado', 'reembolso_pendiente', 'reembolsado'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. cancelar_pedido
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
  v_pago record;
  v_item record;
  v_stock integer;
  v_motivo text := nullif(btrim(p_motivo), '');
  v_reembolso boolean := false;
begin
  select p.id, p.codigo, p.estado, p.usuario_id
  into v_pedido
  from public.pedidos p
  where p.id = p_pedido_id
  for update;

  if not found or (not v_es_admin and v_pedido.usuario_id is distinct from v_usuario) then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  select pa.id, pa.estado
  into v_pago
  from public.pagos pa
  where pa.pedido_id = p_pedido_id
  for update;

  if v_es_admin then
    if v_pedido.estado not in ('pendiente', 'confirmado') then
      raise exception 'Este pedido ya no se puede cancelar.' using errcode = 'AML05';
    end if;
  else
    if v_pedido.estado <> 'pendiente' then
      raise exception 'Solo puedes cancelar un pedido pendiente.' using errcode = 'AML05';
    end if;
    -- Si ya subió el comprobante (o ya se verificó), la cancelación la hace la tienda
    if v_pago.id is not null and v_pago.estado <> 'pendiente' then
      raise exception 'Ya enviaste tu comprobante: para cancelar comunícate con la tienda.' using errcode = 'AML05';
    end if;
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

  -- Plata recibida o por revisar: queda pendiente de devolver
  if v_pago.id is not null and v_pago.estado in ('verificado', 'en_revision') then
    v_reembolso := true;

    update public.pagos pa
    set estado = 'reembolso_pendiente', revisado_por = v_usuario, revisado_en = now()
    where pa.id = v_pago.id;

    update public.pedidos p set estado_pago = 'reembolso_pendiente' where p.id = p_pedido_id;
  end if;

  update public.pedidos p set estado = 'cancelado' where p.id = p_pedido_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (
    p_pedido_id, 'cancelado',
    coalesce(v_motivo, 'Pedido cancelado') || case when v_reembolso then ' · Reembolso pendiente' else '' end,
    v_usuario
  );

  return jsonb_build_object('id', p_pedido_id, 'estado', 'cancelado', 'reembolso_pendiente', v_reembolso);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. marcar_reembolsado
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.marcar_reembolsado(p_pago_id uuid, p_nota text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_pago record;
begin
  select pa.id, pa.estado, pa.pedido_id
  into v_pago
  from public.pagos pa
  where pa.id = p_pago_id
  for update;

  if not found then
    raise exception 'El pago no existe.' using errcode = 'AML04';
  end if;

  if v_pago.estado <> 'reembolso_pendiente' then
    raise exception 'Este pago no tiene un reembolso pendiente.' using errcode = 'AML05';
  end if;

  update public.pagos pa
  set estado = 'reembolsado', revisado_por = v_admin, revisado_en = now()
  where pa.id = p_pago_id;

  update public.pedidos p set estado_pago = 'reembolsado' where p.id = v_pago.pedido_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (v_pago.pedido_id, 'cancelado', coalesce(nullif(btrim(p_nota), ''), 'Reembolso realizado'), v_admin);

  return jsonb_build_object('id', p_pago_id, 'estado', 'reembolsado');
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. resumen_dashboard con reembolsos pendientes
-- ─────────────────────────────────────────────────────────────────────────────
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
    'reembolsos_pendientes', (
      select jsonb_build_object('pagos', count(*), 'total', coalesce(sum(pa.monto), 0))
      from public.pagos pa
      where pa.estado = 'reembolso_pendiente'
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
      where pa.estado in ('pendiente', 'en_revision', 'rechazado') and p.estado <> 'cancelado'
    ),
    'valor_inventario', (
      select coalesce(sum(p.stock * p.precio), 0) from public.productos p where p.activo = true
    )
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Permisos
-- ─────────────────────────────────────────────────────────────────────────────
revoke execute on function public.cancelar_pedido(uuid, text) from public, anon;
revoke execute on function public.marcar_reembolsado(uuid, text) from public, anon;
revoke execute on function public.resumen_dashboard() from public, anon;
grant execute on function public.cancelar_pedido(uuid, text) to authenticated;
grant execute on function public.marcar_reembolsado(uuid, text) to authenticated;
grant execute on function public.resumen_dashboard() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Verificaciones: si algo no cuadra, no se guarda nada
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pagos_estado_check' and pg_get_constraintdef(oid) like '%reembolso_pendiente%'
  ) then
    raise exception 'FRENO: pagos.estado no acepta reembolso_pendiente';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'pedidos_estado_pago_check' and pg_get_constraintdef(oid) like '%reembolsado%'
  ) then
    raise exception 'FRENO: pedidos.estado_pago no acepta reembolsado';
  end if;

  if position('reembolso_pendiente' in pg_get_functiondef('public.cancelar_pedido(uuid, text)'::regprocedure)) = 0 then
    raise exception 'FRENO: cancelar_pedido no genera reembolsos';
  end if;

  if has_function_privilege('anon', 'public.marcar_reembolsado(uuid, text)', 'execute') then
    raise exception 'FRENO: marcar_reembolsado no debe ser público';
  end if;

  if (select prosecdef from pg_proc where oid = 'public.marcar_reembolsado(uuid, text)'::regprocedure) is not true
     or (select proconfig::text from pg_proc where oid = 'public.marcar_reembolsado(uuid, text)'::regprocedure) not like '%search_path=%' then
    raise exception 'FRENO: marcar_reembolsado debe ser security definer con search_path fijo';
  end if;

  raise notice '0006 OK: cancelación protegida y reembolsos (pendiente → reembolsado)';
end $$;

commit;
