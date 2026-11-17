-- 0018_entrega_cierre.sql
--
-- POR QUÉ
--   Fase 9D. Observación del docente: "controlar la entrega del producto y finalizar el proceso".
--   Idea de AML: nadie marca "entregado" sin prueba de que el producto llegó.
--
-- QUÉ HACE
--   1. Estado nuevo 'completado' = entregado + pago verificado. Caminos:
--        recojo:    … → listo_para_recoger → [código] → entregado → completado
--        domicilio: … → empacado → [Tomar y salir] → despachado → [cobro si contra entrega] → [código] → entregado → completado
--        flota:     … → empacado → [flota y guía] → despachado → [Recibí mi pedido / admin con nota] → entregado → completado
--      Con el pago ya verificado, entregado pasa a completado en el mismo momento.
--   2. Código de entrega de 4 dígitos (se genera al empacar, solo recojo y domicilio). Tabla
--      codigos_entrega con RLS y SIN políticas: nadie la lee; solo el dueño ve su código con
--      mi_codigo_entrega(). 5 intentos fallidos bloquean; el admin desbloquea con nota.
--      Un intento fallido NO lanza error (si lo hiciera, se desharía la cuenta del intento):
--      entregar_pedido responde {ok: false, intentos_restantes, bloqueado}.
--   3. Contra entrega: quien entrega registra el cobro (el monto debe ser igual al total). Si
--      cobró el repartidor o el almacén, queda "efectivo por rendir" (pago pendiente con
--      cobrado_en) y el admin lo confirma con confirmar_efectivo → completado. Si cobró el admin,
--      el pago queda verificado al momento.
--   4. Calificación de la entrega (1 a 5 estrellas y comentario corto): "Recibí conforme".
--   5. Faltantes: la línea de tiempo del cliente dice solo "Revisando un producto de tu pedido";
--      la nota interna queda en faltantes_pedido (solo admin) y la ven el admin y el almacén.
--   6. Funciones nuevas: mi_codigo_entrega, mis_codigos_entrega, cola_reparto, detalle_entrega,
--      tomar_pedido, registrar_cobro_entrega, entregar_pedido, desbloquear_codigo_entrega,
--      confirmar_recepcion, calificar_entrega, confirmar_efectivo. Se reescriben empacar_pedido,
--      cambiar_estado_pedido (el admin ya no marca "entregado" a mano), linea_tiempo_pedido,
--      reportar_faltante, resolver_faltante y el resumen diario de Telegram.
--   7. Telegram al admin: pedido entregado, código bloqueado y calificación de 1 o 2 estrellas.
--      Las cuentas de prueba no avisan.
--   8. Verificaciones y un recorrido completo de prueba que se deshace solo.
--
-- QUÉ NO TOCA
--   No borra nada. Los pedidos ya empacados, listos o despachados (recojo y domicilio) reciben
--   su código al correr esta migración. Las notas de faltantes que ya estaban en la línea de
--   tiempo se cambian por el texto para el cliente (la nota completa sigue en faltantes_pedido).
--   RLS de pedidos, pagos, envíos y perfiles: igual.
--
-- CUÁNDO CORRERLA
--   ANTES de publicar el código de la 9D. Requiere la 0017.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Requisito: la 0017
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.faltantes_pedido') is null then
    raise exception 'FRENO: falta correr la 0017 (faltantes_pedido no existe)';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Estado 'completado' y columnas
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.pedidos drop constraint if exists pedidos_estado_check;
alter table public.pedidos add constraint pedidos_estado_check
  check (estado in ('pendiente', 'confirmado', 'preparando', 'empacado', 'listo_para_recoger',
                    'despachado', 'entregado', 'completado', 'cancelado'));

alter table public.pedidos add column if not exists despachado_por uuid references auth.users (id);
alter table public.pedidos add column if not exists despachado_en timestamptz;
alter table public.pedidos add column if not exists entregado_por uuid references auth.users (id);
alter table public.pedidos add column if not exists entregado_en timestamptz;
alter table public.pedidos add column if not exists recibe_nombre text;
alter table public.pedidos add column if not exists recibe_ci text;
alter table public.pedidos add column if not exists completado_en timestamptz;
alter table public.pedidos add column if not exists conforme_en timestamptz;

alter table public.pedidos drop constraint if exists pedidos_recibe_valido;
alter table public.pedidos add constraint pedidos_recibe_valido
  check ((recibe_nombre is null or length(recibe_nombre) between 1 and 120)
         and (recibe_ci is null or length(recibe_ci) between 1 and 30));

alter table public.pagos add column if not exists cobrado_por uuid references auth.users (id);
alter table public.pagos add column if not exists cobrado_en timestamptz;
alter table public.pagos add column if not exists monto_cobrado numeric(10,2);

alter table public.pagos drop constraint if exists pagos_cobro_completo;
alter table public.pagos add constraint pagos_cobro_completo
  check ((cobrado_por is null) = (cobrado_en is null) and (cobrado_en is null) = (monto_cobrado is null));

alter table public.seguimiento_pedido add column if not exists faltante_id uuid references public.faltantes_pedido (id);

create index if not exists pedidos_cola_reparto_idx
  on public.pedidos (created_at)
  where estado in ('empacado', 'despachado');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Código de entrega: nadie lo lee directo
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.codigos_entrega (
  pedido_id uuid primary key references public.pedidos (id),
  codigo text not null check (codigo ~ '^[0-9]{4}$'),
  intentos_fallidos integer not null default 0 check (intentos_fallidos between 0 and 5),
  bloqueado_en timestamptz,
  desbloqueado_por uuid references auth.users (id),
  desbloqueado_en timestamptz,
  usado_en timestamptz,
  created_at timestamptz not null default now()
);

alter table public.codigos_entrega enable row level security;
revoke all on public.codigos_entrega from anon, authenticated;
-- Sin políticas a propósito: ni el admin la lee. El dueño ve su código solo con mi_codigo_entrega().

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Calificación de la entrega
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.calificaciones_entrega (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null unique references public.pedidos (id),
  usuario_id uuid not null references auth.users (id),
  estrellas smallint not null check (estrellas between 1 and 5),
  comentario text check (comentario is null or length(comentario) between 1 and 200),
  created_at timestamptz not null default now()
);

alter table public.calificaciones_entrega enable row level security;
revoke all on public.calificaciones_entrega from anon, authenticated;
grant select on public.calificaciones_entrega to authenticated;

drop policy if exists calificaciones_select_propia on public.calificaciones_entrega;
create policy calificaciones_select_propia on public.calificaciones_entrega
  for select to authenticated
  using (usuario_id = (select auth.uid()));

drop policy if exists calificaciones_select_admin on public.calificaciones_entrega;
create policy calificaciones_select_admin on public.calificaciones_entrega
  for select to authenticated
  using ((select public.es_admin()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Auxiliares internas
-- ─────────────────────────────────────────────────────────────────────────────

-- Repartidor o admin activos. Si no, AML03.
create or replace function public.aml_personal_reparto()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid := public.aml_usuario_activo();
begin
  if not (public.es_admin() or public.es_repartidor()) then
    raise exception 'No tienes permiso para esta acción.' using errcode = 'AML03';
  end if;
  return v_id;
end;
$$;

-- Código de 4 dígitos con azar seguro (gen_random_uuid), no random(). No pisa uno existente.
create or replace function public.aml_generar_codigo_entrega(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.codigos_entrega (pedido_id, codigo)
  values (
    p_pedido_id,
    lpad(((('x' || lpad(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8), 16, '0'))::bit(64)::bigint) % 10000)::text, 4, '0')
  )
  on conflict (pedido_id) do nothing;
end;
$$;

-- entregado + pago verificado → completado (queda registrado quién cerró)
create or replace function public.aml_completar_pedido(p_pedido_id uuid, p_actor uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text;
  v_estado_pago text;
begin
  select p.estado, p.estado_pago into v_estado, v_estado_pago
  from public.pedidos p where p.id = p_pedido_id;

  if v_estado <> 'entregado' or v_estado_pago <> 'verificado' then
    return false;
  end if;

  update public.pedidos p set estado = 'completado', completado_en = now() where p.id = p_pedido_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (p_pedido_id, 'completado', 'Pedido completado: entregado y pagado', p_actor);

  return true;
end;
$$;

-- Marca entregado (pedido y envío) y registra quién entregó a quién
create or replace function public.aml_marcar_entregado(
  p_pedido_id uuid, p_actor uuid, p_recibe_nombre text, p_recibe_ci text, p_nota text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.pedidos p
  set estado = 'entregado', entregado_por = p_actor, entregado_en = now(),
      recibe_nombre = p_recibe_nombre, recibe_ci = p_recibe_ci
  where p.id = p_pedido_id;

  update public.envios e
  set estado = 'entregado', entregado_en = now()
  where e.pedido_id = p_pedido_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (p_pedido_id, 'entregado', p_nota, p_actor);

  if public.aml_completar_pedido(p_pedido_id, p_actor) then
    return 'completado';
  end if;
  return 'entregado';
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. empacar_pedido: igual que en la 0017, y ahora genera el código de entrega
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

  -- Por flota no hay código: en la terminal no hay a quién dárselo
  if v_tipo_zona in ('recojo', 'urbano') then
    perform public.aml_generar_codigo_entrega(p_pedido_id);
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

-- Pedidos que ya estaban en camino antes de la 0018: también reciben su código
do $$
declare
  v_id uuid;
begin
  for v_id in
    select p.id
    from public.pedidos p
    join public.zonas_envio z on z.id = p.zona_envio_id
    where p.estado in ('empacado', 'listo_para_recoger', 'despachado')
      and z.tipo in ('recojo', 'urbano')
  loop
    perform public.aml_generar_codigo_entrega(v_id);
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Faltantes: el cliente ve solo "Revisando un producto de tu pedido"
-- ─────────────────────────────────────────────────────────────────────────────
-- Notas que ya estaban en la línea de tiempo (0017): mismo pedido y mismo momento (misma
-- transacción). Solo cambia el texto; la nota completa sigue en faltantes_pedido.
update public.seguimiento_pedido s
set faltante_id = f.id, nota = 'Revisando un producto de tu pedido'
from public.faltantes_pedido f
where s.faltante_id is null
  and s.pedido_id = f.pedido_id
  and s.created_at = f.created_at
  and s.nota like 'Faltante reportado:%';

update public.seguimiento_pedido s
set faltante_id = f.id, nota = 'Producto repuesto, seguimos con tu pedido'
from public.faltantes_pedido f
where s.faltante_id is null
  and s.pedido_id = f.pedido_id
  and s.created_at = f.resuelto_en
  and s.nota like 'Faltante resuelto:%';

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

  if p_item_id is not null and not exists (
    select 1 from public.pedido_items i where i.id = p_item_id and i.pedido_id = p_pedido_id
  ) then
    raise exception 'El producto no es de este pedido.' using errcode = 'AML04';
  end if;

  insert into public.faltantes_pedido (pedido_id, pedido_item_id, nota, reportado_por)
  values (p_pedido_id, p_item_id, v_nota, v_usuario)
  returning id into v_id;

  -- Para el cliente, sin la nota interna (el admin y el almacén la ven en linea_tiempo_pedido)
  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por, faltante_id)
  values (p_pedido_id, v_estado, 'Revisando un producto de tu pedido', v_usuario, v_id);

  return jsonb_build_object('id', v_id, 'pedido_id', p_pedido_id);
end;
$$;

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

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por, faltante_id)
  values (v_pedido_id, v_estado, 'Producto repuesto, seguimos con tu pedido', v_admin, p_faltante_id);

  return jsonb_build_object('id', p_faltante_id, 'pedido_id', v_pedido_id);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Línea de tiempo: con nombres; faltantes completos solo para el admin y el almacén
-- ─────────────────────────────────────────────────────────────────────────────
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
  v_tipo_zona text;
  v_interna boolean;
begin
  select p.id, p.usuario_id, p.estado, p.zona_envio_id, p.despachado_por, p.entregado_por
  into v_pedido
  from public.pedidos p
  where p.id = p_pedido_id;

  if found then
    select z.tipo into v_tipo_zona from public.zonas_envio z where z.id = v_pedido.zona_envio_id;
  end if;

  if not found
     or not (
       v_pedido.usuario_id is not distinct from v_usuario
       or public.es_admin()
       or (public.es_almacen() and v_pedido.estado in ('confirmado', 'preparando', 'empacado', 'listo_para_recoger'))
       or (public.es_repartidor() and v_tipo_zona = 'urbano'
           and (v_pedido.estado = 'empacado' or v_pedido.despachado_por = v_usuario or v_pedido.entregado_por = v_usuario))
     ) then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  -- La nota del faltante es interna: el dueño (y el repartidor) ven solo el texto para el cliente
  v_interna := public.es_admin() or public.es_almacen();

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

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Código del cliente (solo el dueño)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.mi_codigo_entrega(p_pedido_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_usuario_activo();
  v_pedido record;
  v_codigo record;
begin
  select p.id, p.usuario_id, p.estado into v_pedido from public.pedidos p where p.id = p_pedido_id;

  -- Para cualquiera que no sea el dueño, el pedido "no existe" (tampoco el admin)
  if not found or v_pedido.usuario_id is distinct from v_usuario then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  if v_pedido.estado not in ('empacado', 'listo_para_recoger', 'despachado') then
    return null;
  end if;

  select c.codigo, c.bloqueado_en, c.intentos_fallidos, c.usado_en
  into v_codigo
  from public.codigos_entrega c
  where c.pedido_id = p_pedido_id;

  if not found or v_codigo.usado_en is not null then
    return null;
  end if;

  return jsonb_build_object(
    'pedido_id', p_pedido_id,
    -- Bloqueado: no se muestra hasta que la tienda lo desbloquee
    'codigo', case when v_codigo.bloqueado_en is null then v_codigo.codigo end,
    'bloqueado', v_codigo.bloqueado_en is not null
  );
end;
$$;

-- Los códigos de todos mis pedidos en camino (para la lista de Mis pedidos)
create or replace function public.mis_codigos_entrega()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_usuario_activo();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'pedido_id', c.pedido_id,
      'codigo', case when c.bloqueado_en is null then c.codigo end,
      'bloqueado', c.bloqueado_en is not null
    ))
    from public.codigos_entrega c
    join public.pedidos p on p.id = c.pedido_id
    where p.usuario_id = v_usuario
      and p.estado in ('empacado', 'listo_para_recoger', 'despachado')
      and c.usado_en is null
  ), '[]'::jsonb);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Reparto
-- ─────────────────────────────────────────────────────────────────────────────

-- Datos para entregar un pedido. Nunca incluye el código.
-- Admin: cualquiera. Almacén: recojo listo para recoger. Repartidor: domicilio empacado o el que él lleva.
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
  select p.id, p.estado, p.despachado_por, z.tipo as tipo_zona
  into v_pedido
  from public.pedidos p
  left join public.zonas_envio z on z.id = p.zona_envio_id
  where p.id = p_pedido_id;

  if not found or not (
    public.es_admin()
    or (public.es_almacen() and v_pedido.tipo_zona = 'recojo' and v_pedido.estado = 'listo_para_recoger')
    or (public.es_repartidor() and v_pedido.tipo_zona = 'urbano'
        and (v_pedido.estado = 'empacado' or (v_pedido.estado = 'despachado' and v_pedido.despachado_por = v_usuario)))
  ) then
    if not (public.es_admin() or public.es_almacen() or public.es_repartidor()) then
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
    'empacado_en', p.empacado_en,
    'despachado_por', public.aml_nombre_corto(p.despachado_por),
    'despachado_en', p.despachado_en,
    'entregado_por', public.aml_nombre_corto(p.entregado_por),
    'entregado_en', p.entregado_en,
    'recibe_nombre', p.recibe_nombre,
    'cobrado', pa.cobrado_en is not null,
    'cobrado_por', public.aml_nombre_corto(pa.cobrado_por),
    'cobrado_en', pa.cobrado_en,
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
  left join public.pagos pa on pa.pedido_id = p.id
  left join public.codigos_entrega ce on ce.pedido_id = p.id
  where p.id = p_pedido_id;

  return v_resultado;
end;
$$;

-- Cola del repartidor: a domicilio empacados (el más antiguo primero) y los que ya lleva.
-- El admin ve todos los que están en camino.
create or replace function public.cola_reparto()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_personal_reparto();
  v_admin boolean := public.es_admin();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id,
      'codigo', p.codigo,
      'estado', p.estado,
      'metodo_pago', p.metodo_pago,
      'total', p.total,
      'created_at', p.created_at,
      'cliente', c.nombre,
      'telefono', coalesce(p.telefono_contacto, c.telefono),
      'zona', z.nombre,
      'direccion_entrega', p.direccion_entrega,
      'notas', p.notas,
      'bultos', p.bultos,
      'empacado_en', p.empacado_en,
      'despachado_por', public.aml_nombre_corto(p.despachado_por),
      'despachado_en', p.despachado_en,
      'es_mio', p.despachado_por = v_usuario,
      'cobrado', pa.cobrado_en is not null,
      'codigo_bloqueado', ce.bloqueado_en is not null
    ) order by p.created_at, p.codigo)
    from public.pedidos p
    join public.zonas_envio z on z.id = p.zona_envio_id
    left join public.perfiles c on c.id = p.usuario_id
    left join public.pagos pa on pa.pedido_id = p.id
    left join public.codigos_entrega ce on ce.pedido_id = p.id
    where z.tipo = 'urbano'
      and (p.estado = 'empacado' or (p.estado = 'despachado' and (v_admin or p.despachado_por = v_usuario)))
  ), '[]'::jsonb);
end;
$$;

-- "Tomar y salir": empacado → despachado (a domicilio), con quién y cuándo
create or replace function public.tomar_pedido(p_pedido_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_personal_reparto();
  v_pedido record;
begin
  select p.id, p.estado, z.tipo as tipo_zona
  into v_pedido
  from public.pedidos p
  left join public.zonas_envio z on z.id = p.zona_envio_id
  where p.id = p_pedido_id
  for update of p;

  if not found or v_pedido.tipo_zona is distinct from 'urbano' then
    raise exception 'El pedido no existe o no es a domicilio.' using errcode = 'AML04';
  end if;

  if v_pedido.estado = 'despachado' then
    raise exception 'Este pedido ya salió con otro repartidor.' using errcode = 'AML05';
  end if;

  if v_pedido.estado <> 'empacado' then
    raise exception 'Solo se toma un pedido empacado.' using errcode = 'AML05';
  end if;

  update public.pedidos p
  set estado = 'despachado', despachado_por = v_usuario, despachado_en = now()
  where p.id = p_pedido_id;

  update public.envios e
  set estado = 'en_camino', despachado_en = now()
  where e.pedido_id = p_pedido_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (p_pedido_id, 'despachado', 'Salió a entregar', v_usuario);

  return jsonb_build_object('id', p_pedido_id, 'estado', 'despachado');
end;
$$;

-- Quién puede entregar (y cobrar) este pedido. Devuelve el usuario o corta con AML03/AML05.
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
    if not (v_admin or public.es_almacen()) then
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
      raise exception 'Primero toca «Tomar y salir»: el pedido todavía no salió.' using errcode = 'AML05';
    end if;
    if not v_admin and p_despachado_por is distinct from v_usuario then
      raise exception 'Este pedido lo lleva otro repartidor.' using errcode = 'AML03';
    end if;
  end if;

  return v_usuario;
end;
$$;

-- Contra entrega: cobro en efectivo (el monto debe ser igual al total).
-- Si cobra el admin, el pago queda verificado; si cobra el repartidor o el almacén, queda por rendir.
create or replace function public.registrar_cobro_entrega(p_pedido_id uuid, p_monto numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid;
  v_admin boolean := public.es_admin();
  v_pedido record;
  v_pago record;
begin
  select p.id, p.estado, p.metodo_pago, p.total, p.despachado_por, z.tipo as tipo_zona
  into v_pedido
  from public.pedidos p
  left join public.zonas_envio z on z.id = p.zona_envio_id
  where p.id = p_pedido_id
  for update of p;

  if not found then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  v_usuario := public.aml_puede_entregar(v_pedido.tipo_zona, v_pedido.estado, v_pedido.despachado_por);

  if v_pedido.metodo_pago is distinct from 'contra_entrega' then
    raise exception 'Este pedido ya está pagado: no hay nada que cobrar.' using errcode = 'AML05';
  end if;

  select pa.id, pa.cobrado_en into v_pago from public.pagos pa where pa.pedido_id = p_pedido_id for update;

  if v_pago.id is null then
    raise exception 'El pedido no tiene pago registrado.' using errcode = 'AML04';
  end if;

  if v_pago.cobrado_en is not null then
    raise exception 'El cobro de este pedido ya está registrado.' using errcode = 'AML05';
  end if;

  if p_monto is null or round(p_monto, 2) <> v_pedido.total then
    raise exception 'El monto recibido no coincide con el total del pedido (%).', public.aml_formato_bs(v_pedido.total)
      using errcode = 'AML02';
  end if;

  update public.pagos pa
  set cobrado_por = v_usuario, cobrado_en = now(), monto_cobrado = round(p_monto, 2)
  where pa.id = v_pago.id;

  if v_admin then
    update public.pagos pa
    set estado = 'verificado', revisado_por = v_usuario, revisado_en = now()
    where pa.id = v_pago.id;
    update public.pedidos p set estado_pago = 'verificado' where p.id = p_pedido_id;

    insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
    values (p_pedido_id, v_pedido.estado, 'Pago verificado · cobro en efectivo ' || public.aml_formato_bs(p_monto), v_usuario);
  else
    insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
    values (p_pedido_id, v_pedido.estado, 'Cobro en efectivo: ' || public.aml_formato_bs(p_monto), v_usuario);
  end if;

  return jsonb_build_object('id', p_pedido_id, 'cobrado', true, 'verificado', v_admin);
end;
$$;

-- Entrega con el código del cliente. Un código incorrecto NO lanza error: así el intento queda contado.
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
    raise exception 'Primero registra el cobro: este pedido es contra entrega.' using errcode = 'AML05';
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

-- Solo el admin, con nota: vuelve a habilitar el código
create or replace function public.desbloquear_codigo_entrega(p_pedido_id uuid, p_nota text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_nota text := nullif(btrim(p_nota), '');
  v_estado text;
  v_bloqueado timestamptz;
begin
  if v_nota is null or length(v_nota) < 3 or length(v_nota) > 300 then
    raise exception 'Indica por qué se desbloquea (de 3 a 300 letras).' using errcode = 'AML02';
  end if;

  select p.estado into v_estado from public.pedidos p where p.id = p_pedido_id for update;
  if not found then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  select c.bloqueado_en into v_bloqueado from public.codigos_entrega c where c.pedido_id = p_pedido_id for update;
  if v_bloqueado is null then
    raise exception 'El código de este pedido no está bloqueado.' using errcode = 'AML05';
  end if;

  update public.codigos_entrega c
  set intentos_fallidos = 0, bloqueado_en = null, desbloqueado_por = v_admin, desbloqueado_en = now()
  where c.pedido_id = p_pedido_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (p_pedido_id, v_estado, 'Código de entrega desbloqueado: ' || v_nota, v_admin);

  return jsonb_build_object('id', p_pedido_id, 'desbloqueado', true);
end;
$$;

-- Por flota: el cliente confirma "Recibí mi pedido", o el admin con una nota
create or replace function public.confirmar_recepcion(p_pedido_id uuid, p_nota text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_usuario_activo();
  v_admin boolean := public.es_admin();
  v_nota text := nullif(btrim(p_nota), '');
  v_pedido record;
  v_estado text;
begin
  select p.id, p.estado, p.usuario_id, p.recoge_nombre, p.recoge_ci, z.tipo as tipo_zona
  into v_pedido
  from public.pedidos p
  left join public.zonas_envio z on z.id = p.zona_envio_id
  where p.id = p_pedido_id
  for update of p;

  if not found or not (v_admin or v_pedido.usuario_id = v_usuario) then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  if v_pedido.tipo_zona is distinct from 'provincia' then
    raise exception 'Este pedido se entrega con el código de entrega.' using errcode = 'AML05';
  end if;

  if v_pedido.estado <> 'despachado' then
    raise exception 'Solo se confirma la recepción de un pedido que ya va en la flota.' using errcode = 'AML05';
  end if;

  if v_pedido.usuario_id = v_usuario then
    v_estado := public.aml_marcar_entregado(
      p_pedido_id, v_usuario, v_pedido.recoge_nombre, v_pedido.recoge_ci, 'Recibido por el cliente en la flota'
    );
  else
    if v_nota is null or length(v_nota) < 3 or length(v_nota) > 300 then
      raise exception 'Indica cómo se confirmó la entrega (de 3 a 300 letras).' using errcode = 'AML02';
    end if;
    v_estado := public.aml_marcar_entregado(
      p_pedido_id, v_usuario, v_pedido.recoge_nombre, v_pedido.recoge_ci, 'Entrega en la flota confirmada por la tienda: ' || v_nota
    );
  end if;

  return jsonb_build_object('id', p_pedido_id, 'estado', v_estado);
end;
$$;

-- "Recibí conforme": 1 a 5 estrellas y comentario corto (una sola vez, solo el dueño)
create or replace function public.calificar_entrega(p_pedido_id uuid, p_estrellas integer, p_comentario text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.aml_usuario_activo();
  v_comentario text := nullif(btrim(p_comentario), '');
  v_pedido record;
begin
  if p_estrellas is null or p_estrellas < 1 or p_estrellas > 5 then
    raise exception 'Elige de 1 a 5 estrellas.' using errcode = 'AML02';
  end if;

  if v_comentario is not null and length(v_comentario) > 200 then
    raise exception 'El comentario va hasta 200 letras.' using errcode = 'AML02';
  end if;

  select p.id, p.estado, p.usuario_id into v_pedido from public.pedidos p where p.id = p_pedido_id for update;

  if not found or v_pedido.usuario_id is distinct from v_usuario then
    raise exception 'El pedido no existe.' using errcode = 'AML04';
  end if;

  if v_pedido.estado not in ('entregado', 'completado') then
    raise exception 'Califica la entrega cuando tengas tu pedido.' using errcode = 'AML05';
  end if;

  if exists (select 1 from public.calificaciones_entrega c where c.pedido_id = p_pedido_id) then
    raise exception 'Ya calificaste esta entrega. ¡Gracias!' using errcode = 'AML05';
  end if;

  insert into public.calificaciones_entrega (pedido_id, usuario_id, estrellas, comentario)
  values (p_pedido_id, v_usuario, p_estrellas, v_comentario);

  update public.pedidos p set conforme_en = now() where p.id = p_pedido_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (
    p_pedido_id, v_pedido.estado,
    'Recibí conforme · ' || p_estrellas || case when p_estrellas = 1 then ' estrella' else ' estrellas' end,
    v_usuario
  );

  return jsonb_build_object('pedido_id', p_pedido_id, 'estrellas', p_estrellas);
end;
$$;

-- Solo el admin: "Recibí el efectivo" del repartidor o del almacén → pago verificado (y completado si ya se entregó)
create or replace function public.confirmar_efectivo(p_pago_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.aml_admin_activo();
  v_pedido_id uuid;
  v_pedido record;
  v_pago record;
  v_completado boolean;
begin
  select pa.pedido_id into v_pedido_id from public.pagos pa where pa.id = p_pago_id;
  if not found then
    raise exception 'El pago no existe.' using errcode = 'AML04';
  end if;

  -- Primero el pedido y después el pago, como en el resto
  select p.id, p.estado into v_pedido from public.pedidos p where p.id = v_pedido_id for update;
  select pa.id, pa.metodo, pa.estado, pa.cobrado_en, pa.monto_cobrado
  into v_pago
  from public.pagos pa
  where pa.id = p_pago_id
  for update;

  if v_pedido.estado = 'cancelado' then
    raise exception 'Este pedido está cancelado.' using errcode = 'AML05';
  end if;

  if v_pago.metodo <> 'contra_entrega' or v_pago.cobrado_en is null then
    raise exception 'Este pago no tiene un cobro en efectivo por rendir.' using errcode = 'AML05';
  end if;

  if v_pago.estado <> 'pendiente' then
    raise exception 'Este efectivo ya se recibió.' using errcode = 'AML05';
  end if;

  update public.pagos pa
  set estado = 'verificado', revisado_por = v_admin, revisado_en = now()
  where pa.id = p_pago_id;

  update public.pedidos p set estado_pago = 'verificado' where p.id = v_pedido_id;

  insert into public.seguimiento_pedido (pedido_id, estado, nota, creado_por)
  values (v_pedido_id, v_pedido.estado, 'Pago verificado · efectivo recibido ' || public.aml_formato_bs(v_pago.monto_cobrado), v_admin);

  v_completado := public.aml_completar_pedido(v_pedido_id, v_admin);

  return jsonb_build_object(
    'id', p_pago_id, 'estado', 'verificado',
    'estado_pedido', case when v_completado then 'completado' else v_pedido.estado end
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. cambiar_estado_pedido: el admin confirma y despacha por flota; ya no marca "entregado"
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

  if p_estado in ('entregado', 'completado') then
    raise exception 'La entrega se registra con el código del cliente (por flota, con «Recibí mi pedido» o con una nota de la tienda).'
      using errcode = 'AML05';
  end if;

  select z.tipo into v_tipo_zona
  from public.zonas_envio z
  where z.id = v_pedido.zona_envio_id;

  if p_estado = 'despachado' and v_tipo_zona = 'urbano' then
    raise exception 'A domicilio lo despacha el repartidor con «Tomar y salir».' using errcode = 'AML05';
  end if;

  v_siguiente := case
    when v_pedido.estado = 'pendiente' then 'confirmado'
    when v_pedido.estado = 'empacado' and v_tipo_zona = 'provincia' then 'despachado'
  end;

  if v_siguiente is null or p_estado is distinct from v_siguiente then
    raise exception 'Un pedido % no puede pasar a %.', v_pedido.estado, coalesce(p_estado, 'ese estado')
      using errcode = 'AML05';
  end if;

  if v_pedido.metodo_pago is distinct from 'contra_entrega' and v_pedido.estado_pago <> 'verificado' then
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
-- 11. Telegram al admin
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.aml_trg_aviso_entregado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pago record;
begin
  if public.aml_es_cuenta_prueba(new.usuario_id) then
    return null;
  end if;

  select pa.estado, pa.cobrado_en into v_pago from public.pagos pa where pa.pedido_id = new.id;

  perform public.aml_enviar_telegram(
    '✅ Entregado ' || coalesce(new.codigo, '') || E'\n' ||
    'A: ' || coalesce(new.recibe_nombre, '—') || E'\n' ||
    'Por: ' || coalesce(public.aml_nombre_corto(new.entregado_por), '—') || ' · ' ||
    public.aml_hora_bolivia(coalesce(new.entregado_en, now())) || E'\n' ||
    'Total: ' || public.aml_formato_bs(new.total) ||
    case when new.metodo_pago = 'contra_entrega' and v_pago.estado = 'pendiente' and v_pago.cobrado_en is not null
      then E'\n💵 Efectivo por rendir' else '' end || E'\n' ||
    public.aml_url_sitio() || '/pedidos/' || new.id
  );
  return null;
exception when others then
  raise warning 'Aviso de entrega omitido (SQLSTATE %)', sqlstate;
  return null;
end;
$$;

drop trigger if exists aml_aviso_entregado on public.pedidos;
create trigger aml_aviso_entregado
  after update of estado on public.pedidos
  for each row
  when (new.estado = 'entregado' and old.estado is distinct from 'entregado')
  execute function public.aml_trg_aviso_entregado();

create or replace function public.aml_trg_aviso_codigo_bloqueado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  select p.codigo, p.usuario_id into v from public.pedidos p where p.id = new.pedido_id;

  if not found or public.aml_es_cuenta_prueba(v.usuario_id) then
    return null;
  end if;

  perform public.aml_enviar_telegram(
    '🔒 Código de entrega bloqueado en ' || coalesce(v.codigo, '') || E'\n' ||
    '5 intentos fallidos · ' || public.aml_hora_bolivia(now()) || E'\n' ||
    'Revisa con el cliente y desbloquéalo desde el pedido:' || E'\n' ||
    public.aml_url_sitio() || '/pedidos/' || new.pedido_id
  );
  return null;
exception when others then
  raise warning 'Aviso de código bloqueado omitido (SQLSTATE %)', sqlstate;
  return null;
end;
$$;

drop trigger if exists aml_aviso_codigo_bloqueado on public.codigos_entrega;
create trigger aml_aviso_codigo_bloqueado
  after update of bloqueado_en on public.codigos_entrega
  for each row
  when (new.bloqueado_en is not null and old.bloqueado_en is null)
  execute function public.aml_trg_aviso_codigo_bloqueado();

create or replace function public.aml_trg_aviso_calificacion_baja()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text;
begin
  if new.estrellas > 2 or public.aml_es_cuenta_prueba(new.usuario_id) then
    return null;
  end if;

  select p.codigo into v_codigo from public.pedidos p where p.id = new.pedido_id;

  perform public.aml_enviar_telegram(
    '⭐ Calificación baja en ' || coalesce(v_codigo, '') || ': ' || new.estrellas || ' de 5' || E'\n' ||
    coalesce('«' || left(new.comentario, 200) || '»' || E'\n', '') ||
    public.aml_url_sitio() || '/pedidos/' || new.pedido_id
  );
  return null;
exception when others then
  raise warning 'Aviso de calificación omitido (SQLSTATE %)', sqlstate;
  return null;
end;
$$;

drop trigger if exists aml_aviso_calificacion_baja on public.calificaciones_entrega;
create trigger aml_aviso_calificacion_baja
  after insert on public.calificaciones_entrega
  for each row execute function public.aml_trg_aviso_calificacion_baja();

-- Resumen diario: igual que en la 0012, pero 'completado' tampoco es un pedido abierto
create or replace function public.aml_aviso_resumen_diario()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ahora timestamp := now() at time zone 'America/La_Paz';
  v_desde timestamptz := date_trunc('day', v_ahora) at time zone 'America/La_Paz';
  v_hasta timestamptz := (date_trunc('day', v_ahora) + interval '1 day') at time zone 'America/La_Paz';
  v_pedidos integer;
  v_total numeric(10,2);
  v_pagos integer;
  v_por_despachar integer;
  v_en_camino integer;
  v_bajos integer;
  v_lista text;
begin
  select count(*), coalesce(sum(p.total), 0)
  into v_pedidos, v_total
  from public.pedidos p
  where p.created_at >= v_desde and p.created_at < v_hasta
    and p.estado <> 'cancelado'
    and not public.aml_es_cuenta_prueba(p.usuario_id);

  select count(*) into v_pagos
  from public.pagos pa
  join public.pedidos p on p.id = pa.pedido_id
  where pa.estado = 'en_revision' and p.estado <> 'cancelado'
    and not public.aml_es_cuenta_prueba(p.usuario_id);

  select count(*) filter (where e.estado = 'por_despachar'),
         count(*) filter (where e.estado = 'en_camino')
  into v_por_despachar, v_en_camino
  from public.envios e
  join public.pedidos p on p.id = e.pedido_id
  where p.estado not in ('cancelado', 'entregado', 'completado')
    and not public.aml_es_cuenta_prueba(p.usuario_id);

  select count(*) into v_bajos
  from public.productos pr
  where pr.activo and pr.stock <= pr.stock_minimo;

  select string_agg('• ' || b.nombre || ': ' || b.stock || ' (mín. ' || b.stock_minimo || ')', E'\n' order by b.stock, b.nombre)
  into v_lista
  from (
    select pr.nombre, pr.stock, pr.stock_minimo
    from public.productos pr
    where pr.activo and pr.stock <= pr.stock_minimo
    order by pr.stock, pr.nombre
    limit 10
  ) b;

  return public.aml_enviar_telegram(
    '📊 Resumen del ' || to_char(v_ahora, 'DD/MM') || E'\n' ||
    'Pedidos de hoy: ' || v_pedidos || E'\n' ||
    'Total vendido: ' || public.aml_formato_bs(v_total) || E'\n' ||
    'Pagos por revisar: ' || v_pagos || E'\n' ||
    'Envíos por despachar: ' || v_por_despachar || ' · en camino: ' || v_en_camino || E'\n' ||
    'Stock bajo: ' || v_bajos ||
    case when v_bajos > 0 then E'\n' || v_lista else '' end ||
    case when v_bajos > 10 then E'\n…y ' || (v_bajos - 10) || ' más' else '' end || E'\n' ||
    public.aml_url_sitio() || '/admin'
  );
exception when others then
  raise warning 'Resumen diario omitido (SQLSTATE %)', sqlstate;
  return false;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. Permisos
-- ─────────────────────────────────────────────────────────────────────────────
-- Internas: nadie las llama desde fuera
revoke execute on function public.aml_personal_reparto() from public, anon, authenticated;
revoke execute on function public.aml_generar_codigo_entrega(uuid) from public, anon, authenticated;
revoke execute on function public.aml_completar_pedido(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.aml_marcar_entregado(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.aml_puede_entregar(text, text, uuid) from public, anon, authenticated;
revoke execute on function public.aml_trg_aviso_entregado() from public, anon, authenticated;
revoke execute on function public.aml_trg_aviso_codigo_bloqueado() from public, anon, authenticated;
revoke execute on function public.aml_trg_aviso_calificacion_baja() from public, anon, authenticated;
revoke execute on function public.aml_aviso_resumen_diario() from public, anon, authenticated;

-- Para la API (siempre con sesión; cada función revisa el rol)
revoke execute on function public.empacar_pedido(uuid, integer) from public, anon;
revoke execute on function public.reportar_faltante(uuid, uuid, text) from public, anon;
revoke execute on function public.resolver_faltante(uuid, text) from public, anon;
revoke execute on function public.linea_tiempo_pedido(uuid) from public, anon;
revoke execute on function public.mi_codigo_entrega(uuid) from public, anon;
revoke execute on function public.mis_codigos_entrega() from public, anon;
revoke execute on function public.detalle_entrega(uuid) from public, anon;
revoke execute on function public.cola_reparto() from public, anon;
revoke execute on function public.tomar_pedido(uuid) from public, anon;
revoke execute on function public.registrar_cobro_entrega(uuid, numeric) from public, anon;
revoke execute on function public.entregar_pedido(uuid, text, text, text) from public, anon;
revoke execute on function public.desbloquear_codigo_entrega(uuid, text) from public, anon;
revoke execute on function public.confirmar_recepcion(uuid, text) from public, anon;
revoke execute on function public.calificar_entrega(uuid, integer, text) from public, anon;
revoke execute on function public.confirmar_efectivo(uuid) from public, anon;
revoke execute on function public.cambiar_estado_pedido(uuid, text, text, text, text) from public, anon;

grant execute on function public.empacar_pedido(uuid, integer) to authenticated;
grant execute on function public.reportar_faltante(uuid, uuid, text) to authenticated;
grant execute on function public.resolver_faltante(uuid, text) to authenticated;
grant execute on function public.linea_tiempo_pedido(uuid) to authenticated;
grant execute on function public.mi_codigo_entrega(uuid) to authenticated;
grant execute on function public.mis_codigos_entrega() to authenticated;
grant execute on function public.detalle_entrega(uuid) to authenticated;
grant execute on function public.cola_reparto() to authenticated;
grant execute on function public.tomar_pedido(uuid) to authenticated;
grant execute on function public.registrar_cobro_entrega(uuid, numeric) to authenticated;
grant execute on function public.entregar_pedido(uuid, text, text, text) to authenticated;
grant execute on function public.desbloquear_codigo_entrega(uuid, text) to authenticated;
grant execute on function public.confirmar_recepcion(uuid, text) to authenticated;
grant execute on function public.calificar_entrega(uuid, integer, text) to authenticated;
grant execute on function public.confirmar_efectivo(uuid) to authenticated;
grant execute on function public.cambiar_estado_pedido(uuid, text, text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. Verificaciones: si algo no cuadra, no se guarda nada
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_funcion text;
  v_cli uuid := gen_random_uuid();
  v_alm uuid := gen_random_uuid();
  v_rep uuid := gen_random_uuid();
  v_adm uuid := gen_random_uuid();
  v_zona_urbana uuid;
  v_zona_recojo uuid;
  v_zona_flota uuid;
  v_a uuid;
  v_b uuid;
  v_c uuid;
  v_item1 uuid;
  v_item2 uuid;
  v_pago_a uuid;
  v_faltante uuid;
  v_codigo text;
  v_malo text;
  v_res jsonb;
  v_linea jsonb;
  v_estado text;
  v_estado_pago text;
  i integer;
begin
  -- Estructura
  if not exists (
    select 1 from pg_constraint
    where conname = 'pedidos_estado_check' and pg_get_constraintdef(oid) like '%completado%'
  ) then
    raise exception 'FRENO: pedidos_estado_check no admite completado';
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.codigos_entrega'::regclass) then
    raise exception 'FRENO: codigos_entrega sin RLS';
  end if;

  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'codigos_entrega') then
    raise exception 'FRENO: codigos_entrega no debe tener políticas (nadie la lee directo)';
  end if;

  if has_table_privilege('authenticated', 'public.codigos_entrega', 'select')
     or has_table_privilege('anon', 'public.codigos_entrega', 'select')
     or has_table_privilege('authenticated', 'public.codigos_entrega', 'update') then
    raise exception 'FRENO: codigos_entrega se puede leer o escribir directo';
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.calificaciones_entrega'::regclass) then
    raise exception 'FRENO: calificaciones_entrega sin RLS';
  end if;

  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'calificaciones_entrega') <> 2 then
    raise exception 'FRENO: calificaciones_entrega debe tener solo las políticas de lectura (propia y admin)';
  end if;

  if has_table_privilege('authenticated', 'public.calificaciones_entrega', 'insert')
     or has_table_privilege('authenticated', 'public.calificaciones_entrega', 'update')
     or has_table_privilege('authenticated', 'public.calificaciones_entrega', 'delete') then
    raise exception 'FRENO: authenticated puede escribir en calificaciones_entrega directo';
  end if;

  foreach v_funcion in array array[
    'aml_personal_reparto', 'aml_generar_codigo_entrega', 'aml_completar_pedido', 'aml_marcar_entregado',
    'aml_puede_entregar', 'empacar_pedido', 'reportar_faltante', 'resolver_faltante', 'linea_tiempo_pedido',
    'mi_codigo_entrega', 'mis_codigos_entrega', 'detalle_entrega', 'cola_reparto', 'tomar_pedido',
    'registrar_cobro_entrega', 'entregar_pedido', 'desbloquear_codigo_entrega', 'confirmar_recepcion',
    'calificar_entrega', 'confirmar_efectivo', 'cambiar_estado_pedido', 'aml_trg_aviso_entregado',
    'aml_trg_aviso_codigo_bloqueado', 'aml_trg_aviso_calificacion_baja', 'aml_aviso_resumen_diario'
  ] loop
    if not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = v_funcion
        and p.proconfig is not null and 'search_path=""' = any (p.proconfig)
    ) then
      raise exception 'FRENO: % no existe o no tiene search_path vacío', v_funcion;
    end if;
  end loop;

  if has_function_privilege('anon', 'public.entregar_pedido(uuid, text, text, text)', 'execute')
     or has_function_privilege('anon', 'public.mi_codigo_entrega(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.aml_generar_codigo_entrega(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.aml_marcar_entregado(uuid, uuid, text, text, text)', 'execute')
     or has_function_privilege('authenticated', 'public.aml_completar_pedido(uuid, uuid)', 'execute') then
    raise exception 'FRENO: permisos de ejecución demasiado abiertos';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'aml_aviso_entregado' and not tgisinternal)
     or not exists (select 1 from pg_trigger where tgname = 'aml_aviso_codigo_bloqueado' and not tgisinternal)
     or not exists (select 1 from pg_trigger where tgname = 'aml_aviso_calificacion_baja' and not tgisinternal) then
    raise exception 'FRENO: faltan los triggers de aviso de la 0018';
  end if;

  if exists (
    select 1 from public.pedidos p
    join public.zonas_envio z on z.id = p.zona_envio_id
    where p.estado in ('empacado', 'listo_para_recoger', 'despachado') and z.tipo in ('recojo', 'urbano')
      and not exists (select 1 from public.codigos_entrega c where c.pedido_id = p.id)
  ) then
    raise exception 'FRENO: hay pedidos en camino sin código de entrega';
  end if;

  select z.id into v_zona_urbana from public.zonas_envio z where z.tipo = 'urbano' order by z.activo desc, z.orden limit 1;
  select z.id into v_zona_recojo from public.zonas_envio z where z.tipo = 'recojo' order by z.activo desc limit 1;
  select z.id into v_zona_flota from public.zonas_envio z where z.tipo = 'provincia' order by z.activo desc limit 1;
  if v_zona_urbana is null or v_zona_recojo is null or v_zona_flota is null then
    raise exception 'FRENO: faltan zonas (domicilio, recojo y flota) para el recorrido de prueba';
  end if;

  -- Recorrido completo. Todo se deshace con la excepción AMLOK (ni usuarios, ni pedidos, ni
  -- códigos, ni calificaciones quedan guardados). Cuentas .test: no avisa por Telegram.
  begin
    insert into auth.users (id, aud, role, email, raw_user_meta_data)
    values
      (v_cli, 'authenticated', 'authenticated', 'cliente.0018@amlagrotech.test', '{"nombre": "Cliente Prueba 0018"}'),
      (v_alm, 'authenticated', 'authenticated', 'almacen.0018@amlagrotech.test', '{"nombre": "Almacén Prueba 0018"}'),
      (v_rep, 'authenticated', 'authenticated', 'repartidor.0018@amlagrotech.test', '{"nombre": "Repartidor Prueba 0018"}'),
      (v_adm, 'authenticated', 'authenticated', 'admin.0018@amlagrotech.test', '{"nombre": "Admin Prueba 0018"}');

    update public.perfiles set rol = 'almacen' where id = v_alm;
    update public.perfiles set rol = 'repartidor' where id = v_rep;
    update public.perfiles set rol = 'admin' where id = v_adm;

    -- A: a domicilio, contra entrega
    insert into public.pedidos (codigo, usuario_id, estado, metodo_pago, estado_pago, subtotal, costo_envio, total, zona_envio_id, telefono_contacto, direccion_entrega)
    values ('PRUEBA-0018A', v_cli, 'confirmado', 'contra_entrega', 'pendiente', 30, 0, 30, v_zona_urbana, '70000000', 'Calle de prueba 1')
    returning id into v_a;
    insert into public.pedido_items (pedido_id, nombre_producto, precio_unitario, cantidad, subtotal)
    values (v_a, 'Producto A', 10, 1, 10) returning id into v_item1;
    insert into public.pedido_items (pedido_id, nombre_producto, precio_unitario, cantidad, subtotal)
    values (v_a, 'Producto B', 10, 2, 20) returning id into v_item2;
    insert into public.envios (pedido_id, zona_envio_id) values (v_a, v_zona_urbana);
    insert into public.pagos (pedido_id, metodo, monto) values (v_a, 'contra_entrega', 30) returning id into v_pago_a;

    -- B: recojo en tienda, QR verificado, listo para recoger
    insert into public.pedidos (codigo, usuario_id, estado, metodo_pago, estado_pago, subtotal, costo_envio, total, zona_envio_id, telefono_contacto)
    values ('PRUEBA-0018B', v_cli, 'listo_para_recoger', 'qr', 'verificado', 15, 0, 15, v_zona_recojo, '70000000')
    returning id into v_b;
    insert into public.envios (pedido_id, zona_envio_id, estado) values (v_b, v_zona_recojo, 'listo_para_recoger');
    insert into public.pagos (pedido_id, metodo, monto, estado) values (v_b, 'qr', 15, 'verificado');
    perform public.aml_generar_codigo_entrega(v_b);

    -- C: por flota, transferencia verificada, ya despachado
    insert into public.pedidos (codigo, usuario_id, estado, metodo_pago, estado_pago, subtotal, costo_envio, total, zona_envio_id, telefono_contacto, recoge_nombre, recoge_ci)
    values ('PRUEBA-0018C', v_cli, 'despachado', 'transferencia', 'verificado', 20, 0, 20, v_zona_flota, '70000000', 'Cliente Prueba', '1234567')
    returning id into v_c;
    insert into public.envios (pedido_id, zona_envio_id, estado) values (v_c, v_zona_flota, 'en_camino');
    insert into public.pagos (pedido_id, metodo, monto, estado) values (v_c, 'transferencia', 20, 'verificado');

    -- set_config hace que auth.uid() devuelva ese usuario (solo dentro de esta prueba)
    -- El almacén prepara A con un faltante
    perform set_config('request.jwt.claims', json_build_object('sub', v_alm, 'role', 'authenticated')::text, true);
    perform public.empezar_preparacion(v_a);
    perform public.marcar_item_pedido(v_item1, true);
    perform public.marcar_item_pedido(v_item2, true);
    v_faltante := ((public.reportar_faltante(v_a, v_item2, 'Nota interna 0018: estante vacío'))->>'id')::uuid;

    perform set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated')::text, true);
    perform public.resolver_faltante(v_faltante, 'Repuesto del depósito 0018');
    v_linea := public.linea_tiempo_pedido(v_a);
    if not exists (select 1 from jsonb_array_elements(v_linea) e where e->>'nota' like '%Nota interna 0018%') then
      raise exception 'FRENO: el admin no ve la nota completa del faltante';
    end if;

    perform set_config('request.jwt.claims', json_build_object('sub', v_alm, 'role', 'authenticated')::text, true);
    perform public.empacar_pedido(v_a, 1);

    -- El cliente ve su código, pero no la nota interna del faltante
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    v_codigo := (public.mi_codigo_entrega(v_a))->>'codigo';
    if v_codigo is null or v_codigo !~ '^[0-9]{4}$' then
      raise exception 'FRENO: el dueño no ve su código de entrega';
    end if;
    v_malo := case when v_codigo = '0000' then '1111' else '0000' end;
    if jsonb_array_length(public.mis_codigos_entrega()) < 2 then
      raise exception 'FRENO: mis_codigos_entrega no devuelve los códigos del cliente';
    end if;
    v_linea := public.linea_tiempo_pedido(v_a);
    if exists (select 1 from jsonb_array_elements(v_linea) e where e->>'nota' like '%Nota interna 0018%' or e->>'nota' like '%Repuesto del depósito 0018%') then
      raise exception 'FRENO: el cliente ve la nota interna del faltante';
    end if;
    if not exists (select 1 from jsonb_array_elements(v_linea) e where e->>'nota' = 'Revisando un producto de tu pedido') then
      raise exception 'FRENO: el cliente no ve «Revisando un producto de tu pedido»';
    end if;
    if exists (select 1 from public.seguimiento_pedido s where s.pedido_id = v_a and s.nota like '%Nota interna 0018%') then
      raise exception 'FRENO: la nota interna quedó en seguimiento_pedido (el cliente la lee por RLS)';
    end if;

    -- El repartidor nunca ve el código
    perform set_config('request.jwt.claims', json_build_object('sub', v_rep, 'role', 'authenticated')::text, true);
    begin
      perform public.mi_codigo_entrega(v_a);
      raise exception 'FRENO: el repartidor pudo ver el código de entrega';
    exception when sqlstate 'AML04' then null;
    end;
    if (public.detalle_entrega(v_a)) ? 'codigo_entrega' or (public.detalle_entrega(v_a))::text like '%"' || v_codigo || '"%' then
      raise exception 'FRENO: detalle_entrega deja ver el código';
    end if;
    if jsonb_array_length(public.cola_reparto()) < 1 then
      raise exception 'FRENO: la cola del repartidor no muestra el pedido de prueba';
    end if;

    -- No se entrega sin salir, sin cobro ni sin código
    begin
      perform public.entregar_pedido(v_a, v_codigo, 'Juan Prueba', null);
      raise exception 'FRENO: se pudo entregar sin «Tomar y salir»';
    exception when sqlstate 'AML05' then null;
    end;

    perform public.tomar_pedido(v_a);

    begin
      perform public.entregar_pedido(v_a, v_codigo, 'Juan Prueba', null);
      raise exception 'FRENO: se entregó contra entrega sin registrar el cobro';
    exception when sqlstate 'AML05' then null;
    end;

    begin
      perform public.registrar_cobro_entrega(v_a, 25);
      raise exception 'FRENO: se aceptó un cobro que no coincide con el total';
    exception when sqlstate 'AML02' then null;
    end;

    perform public.registrar_cobro_entrega(v_a, 30);
    select pa.estado into v_estado_pago from public.pagos pa where pa.id = v_pago_a;
    if v_estado_pago <> 'pendiente' then
      raise exception 'FRENO: el cobro del repartidor no quedó por rendir (%)', v_estado_pago;
    end if;

    begin
      perform public.entregar_pedido(v_a, null, 'Juan Prueba', null);
      raise exception 'FRENO: se entregó sin código';
    exception when sqlstate 'AML02' then null;
    end;

    -- Admin tampoco marca entregado a mano
    perform set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated')::text, true);
    begin
      perform public.cambiar_estado_pedido(v_a, 'entregado', null, null, null);
      raise exception 'FRENO: el admin pudo marcar entregado sin código';
    exception when sqlstate 'AML05' then null;
    end;

    -- 5 códigos incorrectos bloquean; el sexto (aunque sea el correcto) no entrega
    perform set_config('request.jwt.claims', json_build_object('sub', v_rep, 'role', 'authenticated')::text, true);
    for i in 1..5 loop
      v_res := public.entregar_pedido(v_a, v_malo, 'Juan Prueba', null);
      if (v_res->>'ok')::boolean or (v_res->>'intentos_restantes')::int <> 5 - i or (v_res->>'bloqueado')::boolean <> (i = 5) then
        raise exception 'FRENO: intento % con código incorrecto respondió %', i, v_res;
      end if;
    end loop;

    v_res := public.entregar_pedido(v_a, v_codigo, 'Juan Prueba', null);
    if (v_res->>'ok')::boolean or not (v_res->>'bloqueado')::boolean then
      raise exception 'FRENO: un código bloqueado igual entregó';
    end if;
    select p.estado into v_estado from public.pedidos p where p.id = v_a;
    if v_estado <> 'despachado' then
      raise exception 'FRENO: con el código bloqueado el pedido quedó en %', v_estado;
    end if;

    begin
      perform public.desbloquear_codigo_entrega(v_a, 'Cliente confirmado por teléfono');
      raise exception 'FRENO: el repartidor pudo desbloquear el código';
    exception when sqlstate 'AML03' then null;
    end;

    perform set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated')::text, true);
    perform public.desbloquear_codigo_entrega(v_a, 'Cliente confirmado por teléfono');

    perform set_config('request.jwt.claims', json_build_object('sub', v_rep, 'role', 'authenticated')::text, true);
    v_res := public.entregar_pedido(v_a, v_codigo, 'Juan Prueba', '7654321');
    if not (v_res->>'ok')::boolean or v_res->>'estado' <> 'entregado' then
      raise exception 'FRENO: con el código correcto no se entregó (%)', v_res;
    end if;

    -- El cliente califica (una sola vez)
    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    perform public.calificar_entrega(v_a, 2, 'Llegó tarde');
    begin
      perform public.calificar_entrega(v_a, 5, null);
      raise exception 'FRENO: se pudo calificar dos veces';
    exception when sqlstate 'AML05' then null;
    end;
    v_linea := public.linea_tiempo_pedido(v_a);
    if not exists (
      select 1 from jsonb_array_elements(v_linea) e
      where e->>'actor_nombre' = 'Repartidor Prueba' and e->>'nota' like 'Entregado a Juan Prueba%'
    ) then
      raise exception 'FRENO: la línea de tiempo no muestra a quién y quién entregó';
    end if;

    -- El admin recibe el efectivo → completado
    perform set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated')::text, true);
    perform public.confirmar_efectivo(v_pago_a);
    select p.estado, p.estado_pago into v_estado, v_estado_pago from public.pedidos p where p.id = v_a;
    if v_estado <> 'completado' or v_estado_pago <> 'verificado' then
      raise exception 'FRENO: tras recibir el efectivo el pedido quedó en % / %', v_estado, v_estado_pago;
    end if;

    -- B: el repartidor no entrega en tienda; el almacén sí, y queda completado (ya estaba pagado)
    perform set_config('request.jwt.claims', json_build_object('sub', v_rep, 'role', 'authenticated')::text, true);
    begin
      perform public.entregar_pedido(v_b, '0000', 'Juan Prueba', null);
      raise exception 'FRENO: el repartidor pudo entregar un pedido de recojo';
    exception when sqlstate 'AML03' then null;
    end;

    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    v_codigo := (public.mi_codigo_entrega(v_b))->>'codigo';

    perform set_config('request.jwt.claims', json_build_object('sub', v_alm, 'role', 'authenticated')::text, true);
    v_res := public.entregar_pedido(v_b, v_codigo, 'Juan Prueba', '7654321');
    if v_res->>'estado' <> 'completado' then
      raise exception 'FRENO: la entrega en tienda de un pedido pagado no quedó completada (%)', v_res;
    end if;

    -- C: por flota no hay código; lo confirma el cliente
    perform set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated')::text, true);
    begin
      perform public.cambiar_estado_pedido(v_c, 'entregado', null, null, null);
      raise exception 'FRENO: el admin pudo marcar entregado por flota sin nota';
    exception when sqlstate 'AML05' then null;
    end;

    perform set_config('request.jwt.claims', json_build_object('sub', v_cli, 'role', 'authenticated')::text, true);
    v_res := public.confirmar_recepcion(v_c, null);
    if v_res->>'estado' <> 'completado' then
      raise exception 'FRENO: «Recibí mi pedido» no completó el pedido por flota (%)', v_res;
    end if;

    raise exception using errcode = 'P0001', message = 'AMLOK';
  exception
    when raise_exception then
      if sqlerrm <> 'AMLOK' then raise; end if;
  end;

  perform set_config('request.jwt.claims', '', true);

  if exists (select 1 from public.pedidos where codigo like 'PRUEBA-0018%')
     or exists (select 1 from auth.users where id in (v_cli, v_alm, v_rep, v_adm)) then
    raise exception 'FRENO: el recorrido de prueba no se deshizo';
  end if;

  raise notice '0018 OK: código de entrega (5 intentos), reparto, cobro contra entrega por rendir, completado, calificación y faltantes ocultos al cliente';
end;
$$;

commit;
