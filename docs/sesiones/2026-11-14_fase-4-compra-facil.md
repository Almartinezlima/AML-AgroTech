# Fase 4 — Compra fácil (14 nov 2026)

Rama `fase/4-compra-facil`, desde `master` con la fase 3 unida (PR #12). **Sin migración**: no se tocaron precios, zonas ni cálculos de envío.

## Por qué

Observación del docente: "Continuar compra" se confundía con seguir comprando. Se revisó todo el flujo catálogo → ficha → carrito → checkout → pago → éxito → mis pedidos para que cada botón diga adónde lleva.

## Qué se hizo

- **Botones y enlaces.**
  - Carrito: "Ir a pagar" (→ checkout) y "Seguir comprando" (→ catálogo), juntos en el resumen. Sin sesión: "Iniciar sesión para pagar" / "Crear cuenta para pagar".
  - Checkout: "Elegir cómo pagar", "Cambiar datos de entrega", "Confirmar pedido · Bs. X". Éxito: "Ya pagué: subir comprobante" o "Ver el estado de mi pedido".
  - Mis pedidos: "Ver detalle". Detalle: "Volver a mis pedidos", "Escribir a la tienda por WhatsApp", y en el modal de cancelar "Sí, cancelar pedido" / "No, volver" (prop `textoCancelar` en `ModalConfirmacion`).
  - Ficha: "Ver mi carrito" cuando el producto ya está en el carrito y "Ver todos en {categoría}". Menú del celular: "Mi carrito".
- **Pasos visibles** (`src/components/compra/PasosCompra.tsx`): Carrito → Datos y envío → Pago → Listo, en carrito, checkout y éxito. El checkout pasó de 3 a 2 pasos internos: "Resumen" se unió con "Pago" (el total del servidor se pide al pasar a Pago). Es un clic menos.
- **Mensajes simples.**
  - Sin internet ya no sale "Failed to fetch": ahora dice "No pudimos conectarnos…".
  - Si falta stock se nombra el producto y cuántas unidades quedan, y se ajusta el carrito. Si se cerró la sesión aparece un enlace para volver a entrar.
  - Un pedido inexistente muestra "No encontramos ese pedido" con "Ver mis pedidos". El error de cancelar explica por qué no se puede.
  - "Reintentar" pasó a "Volver a intentar". Se quitaron las promesas de avisos por WhatsApp (en recojo, comprobante en revisión y reembolso), porque esos avisos no existen.
- **Datos recordados.** `GET /api/pedidos/ultima-entrega` (en OpenAPI): solo pedidos del usuario de la sesión, columnas explícitas y la zona solo si sigue activa. El checkout rellena zona, dirección, teléfono y quién recoge sin pisar lo escrito, con el aviso "Usamos los datos de tu última compra. Puedes cambiarlos." Sin compras previas usa el teléfono y el nombre de la cuenta. No se agregó "nombre de quien recibe" (decisión de Aldo).
- **QR con el monto** (`src/components/pagos/QrPago.tsx`):
  - Opción C, la que se usa ahora: QR de demostración generado en el navegador con `qrcode` (pasó de devDependencies a dependencies, misma versión) con el código y el monto. Se muestran el monto grande, la referencia, los 3 pasos para pagar, "Guardar QR" y "Copiar monto". Aparece en Listo y en el detalle cuando falta pagar.
  - Opción A, preparada: con `NEXT_PUBLIC_QR_TIENDA_IMAGEN` (URL del QR real del negocio, nunca en el repo) se muestra ese QR y el cliente escribe el monto.
  - Se borró `public/pagos/qr-demo.png`, que ya no se usa.
- **Estados para el cliente** (`estadoCliente()` en `presentacion.ts`): una insignia (Falta pagar, Recibido, Revisando tu pago, Pago rechazado, Confirmado, Preparando, Listo para recoger, En camino, Entregado, Cancelado) con su línea de "qué sigue". Línea de tiempo: Pedido recibido y En camino. El panel admin no cambia.
- **Detalles de las capturas:** el círculo de los pasos hechos ahora es sólido (la línea se veía a través), el radio de la forma de pago es de 20 px y el aviso "Deshacer" del carrito ya no usa un hex suelto.

## Evidencia

- `npx tsc --noEmit`, `npm run lint` y `npm run build`: sin errores.
- `GET /api/pedidos/ultima-entrega` sin sesión → 401 `NO_AUTENTICADO`; con sesión lo usan las capturas y las E2E.
- Capturas a 1280, 412 y 360 px con `tests/capturas/compra-facil.spec.ts` (servidor de producción en el 3210, cliente fijo de prueba). Carrito, Datos y envío, Pago, Listo con QR, Mis pedidos y detalle: **18 capturas con 0 scroll horizontal**. El pedido de prueba que crean se anuló solo al terminar.
- **E2E: 31/31 en verde** (3,4 min). Se actualizaron `utilidades.ts` (`abrirCheckout` espera los datos recordados), `compra.spec.ts` (textos nuevos, vacía los datos recordados para probar los avisos, comprueba "Ir a pagar"/"Seguir comprando" y que la siguiente compra recuerda zona y quién recoge), `fase-6b.spec.ts` ("Iniciar sesión para pagar") y `pagos-distribucion.spec.ts` (Pedido recibido, En camino).
- **Base intacta** (consultas de solo lectura antes y después): huella del stock idéntica (total 3182), los 6 pedidos de la corrida (AML-000057 a 062) cancelados, 0 pedidos abiertos del cliente fijo, 0 cuentas de registro activas.
