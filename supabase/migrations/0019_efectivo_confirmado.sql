-- 0019_efectivo_confirmado.sql
--
-- POR QUÉ
--   Fase 9E (compra en 3 clics). Con «Efectivo al recibir» no hay pago que revisar: el pedido
--   no tiene por qué esperar a que el admin toque «Pasar a confirmado». Nace confirmado y entra
--   directo a /almacen; el resto es el flujo de la 9D (cobra quien entrega, código de entrega y
--   «Recibí el efectivo» del admin).
--
-- QUÉ HACE
--   1. crear_pedido: con efectivo (contra_entrega) el pedido nace 'confirmado' (el pago sigue
--      'pendiente' hasta que se cobre). Línea de tiempo: «Pedido creado» y «Confirmado · pagas
--      en efectivo al recibir». Mensaje nuevo si la zona no lo permite.
--   2. cancelar_pedido: el cliente también cancela un pedido con efectivo mientras siga
--      'confirmado' y el almacén no haya empezado a prepararlo.
--   3. Pedidos con efectivo que estaban en 'pendiente': pasan a 'confirmado' (con su paso en la
--      línea de tiempo). Hoy no hay ninguno; queda por si acaso.
--   4. Nombres nuevos en lo que ve la gente: «Efectivo al recibir» (Telegram y mensajes de la
--      base) y «Comprobante (foto del pago)» (Telegram). Los valores internos no cambian
--      (contra_entrega, despachado).
--   5. Verificaciones y un recorrido de prueba que se deshace solo (y repone el número de pedido).
--
-- QUÉ NO TOCA
--   Tablas, columnas, RLS y estados: igual. No borra nada. Requiere la 0018.
--
-- CUÁNDO CORRERLA
--   ANTES de publicar el código de la 9E.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

do $$
begin
  if to_regclass('public.codigos_entrega') is null then
    raise exception 'FRENO: falta correr la 0018 (codigos_entrega no existe)';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. crear_pedido: efectivo al recibir nace confirmado
-- ─────────────────────────────────────────────────────────────────────────────
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
  -- Efectivo al recibir: no hay pago que revisar, el pedido nace confirmado y va al almacén (0019)
  v_efectivo boolean := p_metodo_pago = 'contra_entrega';
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
    raise exception 'Efectivo al recibir solo en Recojo en tienda y Distrito 1. Elige QR para esta zona.' using errcode = 'AML02';
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
    v_usuario, case when v_efectivo then 'confirmado' else 'pendiente' end, 0, 0, v_zona.costo, v_zona.id,
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

  -- Un milisegundo después, para que la línea de tiempo los muestre en este orden
  if v_efectivo then
    insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por, created_at)
    values (v_pedido_id, 'confirmado', 'Confirmado · pagas en efectivo al recibir', v_usuario, now() + interval '1 millisecond');
  end if;

  return jsonb_build_object('id', v_pedido_id, 'codigo', v_codigo, 'total', v_total,
    'estado', case when v_efectivo then 'confirmado' else 'pendiente' end);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. cancelar_pedido: el cliente cancela efectivo confirmado si el almacén no empezó
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
  select p.id, p.codigo, p.estado, p.usuario_id, p.metodo_pago, p.preparacion_en
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
    if v_pedido.estado not in ('pendiente', 'confirmado', 'preparando', 'empacado') then
      raise exception 'Este pedido ya no se puede cancelar.' using errcode = 'AML05';
    end if;
  else
    -- Efectivo al recibir nace confirmado (0019): el cliente lo cancela mientras el almacén no empiece
    if not (
      v_pedido.estado = 'pendiente'
      or (v_pedido.estado = 'confirmado' and v_pedido.metodo_pago = 'contra_entrega' and v_pedido.preparacion_en is null)
    ) then
      raise exception 'La tienda ya está preparando tu pedido: para cancelar comunícate con la tienda.' using errcode = 'AML05';
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

  -- Un faltante abierto se cierra con la cancelación (no se borra)
  update public.faltantes_pedido f
  set resuelto_en = now(), resuelto_por = v_usuario, nota_resolucion = 'Pedido cancelado'
  where f.pedido_id = p_pedido_id and f.resuelto_en is null;

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
-- 3. entregar_pedido: igual que en la 0018, con el nombre nuevo en el mensaje
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.entregar_pedido(
  p_pedido_id uuid,
  p_codigo text,
  p_recibe_nombre text,
  p_recibe_ci text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid;
  v_pedido record;
  v_codigo record;
  v_nombre text := nullif(btrim(p_recibe_nombre), '');
  v_ci text := nullif(btrim(p_recibe_ci), '');
  v_intentos integer;
  v_estado text;
begin
  select p.id, p.estado, p.metodo_pago, p.despachado_por, z.tipo as tipo_zona
  into v_pedido
  from public.pedidos p
  left join public.zonas_envio z on z.id = p.zona_envio_id
  where p.id = p_pedido_id
  for update of p;

  if not found then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  v_usuario := public.aml_puede_entregar(v_pedido.tipo_zona, v_pedido.estado, v_pedido.despachado_por);

  if p_codigo is null or btrim(p_codigo) !~ '^[0-9]{4}$' then
    raise exception 'Escribe el código de 4 dígitos que tiene el cliente.' using errcode = 'AML02';
  end if;

  if v_nombre is null or length(v_nombre) < 3 or length(v_nombre) > 120 then
    raise exception 'Escribe el nombre de quien recibe (de 3 a 120 letras).' using errcode = 'AML02';
  end if;

  if v_ci is not null and (length(v_ci) < 4 or length(v_ci) > 20) then
    raise exception 'El CI va de 4 a 20 caracteres.' using errcode = 'AML02';
  end if;

  if v_pedido.metodo_pago = 'contra_entrega' and not exists (
    select 1 from public.pagos pa where pa.pedido_id = p_pedido_id and pa.cobrado_en is not null
  ) then
    raise exception 'Primero registra el cobro: este pedido se paga en efectivo al recibir.' using errcode = 'AML05';
  end if;

  select c.codigo, c.intentos_fallidos, c.bloqueado_en, c.usado_en
  into v_codigo
  from public.codigos_entrega c
  where c.pedido_id = p_pedido_id
  for update;

  if not found then
    raise exception 'Este pedido no tiene código de entrega. Avisa a la tienda.' using errcode = 'AML05';
  end if;

  if v_codigo.bloqueado_en is not null then
    return jsonb_build_object('ok', false, 'bloqueado', true, 'intentos_restantes', 0);
  end if;

  if btrim(p_codigo) <> v_codigo.codigo then
    v_intentos := v_codigo.intentos_fallidos + 1;

    update public.codigos_entrega c
    set intentos_fallidos = v_intentos,
        bloqueado_en = case when v_intentos >= 5 then now() end
    where c.pedido_id = p_pedido_id;

    if v_intentos >= 5 then
      insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
      values (p_pedido_id, v_pedido.estado, 'Entrega en pausa: el código se bloqueó tras 5 intentos. La tienda lo revisará.', v_usuario);
    end if;

    return jsonb_build_object('ok', false, 'bloqueado', v_intentos >= 5, 'intentos_restantes', greatest(5 - v_intentos, 0));
  end if;

  update public.codigos_entrega c set usado_en = now() where c.pedido_id = p_pedido_id;

  v_estado := public.aml_marcar_entregado(
    p_pedido_id, v_usuario, v_nombre, v_ci,
    'Entregado a ' || v_nombre || coalesce(' · CI ' || v_ci, '') ||
      case when v_pedido.tipo_zona = 'recojo' then ' · en tienda' else '' end
  );

  return jsonb_build_object('ok', true, 'id', p_pedido_id, 'estado', v_estado);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Telegram: nombres nuevos
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.aml_trg_aviso_pedido_nuevo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  -- Corre al commit: crear_pedido ya calculó el total
  select p.id, p.codigo, p.usuario_id, p.metodo_pago, p.total, p.created_at,
         u.nombre as cliente, z.nombre as zona
  into v
  from public.pedidos p
  left join public.perfiles u on u.id = p.usuario_id
  left join public.zonas_envio z on z.id = p.zona_envio_id
  where p.id = new.id;

  if not found or public.aml_es_cuenta_prueba(v.usuario_id) then
    return null;
  end if;

  perform public.aml_enviar_telegram(
    '🛒 Pedido nuevo ' || coalesce(v.codigo, '') || E'\n' ||
    'Cliente: ' || coalesce(nullif(btrim(v.cliente), ''), 'Sin nombre') || E'\n' ||
    'Zona: ' || coalesce(v.zona, 'Sin zona') || E'\n' ||
    'Pago: ' || case v.metodo_pago
                  when 'qr' then 'QR'
                  when 'transferencia' then 'Transferencia'
                  when 'contra_entrega' then 'Efectivo al recibir (confirmado, ya está en el almacén)'
                  else coalesce(v.metodo_pago, '-') end || E'\n' ||
    'Total: ' || public.aml_formato_bs(v.total) || E'\n' ||
    public.aml_hora_bolivia(v.created_at) || E'\n' ||
    public.aml_url_sitio() || '/admin/pedidos?codigo=' || coalesce(v.codigo, '')
  );
  return null;
exception when others then
  raise warning 'Aviso de pedido nuevo omitido (SQLSTATE %)', sqlstate;
  return null;
end;
$$;

create or replace function public.aml_trg_aviso_comprobante()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  select p.codigo, p.usuario_id
  into v
  from public.pedidos p
  where p.id = new.pedido_id;

  if not found or public.aml_es_cuenta_prueba(v.usuario_id) then
    return null;
  end if;

  perform public.aml_enviar_telegram(
    '🧾 Comprobante (foto del pago) por revisar ' || coalesce(v.codigo, '') || E'\n' ||
    'Monto: ' || public.aml_formato_bs(new.monto) || E'\n' ||
    public.aml_hora_bolivia(now()) || E'\n' ||
    public.aml_url_sitio() || '/admin/pagos'
  );
  return null;
exception when others then
  raise warning 'Aviso de comprobante omitido (SQLSTATE %)', sqlstate;
  return null;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Pedidos con efectivo que quedaron en pendiente → confirmado
-- ─────────────────────────────────────────────────────────────────────────────
with confirmados as (
  update public.pedidos p
  set estado = 'confirmado'
  where p.metodo_pago = 'contra_entrega' and p.estado = 'pendiente'
  returning p.id
)
insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
select c.id, 'confirmado', 'Confirmado al cambiar el flujo de efectivo al recibir', null
from confirmados c;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Permisos (mismas firmas: se repiten para que quede escrito)
-- ─────────────────────────────────────────────────────────────────────────────
revoke execute on function public.crear_pedido(jsonb, uuid, text, text, text, text, text, text) from public, anon;
revoke execute on function public.cancelar_pedido(uuid, text) from public, anon;
revoke execute on function public.entregar_pedido(uuid, text, text, text) from public, anon;
revoke execute on function public.aml_trg_aviso_pedido_nuevo() from public, anon, authenticated;
revoke execute on function public.aml_trg_aviso_comprobante() from public, anon, authenticated;

grant execute on function public.crear_pedido(jsonb, uuid, text, text, text, text, text, text) to authenticated;
grant execute on function public.cancelar_pedido(uuid, text) to authenticated;
grant execute on function public.entregar_pedido(uuid, text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Verificaciones: si algo no cuadra, no se guarda nada
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_funcion text;
  v_cli uuid := gen_random_uuid();
  v_alm uuid := gen_random_uuid();
  v_zona_ef uuid;
  v_zona_no uuid;
  v_producto uuid;
  v_items jsonb;
  v_a uuid;
  v_b uuid;
  v_c uuid;
  v_res jsonb;
  v_linea jsonb;
  v_estado text;
  v_estado_pago text;
  v_ultimo bigint;
  v_llamado boolean;
begin
  foreach v_funcion in array array['crear_pedido', 'cancelar_pedido', 'entregar_pedido', 'aml_trg_aviso_pedido_nuevo', 'aml_trg_aviso_comprobante'] loop
    if not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = v_funcion
        and p.proconfig is not null and 'search_path=""' = any (p.proconfig)
    ) then
      raise exception 'FRENO: % no existe o no tiene search_path vacío', v_funcion;
    end if;
  end loop;

  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'crear_pedido') <> 1 then
    raise exception 'FRENO: hay más de una versión de crear_pedido';
  end if;

  if has_function_privilege('anon', 'public.crear_pedido(jsonb, uuid, text, text, text, text, text, text)', 'execute')
     or has_function_privilege('anon', 'public.cancelar_pedido(uuid, text)', 'execute') then
    raise exception 'FRENO: crear_pedido o cancelar_pedido quedaron públicos';
  end if;

  if position('Contra entrega' in pg_get_functiondef('public.aml_trg_aviso_pedido_nuevo()'::regprocedure)) > 0 then
    raise exception 'FRENO: el aviso de pedido nuevo todavía dice «Contra entrega»';
  end if;

  if exists (select 1 from public.pedidos where metodo_pago = 'contra_entrega' and estado = 'pendiente') then
    raise exception 'FRENO: quedaron pedidos con efectivo en pendiente';
  end if;

  select z.id into v_zona_ef from public.zonas_envio z
  where z.activo and z.permite_contra_entrega order by (z.tipo = 'recojo') desc, z.orden limit 1;
  select z.id into v_zona_no from public.zonas_envio z
  where z.activo and not z.permite_contra_entrega order by z.orden limit 1;
  select p.id into v_producto from public.productos p
  where p.activo and p.stock >= 3 order by p.stock desc limit 1;

  if v_zona_ef is null or v_zona_no is null or v_producto is null then
    raise exception 'FRENO: faltan zonas (con y sin efectivo) o un producto con stock para el recorrido de prueba';
  end if;

  v_items := jsonb_build_array(jsonb_build_object('producto_id', v_producto, 'cantidad', 1));

  -- La prueba usa números de pedido: se guardan para reponerlos al final (la secuencia no se deshace sola)
  select s.last_value, s.is_called into v_ultimo, v_llamado from public.pedidos_codigo_seq s;

  -- Recorrido. Todo se deshace con la excepción AMLOK. Cuentas .test: no avisa por Telegram.
  begin
    insert into auth.users (id, aud, role, email, raw_user_meta_data)
    values
      (v_cli, 'authenticated', 'authenticated', 'cliente.0019@amlagrotech.test', '{"nombre": "Cliente Prueba 0019"}'),
      (v_alm, 'authenticated', 'authenticated', 'almacen.0019@amlagrotech.test', '{"nombre": "Almacén Prueba 0019"}');
    update public.perfiles set rol = 'almacen' where id = v_alm;

    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);

    -- A: efectivo → nace confirmado, con el pago pendiente
    v_res := public.crear_pedido(v_items, v_zona_ef, 'Calle de prueba 1', '70000000', 'contra_entrega', null, 'Cliente Prueba', '1234567');
    v_a := (v_res->>'id')::uuid;
    select p.estado, p.estado_pago into v_estado, v_estado_pago from public.pedidos p where p.id = v_a;
    if v_estado <> 'confirmado' or v_estado_pago <> 'pendiente' or v_res->>'estado' <> 'confirmado' then
      raise exception 'FRENO: un pedido con efectivo nació en % / pago %', v_estado, v_estado_pago;
    end if;

    v_linea := public.linea_tiempo_pedido(v_a);
    if jsonb_array_length(v_linea) <> 2 or v_linea->0->>'estado' <> 'pendiente' or v_linea->1->>'estado' <> 'confirmado' then
      raise exception 'FRENO: la línea de tiempo del efectivo no es «Pedido creado» y luego «Confirmado»: %', v_linea;
    end if;

    -- C: QR → sigue pendiente
    v_res := public.crear_pedido(v_items, v_zona_ef, 'Calle de prueba 1', '70000000', 'qr', null, 'Cliente Prueba', '1234567');
    v_c := (v_res->>'id')::uuid;
    if (select p.estado from public.pedidos p where p.id = v_c) <> 'pendiente' then
      raise exception 'FRENO: un pedido con QR no quedó pendiente';
    end if;

    -- Zona sin efectivo: se rechaza con el mensaje nuevo
    begin
      perform public.crear_pedido(v_items, v_zona_no, 'Calle de prueba 1', '70000000', 'contra_entrega', null, 'Cliente Prueba', '1234567');
      raise exception 'FRENO: se aceptó efectivo en una zona que no lo permite';
    exception when sqlstate 'AML02' then
      if sqlerrm not like 'Efectivo al recibir solo en%' then
        raise exception 'FRENO: el mensaje de zona sin efectivo es «%»', sqlerrm;
      end if;
    end;

    -- B: efectivo que el almacén ya empezó a preparar
    v_res := public.crear_pedido(v_items, v_zona_ef, 'Calle de prueba 1', '70000000', 'contra_entrega', null, 'Cliente Prueba', '1234567');
    v_b := (v_res->>'id')::uuid;

    perform set_config('request.jwt.claims', json_build_object('sub', v_alm, 'role', 'authenticated')::text, true);
    if not exists (select 1 from jsonb_array_elements(public.cola_almacen()) e where (e->>'id')::uuid = v_a) then
      raise exception 'FRENO: el pedido con efectivo no entró a la cola del almacén';
    end if;
    perform public.empezar_preparacion(v_b);

    -- El cliente cancela A (confirmado, sin empezar) pero no B (en preparación)
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    perform public.cancelar_pedido(v_a, 'Me equivoqué');
    if (select p.estado from public.pedidos p where p.id = v_a) <> 'cancelado' then
      raise exception 'FRENO: el cliente no pudo cancelar su pedido con efectivo sin empezar';
    end if;

    begin
      perform public.cancelar_pedido(v_b, 'Ya no lo quiero');
      raise exception 'FRENO: el cliente canceló un pedido que el almacén ya estaba preparando';
    exception when sqlstate 'AML05' then null;
    end;

    perform public.cancelar_pedido(v_c, 'Prueba');

    raise exception using errcode = 'P0001', message = 'AMLOK';
  exception
    when raise_exception then
      if sqlerrm <> 'AMLOK' then raise; end if;
  end;

  perform set_config('request.jwt.claims', '', true);
  perform setval('public.pedidos_codigo_seq', v_ultimo, v_llamado);

  if exists (select 1 from auth.users where id in (v_cli, v_alm))
     or exists (select 1 from public.pedidos where id in (v_a, v_b, v_c)) then
    raise exception 'FRENO: el recorrido de prueba no se deshizo';
  end if;

  raise notice '0019 OK: efectivo al recibir nace confirmado y entra al almacén; el cliente lo cancela hasta que se empiece a preparar';
end;
$$;

commit;
