-- 0020_flujo_final.sql
--
-- POR QUÉ
--   Fase 9F (flujo final). Tres roles en el flujo de compra: cliente, admin y repartidor.
--   Solo se paga con QR. El admin prepara y deja "Listo para salir"; los repartidores son personas
--   externas que se avisan por un grupo de Telegram, aceptan la entrega (el primero se la lleva),
--   la recogen en tienda y la entregan con el código del cliente. Ganan el costo de envío y el
--   admin les paga lo acumulado.
--
-- QUÉ HACE
--   1. Solo QR: crear_pedido rechaza efectivo y transferencia; ninguna zona permite efectivo.
--      Nada se borra: los pagos viejos quedan como están. registrar_cobro_entrega y
--      confirmar_efectivo dejan de poder llamarse desde la API.
--   2. Sin rol Almacén: la cuenta que lo tenga pasa a cliente y el rol sale de perfiles_rol_check.
--      Preparar, faltantes y "Listo para salir" (empacar_pedido) quedan solo para el admin.
--      El cliente cancela solo mientras el pedido siga pendiente.
--   3. Repartidores externos:
--      - repartidores_estado: "Estoy disponible / No disponible" (cambiar_disponibilidad).
--      - pedidos.repartidor_id / aceptado_en: quién aceptó la entrega.
--      - panel_repartidor(): disponibilidad, entregas disponibles (sin nombre ni teléfono del
--        cliente), mis entregas, ganado y por cobrar. Una sola llamada.
--      - aceptar_entrega(): atómica (bloquea la fila); el primero se la lleva.
--      - tomar_pedido(): ahora es "Recogí el pedido en tienda" y solo lo hace quien aceptó.
--      - liberar_entrega(): el admin la vuelve a dejar disponible (y se publica otra vez).
--   4. Pago a repartidores: tabla pagos_repartidor y pedidos.pago_repartidor_id.
--      deudas_repartidores() (admin) y pagar_repartidor() (marca todo lo entregado sin pagar,
--      con quién y cuándo; frena si el monto cambió mientras el admin miraba).
--   5. Telegram al grupo de repartidores cuando un pedido a domicilio queda "Listo para salir"
--      (o se libera). Chat en Vault: aml_telegram_chat_repartidores. Sin secreto no envía nada.
--      Cuentas @amlagrotech.test no avisan.
--   6. Permisos, verificaciones y un recorrido de prueba que se deshace solo.
--
-- QUÉ NO TOCA
--   No borra filas. Por flota sigue igual (el admin despacha con empresa y guía; el cliente
--   confirma "Recibí mi pedido"). El rol distribuidor (abastecimiento) sigue igual.
--   es_almacen() queda (devuelve false para todos) para no romper funciones viejas.
--
-- CUÁNDO CORRERLA
--   ANTES de publicar el código de la 9F. Requiere la 0019.
--   Si quedan pedidos abiertos con efectivo o transferencia, FRENA: cancélalos antes desde /admin.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'crear_pedido'
      and pg_get_functiondef(p.oid) like '%Confirmado · pagas en efectivo al recibir%'
  ) and to_regclass('public.pagos_repartidor') is null then
    raise exception 'FRENO: falta correr la 0019';
  end if;

  if exists (
    select 1 from public.pedidos p
    where p.metodo_pago <> 'qr' and p.estado not in ('cancelado', 'entregado', 'completado')
  ) then
    raise exception 'FRENO: hay pedidos abiertos con efectivo o transferencia (%). Cancélalos desde /admin y vuelve a correr la 0020.',
      (select string_agg(p.codigo, ', ' order by p.codigo) from public.pedidos p
       where p.metodo_pago <> 'qr' and p.estado not in ('cancelado', 'entregado', 'completado'));
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Solo QR
-- ─────────────────────────────────────────────────────────────────────────────
update public.zonas_envio z set permite_contra_entrega = false where z.permite_contra_entrega;

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

  -- Fase 9F: solo QR (el parámetro se mantiene para no cambiar la firma)
  if p_metodo_pago is distinct from 'qr' then
    raise exception 'Solo se paga con QR.' using errcode = 'AML02';
  end if;

  if v_telefono is null then
    raise exception 'El teléfono es obligatorio.' using errcode = 'AML02';
  end if;

  select z.id, z.tipo, z.costo
  into v_zona
  from public.zonas_envio z
  where z.id = p_zona_id and z.activo = true;

  if not found then
    raise exception 'La zona de envío no está disponible.' using errcode = 'AML04';
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
    v_direccion, v_telefono, nullif(btrim(p_notas), ''), 'qr', 'pendiente',
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
  values (v_pedido_id, 'qr', v_total);

  insert into public.envios (pedido_id, zona_envio_id)
  values (v_pedido_id, v_zona.id);

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (v_pedido_id, 'pendiente', 'Pedido creado', v_usuario);

  return jsonb_build_object('id', v_pedido_id, 'codigo', v_codigo, 'total', v_total, 'estado', 'pendiente');
end;
$$;

-- El cliente cancela solo mientras el pedido siga pendiente y sin comprobante.
-- El admin: pendiente, confirmado, preparando o listo para salir (aunque un repartidor la haya aceptado).
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
    if v_pedido.estado not in ('pendiente', 'confirmado', 'preparando', 'empacado') then
      raise exception 'Este pedido ya no se puede cancelar.' using errcode = 'AML05';
    end if;
  else
    if v_pedido.estado <> 'pendiente' then
      raise exception 'La tienda ya está preparando tu pedido: para cancelar comunícate con la tienda.' using errcode = 'AML05';
    end if;
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
-- 2. Sin rol Almacén
-- ─────────────────────────────────────────────────────────────────────────────
-- Se corre como postgres: proteger_campos_perfil deja pasar a los roles internos
update public.perfiles set rol = 'cliente' where rol = 'almacen';

alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check
  check (rol in ('admin', 'cliente', 'distribuidor', 'repartidor'));

-- Preparar, faltantes y "Listo para salir": solo el admin (mismo nombre para no tocar 6 funciones)
create or replace function public.aml_personal_almacen()
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
-- 3. Repartidores externos: tablas y columnas
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.repartidores_estado (
  usuario_id uuid primary key references auth.users (id),
  disponible boolean not null default false,
  cambiado_en timestamptz not null default now()
);

alter table public.repartidores_estado enable row level security;
revoke all on public.repartidores_estado from anon, authenticated;
-- Sin políticas a propósito: se lee y escribe solo con funciones

create table if not exists public.pagos_repartidor (
  id uuid primary key default gen_random_uuid(),
  repartidor_id uuid not null references auth.users (id),
  monto numeric(10,2) not null check (monto > 0),
  entregas integer not null check (entregas > 0),
  pagado_por uuid not null references auth.users (id),
  pagado_en timestamptz not null default now()
);

create index if not exists pagos_repartidor_repartidor_idx on public.pagos_repartidor (repartidor_id, pagado_en desc);

alter table public.pagos_repartidor enable row level security;
revoke all on public.pagos_repartidor from anon, authenticated;
-- Sin políticas a propósito: se lee con deudas_repartidores() y panel_repartidor()

alter table public.pedidos add column if not exists repartidor_id uuid references auth.users (id);
alter table public.pedidos add column if not exists aceptado_en timestamptz;
alter table public.pedidos add column if not exists pago_repartidor_id uuid references public.pagos_repartidor (id);

alter table public.pedidos drop constraint if exists pedidos_aceptado_completo;
alter table public.pedidos add constraint pedidos_aceptado_completo
  check ((repartidor_id is null) = (aceptado_en is null));

create index if not exists pedidos_repartidor_idx on public.pedidos (repartidor_id) where repartidor_id is not null;

-- Pedidos a domicilio que ya salieron con un repartidor antes de la 0020: quedan a su nombre
update public.pedidos p
set repartidor_id = p.despachado_por, aceptado_en = coalesce(p.despachado_en, now())
from public.zonas_envio z, public.perfiles r
where z.id = p.zona_envio_id and z.tipo = 'urbano'
  and r.id = p.despachado_por and r.rol = 'repartidor'
  and p.repartidor_id is null and p.despachado_por is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Auxiliares internas
-- ─────────────────────────────────────────────────────────────────────────────
-- Repartidor activo. Si no, AML03.
create or replace function public.aml_repartidor_activo()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid := public.aml_usuario_activo();
begin
  if not public.es_repartidor() then
    raise exception 'No tienes permiso para esta acción.' using errcode = 'AML03';
  end if;
  return v_id;
end;
$$;

-- Telegram a un chat de Vault (lista cerrada de secretos). Nunca lanza error.
create or replace function public.aml_enviar_telegram_a(p_secreto_chat text, p_texto text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_chat text;
begin
  if p_secreto_chat is null or p_secreto_chat not in ('aml_telegram_chat_admin', 'aml_telegram_chat_repartidores') then
    return false;
  end if;

  select s.decrypted_secret into v_token
  from vault.decrypted_secrets s where s.name = 'aml_telegram_token';

  select s.decrypted_secret into v_chat
  from vault.decrypted_secrets s where s.name = p_secreto_chat;

  -- Sin secretos cargados los avisos están apagados
  if nullif(btrim(v_token), '') is null or nullif(btrim(v_chat), '') is null or p_texto is null then
    return false;
  end if;

  perform net.http_post(
    url := 'https://api.telegram.org/bot' || btrim(v_token) || '/sendMessage',
    body := jsonb_build_object(
      'chat_id', btrim(v_chat),
      'text', left(p_texto, 4000),
      'link_preview_options', jsonb_build_object('is_disabled', true)
    ),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 3000
  );

  return true;
exception when others then
  raise warning 'Aviso de Telegram no encolado (SQLSTATE %)', sqlstate;
  return false;
end;
$$;

-- La de siempre (al admin) pasa a usar la nueva
create or replace function public.aml_enviar_telegram(p_texto text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select public.aml_enviar_telegram_a('aml_telegram_chat_admin', p_texto);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. "Listo para salir" (empacar_pedido): igual que en la 0018, nombre nuevo en la línea de tiempo
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.empacar_pedido(p_pedido_id uuid, p_bultos integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_personal_almacen();
  v_pedido record;
  v_tipo_zona text;
  v_sin_marcar integer;
  v_nuevo text;
begin
  if p_bultos is null or p_bultos < 1 or p_bultos > 50 then
    raise exception 'Indica cuántos bultos son (de 1 a 50).' using errcode = 'AML02';
  end if;

  select p.id, p.estado, p.zona_envio_id
  into v_pedido
  from public.pedidos p
  where p.id = p_pedido_id
  for update;

  if not found then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  if v_pedido.estado <> 'preparando' then
    raise exception 'Solo queda listo un pedido en preparación.' using errcode = 'AML05';
  end if;

  select count(*) into v_sin_marcar
  from public.pedido_items i
  where i.pedido_id = p_pedido_id and i.marcado_en is null;

  if v_sin_marcar > 0 then
    raise exception 'Faltan % producto(s) por poner en la caja.', v_sin_marcar using errcode = 'AML05';
  end if;

  if exists (
    select 1 from public.faltantes_pedido f
    where f.pedido_id = p_pedido_id and f.resuelto_en is null
  ) then
    raise exception 'Hay un faltante sin resolver: resuélvelo antes de dejarlo listo.' using errcode = 'AML05';
  end if;

  select z.tipo into v_tipo_zona from public.zonas_envio z where z.id = v_pedido.zona_envio_id;
  v_nuevo := case when v_tipo_zona = 'recojo' then 'listo_para_recoger' else 'empacado' end;

  update public.pedidos p
  set estado = v_nuevo, empacado_por = v_usuario, empacado_en = now(), bultos = p_bultos
  where p.id = p_pedido_id;

  if v_nuevo = 'listo_para_recoger' then
    update public.envios e set estado = 'listo_para_recoger' where e.pedido_id = p_pedido_id;
  end if;

  -- Por flota no hay código: en la terminal no hay a quién dárselo
  if v_tipo_zona in ('recojo', 'urbano') then
    perform public.aml_generar_codigo_entrega(p_pedido_id);
  end if;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (
    p_pedido_id, v_nuevo,
    case when v_nuevo = 'listo_para_recoger' then 'Listo para recoger · ' else 'Listo para salir · ' end ||
      p_bultos || case when p_bultos = 1 then ' bulto' else ' bultos' end,
    v_usuario
  );

  return jsonb_build_object('id', p_pedido_id, 'estado', v_nuevo, 'bultos', p_bultos);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Panel del repartidor
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.cambiar_disponibilidad(p_disponible boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_repartidor_activo();
begin
  if p_disponible is null then
    raise exception 'Indica si estás disponible.' using errcode = 'AML02';
  end if;

  insert into public.repartidores_estado (usuario_id, disponible, cambiado_en)
  values (v_usuario, p_disponible, now())
  on conflict (usuario_id) do update set disponible = excluded.disponible, cambiado_en = excluded.cambiado_en;

  return jsonb_build_object('disponible', p_disponible);
end;
$$;

-- Todo el panel en una llamada. Las entregas disponibles no traen nombre ni teléfono del cliente.
create or replace function public.panel_repartidor()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_repartidor_activo();
  v_disponible boolean;
begin
  select coalesce((select e.disponible from public.repartidores_estado e where e.usuario_id = v_usuario), false)
  into v_disponible;

  return jsonb_build_object(
    'disponible', v_disponible,
    'disponibles', case when not v_disponible then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'codigo', p.codigo,
        'zona', z.nombre,
        'direccion_entrega', p.direccion_entrega,
        'bultos', p.bultos,
        'ganas', p.costo_envio,
        'empacado_en', p.empacado_en
      ) order by p.empacado_en, p.codigo)
      from public.pedidos p
      join public.zonas_envio z on z.id = p.zona_envio_id
      where z.tipo = 'urbano' and p.estado = 'empacado' and p.repartidor_id is null
    ), '[]'::jsonb) end,
    'mias', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'codigo', p.codigo,
        'estado', p.estado,
        'cliente', c.nombre,
        'telefono', coalesce(p.telefono_contacto, c.telefono),
        'zona', z.nombre,
        'direccion_entrega', p.direccion_entrega,
        'notas', p.notas,
        'bultos', p.bultos,
        'ganas', p.costo_envio,
        'aceptado_en', p.aceptado_en,
        'despachado_en', p.despachado_en,
        'codigo_bloqueado', ce.bloqueado_en is not null
      ) order by p.aceptado_en, p.codigo)
      from public.pedidos p
      join public.zonas_envio z on z.id = p.zona_envio_id
      left join public.perfiles c on c.id = p.usuario_id
      left join public.codigos_entrega ce on ce.pedido_id = p.id
      where p.repartidor_id = v_usuario and p.estado in ('empacado', 'despachado')
    ), '[]'::jsonb),
    'ganado', coalesce((
      select sum(p.costo_envio) from public.pedidos p
      where p.repartidor_id = v_usuario and p.estado in ('entregado', 'completado')
    ), 0),
    'por_cobrar', coalesce((
      select sum(p.costo_envio) from public.pedidos p
      where p.repartidor_id = v_usuario and p.estado in ('entregado', 'completado') and p.pago_repartidor_id is null
    ), 0),
    'entregas_hechas', (
      select count(*) from public.pedidos p
      where p.repartidor_id = v_usuario and p.estado in ('entregado', 'completado')
    ),
    'ultimo_pago', (
      select jsonb_build_object('monto', pr.monto, 'entregas', pr.entregas, 'pagado_en', pr.pagado_en)
      from public.pagos_repartidor pr
      where pr.repartidor_id = v_usuario
      order by pr.pagado_en desc
      limit 1
    )
  );
end;
$$;

-- "Aceptar": el primero se la lleva. La fila se bloquea; el segundo ve que ya tiene repartidor.
create or replace function public.aceptar_entrega(p_pedido_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_repartidor_activo();
  v_pedido record;
begin
  if not coalesce((select e.disponible from public.repartidores_estado e where e.usuario_id = v_usuario), false) then
    raise exception 'Primero marca «Estoy disponible».' using errcode = 'AML05';
  end if;

  select p.id, p.estado, p.repartidor_id, z.tipo as tipo_zona
  into v_pedido
  from public.pedidos p
  left join public.zonas_envio z on z.id = p.zona_envio_id
  where p.id = p_pedido_id
  for update of p;

  if not found or v_pedido.tipo_zona is distinct from 'urbano' then
    raise exception 'La entrega no existe.' using errcode = 'AML04';
  end if;

  if v_pedido.repartidor_id = v_usuario then
    return jsonb_build_object('id', p_pedido_id, 'aceptada', true);
  end if;

  if v_pedido.repartidor_id is not null or v_pedido.estado <> 'empacado' then
    raise exception 'Otro repartidor ya la tomó.' using errcode = 'AML05';
  end if;

  update public.pedidos p
  set repartidor_id = v_usuario, aceptado_en = now()
  where p.id = p_pedido_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (p_pedido_id, 'empacado', 'Un repartidor aceptó tu entrega', v_usuario);

  return jsonb_build_object('id', p_pedido_id, 'aceptada', true);
end;
$$;

-- "Recogí el pedido en tienda": empacado → despachado. Solo quien la aceptó (o el admin, que la lleva él).
create or replace function public.tomar_pedido(p_pedido_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_usuario_activo();
  v_admin boolean := public.es_admin();
  v_pedido record;
begin
  if not (v_admin or public.es_repartidor()) then
    raise exception 'No tienes permiso para esta acción.' using errcode = 'AML03';
  end if;

  select p.id, p.estado, p.repartidor_id, z.tipo as tipo_zona
  into v_pedido
  from public.pedidos p
  left join public.zonas_envio z on z.id = p.zona_envio_id
  where p.id = p_pedido_id
  for update of p;

  if not found or v_pedido.tipo_zona is distinct from 'urbano' then
    raise exception 'El pedido no existe o no es a domicilio.' using errcode = 'AML04';
  end if;

  if not v_admin and v_pedido.repartidor_id is distinct from v_usuario then
    raise exception 'Esta entrega la tiene otro repartidor.' using errcode = 'AML03';
  end if;

  if v_pedido.estado = 'despachado' then
    raise exception 'Este pedido ya salió de la tienda.' using errcode = 'AML05';
  end if;

  if v_pedido.estado <> 'empacado' then
    raise exception 'Solo se recoge un pedido listo para salir.' using errcode = 'AML05';
  end if;

  update public.pedidos p
  set estado = 'despachado', despachado_por = v_usuario, despachado_en = now()
  where p.id = p_pedido_id;

  update public.envios e
  set estado = 'en_camino', despachado_en = now()
  where e.pedido_id = p_pedido_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (p_pedido_id, 'despachado', 'Salió de la tienda: va en camino', v_usuario);

  return jsonb_build_object('id', p_pedido_id, 'estado', 'despachado');
end;
$$;

-- Solo el admin: si el repartidor no aparece, la entrega vuelve a estar disponible (y se publica otra vez)
create or replace function public.liberar_entrega(p_pedido_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_pedido record;
begin
  select p.id, p.estado, p.repartidor_id
  into v_pedido
  from public.pedidos p
  where p.id = p_pedido_id
  for update;

  if not found then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  if v_pedido.estado <> 'empacado' or v_pedido.repartidor_id is null then
    raise exception 'Solo se libera una entrega aceptada que todavía no salió de la tienda.' using errcode = 'AML05';
  end if;

  update public.pedidos p
  set repartidor_id = null, aceptado_en = null
  where p.id = p_pedido_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (p_pedido_id, 'empacado', 'Buscando otro repartidor', v_admin);

  return jsonb_build_object('id', p_pedido_id, 'liberada', true);
end;
$$;

-- Cola del admin: a domicilio listos para salir o en camino, con quién la lleva
create or replace function public.cola_reparto()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id,
      'codigo', p.codigo,
      'estado', p.estado,
      'total', p.total,
      'created_at', p.created_at,
      'cliente', c.nombre,
      'telefono', coalesce(p.telefono_contacto, c.telefono),
      'zona', z.nombre,
      'direccion_entrega', p.direccion_entrega,
      'notas', p.notas,
      'bultos', p.bultos,
      'ganas', p.costo_envio,
      'empacado_en', p.empacado_en,
      'repartidor', public.aml_nombre_corto(p.repartidor_id),
      'aceptado_en', p.aceptado_en,
      'despachado_en', p.despachado_en,
      'codigo_bloqueado', ce.bloqueado_en is not null
    ) order by p.created_at, p.codigo)
    from public.pedidos p
    join public.zonas_envio z on z.id = p.zona_envio_id
    left join public.perfiles c on c.id = p.usuario_id
    left join public.codigos_entrega ce on ce.pedido_id = p.id
    where z.tipo = 'urbano' and p.estado in ('empacado', 'despachado')
  ), '[]'::jsonb);
end;
$$;

-- Datos para entregar. Nunca incluye el código.
-- Admin: cualquiera. Repartidor: solo las entregas que aceptó (listas para salir o en camino).
create or replace function public.detalle_entrega(p_pedido_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_usuario_activo();
  v_pedido record;
  v_resultado jsonb;
begin
  select p.id, p.estado, p.repartidor_id, z.tipo as tipo_zona
  into v_pedido
  from public.pedidos p
  left join public.zonas_envio z on z.id = p.zona_envio_id
  where p.id = p_pedido_id;

  if not found or not (
    public.es_admin()
    or (public.es_repartidor() and v_pedido.tipo_zona = 'urbano'
        and v_pedido.repartidor_id = v_usuario and v_pedido.estado in ('empacado', 'despachado'))
  ) then
    if not (public.es_admin() or public.es_repartidor()) then
      raise exception 'No tienes permiso para esta acción.' using errcode = 'AML03';
    end if;
    raise exception 'El pedido no existe o no está para entregar.' using errcode = 'AML04';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'codigo', p.codigo,
    'estado', p.estado,
    'metodo_pago', p.metodo_pago,
    'estado_pago', p.estado_pago,
    'total', p.total,
    'created_at', p.created_at,
    'cliente', c.nombre,
    'telefono', coalesce(p.telefono_contacto, c.telefono),
    'zona', z.nombre,
    'tipo_zona', z.tipo,
    'direccion_entrega', p.direccion_entrega,
    'recoge_nombre', p.recoge_nombre,
    'recoge_ci', p.recoge_ci,
    'notas', p.notas,
    'bultos', p.bultos,
    'ganas', p.costo_envio,
    'empacado_en', p.empacado_en,
    'repartidor', public.aml_nombre_corto(p.repartidor_id),
    'es_mia', p.repartidor_id = v_usuario,
    'aceptado_en', p.aceptado_en,
    'despachado_por', public.aml_nombre_corto(p.despachado_por),
    'despachado_en', p.despachado_en,
    'entregado_por', public.aml_nombre_corto(p.entregado_por),
    'entregado_en', p.entregado_en,
    'recibe_nombre', p.recibe_nombre,
    'tiene_codigo', ce.pedido_id is not null,
    'codigo_bloqueado', ce.bloqueado_en is not null,
    'intentos_restantes', case when ce.pedido_id is null then null else 5 - ce.intentos_fallidos end,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'nombre_producto', i.nombre_producto, 'cantidad', i.cantidad, 'unidad', pr.unidad
      ) order by i.nombre_producto)
      from public.pedido_items i
      left join public.productos pr on pr.id = i.producto_id
      where i.pedido_id = p.id
    ), '[]'::jsonb)
  )
  into v_resultado
  from public.pedidos p
  left join public.perfiles c on c.id = p.usuario_id
  left join public.zonas_envio z on z.id = p.zona_envio_id
  left join public.codigos_entrega ce on ce.pedido_id = p.id
  where p.id = p_pedido_id;

  return v_resultado;
end;
$$;

-- Quién puede entregar este pedido. Recojo: el admin. Domicilio: quien lo lleva (o el admin).
create or replace function public.aml_puede_entregar(p_tipo_zona text, p_estado text, p_despachado_por uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_usuario_activo();
  v_admin boolean := public.es_admin();
begin
  if p_tipo_zona = 'provincia' then
    raise exception 'Por flota, la entrega la confirma el cliente con «Recibí mi pedido» o la tienda con una nota.'
      using errcode = 'AML05';
  end if;

  if p_tipo_zona = 'recojo' then
    if not v_admin then
      raise exception 'No tienes permiso para esta acción.' using errcode = 'AML03';
    end if;
    if p_estado <> 'listo_para_recoger' then
      raise exception 'Solo se entrega en tienda un pedido listo para recoger.' using errcode = 'AML05';
    end if;
  else
    if not (v_admin or public.es_repartidor()) then
      raise exception 'No tienes permiso para esta acción.' using errcode = 'AML03';
    end if;
    if p_estado <> 'despachado' then
      raise exception 'Primero toca «Recogí el pedido»: todavía no salió de la tienda.' using errcode = 'AML05';
    end if;
    if not v_admin and p_despachado_por is distinct from v_usuario then
      raise exception 'Este pedido lo lleva otro repartidor.' using errcode = 'AML03';
    end if;
  end if;

  return v_usuario;
end;
$$;

-- Entrega con el código del cliente. Un código incorrecto NO lanza error: así el intento queda contado.
-- Igual que en la 0019, sin el cobro en efectivo.
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
  select p.id, p.estado, p.despachado_por, z.tipo as tipo_zona
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

-- Línea de tiempo: dueño, admin y el repartidor que tiene (o tuvo) la entrega
create or replace function public.linea_tiempo_pedido(p_pedido_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_usuario_activo();
  v_pedido record;
  v_interna boolean;
begin
  select p.id, p.usuario_id, p.repartidor_id, p.entregado_por, z.tipo as tipo_zona
  into v_pedido
  from public.pedidos p
  left join public.zonas_envio z on z.id = p.zona_envio_id
  where p.id = p_pedido_id;

  if not found
     or not (
       v_pedido.usuario_id is not distinct from v_usuario
       or public.es_admin()
       or (public.es_repartidor() and v_pedido.tipo_zona = 'urbano'
           and (v_pedido.repartidor_id = v_usuario or v_pedido.entregado_por = v_usuario))
     ) then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  -- La nota del faltante es interna: el dueño (y el repartidor) ven solo el texto para el cliente
  v_interna := public.es_admin();

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id,
      'estado', s.estado,
      'nota', case
        when v_interna and f.id is not null and s.nota = 'Revisando un producto de tu pedido'
          then 'Faltante reportado: ' || coalesce(i.nombre_producto || ' — ', '') || f.nota
        when v_interna and f.id is not null and f.nota_resolucion is not null
          then 'Faltante resuelto: ' || f.nota_resolucion
        else s.nota
      end,
      'created_at', s.created_at,
      'actor_nombre', public.aml_nombre_corto(s.creado_por),
      'actor_rol', a.rol,
      'es_propio', s.creado_por = v_usuario
    ) order by s.created_at, s.id)
    from public.seguimiento_pedido s
    left join public.perfiles a on a.id = s.creado_por
    left join public.faltantes_pedido f on f.id = s.faltante_id
    left join public.pedido_items i on i.id = f.pedido_item_id
    where s.pedido_id = p_pedido_id
  ), '[]'::jsonb);
end;
$$;

-- El admin confirma y despacha por flota. Preparar y "Listo para salir" van por sus funciones.
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
  select p.id, p.estado, p.estado_pago, p.zona_envio_id
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

  if p_estado in ('preparando', 'empacado') or (p_estado = 'listo_para_recoger' and v_pedido.estado = 'preparando') then
    raise exception 'Preparar y dejar listo se hace desde «Por preparar».' using errcode = 'AML05';
  end if;

  if p_estado in ('entregado', 'completado') then
    raise exception 'La entrega se registra con el código del cliente (por flota, con «Recibí mi pedido» o con una nota de la tienda).'
      using errcode = 'AML05';
  end if;

  select z.tipo into v_tipo_zona
  from public.zonas_envio z
  where z.id = v_pedido.zona_envio_id;

  if p_estado = 'despachado' and v_tipo_zona = 'urbano' then
    raise exception 'A domicilio sale con el repartidor que acepta la entrega.' using errcode = 'AML05';
  end if;

  v_siguiente := case
    when v_pedido.estado = 'pendiente' then 'confirmado'
    when v_pedido.estado = 'empacado' and v_tipo_zona = 'provincia' then 'despachado'
  end;

  if v_siguiente is null or p_estado is distinct from v_siguiente then
    raise exception 'Un pedido % no puede pasar a %.', v_pedido.estado, coalesce(p_estado, 'ese estado')
      using errcode = 'AML05';
  end if;

  if v_pedido.estado_pago <> 'verificado' then
    raise exception 'El pago de este pedido todavía no está verificado.' using errcode = 'AML05';
  end if;

  if p_estado = 'despachado' then
    if v_transportista is null or v_guia is null then
      raise exception 'Para despachar por flota indica la empresa de flota y el número de guía.'
        using errcode = 'AML02';
    end if;

    update public.envios e
    set estado = 'en_camino', despachado_en = now(), transportista = v_transportista, numero_guia = v_guia
    where e.pedido_id = p_pedido_id;

    update public.pedidos p set despachado_por = v_admin, despachado_en = now() where p.id = p_pedido_id;
  end if;

  update public.pedidos p set estado = p_estado where p.id = p_pedido_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (p_pedido_id, p_estado, nullif(btrim(p_nota), ''), v_admin);

  return jsonb_build_object('id', p_pedido_id, 'estado', p_estado);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Pago a repartidores
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.deudas_repartidores()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
begin
  return jsonb_build_object(
    'repartidores', coalesce((
      select jsonb_agg(fila order by (fila->>'por_pagar')::numeric desc, fila->>'nombre')
      from (
        select jsonb_build_object(
          'id', r.id,
          'nombre', r.nombre,
          'telefono', r.telefono,
          'activo', r.activo,
          'es_repartidor', r.rol = 'repartidor',
          'disponible', coalesce(e.disponible, false),
          'en_curso', (select count(*) from public.pedidos p
                       where p.repartidor_id = r.id and p.estado in ('empacado', 'despachado')),
          'entregas_por_pagar', (select count(*) from public.pedidos p
                                 where p.repartidor_id = r.id and p.estado in ('entregado', 'completado')
                                   and p.pago_repartidor_id is null),
          'por_pagar', coalesce((select sum(p.costo_envio) from public.pedidos p
                                 where p.repartidor_id = r.id and p.estado in ('entregado', 'completado')
                                   and p.pago_repartidor_id is null), 0),
          'total_pagado', coalesce((select sum(pr.monto) from public.pagos_repartidor pr where pr.repartidor_id = r.id), 0),
          'ultimo_pago_en', (select max(pr.pagado_en) from public.pagos_repartidor pr where pr.repartidor_id = r.id)
        ) as fila
        from public.perfiles r
        left join public.repartidores_estado e on e.usuario_id = r.id
        -- También quien dejó de ser repartidor pero todavía tiene entregas registradas
        where r.rol = 'repartidor' or exists (select 1 from public.pedidos p where p.repartidor_id = r.id)
      ) t
    ), '[]'::jsonb),
    'pagos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pr.id,
        'repartidor', public.aml_nombre_corto(pr.repartidor_id),
        'monto', pr.monto,
        'entregas', pr.entregas,
        'pagado_por', public.aml_nombre_corto(pr.pagado_por),
        'pagado_en', pr.pagado_en
      ) order by pr.pagado_en desc)
      from (select * from public.pagos_repartidor order by pagado_en desc limit 30) pr
    ), '[]'::jsonb)
  );
end;
$$;

-- "Pagado": marca todo lo entregado sin pagar. p_monto es lo que el admin vio en pantalla:
-- si en el medio se entregó otra, frena para que no pague algo distinto de lo que vio.
create or replace function public.pagar_repartidor(p_repartidor_id uuid, p_monto numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_ids uuid[];
  v_monto numeric(10,2);
  v_pago_id uuid;
begin
  select array_agg(p.id order by p.id), coalesce(sum(p.costo_envio), 0)
  into v_ids, v_monto
  from (
    select p.id, p.costo_envio
    from public.pedidos p
    where p.repartidor_id = p_repartidor_id
      and p.estado in ('entregado', 'completado')
      and p.pago_repartidor_id is null
    order by p.id
    for update
  ) p;

  if v_ids is null or v_monto <= 0 then
    raise exception 'Este repartidor no tiene nada por cobrar.' using errcode = 'AML05';
  end if;

  if p_monto is null or round(p_monto, 2) <> v_monto then
    raise exception 'El monto cambió: ahora son %. Recarga la página y vuelve a revisar.', public.aml_formato_bs(v_monto)
      using errcode = 'AML05';
  end if;

  insert into public.pagos_repartidor (repartidor_id, monto, entregas, pagado_por)
  values (p_repartidor_id, v_monto, cardinality(v_ids), v_admin)
  returning id into v_pago_id;

  update public.pedidos p set pago_repartidor_id = v_pago_id where p.id = any (v_ids);

  return jsonb_build_object('id', v_pago_id, 'monto', v_monto, 'entregas', cardinality(v_ids));
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Telegram
-- ─────────────────────────────────────────────────────────────────────────────
-- Al grupo de repartidores: pedido a domicilio listo para salir (o liberado) y sin repartidor
create or replace function public.aml_trg_aviso_entrega_disponible()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_zona record;
begin
  if public.aml_es_cuenta_prueba(new.usuario_id) then
    return null;
  end if;

  select z.nombre, z.tipo into v_zona from public.zonas_envio z where z.id = new.zona_envio_id;
  if v_zona.tipo is distinct from 'urbano' then
    return null;
  end if;

  perform public.aml_enviar_telegram_a(
    'aml_telegram_chat_repartidores',
    '🛵 Entrega disponible · ' || coalesce(v_zona.nombre, '—') ||
    ' · Ganas ' || public.aml_formato_bs(new.costo_envio) ||
    ' · ' || public.aml_url_sitio() || '/repartidor'
  );
  return null;
exception when others then
  raise warning 'Aviso de entrega disponible omitido (SQLSTATE %)', sqlstate;
  return null;
end;
$$;

drop trigger if exists aml_aviso_entrega_disponible on public.pedidos;
create trigger aml_aviso_entrega_disponible
  after update of estado, repartidor_id on public.pedidos
  for each row
  when (new.estado = 'empacado' and new.repartidor_id is null
        and (old.estado is distinct from 'empacado' or old.repartidor_id is not null))
  execute function public.aml_trg_aviso_entrega_disponible();

-- Al admin: entregado (sin la línea de efectivo por rendir)
create or replace function public.aml_trg_aviso_entregado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.aml_es_cuenta_prueba(new.usuario_id) then
    return null;
  end if;

  perform public.aml_enviar_telegram(
    '✅ Entregado ' || coalesce(new.codigo, '') || E'\n' ||
    'A: ' || coalesce(new.recibe_nombre, '—') || E'\n' ||
    'Por: ' || coalesce(public.aml_nombre_corto(new.entregado_por), '—') || ' · ' ||
    public.aml_hora_bolivia(coalesce(new.entregado_en, now())) || E'\n' ||
    'Total: ' || public.aml_formato_bs(new.total) ||
    case when new.repartidor_id is not null
      then E'\n🛵 Al repartidor: ' || public.aml_formato_bs(new.costo_envio) else '' end || E'\n' ||
    public.aml_url_sitio() || '/pedidos/' || new.id
  );
  return null;
exception when others then
  raise warning 'Aviso de entrega omitido (SQLSTATE %)', sqlstate;
  return null;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Permisos
-- ─────────────────────────────────────────────────────────────────────────────
-- Internas: nadie las llama desde fuera
revoke execute on function public.aml_repartidor_activo() from public, anon, authenticated;
revoke execute on function public.aml_personal_almacen() from public, anon, authenticated;
revoke execute on function public.aml_enviar_telegram_a(text, text) from public, anon, authenticated;
revoke execute on function public.aml_enviar_telegram(text) from public, anon, authenticated;
revoke execute on function public.aml_puede_entregar(text, text, uuid) from public, anon, authenticated;
revoke execute on function public.aml_trg_aviso_entrega_disponible() from public, anon, authenticated;
revoke execute on function public.aml_trg_aviso_entregado() from public, anon, authenticated;

-- Efectivo: se dejan de usar (no se borran)
revoke execute on function public.registrar_cobro_entrega(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.confirmar_efectivo(uuid) from public, anon, authenticated;

-- Para la API (siempre con sesión; cada función revisa el rol)
revoke execute on function public.crear_pedido(jsonb, uuid, text, text, text, text, text, text) from public, anon;
revoke execute on function public.cancelar_pedido(uuid, text) from public, anon;
revoke execute on function public.empacar_pedido(uuid, integer) from public, anon;
revoke execute on function public.cambiar_disponibilidad(boolean) from public, anon;
revoke execute on function public.panel_repartidor() from public, anon;
revoke execute on function public.aceptar_entrega(uuid) from public, anon;
revoke execute on function public.tomar_pedido(uuid) from public, anon;
revoke execute on function public.liberar_entrega(uuid) from public, anon;
revoke execute on function public.cola_reparto() from public, anon;
revoke execute on function public.detalle_entrega(uuid) from public, anon;
revoke execute on function public.entregar_pedido(uuid, text, text, text) from public, anon;
revoke execute on function public.linea_tiempo_pedido(uuid) from public, anon;
revoke execute on function public.cambiar_estado_pedido(uuid, text, text, text, text) from public, anon;
revoke execute on function public.deudas_repartidores() from public, anon;
revoke execute on function public.pagar_repartidor(uuid, numeric) from public, anon;

grant execute on function public.crear_pedido(jsonb, uuid, text, text, text, text, text, text) to authenticated;
grant execute on function public.cancelar_pedido(uuid, text) to authenticated;
grant execute on function public.empacar_pedido(uuid, integer) to authenticated;
grant execute on function public.cambiar_disponibilidad(boolean) to authenticated;
grant execute on function public.panel_repartidor() to authenticated;
grant execute on function public.aceptar_entrega(uuid) to authenticated;
grant execute on function public.tomar_pedido(uuid) to authenticated;
grant execute on function public.liberar_entrega(uuid) to authenticated;
grant execute on function public.cola_reparto() to authenticated;
grant execute on function public.detalle_entrega(uuid) to authenticated;
grant execute on function public.entregar_pedido(uuid, text, text, text) to authenticated;
grant execute on function public.linea_tiempo_pedido(uuid) to authenticated;
grant execute on function public.cambiar_estado_pedido(uuid, text, text, text, text) to authenticated;
grant execute on function public.deudas_repartidores() to authenticated;
grant execute on function public.pagar_repartidor(uuid, numeric) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Verificaciones: si algo no cuadra, no se guarda nada
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_funcion text;
  v_cli uuid := gen_random_uuid();
  v_adm uuid := gen_random_uuid();
  v_r1 uuid := gen_random_uuid();
  v_r2 uuid := gen_random_uuid();
  v_zona uuid;
  v_costo numeric;
  v_producto uuid;
  v_items jsonb;
  v_ped uuid;
  v_item uuid;
  v_codigo text;
  v_res jsonb;
  v_panel jsonb;
  v_deudas jsonb;
  v_ultimo bigint;
  v_llamado boolean;
begin
  foreach v_funcion in array array[
    'crear_pedido', 'cancelar_pedido', 'aml_personal_almacen', 'aml_repartidor_activo', 'aml_enviar_telegram_a',
    'aml_enviar_telegram', 'empacar_pedido', 'cambiar_disponibilidad', 'panel_repartidor', 'aceptar_entrega',
    'tomar_pedido', 'liberar_entrega', 'cola_reparto', 'detalle_entrega', 'aml_puede_entregar', 'entregar_pedido',
    'linea_tiempo_pedido', 'cambiar_estado_pedido', 'deudas_repartidores', 'pagar_repartidor',
    'aml_trg_aviso_entrega_disponible', 'aml_trg_aviso_entregado'
  ] loop
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

  if has_function_privilege('authenticated', 'public.registrar_cobro_entrega(uuid, numeric)', 'execute')
     or has_function_privilege('authenticated', 'public.confirmar_efectivo(uuid)', 'execute') then
    raise exception 'FRENO: las funciones de efectivo todavía se pueden llamar';
  end if;

  if has_function_privilege('anon', 'public.aceptar_entrega(uuid)', 'execute')
     or has_function_privilege('anon', 'public.pagar_repartidor(uuid, numeric)', 'execute')
     or has_function_privilege('authenticated', 'public.aml_enviar_telegram_a(text, text)', 'execute') then
    raise exception 'FRENO: quedó una función abierta de más';
  end if;

  if has_table_privilege('authenticated', 'public.pagos_repartidor', 'select')
     or has_table_privilege('authenticated', 'public.repartidores_estado', 'select') then
    raise exception 'FRENO: pagos_repartidor o repartidores_estado se pueden leer directo';
  end if;

  if exists (select 1 from public.perfiles where rol = 'almacen') then
    raise exception 'FRENO: todavía hay cuentas con rol almacén';
  end if;

  if exists (select 1 from public.zonas_envio where permite_contra_entrega) then
    raise exception 'FRENO: una zona todavía permite efectivo';
  end if;

  select z.id, z.costo into v_zona, v_costo from public.zonas_envio z
  where z.activo and z.tipo = 'urbano' and z.costo > 0 order by z.orden limit 1;
  select p.id into v_producto from public.productos p
  where p.activo and p.stock >= 3 order by p.stock desc limit 1;

  if v_zona is null or v_producto is null then
    raise exception 'FRENO: falta una zona a domicilio con costo o un producto con stock para el recorrido de prueba';
  end if;

  v_items := jsonb_build_array(jsonb_build_object('producto_id', v_producto, 'cantidad', 1));

  -- La prueba usa números de pedido: se guardan para reponerlos al final
  select s.last_value, s.is_called into v_ultimo, v_llamado from public.pedidos_codigo_seq s;

  -- Recorrido. Todo se deshace con la excepción AMLOK. Cuentas .test: no avisa por Telegram.
  begin
    insert into auth.users (id, aud, role, email, raw_user_meta_data)
    values
      (v_cli, 'authenticated', 'authenticated', 'cliente.0020@amlagrotech.test', '{"nombre": "Cliente Prueba 0020"}'),
      (v_adm, 'authenticated', 'authenticated', 'admin.0020@amlagrotech.test', '{"nombre": "Admin Prueba 0020"}'),
      (v_r1, 'authenticated', 'authenticated', 'repartidor1.0020@amlagrotech.test', '{"nombre": "Repartidor Uno 0020"}'),
      (v_r2, 'authenticated', 'authenticated', 'repartidor2.0020@amlagrotech.test', '{"nombre": "Repartidor Dos 0020"}');
    update public.perfiles set rol = 'admin' where id = v_adm;
    update public.perfiles set rol = 'repartidor' where id in (v_r1, v_r2);

    -- Cliente: efectivo y transferencia se rechazan; QR nace pendiente
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    begin
      perform public.crear_pedido(v_items, v_zona, 'Calle de prueba 1', '70000000', 'contra_entrega', null, null, null);
      raise exception 'FRENO: se aceptó un pedido con efectivo';
    exception when sqlstate 'AML02' then null;
    end;
    begin
      perform public.crear_pedido(v_items, v_zona, 'Calle de prueba 1', '70000000', 'transferencia', null, null, null);
      raise exception 'FRENO: se aceptó un pedido con transferencia';
    exception when sqlstate 'AML02' then null;
    end;

    v_res := public.crear_pedido(v_items, v_zona, 'Calle de prueba 1', '70000000', 'qr', null, null, null);
    v_ped := (v_res->>'id')::uuid;
    if v_res->>'estado' <> 'pendiente' then
      raise exception 'FRENO: un pedido con QR no nació pendiente';
    end if;

    -- Pago verificado (como lo deja verificar_pago) y el admin prepara y deja listo para salir
    update public.pagos set estado = 'verificado' where pedido_id = v_ped;
    update public.pedidos set estado_pago = 'verificado' where id = v_ped;

    perform set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated')::text, true);
    perform public.cambiar_estado_pedido(v_ped, 'confirmado', null, null, null);
    perform public.empezar_preparacion(v_ped);
    for v_item in select i.id from public.pedido_items i where i.pedido_id = v_ped loop
      perform public.marcar_item_pedido(v_item, true);
    end loop;
    perform public.empacar_pedido(v_ped, 2);
    if (select estado from public.pedidos where id = v_ped) <> 'empacado' then
      raise exception 'FRENO: el pedido no quedó listo para salir';
    end if;

    -- Repartidor 1 no disponible: no ve nada y no puede aceptar
    perform set_config('request.jwt.claims', json_build_object('sub', v_r1, 'role', 'authenticated')::text, true);
    v_panel := public.panel_repartidor();
    if (v_panel->>'disponible')::boolean or jsonb_array_length(v_panel->'disponibles') <> 0 then
      raise exception 'FRENO: un repartidor no disponible ve entregas';
    end if;
    begin
      perform public.aceptar_entrega(v_ped);
      raise exception 'FRENO: un repartidor no disponible aceptó una entrega';
    exception when sqlstate 'AML05' then null;
    end;

    -- Disponible: la ve sin datos del cliente y con lo que gana
    perform public.cambiar_disponibilidad(true);
    v_panel := public.panel_repartidor();
    if not exists (select 1 from jsonb_array_elements(v_panel->'disponibles') e
                   where (e->>'id')::uuid = v_ped and (e->>'ganas')::numeric = v_costo and (e->>'bultos')::int = 2) then
      raise exception 'FRENO: la entrega no aparece disponible con lo que gana: %', v_panel;
    end if;
    if exists (select 1 from jsonb_array_elements(v_panel->'disponibles') e where e ? 'cliente' or e ? 'telefono') then
      raise exception 'FRENO: las entregas disponibles muestran datos del cliente';
    end if;

    -- El primero se la lleva
    perform public.aceptar_entrega(v_ped);

    perform set_config('request.jwt.claims', json_build_object('sub', v_r2, 'role', 'authenticated')::text, true);
    perform public.cambiar_disponibilidad(true);
    if exists (select 1 from jsonb_array_elements(public.panel_repartidor()->'disponibles') e where (e->>'id')::uuid = v_ped) then
      raise exception 'FRENO: la entrega aceptada sigue disponible para otro';
    end if;
    begin
      perform public.aceptar_entrega(v_ped);
      raise exception 'FRENO: dos repartidores aceptaron la misma entrega';
    exception when sqlstate 'AML05' then
      if sqlerrm <> 'Otro repartidor ya la tomó.' then
        raise exception 'FRENO: el mensaje al segundo repartidor es «%»', sqlerrm;
      end if;
    end;

    -- El admin la libera y la acepta el repartidor 2
    perform set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated')::text, true);
    perform public.liberar_entrega(v_ped);

    perform set_config('request.jwt.claims', json_build_object('sub', v_r2, 'role', 'authenticated')::text, true);
    perform public.aceptar_entrega(v_ped);

    -- El 1 ya no puede recogerla ni ver su detalle
    perform set_config('request.jwt.claims', json_build_object('sub', v_r1, 'role', 'authenticated')::text, true);
    begin
      perform public.tomar_pedido(v_ped);
      raise exception 'FRENO: un repartidor recogió una entrega que no es suya';
    exception when sqlstate 'AML03' then null;
    end;
    begin
      perform public.detalle_entrega(v_ped);
      raise exception 'FRENO: un repartidor vio el detalle de una entrega que no es suya';
    exception when sqlstate 'AML04' then null;
    end;

    -- El 2 la recoge y la entrega con el código: queda completado (el QR ya estaba verificado)
    perform set_config('request.jwt.claims', json_build_object('sub', v_r2, 'role', 'authenticated')::text, true);
    perform public.tomar_pedido(v_ped);
    select c.codigo into v_codigo from public.codigos_entrega c where c.pedido_id = v_ped;
    v_res := public.entregar_pedido(v_ped, v_codigo, 'Cliente Prueba', null);
    if not (v_res->>'ok')::boolean or v_res->>'estado' <> 'completado' then
      raise exception 'FRENO: la entrega con código no completó el pedido: %', v_res;
    end if;

    v_panel := public.panel_repartidor();
    if (v_panel->>'por_cobrar')::numeric <> v_costo or (v_panel->>'ganado')::numeric <> v_costo then
      raise exception 'FRENO: ganado o por cobrar no es el costo de envío: %', v_panel;
    end if;

    -- Un repartidor no ve las deudas ni paga
    begin
      perform public.deudas_repartidores();
      raise exception 'FRENO: un repartidor vio las deudas';
    exception when sqlstate 'AML03' then null;
    end;

    -- El admin paga: con un monto distinto frena; con el correcto queda en cero
    perform set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated')::text, true);
    v_deudas := public.deudas_repartidores();
    if not exists (select 1 from jsonb_array_elements(v_deudas->'repartidores') e
                   where (e->>'id')::uuid = v_r2 and (e->>'por_pagar')::numeric = v_costo) then
      raise exception 'FRENO: la deuda del repartidor no aparece: %', v_deudas;
    end if;
    begin
      perform public.pagar_repartidor(v_r2, v_costo + 1);
      raise exception 'FRENO: se pagó un monto distinto del que se debe';
    exception when sqlstate 'AML05' then null;
    end;
    perform public.pagar_repartidor(v_r2, v_costo);
    if exists (select 1 from public.pedidos where id = v_ped and pago_repartidor_id is null) then
      raise exception 'FRENO: el pago no marcó la entrega';
    end if;

    perform set_config('request.jwt.claims', json_build_object('sub', v_r2, 'role', 'authenticated')::text, true);
    v_panel := public.panel_repartidor();
    if (v_panel->>'por_cobrar')::numeric <> 0 or jsonb_typeof(v_panel->'ultimo_pago') is distinct from 'object' then
      raise exception 'FRENO: después de pagar, por cobrar no quedó en cero: %', v_panel;
    end if;

    -- El cliente no cancela un pedido confirmado
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    v_res := public.crear_pedido(v_items, v_zona, 'Calle de prueba 1', '70000000', 'qr', null, null, null);
    update public.pagos set estado = 'verificado' where pedido_id = (v_res->>'id')::uuid;
    update public.pedidos set estado_pago = 'verificado', estado = 'confirmado' where id = (v_res->>'id')::uuid;
    begin
      perform public.cancelar_pedido((v_res->>'id')::uuid, 'Ya no');
      raise exception 'FRENO: el cliente canceló un pedido confirmado';
    exception when sqlstate 'AML05' then null;
    end;

    raise exception using errcode = 'P0001', message = 'AMLOK';
  exception
    when raise_exception then
      if sqlerrm <> 'AMLOK' then raise; end if;
  end;

  perform set_config('request.jwt.claims', '', true);
  perform setval('public.pedidos_codigo_seq', v_ultimo, v_llamado);

  if exists (select 1 from auth.users where id in (v_cli, v_adm, v_r1, v_r2))
     or exists (select 1 from public.pedidos where id = v_ped)
     or exists (select 1 from public.pagos_repartidor where repartidor_id in (v_r1, v_r2)) then
    raise exception 'FRENO: el recorrido de prueba no se deshizo';
  end if;

  raise notice '0020 OK: solo QR, sin almacén, repartidores con disponibilidad, aceptar atómico, liberar y pago al repartidor';
end;
$$;

commit;
