-- 0014_distribuidores_demo.sql
--
-- POR QUÉ
--   Para la feria y las E2E hacen falta 2 proveedores con presentaciones reales de los
--   productos de la tienda. Fase 6A (14 nov 2026).
--
-- QUÉ HACE
--   1. Busca las 2 cuentas de prueba por correo y les pone el rol distribuidor:
--        distribuidor.sucre@amlagrotech.test  → "Agroinsumos del Sur" (Sucre, 2 días)
--        distribuidor.scz@amlagrotech.test    → "Distribuidora Oriente Agro" (Santa Cruz, 4 días)
--      Los nombres son inventados: no son empresas reales.
--   2. Crea sus fichas y 22 presentaciones sobre productos que ya existen (por SKU).
--      Los precios mayoristas son ESTIMADOS, igual que los precios de riego y cañerías: el
--      costo por unidad queda entre el 63 % y el 92 % del precio de venta (los fertilizantes
--      con el margen más chico, como en el mercado). Varios productos los venden los
--      dos, para que se vea "el más barato" en el abastecimiento (fase 6B).
--   Como son cuentas @amlagrotech.test, sus órdenes no mandan avisos por Telegram ni cuentan
--   en el resumen (aml_es_cuenta_prueba).
--
-- QUÉ NO TOCA
--   No crea cuentas (las crea Aldo en Supabase Auth; las contraseñas viven solo en
--   .env.test.local). No toca productos, stock ni costos.
--
-- CUÁNDO CORRERLA
--   DESPUÉS de la 0013 y de crear las 2 cuentas en Auth. Si falta alguna, frena.
--
-- Se puede correr dos veces. Se corre a mano en el SQL Editor de Supabase.

begin;

do $$
declare
  v_sucre uuid;
  v_scz uuid;
begin
  select p.id into v_sucre from public.perfiles p where lower(p.email) = 'distribuidor.sucre@amlagrotech.test';
  select p.id into v_scz from public.perfiles p where lower(p.email) = 'distribuidor.scz@amlagrotech.test';

  if v_sucre is null or v_scz is null then
    raise exception 'FRENO: primero crea en Supabase Auth las cuentas distribuidor.sucre@amlagrotech.test y distribuidor.scz@amlagrotech.test.';
  end if;

  -- Corre como postgres: proteger_campos_perfil lo permite
  update public.perfiles p
  set rol = 'distribuidor', activo = true
  where p.id in (v_sucre, v_scz) and (p.rol <> 'distribuidor' or not p.activo);

  update public.perfiles p set nombre = 'Agroinsumos del Sur' where p.id = v_sucre and p.nombre = 'Usuario';
  update public.perfiles p set nombre = 'Distribuidora Oriente Agro' where p.id = v_scz and p.nombre = 'Usuario';

  insert into public.distribuidores (usuario_id, nombre_comercial, ciudad, telefono, dias_entrega)
  values
    (v_sucre, 'Agroinsumos del Sur', 'Sucre', '70000001', 2),
    (v_scz, 'Distribuidora Oriente Agro', 'Santa Cruz', '70000002', 4)
  on conflict (usuario_id) do nothing;
end;
$$;

-- Presentaciones: (correo del distribuidor, SKU, presentación, unidades de venta, precio mayorista, días)
with datos (correo, sku, nombre, unidades, precio, dias) as (
  values
    -- Agroinsumos del Sur (Sucre)
    ('distribuidor.sucre@amlagrotech.test', 'AGR-006', 'Bidón 20 L',             20, 1640.00, null::integer),
    ('distribuidor.sucre@amlagrotech.test', 'AGR-002', 'Caja 12 × 1 L',          12, 1080.00, null),
    ('distribuidor.sucre@amlagrotech.test', 'AGR-005', 'Caja 12 × 1 L',          12,  936.00, null),
    ('distribuidor.sucre@amlagrotech.test', 'AGR-008', 'Bolsa 25 kg',            25, 1375.00, null),
    ('distribuidor.sucre@amlagrotech.test', 'AGR-001', 'Caja 25 × 1 kg',         25, 1400.00, null),
    ('distribuidor.sucre@amlagrotech.test', 'AGR-011', 'Lote 10 sacos de 50 kg', 10, 2900.00, null),
    ('distribuidor.sucre@amlagrotech.test', 'SEM-002', 'Bolsa 25 kg',            25,  500.00, null),
    ('distribuidor.sucre@amlagrotech.test', 'SEM-005', 'Lote 10 arrobas',        10,  680.00, 3),
    ('distribuidor.sucre@amlagrotech.test', 'HER-003', 'Caja 12 unidades',       12,  420.00, null),
    ('distribuidor.sucre@amlagrotech.test', 'HER-005', 'Caja 6 unidades',         6,  210.00, null),
    ('distribuidor.sucre@amlagrotech.test', 'CAN-001', 'Bolsa 50 unidades',      50,  375.00, null),
    -- Distribuidora Oriente Agro (Santa Cruz)
    ('distribuidor.scz@amlagrotech.test',   'AGR-006', 'Bidón 20 L',             20, 1560.00, null),
    ('distribuidor.scz@amlagrotech.test',   'AGR-007', 'Bidón 20 L',             20, 1400.00, null),
    ('distribuidor.scz@amlagrotech.test',   'AGR-011', 'Lote 20 sacos de 50 kg', 20, 5600.00, null),
    ('distribuidor.scz@amlagrotech.test',   'AGR-003', 'Lote 10 sacos de 50 kg', 10, 3700.00, null),
    ('distribuidor.scz@amlagrotech.test',   'AGR-009', 'Lote 10 sacos de 50 kg', 10, 4200.00, null),
    ('distribuidor.scz@amlagrotech.test',   'AGR-012', 'Lote 10 sacos de 50 kg', 10, 7650.00, 5),
    ('distribuidor.scz@amlagrotech.test',   'AGR-008', 'Bolsa 25 kg',            25, 1425.00, null),
    ('distribuidor.scz@amlagrotech.test',   'SEM-003', 'Bolsa 20 kg',             1,  345.00, null),
    ('distribuidor.scz@amlagrotech.test',   'RIE-002', 'Rollo 1000 m',            1,  360.00, null),
    ('distribuidor.scz@amlagrotech.test',   'RIE-003', 'Bolsa 100 unidades',    100,  220.00, null),
    ('distribuidor.scz@amlagrotech.test',   'RIE-001', 'Caja 10 unidades',       10,  580.00, null)
)
insert into public.presentaciones_distribuidor (
  distribuidor_id, producto_id, nombre, unidades_por_presentacion, precio_mayorista, dias_entrega
)
select d.id, pr.id, x.nombre, x.unidades, x.precio, x.dias
from datos x
join public.perfiles u on lower(u.email) = x.correo
join public.distribuidores d on d.usuario_id = u.id
join public.productos pr on pr.sku = x.sku
on conflict (distribuidor_id, producto_id, nombre) where activo do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificaciones
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_fichas integer;
  v_presentaciones integer;
  v_mas_cara record;
begin
  select count(*) into v_fichas
  from public.distribuidores d
  join public.perfiles u on u.id = d.usuario_id
  where lower(u.email) in ('distribuidor.sucre@amlagrotech.test', 'distribuidor.scz@amlagrotech.test')
    and u.rol = 'distribuidor' and d.activo;

  if v_fichas <> 2 then
    raise exception 'FRENO: se esperaban 2 fichas de distribuidor activas y hay %.', v_fichas;
  end if;

  select count(*) into v_presentaciones
  from public.presentaciones_distribuidor pd
  join public.distribuidores d on d.id = pd.distribuidor_id
  join public.perfiles u on u.id = d.usuario_id
  where lower(u.email) in ('distribuidor.sucre@amlagrotech.test', 'distribuidor.scz@amlagrotech.test')
    and pd.activo;

  if v_presentaciones < 22 then
    raise exception 'FRENO: se esperaban 22 presentaciones y hay % (¿falta algún SKU?).', v_presentaciones;
  end if;

  -- Ningún costo por unidad estimado puede superar el precio de venta
  select pr.sku, round(pd.precio_mayorista / pd.unidades_por_presentacion, 2) as costo, pr.precio
  into v_mas_cara
  from public.presentaciones_distribuidor pd
  join public.productos pr on pr.id = pd.producto_id
  where pd.precio_mayorista / pd.unidades_por_presentacion >= pr.precio
  limit 1;

  if found then
    raise exception 'FRENO: % costaría Bs. % por unidad y se vende a Bs. %.', v_mas_cara.sku, v_mas_cara.costo, v_mas_cara.precio;
  end if;

  if not (
    public.aml_es_cuenta_prueba((select id from public.perfiles where lower(email) = 'distribuidor.sucre@amlagrotech.test'))
    and public.aml_es_cuenta_prueba((select id from public.perfiles where lower(email) = 'distribuidor.scz@amlagrotech.test'))
  ) then
    raise exception 'FRENO: las cuentas de los distribuidores de demostración no cuentan como prueba.';
  end if;

  raise notice '0014 OK: 2 distribuidores de demostración con % presentaciones.', v_presentaciones;
end;
$$;

commit;
