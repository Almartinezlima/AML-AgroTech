-- 0021_telegram_timeout.sql
--
-- POR QUÉ
--   Fase 9G. El 18/11/2026 se perdieron 3 avisos de Telegram por «Timeout of 3000 ms reached»:
--   en uno, el saludo TLS con api.telegram.org tardó 2,9 s. 3 s es poco para Supabase → Telegram.
--
-- QUÉ HACE
--   1. aml_enviar_telegram_a (0020; por ella pasan todos los avisos, también aml_enviar_telegram)
--      espera hasta 10000 ms en vez de 3000. Lo demás queda igual: lista cerrada de chats, sin
--      secretos no envía nada, nunca lanza error.
--   2. Verificaciones.
--
-- QUÉ NO TOCA
--   Tablas, triggers, textos de los avisos ni permisos. pg_net envía después del commit, así que
--   esperar más no frena ninguna compra ni ninguna pantalla.
--
-- CUÁNDO CORRERLA
--   Cuando quieras: no depende del código publicado. Requiere la 0020.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

do $$
begin
  if to_regprocedure('public.aml_enviar_telegram_a(text, text)') is null then
    raise exception 'FRENO: falta correr la 0020 (aml_enviar_telegram_a no existe)';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Telegram con 10 s de espera
-- ─────────────────────────────────────────────────────────────────────────────
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
    -- 0021: 3 s se quedaba corto (el saludo TLS llegó a tardar ~3 s)
    timeout_milliseconds := 10000
  );

  return true;
exception when others then
  raise warning 'Aviso de Telegram no encolado (SQLSTATE %)', sqlstate;
  return false;
end;
$$;

revoke execute on function public.aml_enviar_telegram_a(text, text) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Verificaciones: si algo no cuadra, no se guarda nada
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_def text := pg_get_functiondef('public.aml_enviar_telegram_a(text, text)'::regprocedure);
begin
  if position('timeout_milliseconds := 10000' in v_def) = 0 then
    raise exception 'FRENO: aml_enviar_telegram_a no quedó con 10000 ms';
  end if;

  if position('3000' in v_def) > 0 then
    raise exception 'FRENO: aml_enviar_telegram_a todavía menciona 3000 ms';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'aml_enviar_telegram_a'
      and p.proconfig is not null and 'search_path=""' = any (p.proconfig)
  ) then
    raise exception 'FRENO: aml_enviar_telegram_a sin search_path vacío';
  end if;

  if has_function_privilege('authenticated', 'public.aml_enviar_telegram_a(text, text)', 'execute')
     or has_function_privilege('anon', 'public.aml_enviar_telegram_a(text, text)', 'execute') then
    raise exception 'FRENO: aml_enviar_telegram_a se puede llamar desde la web';
  end if;

  -- aml_enviar_telegram (avisos al admin) sigue pasando por la nueva
  if position('aml_enviar_telegram_a' in pg_get_functiondef('public.aml_enviar_telegram(text)'::regprocedure)) = 0 then
    raise exception 'FRENO: aml_enviar_telegram no usa aml_enviar_telegram_a';
  end if;

  raise notice '0021 OK: los avisos de Telegram esperan hasta 10 s';
end;
$$;

commit;
