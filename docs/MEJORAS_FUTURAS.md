# AML AgroTech — Mejoras futuras

Lo que queda para después de la feria. Ninguna de estas mejoras está programada hoy: el estado real está en [`ESTADO.md`](ESTADO.md). Cada una respeta las reglas del proyecto: seguridad en tres capas (middleware, API y base), escrituras solo por funciones SQL y planes gratuitos mientras se pueda.

| # | Mejora | Pilar | Para qué |
|---|---|---|---|
| 1 | Ubicación con mapa | Distribución | El repartidor llega sin preguntar |
| 2 | Modo tótem | E-commerce y Pagos | Comprar en la tienda sin celular |
| 3 | Verificación automática del QR | Pagos | El admin deja de revisar cada comprobante a mano |
| 4 | Acortar los pasos del admin y del repartidor | Distribución | Menos toques por pedido |
| 5 | Seguridad a fondo | Seguridad | Resistir abuso y fugas |
| 6 | Velocidad: Render y Supabase en la misma región | Despliegue | Respuestas más rápidas |

## 1. Ubicación con mapa

**Hoy:** el cliente escribe la dirección o la comunidad a mano. En el campo, muchas casas no tienen calle ni número, y el repartidor tiene que llamar para ubicarse.

**Mejora:**

- En el checkout, a domicilio, un botón «Marcar mi ubicación» que usa el GPS del celular (`navigator.geolocation`). El cliente ve el punto en un mapa y lo puede mover si no es exacto.
- La dirección escrita sigue siendo obligatoria (referencias como «casa de adobe junto a la escuela»); la ubicación es un dato más.
- El repartidor, ya con la entrega aceptada, ve «Abrir en Google Maps», un enlace `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` que abre la app de mapas con la ruta. No hace falta pagar la API de Google Maps.
- Para mostrar el mapa en el checkout, Leaflet con OpenStreetMap (gratis, sin tarjeta).

**Datos:** `pedidos.ubicacion_lat` y `pedidos.ubicacion_lng` (numeric, opcionales), guardados por `crear_pedido`, y devueltos por `GET /api/pedidos/ultima-entrega` para recordarlos en la próxima compra.

**Privacidad:** igual que el nombre y el teléfono, la ubicación **no** sale en «Entregas disponibles»: el repartidor la ve recién al aceptar (`detalle_entrega`). Nunca va en el mensaje del grupo de Telegram.

## 2. Modo tótem

**Para qué:** una pantalla en la tienda de Villa Charcas donde el agricultor que no tiene celular, o no quiere crear una cuenta, compra solo.

- **Pantalla táctil Android** en modo quiosco (una sola app fija, por ejemplo con el modo «Fijar pantalla» de Android o un lanzador de quiosco). Abre `/totem`: catálogo con botones grandes, carrito y pago, sin menú ni inicio de sesión.
- **Cuenta del tótem:** un rol nuevo `totem` que solo puede crear pedidos de «Recojo en tienda» y no ve pedidos de otros. La sesión no se cierra sola; al terminar cada compra, la pantalla vuelve al inicio y vacía el carrito.
- **Ticket de compra impreso:** impresora térmica de 58 u 80 mm conectada al Android (USB o Bluetooth). El ticket lleva el código del pedido, los productos, el total, la hora de Bolivia y el código de entrega en grande. Sale «sin valor fiscal», igual que el recibo PDF.
- **Pago con tarjeta de débito:** con un POS (lector de tarjetas) de un banco boliviano que ofrezca integración con Android o una API. El pedido queda pagado solo cuando el banco confirma; hasta tener ese POS, el tótem cobra con el mismo QR de la tienda.

**Ojo:** el POS y la impresora tienen costo (equipo y comisión por venta). Por la regla de «cero pagos», se decide con Aldo antes de comprar nada.

## 3. Verificación automática del QR con la API del banco

**Hoy:** el QR de la tienda es fijo y sin monto; el cliente sube la foto del comprobante y el admin la compara a mano con el monto esperado (`/admin/pagos`).

**Mejora:**

- Usar la API de cobros por QR del banco (BNB u otro que la ofrezca a comercios) para generar **un QR por pedido**, con el monto exacto y el código `AML-…` como referencia, y con vencimiento.
- El banco avisa del pago con un *webhook* a una ruta nueva (por ejemplo `POST /api/pagos/notificacion`) o la app consulta el estado cada pocos segundos. Al confirmarse, `verificar_pago` corre solo: el pedido pasa a `confirmado` y entra a «Por preparar» sin que nadie toque nada.
- La foto del comprobante queda como respaldo, para cuando el banco no responda.

**Seguridad:** la ruta del *webhook* verifica la firma del banco y no confía en el monto que llega: lo compara con `pedidos.total`. Las credenciales de la API del banco van en variables secretas de Render o en Vault, nunca en el repositorio. De paso se acaba el QR fijo que vence y hay que renovar a mano.

**Requisito:** contrato de comercio con el banco, que normalmente pide NIT y cuenta empresarial.

## 4. Acortar los pasos del admin y del repartidor

**Hoy**, un pedido a domicilio pide al admin: aprobar el pago → «Empezar a preparar» → marcar cada producto → «Listo para salir» con bultos → imprimir la etiqueta. Y al repartidor: «Estoy disponible» → «Aceptar» → «Recogí el pedido» → escribir el código y el nombre → «Entregar».

**Ideas para medir y probar con usuarios reales:**

- **Admin:**
  - «Aprobar y empezar a preparar» en un solo botón desde el visor del comprobante.
  - Botón «Marcar todo» cuando el pedido tiene pocos productos (sigue guardando quién y cuándo).
  - Bultos en 1 por defecto, para que «Listo para salir» sea un solo toque.
  - Imprimir la etiqueta en el mismo momento de «Listo para salir».
- **Repartidor:**
  - Aceptar directo desde el enlace del aviso de Telegram (abre la entrega y no la lista).
  - El nombre de quien recibe ya viene escrito (9G); que el teclado numérico salga solo para el código y que «Entregar» se active al cuarto dígito.
  - «Recogí el pedido» con el escaneo del QR de la etiqueta, en lugar de buscar el pedido.

Cada cambio se mide contando toques y segundos por pedido antes y después, en 412 px.

## 5. Seguridad a fondo

Hoy hay roles verificados en servidor, RLS, funciones `security definer`, validación con zod, encabezados de seguridad y secretos en Vault. Falta:

- **Límite de peticiones (*rate limiting*):** por IP y por cuenta en las rutas sensibles: inicio de sesión, registro, recuperar contraseña, `POST /api/pedidos`, subir comprobante, entregar con código (ya bloquea a los 5 intentos, pero por pedido) y aceptar entrega. Opciones gratuitas: una tabla de contadores en Postgres con ventana de tiempo, o el límite propio de Supabase Auth para los correos. Respuesta `429` con el formato `{ error }`.
- **Registro de actividad sospechosa:** una tabla `eventos_seguridad` (solo `insert`, solo la lee el admin) con inicios de sesión fallidos seguidos, códigos de entrega bloqueados, `403` repetidos, intentos de cambiar el rol, comprobantes rechazados en serie. Aviso por Telegram al admin cuando se pasa un umbral, y una pantalla en `/admin` para revisarlos.
- **Revisión de dependencias:** `npm audit` y Dependabot de GitHub (gratis) con un Pull Request por actualización. Pendiente conocido: subir de Next 14 a Next 16 para cerrar la vulnerabilidad crítica que `npm audit` marca en `next` (cambio mayor: rama propia y la suite E2E completa).
- **Secretos en el historial de Git:** pasar `gitleaks` (o el *secret scanning* de GitHub) sobre **todo** el historial, no solo el último commit. Si aparece una clave, se **rota** primero (Supabase, bot de Telegram) y después se limpia el historial; limpiar sin rotar no alcanza, porque el repositorio pudo copiarse.
- **Revisión de Supabase:** correr los avisos de seguridad y rendimiento del panel (*advisors*) después de cada migración, y activar en Auth el mínimo de 8 caracteres y las *Redirect URLs* exactas.

## 6. Velocidad: Render y Supabase en la misma región

**Hoy:** la base está en Supabase **sa-east-1 (São Paulo)**. Cada página o ruta de la API hace una o varias consultas desde Render hasta Supabase; si Render corre en otra región, cada consulta suma la distancia entre los dos centros de datos. Además, el plan gratis de Render duerme tras un rato sin uso (unos 45 s para despertar).

**Mejora:**

- Revisar en el panel de Render la región del servicio y ponerlo en la misma región que Supabase, o en la más cercana. Render no ofrece Sudamérica, así que la opción realista es mover los dos a la misma región de Estados Unidos (por ejemplo Render en Virginia y Supabase en `us-east-1`). Medir antes y después con el tiempo de `/api/salud` y de `/api/pedidos`.
- Mover Supabase de región significa un proyecto nuevo: correr las migraciones `0001` a `0022`, copiar los datos y los archivos de Storage, volver a cargar los secretos de Vault y el trabajo de `pg_cron`, y cambiar las variables de Render. Se hace en una fecha sin ventas y con respaldo.
- Mientras tanto, sin mover nada: juntar consultas en una sola función SQL (como ya hace `panel_repartidor`), cachear el catálogo (que cambia poco) y despertar el sitio unos minutos antes de usarlo.
