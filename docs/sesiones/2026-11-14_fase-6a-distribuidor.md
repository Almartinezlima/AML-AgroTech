# Fase 6A — Distribuidor: proveedores y presentaciones (14 nov 2026)

Rama `fase/6a-distribuidor`, desde `master` con la fase 5 unida (PR #14). **Migraciones 0013 y 0014** (Aldo las corre; Claude Code no). Primera mitad de la fase 6; la 6B (órdenes de compra, recepción con fraccionamiento y margen) va en `fase/6b-abastecimiento`.

## Por qué

El distribuidor deja de ser "un cliente que compra al por mayor" y pasa a ser el **proveedor mayorista** (Sucre o Santa Cruz) que le vende a la tienda. No reparte a clientes ni ve sus pedidos.

## Decisiones (Aldo, 14 nov)

- **El rol distribuidor lo asigna solo el admin.** Se quitó del registro y de `handle_new_user`; toda cuenta nueva es cliente. La portada pasó de "¿Tienes un negocio agropecuario?" a **"¿Eres proveedor mayorista?"** con WhatsApp a la tienda.
- **El costo va aparte** (`costos_producto`, solo admin): `productos` se lee sin sesión y el margen no puede quedar a la vista. Se llena en la 6B, con promedio ponderado y el último costo como referencia.
- **Fraccionamiento en la presentación**: `unidades_por_presentacion` es entero y está en la unidad de venta de la tienda (bidón 20 L de un producto por litro = 20). El formulario lo pregunta así: "¿Cuántos «litro» trae?".
- **Nunca hard-delete**: fichas y presentaciones se desactivan. Ni el admin tiene `delete` sobre estas tablas.
- **Cuenta admin de las E2E = prueba** (pedido de Aldo): `aml_es_cuenta_prueba` la reconoce **por su id**, no por el correo, porque el repo es público y el correo sirve para entrar. Sus movimientos ya no avisan ni cuentan en el resumen. Ojo: es la cuenta admin más antigua (1 oct); si se usa para trabajar de verdad, sus ajustes de stock tampoco avisan.
- **Demo**: 2 distribuidores `.test` con nombres inventados ("Agroinsumos del Sur", Sucre; "Distribuidora Oriente Agro", Santa Cruz) y 22 presentaciones con precios mayoristas estimados. No mandan avisos; en la fase 8 se harán cuentas demo no-.test para mostrar los avisos en la feria.

## Qué se hizo

- **0013** (`supabase/migrations/0013_distribuidores.sql`):
  - Tablas `distribuidores`, `presentaciones_distribuidor` y `costos_producto`, con RLS:

    | Quién | Qué ve y toca |
    |---|---|
    | Distribuidor | Su ficha (solo lectura) y sus presentaciones (ver, crear, editar) |
    | Admin | Todo |
    | Anon | Nada |
    | Nadie | Borra |

  - Triggers: la ficha solo apunta a una cuenta con rol distribuidor y no cambia de cuenta; una presentación no cambia de distribuidor ni de producto.
  - Auxiliares `es_distribuidor()` y `aml_mi_distribuidor()`.
  - Cierra con 12 verificaciones FRENO, entre ellas la de la cuenta admin de las E2E.
- **0014** (`0014_distribuidores_demo.sql`): busca las 2 cuentas por correo, les pone el rol, crea las fichas y las 22 presentaciones por SKU. Frena si faltan las cuentas, si algún costo por unidad supera el precio de venta o si las cuentas no cuentan como prueba.
- **API** (en OpenAPI, etiqueta Abastecimiento):
  - `GET /api/distribuidor/ficha`;
  - `GET|POST /api/distribuidor/presentaciones` y `PATCH /api/distribuidor/presentaciones/:id` (siempre sobre la ficha propia; además de la RLS, se filtra por `distribuidor_id`);
  - `GET|POST /api/distribuidores` y `PATCH /api/distribuidores/:id` (admin);
  - `requerirDistribuidor()` en `sesion.ts`.
- **Pantallas**:
  - `/distribuidor`: panel del proveedor (cifras, presentaciones, alta y edición, sin stock, dejar de vender).
  - `/admin/abastecimiento/distribuidores`: fichas, cuentas sin ficha, lo que vende cada uno y WhatsApp.
  - El componente compartido `TarjetaPresentacion`.
  - "Distribuidores" en el menú del admin y "Panel del proveedor" en el navbar.
- **Acceso**: el middleware exige rol distribuidor en `/distribuidor`. Al iniciar sesión, el distribuidor entra a su panel.
- **Pruebas**:
  - `tests/e2e/distribuidor.spec.ts`: no crea nada; lo que cambia, lo revierte.
  - `tests/capturas/distribuidor-6a.spec.ts`: solo lee.
  - Cuentas `E2E_DIST1/2` en `.env.test.example`; las contraseñas viven solo en `.env.test.local`.

## Evidencia

- `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.
- Capturas y E2E: después de correr la 0013 y la 0014 (ver abajo).
