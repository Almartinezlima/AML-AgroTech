-- 0017_almacen_empaque.sql
--
-- POR QUÉ
--   Fase 9C. Observaciones del docente: "controlar la preparación y empaque del producto con
--   roles específicos de usuario" y "completar de forma correcta el cobro". Idea de AML:
--   cada paso tiene un responsable y queda registrado QUIÉN lo hizo y CUÁNDO.
--
-- QUÉ HACE
--   1. Roles nuevos 'almacen' y 'repartidor' (solo los asigna el admin: proteger_campos_perfil
--      ya lo impide a los demás y handle_new_user crea siempre clientes). Auxiliares
--      es_almacen() y es_repartidor() (rol exacto y cuenta activa) y aml_personal_almacen()
--      (almacén o admin; si no, AML03).
--   2. Estado de pedido nuevo 'empacado' (entre preparando y despachado). Caminos:
--        recojo:     confirmado → preparando → [empacar] → listo_para_recoger → entregado
--        domicilio / flota: confirmado → preparando → [empacar] → empacado → despachado → entregado
--      Preparar y empacar se hacen SOLO con las funciones del almacén (registran quién).
--   3. Columnas: pedidos.preparacion_por/_en, empacado_por/_en, bultos; pedido_items.marcado_por/_en.
--   4. Tabla faltantes_pedido (RLS: solo el admin la lee; el almacén, por funciones). Mientras haya
--      un faltante abierto el pedido no se empaca; el admin lo resuelve ("Repuesto, continuar").
--   5. Funciones: empezar_preparacion, marcar_item_pedido, reportar_faltante, resolver_faltante,
--      empacar_pedido, cola_almacen, detalle_preparacion, linea_tiempo_pedido (con el nombre de
--      quién hizo cada paso). Se reescriben cambiar_estado_pedido (camino nuevo) y cancelar_pedido
--      (el admin también cancela en preparando y empacado; el stock vuelve al kardex).
--   6. Aviso por Telegram al admin cuando se reporta un faltante.
--   7. Verificaciones y un recorrido completo de prueba que se deshace solo.
--
-- QUÉ NO TOCA
--   No cambia pedidos, pagos ni perfiles existentes. Los pedidos que ya están en 'preparando'
--   se siguen preparando en /almacen. RLS de pedidos, pagos, envíos y perfiles: igual
--   (almacén y repartidor no leen ninguna tabla directo). Nada se borra.
--
-- CUÁNDO CORRERLA
--   ANTES de publicar el código de la 9C (el panel /almacen y el admin la usan). Después:
--   crear las cuentas almacen@ y repartidor@amlagrotech.test y asignarles el rol.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Roles
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check
  check (rol in ('admin', 'cliente', 'distribuidor', 'almacen', 'repartidor'));

create or replace function public.es_almacen()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.rol = 'almacen' and p.activo = true
  );
$$;

create or replace function public.es_repartidor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.rol = 'repartidor' and p.activo = true
  );
$$;

-- Almacén o admin activos (el admin puede hacer todo lo del almacén). Si no, AML03.
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
  if not (public.es_admin() or public.es_almacen()) then
    raise exception 'No tienes permiso para esta acción.' using errcode = 'AML03';
  end if;
  return v_id;
end;
$$;

-- "Aldo Martínez Lima" → "Aldo Martínez" (para la línea de tiempo y el panel)
create or replace function public.aml_nombre_corto(p_usuario_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select array_to_string((regexp_split_to_array(btrim(p.nombre), '\s+'))[1:2], ' ')
  from public.perfiles p
  where p.id = p_usuario_id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Estado 'empacado' y columnas de preparación
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.pedidos drop constraint if exists pedidos_estado_check;
alter table public.pedidos add constraint pedidos_estado_check
  check (estado in ('pendiente', 'confirmado', 'preparando', 'empacado', 'listo_para_recoger',
                    'despachado', 'entregado', 'cancelado'));

alter table public.pedidos add column if not exists preparacion_por uuid references auth.users (id);
alter table public.pedidos add column if not exists preparacion_en timestamptz;
alter table public.pedidos add column if not exists empacado_por uuid references auth.users (id);
alter table public.pedidos add column if not exists empacado_en timestamptz;
alter table public.pedidos add column if not exists bultos integer;

alter table public.pedidos drop constraint if exists pedidos_bultos_rango;
alter table public.pedidos add constraint pedidos_bultos_rango
  check (bultos is null or bultos between 1 and 50);

alter table public.pedido_items add column if not exists marcado_por uuid references auth.users (id);
alter table public.pedido_items add column if not exists marcado_en timestamptz;

alter table public.pedido_items drop constraint if exists pedido_items_marcado_completo;
alter table public.pedido_items add constraint pedido_items_marcado_completo
  check ((marcado_por is null) = (marcado_en is null));

create index if not exists pedidos_cola_almacen_idx
  on public.pedidos (created_at)
  where estado in ('confirmado', 'preparando', 'empacado', 'listo_para_recoger');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Faltantes
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.faltantes_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id),
  pedido_item_id uuid references public.pedido_items (id),
  nota text not null check (length(btrim(nota)) between 3 and 300),
  reportado_por uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  resuelto_en timestamptz,
  resuelto_por uuid references auth.users (id),
  nota_resolucion text check (nota_resolucion is null or length(btrim(nota_resolucion)) between 3 and 300),
  constraint faltantes_resolucion_completa check ((resuelto_en is null) = (resuelto_por is null))
);

create index if not exists faltantes_abiertos_idx
  on public.faltantes_pedido (pedido_id)
  where resuelto_en is null;

alter table public.faltantes_pedido enable row level security;
revoke all on public.faltantes_pedido from anon, authenticated;
grant select on public.faltantes_pedido to authenticated;

drop policy if exists faltantes_select_admin on public.faltantes_pedido;
create policy faltantes_select_admin on public.faltantes_pedido
  for select to authenticated
  using ((select public.es_admin()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Funciones del almacén
-- ─────────────────────────────────────────────────────────────────────────────

-- confirmado → preparando
create or replace function public.empezar_preparacion(p_pedido_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_personal_almacen();
  v_pedido record;
begin
  select p.id, p.estado, p.metodo_pago, p.estado_pago
  into v_pedido
  from public.pedidos p
  where p.id = p_pedido_id
  for update;

  if not found then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  if v_pedido.estado = 'preparando' then
    raise exception 'Este pedido ya se está preparando.' using errcode = 'AML05';
  end if;

  if v_pedido.estado <> 'confirmado' then
    raise exception 'Solo se prepara un pedido confirmado.' using errcode = 'AML05';
  end if;

  if v_pedido.metodo_pago is distinct from 'contra_entrega' and v_pedido.estado_pago <> 'verificado' then
    raise exception 'El pago de este pedido todavía no está verificado.' using errcode = 'AML05';
  end if;

  update public.pedidos p
  set estado = 'preparando', preparacion_por = v_usuario, preparacion_en = now()
  where p.id = p_pedido_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (p_pedido_id, 'preparando', 'Preparación iniciada', v_usuario);

  return jsonb_build_object('id', p_pedido_id, 'estado', 'preparando');
end;
$$;

-- Casilla "en la caja" de cada producto (solo con el pedido en preparación)
create or replace function public.marcar_item_pedido(p_item_id uuid, p_marcado boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_personal_almacen();
  v_pedido_id uuid;
  v_estado text;
begin
  if p_marcado is null then
    raise exception 'Indica si el producto está en la caja.' using errcode = 'AML02';
  end if;

  select i.pedido_id into v_pedido_id from public.pedido_items i where i.id = p_item_id;
  if not found then
    raise exception 'El producto no existe en el pedido.' using errcode = 'AML04';
  end if;

  -- Primero el pedido y después el ítem, como en el resto de funciones
  select p.estado into v_estado from public.pedidos p where p.id = v_pedido_id for update;

  if v_estado is distinct from 'preparando' then
    raise exception 'Solo se marcan productos de un pedido en preparación.' using errcode = 'AML05';
  end if;

  update public.pedido_items i
  set marcado_por = case when p_marcado then v_usuario end,
      marcado_en = case when p_marcado then now() end
  where i.id = p_item_id;

  return jsonb_build_object('id', p_item_id, 'marcado', p_marcado);
end;
$$;

create or replace function public.reportar_faltante(p_pedido_id uuid, p_item_id uuid, p_nota text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_personal_almacen();
  v_nota text := nullif(btrim(p_nota), '');
  v_estado text;
  v_producto text;
  v_id uuid;
begin
  if v_nota is null or length(v_nota) < 3 or length(v_nota) > 300 then
    raise exception 'Describe el faltante (de 3 a 300 letras).' using errcode = 'AML02';
  end if;

  select p.estado into v_estado from public.pedidos p where p.id = p_pedido_id for update;
  if not found then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  if v_estado <> 'preparando' then
    raise exception 'Solo se reporta un faltante de un pedido en preparación.' using errcode = 'AML05';
  end if;

  if p_item_id is not null then
    select i.nombre_producto into v_producto
    from public.pedido_items i
    where i.id = p_item_id and i.pedido_id = p_pedido_id;
    if not found then
      raise exception 'El producto no es de este pedido.' using errcode = 'AML04';
    end if;
  end if;

  insert into public.faltantes_pedido (pedido_id, pedido_item_id, nota, reportado_por)
  values (p_pedido_id, p_item_id, v_nota, v_usuario)
  returning id into v_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (p_pedido_id, v_estado, 'Faltante reportado: ' || coalesce(v_producto || ' — ', '') || v_nota, v_usuario);

  return jsonb_build_object('id', v_id, 'pedido_id', p_pedido_id);
end;
$$;

-- Solo el admin: "Repuesto, continuar"
create or replace function public.resolver_faltante(p_faltante_id uuid, p_nota text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_nota text := nullif(btrim(p_nota), '');
  v_pedido_id uuid;
  v_estado text;
  v_resuelto timestamptz;
begin
  if v_nota is null or length(v_nota) < 3 or length(v_nota) > 300 then
    raise exception 'Indica cómo se resolvió (de 3 a 300 letras).' using errcode = 'AML02';
  end if;

  select f.pedido_id into v_pedido_id from public.faltantes_pedido f where f.id = p_faltante_id;
  if not found then
    raise exception 'El faltante no existe.' using errcode = 'AML04';
  end if;

  select p.estado into v_estado from public.pedidos p where p.id = v_pedido_id for update;

  select f.resuelto_en into v_resuelto
  from public.faltantes_pedido f
  where f.id = p_faltante_id
  for update;

  if v_resuelto is not null then
    raise exception 'Este faltante ya está resuelto.' using errcode = 'AML05';
  end if;

  update public.faltantes_pedido f
  set resuelto_en = now(), resuelto_por = v_admin, nota_resolucion = v_nota
  where f.id = p_faltante_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (v_pedido_id, v_estado, 'Faltante resuelto: ' || v_nota, v_admin);

  return jsonb_build_object('id', p_faltante_id, 'pedido_id', v_pedido_id);
end;
$$;

-- preparando → listo_para_recoger (recojo) o empacado (domicilio / flota)
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
    raise exception 'Solo se empaca un pedido en preparación.' using errcode = 'AML05';
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
    raise exception 'Hay un faltante sin resolver: la tienda tiene que resolverlo antes de empacar.'
      using errcode = 'AML05';
  end if;

  select z.tipo into v_tipo_zona from public.zonas_envio z where z.id = v_pedido.zona_envio_id;
  v_nuevo := case when v_tipo_zona = 'recojo' then 'listo_para_recoger' else 'empacado' end;

  update public.pedidos p
  set estado = v_nuevo, empacado_por = v_usuario, empacado_en = now(), bultos = p_bultos
  where p.id = p_pedido_id;

  if v_nuevo = 'listo_para_recoger' then
    update public.envios e set estado = 'listo_para_recoger' where e.pedido_id = p_pedido_id;
  end if;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (
    p_pedido_id, v_nuevo,
    'Empacado · ' || p_bultos || case when p_bultos = 1 then ' bulto' else ' bultos' end,
    v_usuario
  );

  return jsonb_build_object('id', p_pedido_id, 'estado', v_nuevo, 'bultos', p_bultos);
end;
$$;

-- Cola del almacén: el más antiguo primero
create or replace function public.cola_almacen()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_personal_almacen();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id,
      'codigo', p.codigo,
      'estado', p.estado,
      'metodo_pago', p.metodo_pago,
      'created_at', p.created_at,
      'cliente', public.aml_nombre_corto(p.usuario_id),
      'zona', z.nombre,
      'tipo_zona', z.tipo,
      'productos', (select count(*) from public.pedido_items i where i.pedido_id = p.id),
      'marcados', (select count(*) from public.pedido_items i where i.pedido_id = p.id and i.marcado_en is not null),
      'faltantes_abiertos', (select count(*) from public.faltantes_pedido f where f.pedido_id = p.id and f.resuelto_en is null),
      'preparacion_por', public.aml_nombre_corto(p.preparacion_por),
      'empacado_en', p.empacado_en,
      'bultos', p.bultos
    ) order by p.created_at, p.codigo)
    from public.pedidos p
    left join public.zonas_envio z on z.id = p.zona_envio_id
    where p.estado in ('confirmado', 'preparando', 'empacado', 'listo_para_recoger')
  ), '[]'::jsonb);
end;
$$;

-- Detalle para preparar e imprimir la etiqueta (solo pedidos en el camino del almacén)
create or replace function public.detalle_preparacion(p_pedido_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_personal_almacen();
  v_resultado jsonb;
begin
  select jsonb_build_object(
    'id', p.id,
    'codigo', p.codigo,
    'estado', p.estado,
    'metodo_pago', p.metodo_pago,
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
    'preparacion_por', public.aml_nombre_corto(p.preparacion_por),
    'preparacion_en', p.preparacion_en,
    'empacado_por', public.aml_nombre_corto(p.empacado_por),
    'empacado_en', p.empacado_en,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'nombre_producto', i.nombre_producto,
        'cantidad', i.cantidad,
        'unidad', pr.unidad,
        'sku', pr.sku,
        'marcado', i.marcado_en is not null,
        'marcado_por', public.aml_nombre_corto(i.marcado_por),
        'marcado_en', i.marcado_en
      ) order by i.nombre_producto)
      from public.pedido_items i
      left join public.productos pr on pr.id = i.producto_id
      where i.pedido_id = p.id
    ), '[]'::jsonb),
    'faltantes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'pedido_item_id', f.pedido_item_id,
        'producto', i.nombre_producto,
        'nota', f.nota,
        'reportado_por', public.aml_nombre_corto(f.reportado_por),
        'created_at', f.created_at,
        'resuelto_en', f.resuelto_en,
        'resuelto_por', public.aml_nombre_corto(f.resuelto_por),
        'nota_resolucion', f.nota_resolucion
      ) order by f.created_at)
      from public.faltantes_pedido f
      left join public.pedido_items i on i.id = f.pedido_item_id
      where f.pedido_id = p.id
    ), '[]'::jsonb)
  )
  into v_resultado
  from public.pedidos p
  left join public.perfiles c on c.id = p.usuario_id
  left join public.zonas_envio z on z.id = p.zona_envio_id
  where p.id = p_pedido_id
    and p.estado in ('confirmado', 'preparando', 'empacado', 'listo_para_recoger');

  if v_resultado is null then
    raise exception 'El pedido no existe o no está en el almacén.' using errcode = 'AML04';
  end if;

  return v_resultado;
end;
$$;

-- Línea de tiempo con el nombre de quién hizo cada paso.
-- La ven el dueño del pedido, el admin y el almacén (solo pedidos en su camino).
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
begin
  select p.id, p.usuario_id, p.estado into v_pedido from public.pedidos p where p.id = p_pedido_id;

  if not found
     or not (
       v_pedido.usuario_id is not distinct from v_usuario
       or public.es_admin()
       or (public.es_almacen() and v_pedido.estado in ('confirmado', 'preparando', 'empacado', 'listo_para_recoger'))
     ) then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id,
      'estado', s.estado,
      'nota', s.nota,
      'created_at', s.created_at,
      'actor_nombre', public.aml_nombre_corto(s.creado_por),
      'actor_rol', a.rol,
      'es_propio', s.creado_por = v_usuario
    ) order by s.created_at, s.id)
    from public.seguimiento_pedido s
    left join public.perfiles a on a.id = s.creado_por
    where s.pedido_id = p_pedido_id
  ), '[]'::jsonb);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. cambiar_estado_pedido: camino nuevo (preparar y empacar solo desde el almacén)
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

  if p_estado in ('preparando', 'empacado') or (p_estado = 'listo_para_recoger' and v_pedido.estado = 'preparando') then
    raise exception 'Preparar y empacar se hace desde el panel de almacén.' using errcode = 'AML05';
  end if;

  select z.tipo into v_tipo_zona
  from public.zonas_envio z
  where z.id = v_pedido.zona_envio_id;

  if v_tipo_zona = 'recojo' then
    v_siguiente := case v_pedido.estado
      when 'pendiente' then 'confirmado'
      when 'listo_para_recoger' then 'entregado'
    end;
  else
    v_siguiente := case v_pedido.estado
      when 'pendiente' then 'confirmado'
      when 'empacado' then 'despachado'
      when 'despachado' then 'entregado'
    end;
  end if;

  if v_siguiente is null or p_estado is distinct from v_siguiente then
    raise exception 'Un pedido % no puede pasar a %.', v_pedido.estado, coalesce(p_estado, 'ese estado')
      using errcode = 'AML05';
  end if;

  if p_estado in ('confirmado', 'despachado')
     and v_pedido.metodo_pago is distinct from 'contra_entrega'
     and v_pedido.estado_pago <> 'verificado' then
    raise exception 'El pago de este pedido todavía no está verificado.' using errcode = 'AML05';
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
-- 6. cancelar_pedido: el admin también cancela en preparando y empacado
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
    if v_pedido.estado not in ('pendiente', 'confirmado', 'preparando', 'empacado') then
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
-- 7. Aviso por Telegram: faltante reportado
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.aml_trg_aviso_faltante()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  v_producto text;
begin
  select p.codigo, p.usuario_id into v from public.pedidos p where p.id = new.pedido_id;

  if not found or public.aml_es_cuenta_prueba(v.usuario_id) then
    return null;
  end if;

  select i.nombre_producto into v_producto from public.pedido_items i where i.id = new.pedido_item_id;

  perform public.aml_enviar_telegram(
    '⚠️ Faltante en ' || coalesce(v.codigo, '') || E'\n' ||
    coalesce(v_producto || E'\n', '') ||
    left(new.nota, 200) || E'\n' ||
    'Reportó: ' || coalesce(public.aml_nombre_corto(new.reportado_por), '—') || ' · ' ||
    public.aml_hora_bolivia(now()) || E'\n' ||
    public.aml_url_sitio() || '/admin/pedidos'
  );
  return null;
exception when others then
  raise warning 'Aviso de faltante omitido (SQLSTATE %)', sqlstate;
  return null;
end;
$$;

drop trigger if exists aml_aviso_faltante on public.faltantes_pedido;
create trigger aml_aviso_faltante
  after insert on public.faltantes_pedido
  for each row execute function public.aml_trg_aviso_faltante();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Permisos
-- ─────────────────────────────────────────────────────────────────────────────
-- Internas: nadie las llama desde fuera
revoke execute on function public.aml_personal_almacen() from public, anon, authenticated;
revoke execute on function public.aml_nombre_corto(uuid) from public, anon, authenticated;
revoke execute on function public.aml_trg_aviso_faltante() from public, anon, authenticated;

-- Para las políticas y la API (siempre con sesión)
revoke execute on function public.es_almacen() from public, anon;
revoke execute on function public.es_repartidor() from public, anon;
revoke execute on function public.empezar_preparacion(uuid) from public, anon;
revoke execute on function public.marcar_item_pedido(uuid, boolean) from public, anon;
revoke execute on function public.reportar_faltante(uuid, uuid, text) from public, anon;
revoke execute on function public.resolver_faltante(uuid, text) from public, anon;
revoke execute on function public.empacar_pedido(uuid, integer) from public, anon;
revoke execute on function public.cola_almacen() from public, anon;
revoke execute on function public.detalle_preparacion(uuid) from public, anon;
revoke execute on function public.linea_tiempo_pedido(uuid) from public, anon;
revoke execute on function public.cambiar_estado_pedido(uuid, text, text, text, text) from public, anon;
revoke execute on function public.cancelar_pedido(uuid, text) from public, anon;

grant execute on function public.es_almacen() to authenticated;
grant execute on function public.es_repartidor() to authenticated;
grant execute on function public.empezar_preparacion(uuid) to authenticated;
grant execute on function public.marcar_item_pedido(uuid, boolean) to authenticated;
grant execute on function public.reportar_faltante(uuid, uuid, text) to authenticated;
grant execute on function public.resolver_faltante(uuid, text) to authenticated;
grant execute on function public.empacar_pedido(uuid, integer) to authenticated;
grant execute on function public.cola_almacen() to authenticated;
grant execute on function public.detalle_preparacion(uuid) to authenticated;
grant execute on function public.linea_tiempo_pedido(uuid) to authenticated;
grant execute on function public.cambiar_estado_pedido(uuid, text, text, text, text) to authenticated;
grant execute on function public.cancelar_pedido(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Verificaciones: si algo no cuadra, no se guarda nada
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_funcion text;
  v_cli uuid := gen_random_uuid();
  v_alm uuid := gen_random_uuid();
  v_adm uuid := gen_random_uuid();
  v_zona uuid;
  v_pedido uuid;
  v_item1 uuid;
  v_item2 uuid;
  v_faltante uuid;
  v_res jsonb;
  v_linea jsonb;
  v_estado text;
  v_estado_envio text;
begin
  -- Estructura
  if not exists (
    select 1 from pg_constraint
    where conname = 'perfiles_rol_check' and pg_get_constraintdef(oid) like '%almacen%repartidor%'
  ) then
    raise exception 'FRENO: perfiles_rol_check no admite almacen y repartidor';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'pedidos_estado_check' and pg_get_constraintdef(oid) like '%empacado%'
  ) then
    raise exception 'FRENO: pedidos_estado_check no admite empacado';
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.faltantes_pedido'::regclass) then
    raise exception 'FRENO: faltantes_pedido sin RLS';
  end if;

  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'faltantes_pedido') <> 1 then
    raise exception 'FRENO: faltantes_pedido debe tener solo la política del admin';
  end if;

  if has_table_privilege('authenticated', 'public.faltantes_pedido', 'insert')
     or has_table_privilege('authenticated', 'public.faltantes_pedido', 'update')
     or has_table_privilege('authenticated', 'public.faltantes_pedido', 'delete') then
    raise exception 'FRENO: authenticated puede escribir en faltantes_pedido directo';
  end if;

  foreach v_funcion in array array[
    'es_almacen', 'es_repartidor', 'aml_personal_almacen', 'aml_nombre_corto', 'empezar_preparacion',
    'marcar_item_pedido', 'reportar_faltante', 'resolver_faltante', 'empacar_pedido', 'cola_almacen',
    'detalle_preparacion', 'linea_tiempo_pedido', 'cambiar_estado_pedido', 'cancelar_pedido',
    'aml_trg_aviso_faltante'
  ] loop
    if not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = v_funcion
        and p.proconfig is not null and 'search_path=""' = any (p.proconfig)
    ) then
      raise exception 'FRENO: % no existe o no tiene search_path vacío', v_funcion;
    end if;
  end loop;

  if has_function_privilege('anon', 'public.cola_almacen()', 'execute')
     or has_function_privilege('anon', 'public.empacar_pedido(uuid, integer)', 'execute')
     or has_function_privilege('authenticated', 'public.aml_personal_almacen()', 'execute')
     or has_function_privilege('authenticated', 'public.aml_nombre_corto(uuid)', 'execute') then
    raise exception 'FRENO: permisos de ejecución demasiado abiertos';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'aml_aviso_faltante' and not tgisinternal) then
    raise exception 'FRENO: falta el trigger aml_aviso_faltante';
  end if;

  select z.id into v_zona from public.zonas_envio z where z.tipo = 'recojo' order by z.activo desc limit 1;
  if v_zona is null then
    raise exception 'FRENO: no hay zona de recojo para el recorrido de prueba';
  end if;

  -- Recorrido completo. Todo se deshace con la excepción AMLOK (ni usuarios, ni pedido,
  -- ni seguimiento quedan guardados). Cuentas .test: no avisa por Telegram.
  begin
    insert into auth.users (id, aud, role, email, raw_user_meta_data)
    values
      (v_cli, 'authenticated', 'authenticated', 'cliente.0017@amlagrotech.test', '{"nombre": "Cliente Prueba 0017"}'),
      (v_alm, 'authenticated', 'authenticated', 'almacen.0017@amlagrotech.test', '{"nombre": "Almacén Prueba 0017"}'),
      (v_adm, 'authenticated', 'authenticated', 'admin.0017@amlagrotech.test', '{"nombre": "Admin Prueba 0017"}');

    update public.perfiles set rol = 'almacen' where id = v_alm;
    update public.perfiles set rol = 'admin' where id = v_adm;

    insert into public.pedidos (codigo, usuario_id, estado, metodo_pago, estado_pago, subtotal, costo_envio, total, zona_envio_id, telefono_contacto)
    values ('PRUEBA-0017', v_cli, 'confirmado', 'contra_entrega', 'pendiente', 30, 0, 30, v_zona, '70000000')
    returning id into v_pedido;

    insert into public.pedido_items (pedido_id, nombre_producto, precio_unitario, cantidad, subtotal)
    values (v_pedido, 'Producto A', 10, 1, 10) returning id into v_item1;
    insert into public.pedido_items (pedido_id, nombre_producto, precio_unitario, cantidad, subtotal)
    values (v_pedido, 'Producto B', 10, 2, 20) returning id into v_item2;
    insert into public.envios (pedido_id, zona_envio_id) values (v_pedido, v_zona);

    -- set_config hace que auth.uid() devuelva ese usuario (solo dentro de esta prueba)
    -- Un cliente no prepara
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    begin
      perform public.empezar_preparacion(v_pedido);
      raise exception 'FRENO: un cliente pudo empezar a preparar';
    exception when sqlstate 'AML03' then null;
    end;
    begin
      perform public.cola_almacen();
      raise exception 'FRENO: un cliente pudo ver la cola del almacén';
    exception when sqlstate 'AML03' then null;
    end;

    -- El almacén prepara
    perform set_config('request.jwt.claims', json_build_object('sub', v_alm, 'role', 'authenticated')::text, true);
    perform public.empezar_preparacion(v_pedido);

    if jsonb_array_length(public.cola_almacen()) < 1 then
      raise exception 'FRENO: la cola del almacén no muestra el pedido de prueba';
    end if;

    begin
      perform public.empacar_pedido(v_pedido, 1);
      raise exception 'FRENO: se pudo empacar con productos sin marcar';
    exception when sqlstate 'AML05' then null;
    end;

    perform public.marcar_item_pedido(v_item1, true);
    v_faltante := ((public.reportar_faltante(v_pedido, v_item2, 'No hay stock en estante'))->>'id')::uuid;
    perform public.marcar_item_pedido(v_item2, true);

    begin
      perform public.empacar_pedido(v_pedido, 1);
      raise exception 'FRENO: se pudo empacar con un faltante abierto';
    exception when sqlstate 'AML05' then null;
    end;

    -- El almacén no resuelve faltantes; el admin sí
    begin
      perform public.resolver_faltante(v_faltante, 'Repuesto del depósito');
      raise exception 'FRENO: el almacén pudo resolver un faltante';
    exception when sqlstate 'AML03' then null;
    end;

    perform set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated')::text, true);
    perform public.resolver_faltante(v_faltante, 'Repuesto del depósito');

    begin
      perform public.cambiar_estado_pedido(v_pedido, 'listo_para_recoger', null, null, null);
      raise exception 'FRENO: el admin pudo saltarse el empaque';
    exception when sqlstate 'AML05' then null;
    end;

    perform set_config('request.jwt.claims', json_build_object('sub', v_alm, 'role', 'authenticated')::text, true);
    v_res := public.empacar_pedido(v_pedido, 2);

    select p.estado into v_estado from public.pedidos p where p.id = v_pedido;
    select e.estado into v_estado_envio from public.envios e where e.pedido_id = v_pedido;
    if v_estado <> 'listo_para_recoger' or v_estado_envio <> 'listo_para_recoger' then
      raise exception 'FRENO: un pedido de recojo empacado quedó en % / envío %', v_estado, v_estado_envio;
    end if;

    if (public.detalle_preparacion(v_pedido))->>'empacado_por' is distinct from 'Almacén Prueba' then
      raise exception 'FRENO: el empaque no registró quién lo hizo';
    end if;

    -- El cliente ve quién hizo cada paso
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    v_linea := public.linea_tiempo_pedido(v_pedido);
    if not exists (
      select 1 from jsonb_array_elements(v_linea) e
      where e->>'actor_nombre' = 'Almacén Prueba' and e->>'nota' like 'Empacado%'
    ) then
      raise exception 'FRENO: la línea de tiempo no muestra quién empacó';
    end if;
    if not exists (
      select 1 from jsonb_array_elements(v_linea) e
      where e->>'actor_nombre' = 'Admin Prueba' and e->>'nota' like 'Faltante resuelto%'
    ) then
      raise exception 'FRENO: la línea de tiempo no muestra quién resolvió el faltante';
    end if;

    raise exception using errcode = 'P0001', message = 'AMLOK';
  exception
    when raise_exception then
      if sqlerrm <> 'AMLOK' then raise; end if;
  end;

  perform set_config('request.jwt.claims', '', true);

  if exists (select 1 from public.pedidos where codigo = 'PRUEBA-0017')
     or exists (select 1 from auth.users where id in (v_cli, v_alm, v_adm)) then
    raise exception 'FRENO: el recorrido de prueba no se deshizo';
  end if;

  raise notice '0017 OK: roles almacen/repartidor, estado empacado, preparación con casillas, faltantes y línea de tiempo con nombres';
end;
$$;

commit;
