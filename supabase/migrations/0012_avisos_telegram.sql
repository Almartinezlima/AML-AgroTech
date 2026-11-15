-- 0012_avisos_telegram.sql
--
-- POR QUÉ
--   El admin tiene que enterarse al momento de lo que pasa en la tienda sin estar mirando
--   el panel: pedidos nuevos, comprobantes por revisar, productos que se acaban y un
--   resumen al cierre del día. Fase 5 (14 nov 2026).
--
-- CÓMO
--   Los avisos salen de la base, no de Next.js:
--   · pg_net deja cada mensaje en una cola y lo manda DESPUÉS del commit, en segundo plano.
--     Si Telegram falla o tarda, la compra, el comprobante o el movimiento ya están
--     guardados. Si la operación falla, la cola se deshace con ella y no sale ningún aviso.
--   · El token del bot y el chat del admin viven en Supabase Vault (cifrados), nunca en el
--     repo ni en Render. Si los secretos no están cargados, los avisos no hacen nada.
--   · Ningún aviso puede romper la operación: todo va dentro de "exception when others",
--     que solo deja un warning con el SQLSTATE (sin token ni datos del cliente).
--
-- QUÉ HACE
--   1. Extensiones pg_net (HTTP asíncrono) y pg_cron (tareas programadas).
--   2. Auxiliares internas: aml_formato_bs (Bs. 1.234,50), aml_hora_bolivia, aml_url_sitio.
--   3. aml_enviar_telegram(texto): lee Vault y encola el mensaje (timeout 3 s).
--   4. Pedido nuevo: trigger diferido al commit sobre pedidos (lee el total final).
--   5. Comprobante subido: trigger sobre pagos cuando pasa a en_revision.
--   6. Stock bajo: trigger sobre movimientos_inventario. Avisa solo cuando el stock CRUZA
--      el mínimo (de arriba a abajo) o llega a 0; mientras siga bajo no repite. Si se
--      repone sobre el mínimo y vuelve a bajar, avisa otra vez. No guarda estado.
--   7. aml_aviso_resumen_diario(): pg_cron la corre a las 00:00 UTC = 20:00 de Bolivia.
--
--   Cuentas de prueba (@amlagrotech.test, aml_es_cuenta_prueba de la 0011): no mandan
--   ningún aviso, y el resumen no las cuenta. En el stock se mira quién hizo el movimiento
--   (usuario_id) y, si viene de un pedido, de quién es el pedido. Si el origen no se
--   conoce (ambos vacíos), se avisa: es más seguro avisar de más que callar una baja real.
--
--   Todas las funciones son security definer con search_path vacío y SIN execute para
--   public, anon ni authenticated: nada de esto se puede llamar desde el navegador.
--
-- QUÉ NO TOCA
--   No cambia tablas, columnas, políticas ni las funciones de compra, pago o inventario.
--   No borra nada.
--
-- DESPUÉS DE CORRERLA (Aldo)
--   Cargar 2 secretos en la pantalla Vault del panel de Supabase (Integrations → Vault),
--   no en el SQL Editor, para que el token no quede en el historial:
--     aml_telegram_token       → el token del bot
--     aml_telegram_chat_admin  → el chat_id del admin
--   Prueba sin tocar datos:  select public.aml_aviso_resumen_diario();
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extensiones
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Auxiliares de formato
-- ─────────────────────────────────────────────────────────────────────────────
-- Igual que formatoBs() del sitio: Bs. 1.234,50
create or replace function public.aml_formato_bs(p_monto numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when coalesce(p_monto, 0) < 0 then '-' else '' end || 'Bs. ' ||
    translate(to_char(abs(coalesce(p_monto, 0)), 'FM999,999,999,990.00'), ',.', '.,');
$$;

-- 14/11 20:00 en hora de Bolivia
create or replace function public.aml_hora_bolivia(p_momento timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(p_momento at time zone 'America/La_Paz', 'DD/MM HH24:MI');
$$;

create or replace function public.aml_url_sitio()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'https://aml-agrotech.onrender.com';
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Envío a Telegram
-- ─────────────────────────────────────────────────────────────────────────────
-- Encola el mensaje en pg_net; sale después del commit. Devuelve false si no hay
-- secretos o si algo falla. Nunca lanza error.
create or replace function public.aml_enviar_telegram(p_texto text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_chat text;
begin
  select s.decrypted_secret into v_token
  from vault.decrypted_secrets s where s.name = 'aml_telegram_token';

  select s.decrypted_secret into v_chat
  from vault.decrypted_secrets s where s.name = 'aml_telegram_chat_admin';

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
  -- Solo el código: ni token ni texto del mensaje
  raise warning 'Aviso de Telegram no encolado (SQLSTATE %)', sqlstate;
  return false;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Pedido nuevo
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
                  when 'contra_entrega' then 'Contra entrega'
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

drop trigger if exists aml_aviso_pedido_nuevo on public.pedidos;
create constraint trigger aml_aviso_pedido_nuevo
  after insert on public.pedidos
  deferrable initially deferred
  for each row execute function public.aml_trg_aviso_pedido_nuevo();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Comprobante subido
-- ─────────────────────────────────────────────────────────────────────────────
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
    '🧾 Comprobante por revisar ' || coalesce(v.codigo, '') || E'\n' ||
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

drop trigger if exists aml_aviso_comprobante on public.pagos;
create trigger aml_aviso_comprobante
  after update of estado on public.pagos
  for each row
  when (new.estado = 'en_revision' and old.estado is distinct from 'en_revision')
  execute function public.aml_trg_aviso_comprobante();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Stock bajo
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.aml_trg_aviso_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_producto record;
  v_titulo text;
begin
  -- Origen de prueba: lo hizo una cuenta .test o es la venta de un pedido de una cuenta .test
  if public.aml_es_cuenta_prueba(new.usuario_id)
     or exists (
       select 1 from public.pedidos p
       where p.id = new.pedido_id and public.aml_es_cuenta_prueba(p.usuario_id)
     ) then
    return null;
  end if;

  select pr.nombre, pr.sku, pr.unidad, pr.stock_minimo, pr.activo
  into v_producto
  from public.productos pr
  where pr.id = new.producto_id;

  if not found or not v_producto.activo then
    return null;
  end if;

  -- Solo al cruzar el umbral; mientras siga bajo no se repite
  if new.stock_nuevo = 0 and new.stock_anterior > 0 then
    v_titulo := '⚠️ Producto agotado';
  elsif new.stock_nuevo <= v_producto.stock_minimo and new.stock_anterior > v_producto.stock_minimo then
    v_titulo := '⚠️ Stock en el mínimo';
  else
    return null;
  end if;

  perform public.aml_enviar_telegram(
    v_titulo || E'\n' ||
    v_producto.nombre || coalesce(' (' || v_producto.sku || ')', '') || E'\n' ||
    'Quedan: ' || new.stock_nuevo || coalesce(' ' || v_producto.unidad, '') ||
      ' · mínimo ' || v_producto.stock_minimo || E'\n' ||
    public.aml_hora_bolivia(now()) || E'\n' ||
    public.aml_url_sitio() || '/admin/inventario'
  );
  return null;
exception when others then
  raise warning 'Aviso de stock omitido (SQLSTATE %)', sqlstate;
  return null;
end;
$$;

drop trigger if exists aml_aviso_stock on public.movimientos_inventario;
create trigger aml_aviso_stock
  after insert on public.movimientos_inventario
  for each row
  when (new.stock_nuevo < new.stock_anterior)
  execute function public.aml_trg_aviso_stock();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Resumen diario
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.aml_aviso_resumen_diario()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- El día se corta en hora de Bolivia, no en UTC
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
  where p.estado not in ('cancelado', 'entregado')
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

-- Todos los días a las 00:00 UTC = 20:00 en Bolivia (UTC-4 todo el año).
-- Si el trabajo ya existe con este nombre, cron.schedule lo actualiza.
select cron.schedule('aml-resumen-diario', '0 0 * * *', 'select public.aml_aviso_resumen_diario();');

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Nada de esto se llama desde el navegador
-- ─────────────────────────────────────────────────────────────────────────────
revoke execute on function public.aml_formato_bs(numeric) from public, anon, authenticated;
revoke execute on function public.aml_hora_bolivia(timestamptz) from public, anon, authenticated;
revoke execute on function public.aml_url_sitio() from public, anon, authenticated;
revoke execute on function public.aml_enviar_telegram(text) from public, anon, authenticated;
revoke execute on function public.aml_trg_aviso_pedido_nuevo() from public, anon, authenticated;
revoke execute on function public.aml_trg_aviso_comprobante() from public, anon, authenticated;
revoke execute on function public.aml_trg_aviso_stock() from public, anon, authenticated;
revoke execute on function public.aml_aviso_resumen_diario() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Verificaciones
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_funcion text;
  v_rol text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise exception 'FRENO: pg_net no quedó instalada.';
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'FRENO: pg_cron no quedó instalada.';
  end if;

  foreach v_funcion in array array[
    'public.aml_enviar_telegram(text)',
    'public.aml_trg_aviso_pedido_nuevo()',
    'public.aml_trg_aviso_comprobante()',
    'public.aml_trg_aviso_stock()',
    'public.aml_aviso_resumen_diario()'
  ] loop
    if not exists (
      select 1 from pg_proc
      where oid = v_funcion::regprocedure and prosecdef
        and proconfig @> array['search_path=""']
    ) then
      raise exception 'FRENO: % no es security definer con search_path vacío.', v_funcion;
    end if;

    foreach v_rol in array array['anon', 'authenticated'] loop
      if has_function_privilege(v_rol, v_funcion, 'execute') then
        raise exception 'FRENO: % se puede ejecutar como %.', v_funcion, v_rol;
      end if;
    end loop;
  end loop;

  if (select count(*) from pg_trigger
      where tgname in ('aml_aviso_pedido_nuevo', 'aml_aviso_comprobante', 'aml_aviso_stock')
        and not tgisinternal) <> 3 then
    raise exception 'FRENO: faltan triggers de avisos.';
  end if;

  if not exists (select 1 from cron.job where jobname = 'aml-resumen-diario' and schedule = '0 0 * * *') then
    raise exception 'FRENO: no quedó programado el resumen diario.';
  end if;

  if public.aml_formato_bs(1234.5) <> 'Bs. 1.234,50' then
    raise exception 'FRENO: el formato de Bs. no coincide con el del sitio (%).', public.aml_formato_bs(1234.5);
  end if;

  raise notice '0012 OK: avisos de Telegram listos (pedido, comprobante, stock y resumen a las 20:00 de Bolivia). Falta cargar los 2 secretos en Vault.';
end;
$$;

commit;
