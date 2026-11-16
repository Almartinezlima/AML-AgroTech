# AML AgroTech

Tienda en línea de insumos agrícolas (semillas, fertilizantes, agroquímicos y herramientas) con pagos, envíos, inventario y abastecimiento con proveedores mayoristas.

**Sitio en vivo:** https://aml-agrotech.onrender.com

> El sitio está en el plan gratis de Render: si nadie lo usó en un rato, la primera visita tarda unos 45 segundos en despertar.

## Equipo — Grupo 20

| | |
|---|---|
| Integrantes | Aldo Martínez Lima · Miguel Alejandro Nava Mamani |
| Materia | SIS324 — Universidad San Francisco Xavier de Chuquisaca (USFX) |
| Docente | Ing. Ramiro Durán Quiroga |

## Qué hace la app

La app tiene tres tipos de usuario y cada uno ve su propio panel.

### Cliente
- Navega el catálogo con búsqueda, filtros y ficha técnica de cada producto.
- Arma su carrito (también sin cuenta) y compra con un checkout de 3 pasos.
- Elige cómo recibir el pedido: envío a su zona o recojo en tienda.
- Paga con QR, por transferencia o contra entrega, y sube la foto del comprobante.
- Sigue su pedido en una línea de tiempo, puede cancelarlo y descarga la **nota de venta en PDF**.

### Distribuidor (proveedor mayorista)
- Carga las presentaciones que le vende a la tienda: producto, cuánto trae y precio mayorista.
- Recibe las órdenes de compra de la tienda, las acepta o las rechaza y las marca como despachadas.

### Administrador
- Gestiona productos, inventario (kardex, entradas, ajustes y alertas de stock mínimo), pedidos, pagos, envíos, zonas y usuarios.
- **Abastecimiento:** ve qué hay que reponer, con el proveedor más barato y la cantidad sugerida, arma las órdenes de compra y las recibe. El stock y el costo se actualizan solos.
- Ve el margen por producto y recibe avisos por Telegram.

La API REST está documentada con OpenAPI; se puede ver en `/api-docs` (Swagger).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend y API | Next.js 14 (App Router) · React 18 · TypeScript |
| Estilos | Tailwind CSS |
| Base de datos, autenticación y archivos | Supabase (PostgreSQL con RLS, Auth y Storage) |
| PDF | pdfkit |
| Pruebas | Playwright (E2E) |
| Deploy | Render |

## Cómo correrlo en local

Requisitos: Node.js 18 o más y un proyecto de Supabase con las migraciones de `supabase/migrations/` aplicadas en orden.

```bash
git clone <url-del-repositorio>
cd aml-agrotech
npm install
cp .env.example .env.local   # y completa los valores
npm run dev
```

Abre http://localhost:3000.

Variables de entorno (en `.env.local`, que **nunca** se sube al repositorio):

| Variable | Para qué sirve |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon) del proyecto de Supabase |
| `NEXT_PUBLIC_WHATSAPP_TIENDA` | Número de WhatsApp de la tienda (opcional) |
| `NEXT_PUBLIC_QR_TIENDA_IMAGEN` | URL de otra imagen de QR de cobro (opcional; por defecto se usa `public/qr-bnb.jpg`) |

Otros comandos:

```bash
npm run build      # compilación de producción
npm run lint       # revisión de código
npm run test:e2e   # pruebas E2E (ver docs/PRUEBAS.md)
```

## Documentación

Está en [`docs/`](docs/README.md): especificación por pilar, arquitectura, diseño, estado del proyecto y guía de pruebas.
