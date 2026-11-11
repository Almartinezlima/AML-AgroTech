# 9–10 nov 2026 — Auditoría completa (solo reporte)

Rama `fase/6-diseno` (commit `4ca210f`). **No se arregló nada**: este informe es la lista de trabajo.

## Cómo se hizo

- Compilación de producción aparte (`.next-e2e`, puerto 3210). No se usó el `npm run dev` de Aldo.
- Playwright: `playwright-cli` para explorar a mano y scripts de Playwright para los recorridos largos. En cada pantalla, captura en **1280 y 375 px** y mediciones automáticas: scroll horizontal, texto < 12 px, contraste WCAG AA, botones táctiles < 36 px, imágenes rotas o sin `alt` y errores de consola.
- **56 capturas medidas**: 0 con scroll horizontal, 0 imágenes rotas y 0 imágenes sin `alt`. También probé 320 y 768 px: sin scroll horizontal.
- **Capturas**: en `.auditoria/` dentro del proyecto. Están excluidas con `.git/info/exclude`, así que no se suben. Las rutas de abajo son relativas a `C:\aml-agrotech`.

### ⛔ Admin: NO se pudo recorrer

`.env.test.local` tiene `E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD` **vacíos**. Sin esa cuenta no se puede entrar al panel. No usé otras credenciales ni la service role.

El script del recorrido admin está listo:
- dashboard
- aprobar y rechazar pagos
- ciclo completo de un pedido con flota y guía
- envíos
- crear y editar un producto E2E con foto
- inventario: entrada, ajuste, kardex y CSV
- zonas y usuarios

Se corre en cuanto Aldo complete `.env.test.local`. Los puntos del admin que aparecen abajo salen de **leer el código y la base**, no de recorrerlo; están marcados con 🔎.

### Datos de prueba creados (todos E2E)

| Qué | Detalle |
|---|---|
| Cuentas | `e2e+aud1794282030622@amlagrotech.test` (visitante que se registró), `e2e+aud1794282248426@amlagrotech.test` (cliente) |
| Pedidos | `AML-000017` Recojo + contra entrega · `AML-000018` Villa Charcas pueblo + transferencia (comprobante subido) · `AML-000019` Culpina + QR (comprobante subido) · `AML-000020` Incahuasi + transferencia (**cancelado por el cliente**) · `AML-000021` Sucre terminal + QR. Todos con nota "E2E: auditoría" |
| Base | No se tocó ningún producto real; los escenarios "sin stock" y "API caída" se simularon en el navegador |

---

## Resumen por prioridad

| Prioridad | ❌ Errores | ⚠️ Flujo | 🎨 Visual | 💡 Mejoras |
|---|---|---|---|---|
| Alta | 5 | 3 | 0 | 3 |
| Media | 2 | 7 | 5 | 9 |
| Baja | 3 | 7 | 8 | 3 |

(Más 4 documentos desactualizados en la sección 5.)

**Lo primero que conviene arreglar (alta):**
1. El cliente puede cancelar un pedido que **ya pagó** (comprobante en revisión).
2. Un pedido cancelado con pago verificado queda "Pago verificado", sin reembolso.
3. La búsqueda no encuentra "valvula", "maiz" ni "fertilizante".
4. Las zonas nuevas no tienen migración.
5. El campo del comprobante sale en inglés ("Choose File").
6. El visitante no puede ver su carrito sin cuenta.
7. El checkout no muestra el total hasta el paso 3.

---

## 1. Visitante

### Portada `/`
Capturas: `.auditoria/1-visitante/01-portada-1280.png` · `01-portada-375.png`

| Tipo | Prioridad | Hallazgo | Cómo reproducir |
|---|---|---|---|
| 🎨 | Media | En celular, los 4 destacados van apilados a lo ancho (≈ 600 px cada uno): la portada mide **8.300 px** a 375 px | Abrir `/` a 375 px y bajar |
| 🎨 | Media | Hueco vacío grande entre "Categorías" y "Productos destacados" (las dos secciones suman ≈ 200 px de relleno) | `/` a 375 px, debajo de la tarjeta "Cañerías" |
| 🎨 | Media | En la tarjeta "Cañerías", la foto es gris y "Ver productos" en gris (`#94a3b8`) casi no se distingue | `/`, sección Categorías |
| 🎨 | Baja | El ejemplo del buscador se corta en celular: "Busca urea, semilla de papa, aspersoı" | `/` a 375 px |
| 🎨 | Baja | El crédito de la foto ("Foto: Aldo Martínez Lima · Villa Charcas") está en 11 px | Abajo a la derecha del hero |
| 🎨 | Baja | Los números grandes "1 2 3" de "Cómo comprar" quedan cortados en el borde superior derecho de cada tarjeta | `/`, "Cómo comprar" |
| 🎨 | Baja | Zonas: "Villa Charcas (entrega en el pueblo)" ocupa 3 líneas y las 5 tarjetas quedan de alturas distintas | `/` a 1280 px |
| ⚠️ | Baja | La zona "Villa Charcas (entrega en el pueblo)" aparece con la etiqueta **"Urbano"**, y "Sucre (recojo en la terminal)" con **"Provincia"**. Para alguien de acá, Sucre no es "provincia" | `/`, Zonas de envío |
| 💡 | Media | Mostrar una prueba de confianza local: dirección o mapa de la tienda en Villa Charcas, horario y botón de WhatsApp en el hero | — |

### Catálogo `/catalogo`
Capturas: `02-catalogo-busqueda-papa-*.png` · `03-catalogo-sin-resultados-*.png` · `04-catalogo-*.png` · `05-catalogo-filtro-canerias-375.png`

| Tipo | Prioridad | Hallazgo | Cómo reproducir |
|---|---|---|---|
| ❌ | **Alta** | **La búsqueda no ignora tildes**: "valvula" → 0 resultados ("Válvula" → 1); "maiz" → 0 | `/catalogo?q=valvula` · `/catalogo?q=maiz` |
| ❌ | **Alta** | **Solo busca en el nombre**: "fertilizante" y "abono" → 0, aunque hay 4 fertilizantes con esa palabra en la descripción | `/catalogo?q=fertilizante` |
| ⚠️ | Media | Al recargar se pierden el filtro de categoría y el orden; tampoco se pueden compartir por enlace (la URL solo guarda `?q=` de entrada) | Elegir "Riego" → F5 → vuelve a "Todos" |
| ⚠️ | Baja | Al escribir en el buscador la URL no cambia: "Atrás" no vuelve a la búsqueda anterior | Buscar, entrar a una ficha, Atrás |
| 🎨 | Baja | El nombre del producto es un enlace de 22 px de alto en celular (el mínimo cómodo es 44 px). Se compensa porque la foto también abre la ficha | Mediciones a 375 px |
| 💡 | Media | Filtros por precio y "solo con stock"; chips con el conteo por categoría ("Riego · 4") | — |
| ✅ | — | Filtros correctos: Semillas 7, Riego 4, Agroquímicos 11, Herramientas 7, Cañerías 4. Orden por precio correcto. Estado vacío correcto | — |

### Ficha `/producto/[id]`
Capturas: `06-ficha-jacto-1280.png` · `06-ficha-jacto-375.png` · `07-ficha-inexistente-375.png`

| Tipo | Prioridad | Hallazgo | Cómo reproducir |
|---|---|---|---|
| ⚠️ | Media | La ficha no tiene productos relacionados ni "otros de la categoría": termina en seco | Cualquier ficha |
| ⚠️ | Baja | Ficha con id inválido: "No se pudo cargar · El identificador no es válido · **Reintentar**". Reintentar no sirve de nada; correspondería "Producto no encontrado" y "Ver catálogo" | `/producto/abc` |
| 💡 | Media | Galería con más de una foto y una tabla de datos (dosis, presentación, cultivo) para los agroquímicos | — |
| ✅ | — | El selector de cantidad respeta el stock (con stock 3, llega hasta 3) | — |

### Comprar sin cuenta y registro
Capturas: `08-carrito-sin-cuenta-login-*.png` · `09-registro-*.png` · `10-catalogo-recien-registrado-375.png` · `11-login-*.png` · `12-recuperar-*.png`

| Tipo | Prioridad | Hallazgo | Cómo reproducir |
|---|---|---|---|
| ⚠️ | **Alta** | **El visitante no puede ver su carrito**: puede agregar productos, pero el ícono del carrito lo manda al login. No sabe qué tiene ni cuánto suma antes de crear la cuenta | Sin sesión: agregar 4 unidades → clic en el carrito → `/auth/login?siguiente=/carrito` |
| ⚠️ | Media | Del login a "Regístrate gratis" **se pierde `?siguiente=/carrito`**: después de registrarse cae en `/catalogo` en vez de volver al carrito (el carrito sí se conserva, con 4 unidades) | Paso anterior → "Regístrate gratis" → registrarse |
| ❌ | Baja | El teléfono del registro acepta letras ("abc"); el checkout después lo rechaza | `/auth/registro`, Teléfono "abc" |
| ⚠️ | Baja | Los mensajes de los campos obligatorios son los del navegador (en un Chrome en inglés salen en inglés: "Please fill out this field") | Registro vacío |
| ✅ | — | Contraseña corta, correo inválido y registro correcto funcionan. El carrito de invitado se suma a la cuenta nueva | — |

### Otras
Capturas: `13-api-docs-*.png` · `14-404-*.png`

| Tipo | Prioridad | Hallazgo |
|---|---|---|
| 🎨 | Media | `/api-docs` (Swagger) tiene **contraste bajo** sobre el fondo oscuro: "GET" 2,3:1 · "Authorize" 2,0:1 · "OAS 3.0" 2,2:1 (mínimo AA: 4,5:1) |
| 🎨 | Baja | La página 404 es la de Next.js por defecto (sin marca ni "Volver al catálogo") |
| ❌ | Baja | Una vez apareció un **400** en la consola al llegar al login desde el carrito. Probé de nuevo con `playwright-cli` y **no se reprodujo** |

---

## 2. Cliente

### Carrito `/carrito`
Capturas: `.auditoria/2-cliente/01-carrito-1280.png` · `01-carrito-375.png` · `02-carrito-cantidad-enorme-375.png`

| Tipo | Prioridad | Hallazgo | Cómo reproducir |
|---|---|---|---|
| ⚠️ | Media | "Quitar" borra el producto al instante, **sin confirmar ni deshacer** | Carrito → "Quitar" |
| 🎨 | Media | Los botones − y + miden **32×32 px** en celular, chicos para dedos con guante o de trabajo; "Quitar" es solo texto chico | Carrito a 375 px |
| 🎨 | Baja | El carrito conserva el estilo anterior (colores sueltos, sin color de categoría): se nota distinto al catálogo nuevo | Comparar con `/catalogo` |
| 💡 | Media | Mostrar en el carrito el costo de envío estimado por zona ("Desde Bs. 0 recojo · Bs. 10 Culpina") | — |
| ✅ | — | Sumar, restar, quitar y recargar funcionan; el carrito sobrevive a la recarga | — |

### Checkout `/checkout`
Capturas: `04-checkout-paso1-*.png` · `05-checkout-error-telefono-375.png` · `06-checkout-paso2-pago-*.png` · `07-checkout-paso3-resumen-*.png` · `03-checkout-stock-insuficiente-375.png`

| Tipo | Prioridad | Hallazgo | Cómo reproducir |
|---|---|---|---|
| ⚠️ | **Alta** | **No se ve el total ni los productos hasta el paso 3**: en escritorio sobra ancho para un resumen lateral fijo | `/checkout` a 1280 px |
| ⚠️ | Media | "Sucre (recojo en la terminal de buses)" pide "Dirección o referencia para la encomienda". Al recoger en la terminal no hay dirección: falta pedir **nombre y CI de quien recoge** | Checkout → Sucre |
| ⚠️ | Baja | Los pasos "1. Entrega · 2. Pago" no son clicables para volver | Paso 3 |
| ❌ | Baja | Si el carrito tiene más cantidad que el máximo (solo manipulando el navegador), el aviso dice "La cantidad es demasiado grande" pero **no ajusta el carrito** (con falta de stock sí lo ajusta) | Cambiar `cantidad` en localStorage → checkout |
| ✅ | — | Sin zona, sin dirección y teléfono inválido dan mensajes claros. Contra entrega solo en Recojo y Villa Charcas pueblo; Culpina, Incahuasi y Sucre ofrecen QR y transferencia. Los totales son correctos (subtotal + envío) | — |
| ✅ | — | **Doble clic en "Confirmar pedido" crea un solo pedido** (AML-000019) | — |
| ✅ | — | La API rechaza con 422: cantidad negativa, 0, 10⁹, precio inyectado, contra entrega en provincia y carrito vacío | — |

### Éxito, Mis pedidos y detalle
Capturas: `08-exito-contra-entrega-*.png` · `09-exito-qr-*.png` · `10-atras-tras-exito-375.png` · `11-mis-pedidos-*.png` · `12-detalle-pedido-qr-*.png` · `13-detalle-pedido-en-revision-*.png` · `14-cancelar-modal-375.png` · `15-detalle-cancelado-*.png`

| Tipo | Prioridad | Hallazgo | Cómo reproducir |
|---|---|---|---|
| ❌ | **Alta** | **El cliente puede cancelar un pedido ya pagado**: con el comprobante "En revisión", el botón "Cancelar pedido" sigue disponible y la base lo permite (`cancelar_pedido` solo mira `estado = 'pendiente'`). Pagó y cancela, y el pago queda en el aire | AML-000019: subir comprobante → "Cancelar pedido" sigue visible |
| ❌ | **Alta** 🔎 | **Cancelar no toca el pago**: si el admin cancela un pedido "confirmado" con pago verificado, queda "Cancelado" + "Pago verificado", sin estado de reembolso ni aviso (`cancelar_pedido` no actualiza `pagos`) | Leído en `0003_modelo_comercio.sql` |
| ⚠️ | **Alta** | El comprobante se sube con el **control nativo del navegador**: "Choose File / No file chosen", en inglés y sin estilo. Es el paso clave del pago con QR | Detalle de un pedido QR o transferencia |
| 💡 | Media | En celular, un botón "Tomar foto del comprobante" (`capture`) y vista previa antes de enviar | — |
| ⚠️ | Baja | "Mis pedidos" no muestra qué se compró (ni la foto ni la cantidad de productos), solo el código y la zona | `/pedidos` |
| 🎨 | Baja | "Enviar comprobante" deshabilitado se ve casi igual al habilitado (contraste 3,8:1) | Detalle sin archivo elegido |
| ✅ | — | Comprobante falso (texto con nombre `.png`): "El tipo de archivo no está permitido". Más de 3 MB: rechazado. Cancelar con el modal propio repone el stock | — |
| ✅ | — | "Atrás" desde el éxito vuelve al catálogo, no duplica el pedido | — |

### Mi cuenta, otra pestaña y salir
Capturas: `16-mi-cuenta-*.png` · `17-menu-celular-375.png`

| Tipo | Prioridad | Hallazgo | Cómo reproducir |
|---|---|---|---|
| ❌ | Media | **El carrito no se sincroniza entre pestañas**: en la pestaña B se agrega un producto y la A sigue mostrando 0. Si después se toca el carrito en A, **pisa** lo agregado en B | Dos pestañas, agregar en una, mirar la otra |
| ⚠️ | Baja | Mi cuenta con nombre vacío: solo el aviso nativo del navegador | `/cuenta` |
| ✅ | — | Cerrar sesión en otra pestaña: la primera manda al login al navegar. Tras "Salir", "Atrás" no muestra datos del cliente | — |

---

## 3. Admin (🔎 leído en el código y la base; recorrido bloqueado)

| Tipo | Prioridad | Hallazgo | Dónde |
|---|---|---|---|
| ❌ | **Alta** | **Las zonas nuevas (Villa Charcas, Culpina, Incahuasi, Sucre terminal) se cambiaron en la base sin migración**. No hay `0005`: si se recrea la base desde `supabase/migrations/`, vuelven las zonas viejas (Sucre urbano, Bs. 35). Va contra la regla de CLAUDE.md | `select … from zonas_envio` vs `0003_modelo_comercio.sql` |
| ⚠️ | Media | Un pedido de **Recojo en tienda** debe pasar por "Despachado / En camino" antes de "Entregado": no tiene sentido para algo que se retira en mostrador (`SIGUIENTE` en `presentacion.ts` y `cambiar_estado_pedido`) | `/admin/pedidos` |
| ⚠️ | Media | Dashboard, Pedidos, Pagos y Usuarios mezclan los **datos E2E** (decenas de cuentas `e2e+…` y pedidos de prueba) con los reales. Para la feria conviene ocultarlos (quedó pendiente de la 2B) | `/admin` |
| 💡 | Alta | Avisos en el panel: "3 pagos por revisar" en la barra del admin y un sonido o insignia cuando entra un pedido nuevo | — |
| 💡 | Media | Imprimir la guía de despacho y la etiqueta del bulto (nombre, CI, zona y guía) para la flota | — |

### 3B. Recorrido real del admin (10 nov 2026, después de las migraciones 0005, 0006 y 0007)

Con la cuenta admin de `.env.test.local`, contra el build de producción (`.next-e2e`, puerto 3210), nunca contra `npm run dev`. Los hallazgos de zonas y de recojo de arriba ya quedaron resueltos en la fase 6B.

**Pruebas automáticas:** `npm run test:e2e:prod` → **29 pasaron · 0 fallaron · 0 omitidas** (incluidas las 4 del admin).

**Recorrido completo (todo ✅ en la corrida final):**

| Área | Qué se probó | Resultado |
|---|---|---|
| Pagos | Aprobar (QR y transferencia) → pedido confirmado; rechazar sin motivo → "Indica el motivo del rechazo."; rechazar con motivo → el cliente lo ve en su pedido | ✅ |
| Pedidos (flota) | Confirmado → preparando → despachado → entregado; despachar sin empresa ni guía → "Para despachar por flota indica la empresa de flota y el número de guía."; la lista muestra quién recoge (nombre y CI) | ✅ |
| Pedidos (recojo) | En preparación ofrece "Pasar a Listo para recoger" (sin "Despachado"); al entregar: pago "verificado", envío "entregado" | ✅ |
| Reembolso | El admin cancela un pedido con pago verificado → "reembolso pendiente"; aparece en el dashboard; "Marcar como reembolsado" → "reembolsado"; el cliente ve "La tienda ya te devolvió…" | ✅ |
| Seguridad | Un cliente intenta cancelar por la API un pedido pagado → **409** | ✅ |
| Envíos | La pestaña "Para recoger en tienda" muestra el pedido de recojo | ✅ |
| Productos | Crear con foto subida, editar el precio, guardar un producto real sin cambios, desactivar (sin borrar) | ✅ |
| Inventario | Entrada +10, ajuste −3, ajuste −500 → "El stock no puede quedar negativo. Disponible: 7."; kardex; CSV → 200 `text/csv` | ✅ |
| Zonas | Días mínimos 5 > máximos 1 → "Los días máximos no pueden ser menores a los mínimos." | ✅ |
| Usuarios | Desactivar y reactivar una cuenta E2E; el botón para desactivar la propia cuenta admin está deshabilitado | ✅ |

**Errores reales de la app encontrados y corregidos (no se tocaron las pruebas):**

| Error | Causa | Arreglo |
|---|---|---|
| En `/admin/pagos`, al cambiar el filtro a "Reembolso pendiente" seguía la lista de "En revisión" | Carrera en `useDatosApi`: la respuesta vieja llegaba después de la nueva y la pisaba | Cada carga lleva un número y se descartan las respuestas viejas (`src/lib/api/useDatosApi.ts`) |
| El selector de categoría del modal de producto, el inventario y las alertas del panel mostraban los emojis guardados en la base | Se pintaba `icono` + `nombre` | Solo el nombre (regla: sin emojis en la interfaz) |
| Los gráficos del dashboard quedaban vacíos un momento al girar el celular o cambiar el tamaño de la ventana | recharts repite la animación de las barras en cada cambio de tamaño | Gráficos sin animación (`Graficos.tsx`) |

**Detalles menores (no corregidos, para la fase siguiente):**
- `/admin/pedidos` lista todos los pedidos sin paginar (a 1280 px la página ya mide unos 8.800 px con 49 pedidos). Conviene paginar o cargar de a 20.
- Los códigos de pedido (`AML-000049`) como enlace miden 19 px de alto a 375 px: área táctil chica.
- El botón "Desactivar" deshabilitado tiene contraste 2,07:1 (WCAG lo exime por estar deshabilitado).
- Siguen mezclados los datos E2E con los reales (ver arriba).

**Capturas** (excluidas de git):
- Las 8 pantallas del admin en tema claro, 1280 y 375 px: `.auditoria/admin-capturas/` (`01-dashboard`, `02-pagos`, `03-pedidos`, `04-envios`, `05-productos`, `06-inventario`, `07-zonas`, `08-usuarios`).
- El recorrido paso a paso (reembolso pendiente, kardex): `.auditoria/9-admin-recorrido/`.

**Datos E2E creados:** pedidos AML-000034 a AML-000049, cuentas "Cliente admin E2E" (`e2e+aud…@amlagrotech.test`) y productos `E2E-ADM-62618` y `E2E-ADM-99368`, desactivados (no se borran).

---

## 4. Escenarios raros (simulados en el navegador)

Capturas: `.auditoria/4-raros/01-catalogo-producto-agotado-375.png` · `02-catalogo-stock-bajo-375.png` · `04-catalogo-api-caida-375.png` · `05-catalogo-cargando-375.png` · `06-portada-cargando-375.png`

| Tipo | Prioridad | Hallazgo |
|---|---|---|
| ❌ | Media | **Con la API caída**, el catálogo dice "**0 productos con precios en bolivianos**" justo encima de "No se pudo cargar": los dos mensajes se contradicen |
| 💡 | Baja | Producto agotado: insignia "Agotado" y botón "Sin stock" correctos, pero sin "Avísame cuando haya" ni productos parecidos |
| ✅ | — | Producto agotado: sale de los destacados de la portada y entra otro. Skeletons con brillo durante la carga. Error con "Reintentar". Sin scroll horizontal en 320, 375, 768 y 1280 px |

---

## 5. Documentos desactualizados (la tienda pasó a Villa Charcas)

| Prioridad | Dónde | Qué dice |
|---|---|---|
| Media | `docs/specs/00-vision.md` (zonas) | "Recojo en tienda (Sucre)", "Sucre urbano" |
| Media | `docs/specs/03-pagos.md` | "Recojo en tienda y Sucre urbano: sí" (contra entrega) |
| Baja | `docs/DISENO.md` | Bloque de envío de la ficha: "Llega a Sucre en 1 día, provincias 2–4 días"; "agricultores de Sucre y las provincias" |
| Baja | `src/app/layout.tsx` (descripción para Google) | "envío a Sucre, Villa Charcas, Culpina e Incahuasi": correcto, pero no dice que la tienda está en Villa Charcas |

---

## 6. 💡 Para estar en el top 3 de la feria

| Prioridad | Idea | Por qué |
|---|---|---|
| **Alta** | **Recorrido de demo de 3 minutos** con cuentas demo fijas (cliente y admin) y datos limpios (sin `e2e+`) | El jurado ve el sistema funcionando de punta a punta, sin basura de pruebas |
| **Alta** | **Seguimiento público por código**: `/seguimiento/AML-000019` sin iniciar sesión (código + teléfono) | Es lo que más usa un agricultor de provincia y se muestra en vivo |
| Media | Mapa de zonas de envío (Villa Charcas → Culpina, Incahuasi, Sucre) con costo y tiempo | Visual, local y fácil de explicar |
| Media | Instalar como app (PWA: ícono en el celular, funciona con poca señal) | En el campo la conexión es mala; impresiona en la demo |
| Media | Panel con un gráfico de "ventas por zona" y un mapa de calor del stock | Muestra los 5 pilares juntos en una pantalla |
| Baja | Modo claro opcional para leer al sol en el celular | El tema oscuro cuesta afuera |
| Baja | Precio por kilo o por litro calculado en la tarjeta ("Bs. 4,80/kg") para comparar presentaciones | Ayuda a decidir |

---

## 7. Lo que funciona bien (para la defensa)

- Seguridad de la API: valida cantidades, ignora precios enviados por el navegador, contra entrega solo donde corresponde, comprobantes validados por contenido (no por extensión).
- Sin doble pedido con doble clic. Stock respetado en ficha y carrito.
- Estados de carga, vacío y error en catálogo y portada. Sin scroll horizontal en ningún ancho probado.
- Las 33 fotos cargan, todas con texto alternativo.

## 8. Pendiente para completar la auditoría

~~1. Aldo completa `E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD` en `.env.test.local`.~~
~~2. Se corre el recorrido del admin y se agrega la sección 3 con capturas.~~ Hecho el 10 nov 2026: ver **3B**.
