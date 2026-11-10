-- 0007_recojo_y_flota.sql
--
-- POR QUÉ
--   La auditoría (9 nov 2026) encontró que un pedido de "Recojo en tienda" tenía que
--   pasar por "Despachado / En camino", y que para Sucre (terminal de buses), Culpina e
--   Incahuasi se pedía una dirección cuando lo que hace falta es saber quién recoge la
--   encomienda en la flota.
--
-- REQUIERE
--   0003 (funciones de comercio). Correr después de la 0006.
--
-- QUÉ HACE
--   1. Estado nuevo de pedido: listo_para_recoger (también en envios.estado).
--   2. pedidos: columnas recoge_nombre y recoge_ci (quién recoge en la flota).
--   3. crear_pedido: recibe p_recoge_nombre y p_recoge_ci (opcionales en la firma).
--        - urbano (entrega en el pueblo): dirección obligatoria.
--        - provincia (por flota): nombre y CI de quien recoge obligatorios; dirección no.
--        - recojo: nada extra.
--   4. cambiar_estado_pedido:
--        - Recojo en tienda: pendiente → confirmado → preparando → listo_para_recoger → entregado.
--        - El resto, como antes: … → preparando → despachado → entregado.
--   5. Verifica columnas, estados, firmas y permisos dentro de la transacción.
--
-- QUÉ NO TOCA
--   Pedidos existentes: siguen con su estado. No borra nada.
--
-- ORDEN
--   Correr la migración y, en seguida, publicar el código de la fase 6B (la API manda
--   p_recoge_nombre y p_recoge_ci). El código viejo sigue funcionando para recojo y pueblo.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Estado nuevo y columnas
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.pedidos drop constraint if exists pedidos_estado_check;
alter table public.pedidos add constraint pedidos_estado_check
  check (estado in ('pendiente', 'confirmado', 'preparando', 'listo_para_recoger', 'despachado', 'entregado', 'cancelado'));

alter table public.envios drop constraint if exists envios_estado_check;
alter table public.envios add constraint envios_estado_check
  check (estado in ('por_despachar', 'listo_para_recoger', 'en_camino', 'entregado'));

alter table public.pedidos add column if not exists recoge_nombre text;
alter table public.pedidos add column if not exists recoge_ci text;

alter table public.pedidos drop constraint if exists pedidos_recoge_nombre_largo;
alter table public.pedidos add constraint pedidos_recoge_nombre_largo
  check (recoge_nombre is null or char_length(recoge_nombre) between 3 and 100);

-- CI boliviano: 5 a 10 dígitos, con complemento opcional (ej.: 1234567, 1234567-1B, 1234567 CH)
alter table public.pedidos drop constraint if exists pedidos_recoge_ci_formato;
alter table public.pedidos add constraint pedidos_recoge_ci_formato
  check (recoge_ci is null or recoge_ci ~ '^[0-9]{5,10}([ -]?[0-9A-Za-z]{1,3})?$');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. crear_pedido con quién recoge
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.crear_pedido(jsonb, uuid, text, text, text, text);

create or replace function public.crear_pedido(
  p_items jsonb,
  p_zona_id uuid,
  p_direccion text,
  p_telefono text,
  p_metodo_pago text,
  p_notas text,
  p_recoge_nombre text default null,
  p_recoge_ci text default null
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
  v_recoge_nombre text := nullif(btrim(p_recoge_nombre), '');
  v_recoge_ci text := upper(nullif(btrim(p_recoge_ci), ''));
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

  if v_zona.tipo = 'urbano' and v_direccion is null then
    raise exception 'La dirección de entrega es obligatoria.' using errcode = 'AML02';
  end if;

  if v_zona.tipo = 'provincia' then
    if v_recoge_nombre is null or char_length(v_recoge_nombre) < 3 then
      raise exception 'Indica el nombre de quien recoge la encomienda.' using errcode = 'AML02';
    end if;
    if v_recoge_ci is null or v_recoge_ci !~ '^[0-9]{5,10}([ -]?[0-9A-Z]{1,3})?$' then
      raise exception 'El CI de quien recoge no es válido.' using errcode = 'AML02';
    end if;
  else
    v_recoge_nombre := null;
    v_recoge_ci := null;
  end if;

  if v_zona.tipo = 'recojo' then
    v_direccion := null;
  end if;

  insert into public.pedidos (
    usuario_id, estado, total, subtotal, costo_envio, zona_envio_id,
    direccion_entrega, telefono_contacto, notas, metodo_pago, estado_pago,
    recoge_nombre, recoge_ci
  )
  values (
    v_usuario, 'pendiente', 0, 0, v_zona.costo, v_zona.id,
    v_direccion, v_telefono, nullif(btrim(p_notas), ''), p_metodo_pago, 'pendiente',
    v_recoge_nombre, v_recoge_ci
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
-- 3. cambiar_estado_pedido con camino de recojo
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

  select z.tipo into v_tipo_zona
  from public.zonas_envio z
  where z.id = v_pedido.zona_envio_id;

  if v_tipo_zona = 'recojo' then
    v_siguiente := case v_pedido.estado
      when 'pendiente' then 'confirmado'
      when 'confirmado' then 'preparando'
      when 'preparando' then 'listo_para_recoger'
      when 'listo_para_recoger' then 'entregado'
    end;
  else
    v_siguiente := case v_pedido.estado
      when 'pendiente' then 'confirmado'
      when 'confirmado' then 'preparando'
      when 'preparando' then 'despachado'
      when 'despachado' then 'entregado'
    end;
  end if;

  if v_siguiente is null or p_estado is distinct from v_siguiente then
    raise exception 'Un pedido % no puede pasar a %.', v_pedido.estado, coalesce(p_estado, 'ese estado')
      using errcode = 'AML05';
  end if;

  if p_estado in ('confirmado', 'preparando', 'listo_para_recoger', 'despachado')
     and v_pedido.metodo_pago is distinct from 'contra_entrega'
     and v_pedido.estado_pago <> 'verificado' then
    raise exception 'El pago de este pedido todavía no está verificado.' using errcode = 'AML05';
  end if;

  if p_estado = 'listo_para_recoger' then
    update public.envios e
    set estado = 'listo_para_recoger'
    where e.pedido_id = p_pedido_id;
  end if;

  if p_estado = 'despachado' then
    if v_tipo_zona = 'provincia' and (v_transportista is null or v_guia is null) then
      raise exception 'Para despachar por flota indica la empresa de flota y el número de guía.'
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
-- 4. Permisos
-- ─────────────────────────────────────────────────────────────────────────────
revoke execute on function public.crear_pedido(jsonb, uuid, text, text, text, text, text, text) from public, anon;
revoke execute on function public.cambiar_estado_pedido(uuid, text, text, text, text) from public, anon;
grant execute on function public.crear_pedido(jsonb, uuid, text, text, text, text, text, text) to authenticated;
grant execute on function public.cambiar_estado_pedido(uuid, text, text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Verificaciones: si algo no cuadra, no se guarda nada
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name in ('recoge_nombre', 'recoge_ci')
    having count(*) = 2
  ) then
    raise exception 'FRENO: faltan las columnas recoge_nombre / recoge_ci';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'pedidos_estado_check' and pg_get_constraintdef(oid) like '%listo_para_recoger%'
  ) then
    raise exception 'FRENO: pedidos.estado no acepta listo_para_recoger';
  end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'crear_pedido' and p.pronargs = 6
  ) then
    raise exception 'FRENO: quedó la versión vieja de crear_pedido';
  end if;

  if position('listo_para_recoger' in pg_get_functiondef('public.cambiar_estado_pedido(uuid, text, text, text, text)'::regprocedure)) = 0 then
    raise exception 'FRENO: cambiar_estado_pedido no conoce el camino de recojo';
  end if;

  if has_function_privilege('anon', 'public.crear_pedido(jsonb, uuid, text, text, text, text, text, text)', 'execute') then
    raise exception 'FRENO: crear_pedido no debe ser público';
  end if;

  -- El CI se valida con la misma regla en la tabla
  if '1234567-1B' !~ '^[0-9]{5,10}([ -]?[0-9A-Za-z]{1,3})?$' or 'abc' ~ '^[0-9]{5,10}([ -]?[0-9A-Za-z]{1,3})?$' then
    raise exception 'FRENO: la regla del CI no se comporta como se espera';
  end if;

  raise notice '0007 OK: recojo con "Listo para recoger" y flota con nombre y CI de quien recoge';
end $$;

commit;
