# AML AgroTech — Contexto del proyecto

## Qué es

Plataforma web de **comercio electrónico de insumos agrícolas** (agroquímicos, semillas, riego, cañerías y herramientas) para Sucre y Chuquisaca, Bolivia. Proyecto final de **SIS324 Ingeniería de Software** (USFX, Ing. Ramiro Durán Quiroga), **Grupo 20**: Aldo Martínez Lima y Miguel Alejandro Nava Mamani. Se construye como **producto final para la feria de software** (objetivo: estar entre los 3 mejores proyectos) y para comercializarse después, no como prototipo.

Especificación completa (historias de usuario, casos de uso, arquitectura): **`docs/README.md`**.

## Los 5 pilares (lo que evalúa el docente)

1. **E-commerce** — catálogo, carrito, checkout, pedidos.
2. **Seguridad** — autenticación, roles, RLS, API protegida.
3. **Pagos** — QR de cobro real del BNB (desde la fase 9F, la única forma de pago); comprobante y verificación.
4. **Distribución** — zonas de envío, flota/encomienda, estados y seguimiento.
5. **Almacenamiento** — inventario, kardex de movimientos, stock mínimo y alertas.

Arquitectura obligatoria: **web services con API REST** propia (`src/app/api/**`). Diagramas UML al final (casos de uso, clases, componentes, despliegue).

## Stack

- **Frontend**: Next.js 14 (App Router, carpeta `src/`) + React 18 + TypeScript estricto + **Tailwind CSS**
- **Backend**: API REST con Route Handlers de Next.js (`src/app/api/**`)
- **Base de datos / Auth / Archivos**: Supabase (Postgres + RLS, Auth, Storage) — proyecto `aml-agrotech` (`cfklhtkhxrategsffuvf`, sa-east-1)
- **Deploy**: **Render** (Web Service gratis) desde la rama `master`
- **Repo**: github.com/Almartinezlima/AML-AgroTech — rama principal **`master`**
- **Código local**: `C:\aml-agrotech` — Windows + VS Code + PowerShell

## Comandos base

```powershell
npm install              # instalar librerías
npm run dev              # local en http://localhost:3000
npx tsc --noEmit         # errores de TypeScript
npm run lint             # ESLint
npm run build            # build de producción (lo mismo que hará Render)
```

## Principios (REGLAS NO NEGOCIABLES)

1. **Producto final, no prototipo.** Cada decisión se piensa para la feria y para venderse: seguridad, datos reales, rendimiento, orden y diseño cuidado.
2. **Una fase a la vez.** No mezclar frentes ni hacer reescrituras gigantes.
3. **Verificar antes de proponer.** Leer el código real y el esquema real de Supabase. NO inventar columnas, rutas, tablas ni APIs.
4. **Primero el plan, después el código.** Antes de editar, mostrar qué se encontró y qué se va a cambiar. **No editar hasta que Aldo apruebe.**
5. **Cambios puntuales y verificables**, no reescrituras innecesarias.
6. **Sin evidencia no está terminado.** Al terminar: `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores, y capturas (Playwright) en 1280, 412 y 360 px de lo que cambió. Skill `verificar`.
7. **Crítica honesta.** Si Aldo pide algo que no conviene o hay una opción mejor, decírselo claro y con razones. Aldo decide.
8. **Avisar antes de tocar algo crítico** (base de datos, autenticación, pagos, archivos de configuración).
9. **Commits y push solo con OK de Aldo.** Nunca push a `master` directo: rama por fase y Pull Request.
10. **Secretos intocables.** PROHIBIDO usar `SUPABASE_SERVICE_ROLE_KEY` desde el navegador, scripts, Playwright o la terminal. Nunca escribir claves en documentos ni commits. `.env.local` nunca se sube.
11. **Cero pagos.** Todo con planes gratuitos sin tarjeta (Render free, Supabase free). Si algo pide tarjeta o plan pago: PARAR y avisar a Aldo.
12. **Las mejores herramientas gratuitas.** Si existe una librería mejor y gratuita, proponerla (sin instalar nada sin OK).
13. **Pensado para el agricultor boliviano.** Precios en Bs., unidades reales (bolsa, litro, kg, rollo, metro, unidad), lugares reales de Chuquisaca, español claro.
14. **Español informal con Aldo.** PowerShell: comandos de a uno, nunca encadenados con `&&`.

## Git

- **Ramas**: `fase/<n>-<tema>` por fase (`fase/1-seguridad`, `fase/2-ecommerce`…); `chore/<tema>` para orden o documentación. Siempre desde `master` actualizado.
- **Commits sin firma de IA**: nunca `Co-Authored-By`, `Claude-Session` ni "Generated with Claude" en commits ni Pull Requests. El autor es Aldo. (También en `.claude/settings.json`.)
- **Commits chicos con prefijo**: `feat(area)`, `fix(area)`, `docs(area)`, `chore(area)`. Ej.: `feat(pagos): subir comprobante`.
- **Al cerrar la fase**: Pull Request a `master`, que Aldo aprueba en GitHub. Render publica solo.

## Flujo de trabajo

1. Aldo y Claude (chat del Proyecto) analizan y deciden; Claude (chat) revisa GitHub y Supabase directamente.
2. Claude Code recibe **un prompt por fase**, en una conversación nueva.
3. Claude Code lee el código real, muestra el plan y **no edita hasta que Aldo apruebe**.
4. Programa y muestra la evidencia (skill `verificar`).
5. Aldo prueba en `localhost:3000`. Con su OK: skill `cerrar-frente`.
6. Migraciones: skill `migracion`. Claude Code escribe el `.sql`; **Aldo lo corre** en el SQL Editor de Supabase.

## Arquitectura (resumen)

```
Navegador (React) ──fetch──▶ API REST propia  src/app/api/**  (valida sesión, rol y datos)
                                   │
                                   ▼
                Supabase: Postgres (RLS + funciones SQL) · Auth · Storage
```

- **Toda escritura de negocio pasa por la API REST** (pedidos, pagos, envíos, inventario, usuarios). El navegador puede LEER catálogo directo de Supabase, pero nunca escribe pedidos, precios, stock, roles ni estados.
- **Precios, totales y stock los calcula el servidor/la base**, nunca se confía en lo que manda el navegador.
- Operaciones que tocan varias tablas (crear pedido, descontar stock, cancelar) van en **funciones SQL transaccionales** llamadas con `rpc()` desde la API.
- Respuestas de la API en JSON con códigos HTTP correctos (200, 201, 400, 401, 403, 404, 409, 422, 500) y forma `{ data }` o `{ error: { codigo, mensaje } }`.
- Validación de entrada con **zod** en cada ruta.
- La API se documenta en OpenAPI (`docs/api/openapi.yaml`) y se muestra en `/api-docs`.

## Reglas técnicas

- **Supabase**: nunca `.select('*')`, siempre columnas explícitas. Filtrar por usuario además de la RLS.
- **IDs**: todas las tablas usan `uuid`. En TypeScript son `string`.
- **Nunca hard-delete**: usar `activo = false` o estados (`cancelado`).
- **Fechas**: en el navegador, `fechaHoyLocal()` de `@/lib/utils`. **NUNCA `toISOString()`** para fechas de calendario (Bolivia es UTC-4). En el servidor, la fecha la pone la base (`now()`).
- **Dinero**: `numeric(10,2)` en la base; en pantalla siempre `Bs. 0,00` con `formatoBs()` de `@/lib/utils`.
- **Roles**: `admin`, `cliente`, `distribuidor`, `repartidor` (el rol `almacen` se quitó en la 0020: preparar lo hace el admin; el repartidor es una persona externa que se registra como cliente y el admin le da el rol). El rol se verifica **en el servidor** (middleware + API + RLS o funciones que revisan el rol), nunca solo en la pantalla. El almacén y el repartidor no leen tablas directo: solo funciones `security definer`.
- **Migraciones**: toda tabla, columna, política o función nueva tiene su archivo en `supabase/migrations/` (numerado). Nada se crea a mano en el panel de Supabase sin su receta.
- **Funciones SQL**: siempre `set search_path = ''` y nombres calificados (`public.tabla`). `security definer` solo si hace falta, y con `revoke execute ... from public, anon` cuando no deben ser públicas.
- **Storage**: imágenes de productos en bucket público `productos`; comprobantes de pago en bucket **privado** `comprobantes` (solo dueño y admin).
- **Tamaño de archivos**: `page.tsx` < 200 líneas; si crece, partir en `_components/`. Componentes reusables en `src/components/`.
- **Arquitectura por carpetas**: `src/app/<ruta>/page.tsx` + `src/app/<ruta>/_components/`; lógica de negocio en `src/lib/<pilar>/`; tipos en `src/types/`.
- **Confirmaciones**: nunca `window.confirm` / `alert`; usar el modal de confirmación propio.
- **Componentes cliente**: `'use client'` solo donde haga falta (estado, eventos).
- **Librerías al día**: ante una API dudosa de Next.js 14, Supabase o Tailwind, consultar la documentación oficial (Context7). Nunca mandar código del proyecto ni claves.

## Diseño (no cambiar sin pedido de Aldo)

Tema **claro** agrícola (desde la fase 6B), mobile-first. **Una sola fuente de tokens** (fase 3): valores en `src/app/globals.css` (`--color-*`, `--letra-*`), expuestos como clases en `tailwind.config.ts`, y clases comunes en `src/components/ui/estilos.ts` (`claseBoton`, `claseTarjeta`, `claseFiltro`…). Sin hex sueltos ni `red-700`/`amber-800`: tokens `estado-*`. Detalle en `docs/DISENO.md`.

| Uso | Token | Color |
|---|---|---|
| Fondo (crema) | `fondo` | `#f6f4ee` |
| Tarjetas | `tarjeta` | `#ffffff` |
| Hover / campos | `tarjeta-hover` | `#eef3ea` |
| Bordes | `borde` | `#dfe5d8` |
| Verde de la marca (botones, precios, enlaces) | `acento` | `#15753a` |
| Verde hover | `acento-hover` | `#166534` |
| Texto principal | `texto` | `#17251b` |
| Texto secundario | `texto-2` | `#4a5a4e` |
| Trigo para texto y detalles | `trigo` | `#836219` |
| Trigo decorativo (rellenos, números grandes) | `trigo-suave` | `#d4b26a` |

Contrastes medidos (WCAG AA): texto 15:1, texto-2 7:1, acento 5,3:1, trigo 5,1:1; blanco sobre `acento` 5,8:1.

- **Trigo**: solo para detalles (pasos de "Cómo comprar", sellos, zonas por flota, créditos). Nunca para estados: el ámbar `#f59e0b` sigue siendo "pendiente".
- **Letra**: `text-xs` vale 15 px en celular y 14 px desde 640 px; `text-sm` 16 px en celular y 15 px desde 640 px (fase 3). Los títulos no cambian. Ningún texto de contenido por debajo de 14 px; el menú en 16 px. Botones táctiles de 44 px como mínimo.
- **Sombras**: solo `shadow-tarjeta`, `shadow-tarjeta-hover` y `shadow-flotante`. **Tablas** debajo de 768 px: tarjetas apiladas, nunca scroll de la página.
- **Portada**: la foto propia de Villa Charcas a pantalla completa, **original**: sin capas, velos, filtros, brillo ni opacidad encima. El texto se lee solo con sombra doble en las letras (`text-shadow`), sin cajas detrás. Encuadre `object-[90%_50%]` para que en celular el título caiga sobre las nubes oscuras.
- **Tipografía**: Bricolage Grotesque (títulos) + Figtree (texto), con `next/font`.
- **Imágenes**: fotos reales siempre (los 36 productos en `public/productos/<sku>.webp`, categorías en `public/categorias/`, portada en `public/portada/`). Fuente de cada una en `docs/CREDITOS_IMAGENES.md`. Nunca íconos como imagen de producto. Fotos de producto WebP de 800 px de lado mayor, portada hasta 1920 px; siempre con `next/image` y `sizes` igual al ancho real en pantalla; `priority` solo en la foto de la portada y la foto principal de la ficha. Las que sube el admin se guardan en Storage dos veces: el original en `productos/originales/` y la copia WebP de 800 px que usa la tienda.
- **Color por categoría** (`src/lib/categorias.ts`): Semillas verde, Riego azul, Agroquímicos naranja, Herramientas tierra, Cañerías gris azulado. Solo en etiquetas y detalles.
- **Íconos**: Lucide (`react-icons/lu`) solo para la interfaz (carrito, usuario, camión…). Sin emojis en la interfaz. Detalle completo en `docs/DISENO.md`.

- Colores de estado: pendiente ámbar `#f59e0b`, verificado/entregado verde `#22c55e`, en camino azul `#3b82f6`, cancelado/rechazado rojo `#ef4444`. Sobre fondo claro el **texto** del estado va en su tono oscuro (`colorTextoEstado` en `Insignia.tsx`): `#92400e`, `#166534`, `#1d4ed8`, `#b91c1c`.
- Escritorio (≥ 1280 px) y celular (360, 412 px) **sin scroll horizontal**.
- Toda pantalla tiene estados de **carga** (skeleton), **vacío** y **error**.
- Comentarios del código en español.

## Datos y negocio

- Catálogo: 36 productos reales. Base de precios de Sucre (Observatorio Agroambiental, 2º sem. 2023); riego y cañerías son estimados. Desde la migración 0008 los fertilizantes Urea, Calferquim, Molimax y los 3 nuevos (Fosfato Diamónico, Cloruro de Potasio, Urea Protegida) tienen precio de referencia de mercado de SurtiAgro (Santa Cruz, 7 sep 2026) con tendencia; nuestro precio incluye el flete hasta Villa Charcas. Ficha técnica opcional por producto (composición, cultivos, modo de uso, dosis y banda toxicológica, esta solo en Agroquímicos). Detalle en `docs/specs/07-reingenieria.md`.
- La tienda está en **Villa Charcas**. Zonas (migración 0010, 14 nov 2026): **Recojo en tienda (Villa Charcas)** Bs. 0 · a domicilio: **Villa Charcas — Distrito 1 (el pueblo)** Bs. 15, **Distrito Pucara** Bs. 20, **Distrito Santa Elena** Bs. 25, **Distrito Supas** Bs. 30, **Distrito Kaisaka** Bs. 35 · por flota con nombre y CI de quien recoge y número de guía: **Incahuasi** Bs. 20, **Culpina** Bs. 25. Solo se paga con QR (0020); a domicilio el costo de envío lo gana el repartidor externo. **Sucre está inactiva** (no se borra: hay pedidos viejos).
- El **QR de cobro real** va en `public/qr-bnb.jpg` (o en la URL de `NEXT_PUBLIC_QR_TIENDA_IMAGEN`) y **se renueva cuando vence**. El actual es del BNB y vale hasta el **23/11/2026**. Al cambiarlo: JPG de al menos ~900 px de ancho, sin comprimir de más, y comprobar que se sigue leyendo con un lector de QR.
- Cuentas demo para la feria: se crean con el panel de Supabase; las contraseñas **nunca** van al repo.

## Documentación

- `docs/README.md` — índice.
- `docs/specs/` — historias de usuario, casos de uso y criterios de aceptación por pilar (la "S" de SDD).
- `docs/ESTADO.md` — qué funciona hoy, qué falta y qué sigue. Se actualiza al cerrar cada fase.
- `docs/sesiones/AAAA-MM-DD_tema.md` — qué se hizo en cada sesión.
- **La verdad está en el código y en Supabase, no en los documentos.** Si hay contradicción, manda la realidad y se avisa a Aldo.
