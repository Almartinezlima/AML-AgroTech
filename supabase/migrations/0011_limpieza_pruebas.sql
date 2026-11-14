-- 0011_limpieza_pruebas.sql
--
-- POR QUÉ
--   Las pruebas E2E corren contra la base real. Cada pedido que crean tiene que quedar
--   cerrado al terminar (stock devuelto, nada por cobrar) y el panel no debe mezclar los
--   datos de prueba con las ventas reales. Fase 2B (14 nov 2026).
--
-- QUÉ HACE
--   1. aml_es_cuenta_prueba(usuario): ¿el perfil tiene correo @amlagrotech.test? Interna.
--   2. anular_pedido_prueba(pedido): solo admin activo y solo pedidos de cuentas
--      @amlagrotech.test. Cancela en CUALQUIER estado (también entregado), devuelve el
--      stock con su "devolucion" en el kardex ("Limpieza E2E AML-…"), deja el pago como
--      reembolsado si hubo plata en juego y anota el seguimiento. Si el pedido ya estaba
--      cancelado no devuelve stock otra vez (se puede llamar dos veces).
--   3. resumen_dashboard(p_incluir_pruebas default false): el dashboard sin pedidos ni
--      pagos de cuentas de prueba. Llamarla sin parámetros sigue funcionando.
--
-- QUÉ NO TOCA
--   No borra nada: pedidos, kardex, seguimiento y cuentas se conservan. No cambia
--   cancelar_pedido ni ningún pedido de cuentas reales.
--
-- CUÁNDO CORRERLA
--   DESPUÉS de unir el PR de fase/2b-pruebas-limpias y de que Render publique
--   (el código funciona sin ella), y ANTES de correr las E2E.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ¿Es una cuenta de prueba?
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.aml_es_cuenta_prueba(p_usuario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles u
    where u.id = p_usuario_id and lower(u.email) like '%@amlagrotech.test'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. anular_pedido_prueba
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.anular_pedido_prueba(p_pedido_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_pedido record;
  v_item record;
  v_stock integer;
  v_ya_estaba boolean;
begin
  select p.id, p.codigo, p.estado, p.usuario_id
  into v_pedido
  from public.pedidos p
  where p.id = p_pedido_id
  for update;

  if not found then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  if not public.aml_es_cuenta_prueba(v_pedido.usuario_id) then
    raise exception 'Solo se pueden anular pedidos de cuentas de prueba (@amlagrotech.test).' using errcode = 'AML03';
  end if;

  v_ya_estaba := v_pedido.estado = 'cancelado';

  -- Un pedido ya cancelado devolvió su stock al cancelarse: no se devuelve dos veces
  if not v_ya_estaba then
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
        'Limpieza E2E ' || v_pedido.codigo, p_pedido_id, v_admin
      );
    end loop;
  end if;

  -- Plata de prueba recibida, en revisión o por devolver: queda cerrada como reembolsada
  update public.pagos pa
  set estado = 'reembolsado', revisado_por = v_admin, revisado_en = now()
  where pa.pedido_id = p_pedido_id
    and pa.estado in ('verificado', 'en_revision', 'reembolso_pendiente');

  if found then
    update public.pedidos p set estado_pago = 'reembolsado' where p.id = p_pedido_id;
  end if;

  if not v_ya_estaba then
    update public.pedidos p set estado = 'cancelado' where p.id = p_pedido_id;

    insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
    values (p_pedido_id, 'cancelado', 'Anulado: pedido de prueba automática (E2E)', v_admin);
  end if;

  return jsonb_build_object('id', p_pedido_id, 'estado', 'cancelado', 'ya_estaba_cancelado', v_ya_estaba);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. resumen_dashboard sin datos de prueba (por defecto)
-- ─────────────────────────────────────────────────────────────────────────────
-- Se cambia la firma: hay que borrar la vieja para que no queden dos
drop function if exists public.resumen_dashboard();

create or replace function public.resumen_dashboard(p_incluir_pruebas boolean default false)
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
  v_todas boolean := coalesce(p_incluir_pruebas, false);
begin
  return jsonb_build_object(
    'ventas_hoy', (
      select jsonb_build_object('total', coalesce(sum(p.total), 0), 'pedidos', count(*))
      from public.pedidos p
      where p.estado <> 'cancelado' and p.created_at >= v_hoy
        and (v_todas or not public.aml_es_cuenta_prueba(p.usuario_id))
    ),
    'ventas_mes', (
      select jsonb_build_object('total', coalesce(sum(p.total), 0), 'pedidos', count(*))
      from public.pedidos p
      where p.estado <> 'cancelado' and p.created_at >= v_mes
        and (v_todas or not public.aml_es_cuenta_prueba(p.usuario_id))
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
              and (v_todas or not public.aml_es_cuenta_prueba(p.usuario_id))
          ), 0) as total
        from generate_series(date_trunc('day', v_ahora) - interval '6 days', date_trunc('day', v_ahora), interval '1 day') as s(dia)
      ) d
    ),
    'pedidos_por_estado', (
      select coalesce(jsonb_agg(jsonb_build_object('estado', e.estado, 'total', e.total) order by e.total desc), '[]'::jsonb)
      from (
        select p.estado, count(*) as total
        from public.pedidos p
        where v_todas or not public.aml_es_cuenta_prueba(p.usuario_id)
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
          and (v_todas or not public.aml_es_cuenta_prueba(p.usuario_id))
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
        and (v_todas or not public.aml_es_cuenta_prueba(p.usuario_id))
    ),
    'reembolsos_pendientes', (
      select jsonb_build_object('pagos', count(*), 'total', coalesce(sum(pa.monto), 0))
      from public.pagos pa
      join public.pedidos p on p.id = pa.pedido_id
      where pa.estado = 'reembolso_pendiente'
        and (v_todas or not public.aml_es_cuenta_prueba(p.usuario_id))
    ),
    'cobrado', (
      select coalesce(sum(pa.monto), 0)
      from public.pagos pa
      join public.pedidos p on p.id = pa.pedido_id
      where pa.estado = 'verificado' and p.estado <> 'cancelado'
        and (v_todas or not public.aml_es_cuenta_prueba(p.usuario_id))
    ),
    'por_cobrar', (
      select coalesce(sum(pa.monto), 0)
      from public.pagos pa
      join public.pedidos p on p.id = pa.pedido_id
      where pa.estado in ('pendiente', 'en_revision', 'rechazado') and p.estado <> 'cancelado'
        and (v_todas or not public.aml_es_cuenta_prueba(p.usuario_id))
    ),
    'valor_inventario', (
      select coalesce(sum(p.stock * p.precio), 0) from public.productos p where p.activo = true
    )
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Permisos: la auxiliar es interna; las otras dos, solo usuarios con sesión
--    (adentro exigen admin activo)
-- ─────────────────────────────────────────────────────────────────────────────
revoke execute on function public.aml_es_cuenta_prueba(uuid) from public, anon, authenticated;
revoke execute on function public.anular_pedido_prueba(uuid) from public, anon;
revoke execute on function public.resumen_dashboard(boolean) from public, anon;
grant execute on function public.anular_pedido_prueba(uuid) to authenticated;
grant execute on function public.resumen_dashboard(boolean) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificaciones: si algo no cuadra, no se guarda nada
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regprocedure('public.resumen_dashboard()') is not null then
    raise exception 'FRENO: quedó la versión vieja de resumen_dashboard sin parámetros';
  end if;

  if to_regprocedure('public.resumen_dashboard(boolean)') is null
     or to_regprocedure('public.anular_pedido_prueba(uuid)') is null
     or to_regprocedure('public.aml_es_cuenta_prueba(uuid)') is null then
    raise exception 'FRENO: falta alguna función de la 0011';
  end if;

  if has_function_privilege('anon', 'public.anular_pedido_prueba(uuid)', 'execute')
     or has_function_privilege('anon', 'public.resumen_dashboard(boolean)', 'execute') then
    raise exception 'FRENO: anon puede ejecutar funciones de admin';
  end if;

  if has_function_privilege('authenticated', 'public.aml_es_cuenta_prueba(uuid)', 'execute') then
    raise exception 'FRENO: aml_es_cuenta_prueba debe ser interna';
  end if;

  if not has_function_privilege('authenticated', 'public.anular_pedido_prueba(uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.resumen_dashboard(boolean)', 'execute') then
    raise exception 'FRENO: authenticated no puede llamar a las funciones de la API';
  end if;

  -- El filtro reconoce las cuentas de prueba que ya existen y no marca a ningún admin
  if not exists (select 1 from public.perfiles u where public.aml_es_cuenta_prueba(u.id)) then
    raise exception 'FRENO: aml_es_cuenta_prueba no reconoce ninguna cuenta @amlagrotech.test';
  end if;

  if exists (select 1 from public.perfiles u where u.rol = 'admin' and public.aml_es_cuenta_prueba(u.id)) then
    raise exception 'FRENO: hay un admin con correo de prueba: el dashboard lo ocultaría';
  end if;

  raise notice '0011 OK: anular_pedido_prueba, resumen_dashboard(p_incluir_pruebas) y aml_es_cuenta_prueba interna';
end $$;

commit;
