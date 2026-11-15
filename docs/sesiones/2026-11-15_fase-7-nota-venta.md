# Fase 7 — Nota de venta en PDF (15 nov 2026)

Rama `fase/7-nota-venta`, desde `master` con la fase 6B unida (PR #16). **Sin migración**: todo lo que necesita ya está en la base.

## Por qué

El cliente y la tienda necesitan un papel de la compra: para el agricultor que lo muestra al recoger, para la flota y para el registro de la tienda. **No es factura** (no hay NIT ni SIN): dice «Nota de venta — documento sin valor fiscal».

## Decisiones (Aldo, 15 nov)

- **En el servidor, con pdfkit** (MIT, gratis). La ruta `GET /api/pedidos/{id}/nota` valida dueño o admin con la misma consulta del detalle y entrega el PDF con `Content-Disposition: attachment`. Es un enlace normal: en Android Chrome lo descarga como archivo, también dentro de los navegadores de WhatsApp o Facebook. Se descartó Puppeteer (Chromium no entra en los 512 MB de Render gratis) y jsPDF en el navegador (los `blob:` fallan en algunos navegadores de celular). `runtime = 'nodejs'`, `dynamic = 'force-dynamic'` y `Cache-Control: private, no-store`.
- **`next.config.mjs`**: `experimental.serverComponentsExternalPackages: ['pdfkit']`. Sin eso el bundle de Next no encuentra las fuentes de pdfkit.
- **Cuándo se descarga** (`situacionNota` en `src/lib/ecommerce/notaVenta.ts`, usada por la API y por los botones):

  | Pedido | Nota |
  |---|---|
  | Pendiente (falta pagar, en revisión o contra entrega sin confirmar) | 409 `NOTA_NO_DISPONIBLE`; en el detalle, «La nota de venta estará disponible cuando la tienda confirme tu pedido» |
  | Confirmado en adelante (pago verificado, o contra entrega confirmado) | ✅ |
  | Cancelado que se llegó a confirmar (hay «confirmado» o más en el seguimiento) | ✅ con la marca de agua **ANULADA** |
  | Cancelado sin confirmar nunca | 409: no hubo venta |

  Pedido ajeno o inexistente: **404** (no se revela que existe). Sin sesión: **401**. Id mal escrito: 400.
- **Carta**, Helvetica (viene con pdfkit y cubre á, ñ, º), legible en blanco y negro: el verde `#15753a` solo en la franja de arriba, los títulos y el total; filas separadas con líneas, no con fondos. La marca ANULADA va en rojo al 18 %.
- **Contenido**: tienda (Villa Charcas, Chuquisaca, WhatsApp de `NEXT_PUBLIC_WHATSAPP_TIENDA`), N.º = código del pedido, fecha y hora de Bolivia, cliente (nombre y teléfono), entrega (zona, dirección o quién recoge en la flota con su CI), tabla (cantidad con la unidad pluralizada, producto, precio unitario y subtotal), envío, total con `formatoBs`, método y estado del pago («Se paga al recibir» en contra entrega), estado del pedido, QR pequeño con el enlace al pedido (pide sesión) y pie con «Página N de M». Con muchos productos sigue en otra página y repite el encabezado de la tabla.
- **CI del cliente**: `perfiles` no tiene CI. El único CI es el de quien recoge en la flota (`recoge_ci`), y ese se muestra.
- **Unidad**: `pedido_items` no la guarda; sale de `productos.unidad` y se pluraliza con `cantidadConUnidad()` (la misma regla del kardex, 6B).

## Qué se hizo

- `src/lib/ecommerce/notaVenta.ts`: la regla de cuándo hay nota y el nombre del archivo (`Nota-AML-000123.pdf`).
- `src/lib/ecommerce/notaVentaPdf.ts`: arma el PDF (solo servidor).
- `src/app/api/pedidos/[id]/nota/route.ts` y su entrada en `docs/api/openapi.yaml`.
- Detalle del pedido (cliente y admin): botón «Descargar nota de venta (PDF)» debajo del seguimiento, con «Documento sin valor fiscal» o el aviso de ANULADA. En `/admin/pedidos`, «Nota PDF» en la tarjeta de los pedidos confirmados en adelante (los cancelados se descargan desde el detalle).
- **Playwright** (pendiente de la 6A y la 6B): `npm run test:e2e:prod` compila antes (`pretest:e2e:prod` → `scripts/compilar-e2e.mjs`) y el webServer solo hace `next start`, con su salida en la terminal (`stdout`/`stderr: 'pipe'`): si vuelve a caerse, queda el error.
- `tests/e2e/nota-venta.spec.ts` (2 pruebas): contra entrega (409 pendiente → el admin confirma → el cliente descarga con el botón y el admin desde el panel) y QR verificado (409 en revisión → aprobado → PDF; inventado 404, sin sesión 401, ajeno 404 con el distribuidor de prueba; al anularse, el PDF dice ANULADA). Lee el texto del PDF descomprimiendo sus páginas.

## Evidencia

- `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.
- PDF de ejemplo en `test-results/notas/`: `nota-qr-verificado.pdf`, `nota-contra-entrega.pdf`, `nota-anulada.pdf`. Capturas: `cliente-360.png`, `cliente-1280.png`, `admin-360.png`, `admin-1280.png` (sin scroll horizontal).
- Suite completa: ver `ESTADO.md` (fila Pruebas).
