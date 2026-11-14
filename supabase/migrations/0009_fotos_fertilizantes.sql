-- 0009_fotos_fertilizantes.sql
--
-- POR QUÉ
--   Los 3 fertilizantes de la 0008 (AGR-012, AGR-013, AGR-014) nacieron sin foto y
--   mostraban la de su categoría. Sus fotos ya están en el repositorio
--   (public/productos/<sku>.webp, 800x800 WebP). Fuentes: docs/CREDITOS_IMAGENES.md.
--
-- QUÉ HACE
--   Pone imagen_url = '/productos/<sku>.webp' en esos 3 productos, solo si no tienen
--   foto (imagen_url null): si el admin ya subió una propia, se respeta.
--
-- QUÉ NO TOCA
--   Precios, nombres, stock ni ninguna otra columna u otro producto. No borra nada.
--
-- CUÁNDO CORRERLA
--   DESPUÉS de que Render publique la rama fase/1b-fotos: si se corre antes, la base
--   apunta a archivos que todavía no existen y se ve la imagen rota.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

update public.productos p
set imagen_url = '/productos/' || p.sku || '.webp'
where p.sku in ('AGR-012', 'AGR-013', 'AGR-014')
  and p.imagen_url is null;

-- Verificaciones: si algo no cuadra, no se guarda nada
do $$
declare
  v_existen int;
  v_con_foto int;
  v_locales int;
begin
  select count(*) into v_existen
  from public.productos
  where sku in ('AGR-012', 'AGR-013', 'AGR-014');

  if v_existen <> 3 then
    raise exception 'FRENO: se esperaban los 3 productos de la 0008 y hay % (¿se corrió la 0008?)', v_existen;
  end if;

  select count(*) into v_con_foto
  from public.productos
  where sku in ('AGR-012', 'AGR-013', 'AGR-014')
    and imagen_url is not null;

  if v_con_foto <> 3 then
    raise exception 'FRENO: solo % de 3 productos quedaron con foto', v_con_foto;
  end if;

  select count(*) into v_locales
  from public.productos
  where sku in ('AGR-012', 'AGR-013', 'AGR-014')
    and imagen_url = '/productos/' || sku || '.webp';

  raise notice '0009 OK: 3 fertilizantes con foto (% con la foto del repositorio, % con foto subida por el admin)', v_locales, 3 - v_locales;
end $$;

commit;
