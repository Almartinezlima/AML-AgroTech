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

La app tiene cuatro roles y cada uno ve su propio panel: **cliente**, **administrador**, **repartidor** y **distribuidor**. Solo se paga con **QR**.

### Cliente
- Navega el catálogo con búsqueda, filtros y ficha técnica de cada producto.
- Arma su carrito (también sin cuenta) y confirma la compra en una sola pantalla, con sus datos recordados.
- Elige cómo recibir el pedido: recojo en tienda, a domicilio en su distrito o por flota a su municipio.
- Paga con el QR de la tienda desde la app de su banco y sube la foto del comprobante justo debajo.
- Sigue su pedido en una línea de tiempo (quién hizo cada paso y a qué hora), lo cancela mientras esté pendiente y descarga el **recibo de compra en PDF**.
- Recibe un **código de 4 dígitos** y lo dicta solo cuando tiene el pedido en la mano (en la tienda o al repartidor).

### Administrador
- Verifica cada comprobante y **prepara** el pedido: marca cada producto, reporta faltantes y lo deja «Listo para salir» con su etiqueta.
- Entrega en tienda con el código del cliente y despacha por flota con empresa y número de guía.
- Paga a los repartidores lo que ganaron y libera una entrega si el repartidor no aparece.
- Gestiona productos, inventario (kardex, entradas, ajustes y alertas de stock mínimo), zonas y usuarios.
- **Abastecimiento:** ve qué hay que reponer, con el proveedor más barato y la cantidad sugerida, arma las órdenes de compra y las recibe. El stock y el costo se actualizan solos.
- Ve el margen por producto y recibe avisos por Telegram.

### Repartidor (persona externa)
- Se registra como cliente y el administrador le da el rol.
- Marca «Estoy disponible» y se entera de cada entrega nueva por el grupo de Telegram.
- Acepta la entrega (el primero se la lleva), la recoge en la tienda y la entrega con el código del cliente.
- Gana el costo de envío y ve cuánto ganó y cuánto le falta cobrar.

### Distribuidor (proveedor mayorista)
- Carga las presentaciones que le vende a la tienda: producto, cuánto trae y precio mayorista.
- Recibe las órdenes de compra de la tienda, las acepta o las rechaza y las marca como despachadas.

La API REST está documentada con OpenAPI; se puede ver en `/api-docs` (Swagger).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend y API | Next.js 14 (App Router) · React 18 · TypeScript |
| Estilos | Tailwind CSS |
| Base de datos, autenticación y archivos | Supabase (PostgreSQL con RLS, Auth y Storage) |
| PDF | pdfkit |
| Avisos | Telegram Bot API desde Postgres (`pg_net` + `pg_cron`) |
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
| `NEXT_PUBLIC_TELEGRAM_GRUPO_REPARTIDORES` | Enlace de invitación al grupo de Telegram de repartidores (opcional; sin él no sale el botón «Unirme al grupo») |

Los secretos de Telegram (token del bot y chats) viven en Supabase Vault, nunca en `.env.local` ni en Render.

Otros comandos:

```bash
npm run build      # compilación de producción
npm run lint       # revisión de código
npm run test:e2e   # pruebas E2E (ver docs/PRUEBAS.md)
```

## Documentación

Está en [`docs/`](docs/README.md): especificación por pilar (historias de usuario y casos de uso), arquitectura, diagramas UML en [`docs/uml/`](docs/uml/README.md), contrato de la API en [`docs/api/openapi.yaml`](docs/api/openapi.yaml), diseño, estado del proyecto, guía de pruebas y [mejoras futuras](docs/MEJORAS_FUTURAS.md).
