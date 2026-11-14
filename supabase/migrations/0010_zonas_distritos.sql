-- 0010_zonas_distritos.sql
--
-- POR QUÉ
--   Zonas de envío nuevas decididas por Aldo (14 nov 2026): los 5 distritos de
--   Villa Charcas, Incahuasi y Culpina con costos nuevos, y Sucre deja de atenderse.
--
-- QUÉ HACE
--   1. Inserta o actualiza, por id, las 8 zonas activas y su orden en el checkout:
--        1 Recojo en tienda (Villa Charcas)          recojo     Bs.  0  0–0 días  contra entrega sí
--        2 Villa Charcas — Distrito 1 (el pueblo)    urbano     Bs. 15  0–1 días  contra entrega sí
--        3 Distrito Pucara                           urbano     Bs. 20  1–2 días  contra entrega no
--        4 Distrito Santa Elena                      urbano     Bs. 25  1–2 días  contra entrega no
--        5 Distrito Supas                            urbano     Bs. 30  2–3 días  contra entrega no
--        6 Distrito Kaisaka                          urbano     Bs. 35  2–3 días  contra entrega no
--        7 Incahuasi                                 provincia  Bs. 20  1–2 días  contra entrega no
--        8 Culpina                                   provincia  Bs. 25  1–2 días  contra entrega no
--      Los distritos son entrega a domicilio (urbano: dirección o comunidad).
--      Incahuasi y Culpina siguen por flota (nombre y CI de quien recoge).
--   2. Desactiva Sucre y cualquier otra zona. Nunca se borra: hay pedidos que la usan.
--   3. Política zonas_select_pedidos_propios: cada usuario puede leer las zonas
--      inactivas de SUS pedidos (antes, un pedido viejo a Sucre mostraba la zona en blanco).
--
-- QUÉ NO TOCA
--   Pedidos, envíos ni costos ya cobrados (cada pedido guarda su costo_envio). No borra nada.
--
-- CUÁNDO CORRERLA
--   DESPUÉS de unir el PR de fase/2a-zonas y de que Render publique.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Zonas activas
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.zonas_envio (id, nombre, tipo, costo, dias_min, dias_max, permite_contra_entrega, activo, orden)
values
  ('3e54a6cc-3182-4bd8-ad30-6be6aa5926fc', 'Recojo en tienda (Villa Charcas)',       'recojo',     0.00, 0, 0, true,  true, 1),
  ('838924ab-1847-46eb-a1b0-28e9b496d38d', 'Villa Charcas — Distrito 1 (el pueblo)', 'urbano',    15.00, 0, 1, true,  true, 2),
  ('77b57011-17ef-44ea-964a-8bc687953162', 'Distrito Pucara',                        'urbano',    20.00, 1, 2, false, true, 3),
  ('1e594a11-b060-4890-9d55-c3fb6c69a0ba', 'Distrito Santa Elena',                   'urbano',    25.00, 1, 2, false, true, 4),
  ('4e13f790-590c-4d50-89d0-7798fc336b97', 'Distrito Supas',                         'urbano',    30.00, 2, 3, false, true, 5),
  ('49f3573e-f5d0-49da-be4f-df7cda8b2916', 'Distrito Kaisaka',                       'urbano',    35.00, 2, 3, false, true, 6),
  ('a04e9cac-230f-4308-83a4-5fa0e4aab4cd', 'Incahuasi',                              'provincia', 20.00, 1, 2, false, true, 7),
  ('131973a8-becc-4cb9-ab32-a53445cd5826', 'Culpina',                                'provincia', 25.00, 1, 2, false, true, 8)
on conflict (id) do update set
  nombre = excluded.nombre,
  tipo = excluded.tipo,
  costo = excluded.costo,
  dias_min = excluded.dias_min,
  dias_max = excluded.dias_max,
  permite_contra_entrega = excluded.permite_contra_entrega,
  activo = excluded.activo,
  orden = excluded.orden;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Sucre y cualquier otra zona quedan inactivas (se conservan por los pedidos viejos)
-- ─────────────────────────────────────────────────────────────────────────────
update public.zonas_envio z
set activo = false,
    orden = case when z.id = 'ae7b13ac-6606-478d-8341-5bd85ffad126' then 9 else z.orden end
where z.id not in (
  '3e54a6cc-3182-4bd8-ad30-6be6aa5926fc', '838924ab-1847-46eb-a1b0-28e9b496d38d',
  '77b57011-17ef-44ea-964a-8bc687953162', '1e594a11-b060-4890-9d55-c3fb6c69a0ba',
  '4e13f790-590c-4d50-89d0-7798fc336b97', '49f3573e-f5d0-49da-be4f-df7cda8b2916',
  'a04e9cac-230f-4308-83a4-5fa0e4aab4cd', '131973a8-becc-4cb9-ab32-a53445cd5826'
) and (z.activo or z.id = 'ae7b13ac-6606-478d-8341-5bd85ffad126');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Cada usuario ve la zona de sus propios pedidos aunque esté inactiva
-- ─────────────────────────────────────────────────────────────────────────────
-- Las políticas de pedidos no leen zonas_envio: no hay recursión.
drop policy if exists zonas_select_pedidos_propios on public.zonas_envio;
create policy zonas_select_pedidos_propios on public.zonas_envio
  for select to authenticated
  using (exists (
    select 1 from public.pedidos p
    where p.zona_envio_id = zonas_envio.id
      and p.usuario_id = (select auth.uid())
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificaciones: si algo no cuadra, no se guarda nada
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_activas int;
  v_correctas int;
begin
  select count(*) into v_activas from public.zonas_envio where activo;

  select count(*) into v_correctas
  from public.zonas_envio z
  join (values
    ('3e54a6cc-3182-4bd8-ad30-6be6aa5926fc'::uuid, 'recojo',     0.00::numeric, true,  1),
    ('838924ab-1847-46eb-a1b0-28e9b496d38d'::uuid, 'urbano',    15.00,          true,  2),
    ('77b57011-17ef-44ea-964a-8bc687953162'::uuid, 'urbano',    20.00,          false, 3),
    ('1e594a11-b060-4890-9d55-c3fb6c69a0ba'::uuid, 'urbano',    25.00,          false, 4),
    ('4e13f790-590c-4d50-89d0-7798fc336b97'::uuid, 'urbano',    30.00,          false, 5),
    ('49f3573e-f5d0-49da-be4f-df7cda8b2916'::uuid, 'urbano',    35.00,          false, 6),
    ('a04e9cac-230f-4308-83a4-5fa0e4aab4cd'::uuid, 'provincia', 20.00,          false, 7),
    ('131973a8-becc-4cb9-ab32-a53445cd5826'::uuid, 'provincia', 25.00,          false, 8)
  ) e(id, tipo, costo, contra, orden) on e.id = z.id
  where z.activo and z.tipo = e.tipo and z.costo = e.costo
    and z.permite_contra_entrega = e.contra and z.orden = e.orden;

  if v_activas <> 8 or v_correctas <> 8 then
    raise exception 'FRENO: se esperaban 8 zonas activas correctas y hay % activas, % correctas', v_activas, v_correctas;
  end if;

  if exists (select 1 from public.zonas_envio where id = 'ae7b13ac-6606-478d-8341-5bd85ffad126' and activo) then
    raise exception 'FRENO: Sucre sigue activa';
  end if;

  if not exists (select 1 from public.zonas_envio where id = 'ae7b13ac-6606-478d-8341-5bd85ffad126') then
    raise exception 'FRENO: la zona Sucre no existe (no se debe borrar)';
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'zonas_envio'
                 and policyname = 'zonas_select_pedidos_propios') then
    raise exception 'FRENO: falta la política zonas_select_pedidos_propios';
  end if;

  raise notice '0010 OK: 8 zonas activas (recojo, 5 distritos de Villa Charcas, Incahuasi, Culpina), Sucre inactiva y política de pedidos propios';
end $$;

commit;
