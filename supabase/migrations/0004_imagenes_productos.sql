-- 0004_imagenes_productos.sql
--
-- POR QUÉ
--   Los 33 productos no tenían foto. Las fotos reales ya están en el repositorio
--   (public/productos/<sku>.webp, 800x800 WebP) y se sirven desde la propia app.
--   Fuente y licencia de cada una: docs/CREDITOS_IMAGENES.md.
--
-- QUÉ HACE
--   1. Pone imagen_url = '/productos/<sku>.webp' en los 33 productos, por SKU.
--   2. Solo toca productos SIN foto o con una foto local anterior: si el admin ya
--      subió una foto propia a Storage (https://…), se respeta.
--   3. Verifica que los 33 SKU existan y queden con su foto.
--
-- QUÉ NO TOCA
--   Precios, nombres, stock ni ninguna otra columna. No borra nada.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

with fotos(sku) as (
  values
    ('AGR-001'), ('AGR-002'), ('AGR-003'), ('AGR-004'), ('AGR-005'), ('AGR-006'),
    ('AGR-007'), ('AGR-008'), ('AGR-009'), ('AGR-010'), ('AGR-011'),
    ('CAN-001'), ('CAN-002'), ('CAN-003'), ('CAN-004'),
    ('HER-001'), ('HER-002'), ('HER-003'), ('HER-004'), ('HER-005'), ('HER-006'), ('HER-007'),
    ('RIE-001'), ('RIE-002'), ('RIE-003'), ('RIE-004'),
    ('SEM-001'), ('SEM-002'), ('SEM-003'), ('SEM-004'), ('SEM-005'), ('SEM-006'), ('SEM-007')
)
update public.productos p
set imagen_url = '/productos/' || p.sku || '.webp'
from fotos f
where p.sku = f.sku
  and (p.imagen_url is null or p.imagen_url like '/productos/%');

-- Verificaciones: si algo no cuadra, no se guarda nada
do $$
declare
  v_esperados int := 33;
  v_existen int;
  v_con_foto int;
begin
  select count(*) into v_existen
  from public.productos
  where sku ~ '^(AGR-0(0[1-9]|1[01])|CAN-00[1-4]|HER-00[1-7]|RIE-00[1-4]|SEM-00[1-7])$';

  if v_existen <> v_esperados then
    raise exception 'FRENO: se esperaban % productos con SKU y hay %', v_esperados, v_existen;
  end if;

  select count(*) into v_con_foto
  from public.productos
  where sku ~ '^(AGR|CAN|HER|RIE|SEM)-[0-9]{3}$'
    and imagen_url is not null;

  if v_con_foto < v_esperados then
    raise exception 'FRENO: solo % de % productos quedaron con foto', v_con_foto, v_esperados;
  end if;

  raise notice '0004 OK: % productos con foto real', v_con_foto;
end $$;

commit;
