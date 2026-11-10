-- 0005_zonas_villa_charcas.sql
--
-- POR QUÉ
--   La tienda se mudó a Villa Charcas y las zonas de envío se cambiaron a mano en la
--   base (9 nov 2026) sin su receta. Esta migración deja por escrito el estado real,
--   para que una base nueva quede igual que la de producción.
--
-- QUÉ HACE
--   1. Inserta o actualiza, por id, las 5 zonas tal como están hoy en la base:
--        Recojo en tienda (Villa Charcas)          recojo     Bs.  0  0–0 días  contra entrega sí
--        Villa Charcas (entrega en el pueblo)      urbano     Bs. 10  0–1 días  contra entrega sí
--        Culpina                                   provincia  Bs. 10  1–2 días  contra entrega no
--        Incahuasi                                 provincia  Bs. 10  1–2 días  contra entrega no
--        Sucre (recojo en la terminal de buses)    provincia  Bs. 15  1–2 días  contra entrega no
--   2. Desactiva cualquier otra zona (nunca se borra: hay pedidos que apuntan a ellas).
--   3. Verifica que queden exactamente esas 5 activas.
--
-- QUÉ NO TOCA
--   Pedidos ni envíos existentes. No borra nada.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

insert into public.zonas_envio (id, nombre, tipo, costo, dias_min, dias_max, permite_contra_entrega, activo, orden)
values
  ('3e54a6cc-3182-4bd8-ad30-6be6aa5926fc', 'Recojo en tienda (Villa Charcas)',       'recojo',    0.00, 0, 0, true,  true, 1),
  ('838924ab-1847-46eb-a1b0-28e9b496d38d', 'Villa Charcas (entrega en el pueblo)',   'urbano',   10.00, 0, 1, true,  true, 2),
  ('131973a8-becc-4cb9-ab32-a53445cd5826', 'Culpina',                                'provincia', 10.00, 1, 2, false, true, 3),
  ('a04e9cac-230f-4308-83a4-5fa0e4aab4cd', 'Incahuasi',                              'provincia', 10.00, 1, 2, false, true, 4),
  ('ae7b13ac-6606-478d-8341-5bd85ffad126', 'Sucre (recojo en la terminal de buses)', 'provincia', 15.00, 1, 2, false, true, 5)
on conflict (id) do update set
  nombre = excluded.nombre,
  tipo = excluded.tipo,
  costo = excluded.costo,
  dias_min = excluded.dias_min,
  dias_max = excluded.dias_max,
  permite_contra_entrega = excluded.permite_contra_entrega,
  activo = excluded.activo,
  orden = excluded.orden;

-- Cualquier otra zona queda inactiva (se conserva por los pedidos viejos)
update public.zonas_envio z
set activo = false
where z.id not in (
  '3e54a6cc-3182-4bd8-ad30-6be6aa5926fc', '838924ab-1847-46eb-a1b0-28e9b496d38d',
  '131973a8-becc-4cb9-ab32-a53445cd5826', 'a04e9cac-230f-4308-83a4-5fa0e4aab4cd',
  'ae7b13ac-6606-478d-8341-5bd85ffad126'
) and z.activo;

-- Verificaciones: si algo no cuadra, no se guarda nada
do $$
declare
  v_activas int;
  v_correctas int;
begin
  select count(*) into v_activas from public.zonas_envio where activo;

  select count(*) into v_correctas
  from public.zonas_envio z
  join (values
    ('3e54a6cc-3182-4bd8-ad30-6be6aa5926fc'::uuid, 'recojo', 0.00::numeric, true),
    ('838924ab-1847-46eb-a1b0-28e9b496d38d'::uuid, 'urbano', 10.00, true),
    ('131973a8-becc-4cb9-ab32-a53445cd5826'::uuid, 'provincia', 10.00, false),
    ('a04e9cac-230f-4308-83a4-5fa0e4aab4cd'::uuid, 'provincia', 10.00, false),
    ('ae7b13ac-6606-478d-8341-5bd85ffad126'::uuid, 'provincia', 15.00, false)
  ) e(id, tipo, costo, contra) on e.id = z.id
  where z.activo and z.tipo = e.tipo and z.costo = e.costo and z.permite_contra_entrega = e.contra;

  if v_activas <> 5 or v_correctas <> 5 then
    raise exception 'FRENO: se esperaban 5 zonas activas correctas y hay % activas, % correctas', v_activas, v_correctas;
  end if;

  raise notice '0005 OK: 5 zonas de envío desde Villa Charcas';
end $$;

commit;
