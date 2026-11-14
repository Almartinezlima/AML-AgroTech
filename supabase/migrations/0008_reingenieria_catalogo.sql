-- 0008_reingenieria_catalogo.sql
--
-- POR QUÉ
--   Reingeniería del catálogo a partir de tiendas agro bolivianas (SurtiAgro,
--   mercado de Santa Cruz, precios al 7 sep 2026). Detalle: docs/specs/07-reingenieria.md.
--
-- QUÉ HACE
--   1. Columnas nuevas y opcionales en productos: composicion, cultivos, modo_uso,
--      dosis, banda_toxicologica, precio_referencia, fuente_precio, fecha_precio,
--      tendencia_precio. Los "enum" son text + check, como el resto del esquema.
--   2. Trigger: la banda toxicológica solo se permite en productos de la categoría
--      Agroquímicos (pilar de seguridad; protege cualquier camino de escritura).
--   3. Precios nuevos de Urea, Calferquim y Molimax con su referencia de mercado.
--      Solo si todavía no tienen la referencia del 2026-09-07 (no pisa ediciones del admin).
--   4. Tres productos nuevos (AGR-012, AGR-013, AGR-014) con stock inicial 30 y su
--      entrada en el kardex. Sin foto propia: la app muestra la foto de la categoría.
--   5. Composición de los agroquímicos solo con datos seguros (N-P-K del nombre o
--      ingrediente activo conocido de la etiqueta).
--
-- QUÉ NO TOCA
--   Nombres, descripciones, stock ni precios de otros productos. Dosis, cultivos,
--   modo de uso y banda quedan vacíos (los carga Aldo desde el admin). No borra nada.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase,
-- ANTES de publicar el código de la rama fase/1-reingenieria.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Columnas nuevas
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.productos add column if not exists composicion text;
alter table public.productos add column if not exists cultivos text;
alter table public.productos add column if not exists modo_uso text;
alter table public.productos add column if not exists dosis text;
alter table public.productos add column if not exists banda_toxicologica text;
alter table public.productos add column if not exists precio_referencia numeric(10,2);
alter table public.productos add column if not exists fuente_precio text;
alter table public.productos add column if not exists fecha_precio date;
alter table public.productos add column if not exists tendencia_precio text;

alter table public.productos drop constraint if exists productos_banda_toxicologica_valida;
alter table public.productos add constraint productos_banda_toxicologica_valida
  check (banda_toxicologica is null or banda_toxicologica in ('roja', 'amarilla', 'azul', 'verde'));

alter table public.productos drop constraint if exists productos_tendencia_precio_valida;
alter table public.productos add constraint productos_tendencia_precio_valida
  check (tendencia_precio is null or tendencia_precio in ('al_alza', 'estable', 'a_la_baja'));

alter table public.productos drop constraint if exists productos_precio_referencia_positivo;
alter table public.productos add constraint productos_precio_referencia_positivo
  check (precio_referencia is null or precio_referencia > 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Banda toxicológica solo en Agroquímicos
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.validar_banda_toxicologica()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.banda_toxicologica is not null and not exists (
    select 1 from public.categorias c
    where c.id = new.categoria_id and c.nombre = 'Agroquímicos'
  ) then
    raise exception 'La banda toxicológica solo corresponde a productos de Agroquímicos.'
      using errcode = 'AML02';
  end if;

  return new;
end;
$$;

revoke execute on function public.validar_banda_toxicologica() from public, anon, authenticated;

drop trigger if exists validar_banda_toxicologica on public.productos;
create trigger validar_banda_toxicologica
  before insert or update of banda_toxicologica, categoria_id on public.productos
  for each row execute function public.validar_banda_toxicologica();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Precios nuevos con referencia de mercado
-- ─────────────────────────────────────────────────────────────────────────────
with precios(sku, precio, referencia) as (
  values
    ('AGR-011', 340.00, 325.00),  -- Urea 46% N
    ('AGR-003', 420.00, 405.00),  -- Calferquim NPK 15-15-15
    ('AGR-009', 475.00, 455.00)   -- Molimax NPK 20-20-20
)
update public.productos p
set precio = x.precio,
    precio_referencia = x.referencia,
    fuente_precio = 'SurtiAgro, mercado de Santa Cruz',
    fecha_precio = date '2026-09-07',
    tendencia_precio = 'al_alza'
from precios x
where p.sku = x.sku
  and p.fecha_precio is distinct from date '2026-09-07';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Productos nuevos con stock inicial y su entrada en el kardex
-- ─────────────────────────────────────────────────────────────────────────────
-- El SQL Editor corre como postgres: el trigger proteger_stock_producto lo deja pasar.
-- El movimiento se escribe con el mismo formato que registrar_movimiento().
with categoria as (
  select c.id, c.icono from public.categorias c where c.nombre = 'Agroquímicos'
),
nuevos(sku, nombre, descripcion, composicion, precio, referencia) as (
  values
    ('AGR-012', 'Fosfato Diamónico 18-46-0',
     'Fertilizante granulado con nitrógeno y alto contenido de fósforo. Se usa a la siembra para el arranque del cultivo.',
     'N-P-K 18-46-0', 835.00, 817.00),
    ('AGR-013', 'Cloruro de Potasio 0-0-60',
     'Fertilizante potásico granulado (muriato de potasio). Aporta potasio al cultivo.',
     'N-P-K 0-0-60', 265.00, 245.00),
    ('AGR-014', 'Urea Protegida con Polímero',
     'Urea con recubrimiento de polímero que libera el nitrógeno de forma más gradual.',
     'Urea recubierta con polímero', 375.00, 360.00)
),
insertados as (
  insert into public.productos (
    sku, nombre, descripcion, precio, stock, stock_minimo, unidad, categoria_id, icono,
    imagen_url, activo, composicion, precio_referencia, fuente_precio, fecha_precio, tendencia_precio
  )
  select n.sku, n.nombre, n.descripcion, n.precio, 30, 10, 'saco 50kg', c.id, c.icono,
         null, true, n.composicion, n.referencia, 'SurtiAgro, mercado de Santa Cruz',
         date '2026-09-07', 'al_alza'
  from nuevos n cross join categoria c
  on conflict (sku) do nothing
  returning id
)
insert into public.movimientos_inventario (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
select i.id, 'entrada', 30, 0, 30, 'Stock inicial (migración 0008)', null
from insertados i;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Composición (solo datos seguros; no pisa lo que cargue el admin)
-- ─────────────────────────────────────────────────────────────────────────────
with composiciones(sku, composicion) as (
  values
    ('AGR-001', 'N-P-K 20-20-20'),
    ('AGR-002', 'Clorotalonil'),
    ('AGR-003', 'N-P-K 15-15-15'),
    ('AGR-005', 'Cipermetrina 25 % EC'),
    ('AGR-006', 'Glifosato'),
    ('AGR-007', 'Paraquat'),
    ('AGR-008', 'Mancozeb'),
    ('AGR-009', 'N-P-K 20-20-20'),
    ('AGR-010', 'Espiromesifeno'),
    ('AGR-011', 'Nitrógeno 46 % (N-P-K 46-0-0)')
)
update public.productos p
set composicion = x.composicion
from composiciones x
where p.sku = x.sku
  and p.composicion is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificaciones: si algo no cuadra, no se guarda nada
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_columnas int;
  v_precios int;
  v_nuevos int;
  v_kardex int;
  v_con_composicion int;
begin
  select count(*) into v_columnas
  from information_schema.columns
  where table_schema = 'public' and table_name = 'productos'
    and column_name in ('composicion', 'cultivos', 'modo_uso', 'dosis', 'banda_toxicologica',
                        'precio_referencia', 'fuente_precio', 'fecha_precio', 'tendencia_precio');
  if v_columnas <> 9 then
    raise exception 'FRENO: se esperaban 9 columnas nuevas y hay %', v_columnas;
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'validar_banda_toxicologica'
                 and tgrelid = 'public.productos'::regclass) then
    raise exception 'FRENO: falta el trigger validar_banda_toxicologica';
  end if;

  select count(*) into v_precios
  from public.productos
  where (sku, precio_referencia) in (('AGR-011', 325), ('AGR-003', 405), ('AGR-009', 455))
    and fecha_precio = date '2026-09-07';
  if v_precios <> 3 then
    raise exception 'FRENO: se esperaban 3 precios con referencia de mercado y hay %', v_precios;
  end if;

  select count(*) into v_nuevos
  from public.productos p
  join public.categorias c on c.id = p.categoria_id and c.nombre = 'Agroquímicos'
  where p.sku in ('AGR-012', 'AGR-013', 'AGR-014');
  if v_nuevos <> 3 then
    raise exception 'FRENO: se esperaban 3 productos nuevos en Agroquímicos y hay %', v_nuevos;
  end if;

  select count(*) into v_kardex
  from public.movimientos_inventario m
  join public.productos p on p.id = m.producto_id
  where p.sku in ('AGR-012', 'AGR-013', 'AGR-014')
    and m.tipo = 'entrada' and m.motivo = 'Stock inicial (migración 0008)';
  if v_kardex <> 3 then
    raise exception 'FRENO: se esperaban 3 entradas de stock inicial en el kardex y hay %', v_kardex;
  end if;

  if exists (select 1 from public.productos where stock < 0) then
    raise exception 'FRENO: hay productos con stock negativo';
  end if;

  select count(*) into v_con_composicion from public.productos where composicion is not null;

  raise notice '0008 OK: 9 columnas, trigger de banda, 3 precios, 3 productos nuevos con kardex, % con composición', v_con_composicion;
end $$;

commit;
