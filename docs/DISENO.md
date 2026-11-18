# AML AgroTech — Brief de diseño

Sexto documento de la especificación. Manda sobre cualquier decisión visual; si el código se aparta de esto, se corrige el código o se actualiza este documento con el OK de Aldo.

## 1. Para quién y qué tiene que transmitir

- **Quién compra:** agricultores y distribuidores de Villa Charcas, Culpina, Incahuasi y Sucre (Chuquisaca). La tienda está en Villa Charcas. Muchos entran desde el celular, con datos móviles y pantallas de 360 px.
- **Qué tiene que sentir:** una tienda **seria, local y confiable**, no una plantilla. "Esto lo atiende gente de acá y me llega al pueblo".
- **Trabajo principal de cada pantalla:** encontrar el insumo, saber el precio en Bs. y cuánto cuesta llevarlo, pagar sin miedo.

Principios:
1. **Claro antes que lindo.** Precio, unidad y disponibilidad siempre visibles. Español simple.
2. **Lo agrícola es el carácter.** La identidad sale del campo: fotos reales de productos, de cultivos y del valle andino, con color por categoría.
3. **Nada roto, nada vacío sin explicación.** Toda pantalla tiene carga (skeleton), vacío y error.
4. **Movimiento con motivo.** Solo responde a lo que hace la persona, más una entrada orquestada en la portada.

## 2. Color (tema claro, fase 6B)

Fondo crema, tarjetas blancas con sombra suave, verde de la marca, dorado trigo para detalles y textos oscuros. **Una sola fuente (fase 3):** los valores viven en `src/app/globals.css` (`:root`, como canales RGB `--color-*`) y `tailwind.config.ts` los expone como clases (`bg-fondo`, `text-acento`, `bg-acento/10`…). En el código no van hex sueltos ni rojos/ámbar de Tailwind (`red-700`, `amber-800`): se usan los tokens.

| Token | Valor | Uso | Contraste |
|---|---|---|---|
| `fondo` | `#f6f4ee` | Fondo de página (crema) | — |
| `tarjeta` | `#ffffff` | Tarjetas, menú, footer | — |
| `tarjeta-hover` | `#eef3ea` | Hover, campos de texto, avisos suaves | — |
| `borde` | `#dfe5d8` | Bordes y divisores | — |
| `borde-fuerte` | `#b9c7b2` | Borde de un campo al pasar el mouse | — |
| `acento` | `#15753a` | Botones, precios, enlaces, foco | 5,3:1 sobre crema; blanco encima 5,8:1 |
| `acento-hover` | `#166534` | Hover de la acción principal | — |
| `texto` | `#17251b` | Texto principal | 15:1 |
| `texto-2` | `#4a5a4e` | Texto secundario, etiquetas | 7:1 |
| `texto-3` | `#6b7a6f` | Solo placeholder | — |
| `trigo` | `#836219` | Detalles con texto (zonas por flota, "Paso 1") | 5,1:1 |
| `trigo-suave` | `#d4b26a` | Solo decorativo (números grandes, rellenos) | — |

Estados (nunca solo color: siempre con texto): pendiente `#f59e0b` · verificado/entregado `#22c55e` · en camino `#3b82f6` · cancelado/rechazado `#ef4444`. El punto de la insignia usa ese color; **el texto usa su tono oscuro** (`#92400e`, `#166534`, `#1d4ed8`, `#b91c1c`) para pasar AA sobre blanco. El trigo **no es un estado**.

Tokens de estado (fase 3): `estado-pendiente` / `estado-pendiente-texto`, `estado-ok` / `estado-ok-texto`, `estado-camino` / `estado-camino-texto`, `estado-error` / `estado-error-texto`. El color base va en el punto, el fondo (`/10`) y el borde (`/40`); el `-texto` en las letras. `Insignia.tsx` traduce el color de `presentacion.ts` al tono.

Sobre fotos el texto es blanco. En la portada se lee solo con sombra doble en las letras (sin velo ni cajas); en las tarjetas de categorías sigue con velo oscuro debajo.

## 3. Tipografía

| Rol | Familia | Pesos | Clase |
|---|---|---|---|
| Títulos, cifras grandes, marca | **Bricolage Grotesque** | 600, 700, 800 | `font-titulo` |
| Texto, botones, formularios | **Figtree** | 400, 500, 600, 700 | `font-sans` (por defecto) |

- Cargadas con `next/font/google`: se sirven desde nuestro propio dominio, sin pedidos a Google en el navegador.
- **Escala** (móvil → escritorio): hero `text-4xl → text-7xl` · título de página `text-3xl → text-4xl` · sección `text-3xl → text-4xl` · tarjeta `text-base` (16 px) semibold · cuerpo 16 px · ayuda `text-sm` · lo más chico `text-xs`. Menú en 16 px.
- **Letra chica (fase 3), más grande en celular.** `text-xs` (insignias, pie de tarjeta, SKU, fechas): **15 px en celular / 14 px desde 640 px**. `text-sm` (etiquetas, ayudas, precios secundarios, datos de tablas): **16 px en celular / 15 px desde 640 px**. Se define con las variables `--letra-xs` y `--letra-sm` de `globals.css`; de `text-base` para arriba (títulos) no cambia nada. Ningún texto de contenido baja de 14 px.
- Títulos con `tracking-tight` y `text-balance`; párrafos con `max-w-prose` (menos de 80 caracteres por línea).
- **Precios y cantidades** con `tabular-nums` para que las cifras no bailen.
- Sin MAYÚSCULAS sostenidas en etiquetas, sin acentuar una sola palabra del título con otro color.

## 4. Espaciado, grilla y forma

- Base de 4 px (escala de Tailwind). Secciones de portada `py-16 md:py-24`; páginas `py-8`; tarjetas `p-4 sm:p-5`.
- Contenedor `max-w-7xl` (portada, catálogo), `max-w-5xl` (ficha, admin), `max-w-2xl` (checkout).
- **Radios por jerarquía:** botones y campos `rounded-xl`, tarjetas `rounded-2xl`, insignias y filtros `rounded-full`, hero y bloques grandes `rounded-3xl`.
- **Sombras (fase 3), solo tres:** `shadow-tarjeta` (toda tarjeta en reposo, muy suave), `shadow-tarjeta-hover` (al pasar el mouse o bloques destacados) y `shadow-flotante` (modales).
- **Separaciones:** listas `gap-3`, grillas `gap-3 sm:gap-4`, entre secciones `mb-6`; páginas con `clasePagina` (`px-4 sm:px-6`, `py-8 sm:py-10`).
- Márgenes laterales de 16 px en celular. **Nunca scroll horizontal** en 360, 412 ni 1280 px.
- **Tablas anchas:** debajo de `md` (768 px) no hay `<table>`: tarjetas apiladas. Desde `md`, filas en columnas o tabla dentro de su propio `overflow-x-auto`. Filas de filtros y el menú del panel se desplazan dentro de su fila en celular, nunca la página. `html, body { overflow-x: clip }` es solo red de seguridad: igual se mide cada página.

## 5. Fotos y color por categoría

La tienda se ve **con fotos reales**, no con ilustraciones ni íconos.

| Categoría | Color | Uso del color |
|---|---|---|
| Semillas | `#4ade80` verde | Etiqueta, franja inferior de la foto, borde al pasar |
| Riego | `#38bdf8` azul | ídem |
| Agroquímicos | `#fb923c` naranja | ídem (distinto del ámbar `#f59e0b` de "pendiente") |
| Herramientas | `#c8956a` tierra | ídem |
| Cañerías | `#94a3b8` gris azulado | ídem |

- Mapa central: **`src/lib/categorias.ts`** (foto, descripción, color y clases de la etiqueta). Componente `EtiquetaCategoria`.
- El color de categoría **nunca** reemplaza a los colores de estado (pendiente, entregado…).

## 6. Imágenes

- **Productos**: foto real cuadrada 800×800 WebP en `public/productos/<sku>.webp` (migración `0004` pone `imagen_url`). Fotos de envase sobre fondo blanco centradas sin cortar; fotos de ambiente con recorte centrado.
- **Tarjeta**: foto de borde a borde (`aspect-square`, `object-cover`), franja inferior con el color de la categoría, zoom suave al pasar y la tarjeta se levanta con sombra.
- **Producto nuevo sin foto**: se muestra la foto de su categoría. Nunca una imagen rota ni un ícono.
- **Categorías**: una foto por categoría en `public/categorias/`.
- **Portada**: foto propia de un campo de papa en Villa Charcas (Aldo Martínez Lima), en `public/portada/villa-charcas.webp`, con `next/image` (`priority`, `placeholder="blur"`) sin capas, velos ni filtros encima: la foto va original. El texto (etiqueta, título, subtítulo y ventajas) lleva sombra doble en las letras, `0 1px 2px` al 60 % y `0 2px 14px` al 45 %, y la imagen usa `object-[90%_50%]` para que en celular el título caiga sobre nubes oscuras (contraste medio del fondo 3,5:1 en vez de 2,3:1). Crédito en el hero y en el footer.
- **Créditos**: fuente, autor y licencia de cada foto en `docs/CREDITOS_IMAGENES.md`. Las de tienda son de uso referencial académico: reemplazarlas antes de comercializar.
- **Íconos**: Lucide (`react-icons/lu`, ISC) solo para la interfaz, `aria-hidden` si son decorativos. Sin emojis.

## 7. Componentes

| Componente | Reglas |
|---|---|
| Clases comunes | `src/components/ui/estilos.ts`: `claseBoton(variante, tamaño)` (primario, secundario, peligro, peligro-lleno, suave · normal o chico, los dos de 44 px), `claseBotonCantidad`, `claseInput`, `claseEtiqueta`, `claseFiltro`, `claseFilaFiltros`, `claseTarjeta`, `clasePagina`, `claseTituloPagina`, `claseTituloAdmin`, `claseEnlace`. Nada de `!px-3 !py-2` sueltos |
| Botón primario | Fondo `acento`, texto blanco, `font-bold`, `rounded-xl`, alto mínimo 44 px. Uno por pantalla/paso |
| Botón secundario | Borde `borde` → `acento` al pasar |
| Botón peligro | Borde rojo; la acción real va en un modal de confirmación propio |
| Campo | Fondo `tarjeta-hover`, etiqueta visible arriba (nunca solo placeholder), placeholder más tenue que la etiqueta |
| Tarjeta de producto | Foto cuadrada de borde a borde, etiqueta de categoría con color, nombre (2 líneas máx.), precio grande + unidad, disponibilidad con texto, botón ancho |
| Insignia de estado | Punto del color del estado + texto en su tono oscuro, `rounded-full`, fondo del color al 10 %. También para activo/inactivo (`INSIGNIA_ACTIVO`, `INSIGNIA_INACTIVO`). Para el cliente (fase 4) una sola insignia con `estadoCliente()` de `presentacion.ts` y su línea de "qué sigue"; el panel admin conserva los nombres de la base |
| Pasos de la compra | `PasosCompra` (fase 4, 9E): Carrito → Datos y pago → Pagar → Listo, círculo numerado y nombre debajo; los hechos llevan ✓ y el carrito se toca para volver mientras no se confirmó. En carrito, checkout y pantalla del pago |
| Modales y visores | `Modal` y `ModalConfirmacion` (fase 9E): se cierran con la X, Esc (solo el de encima), clic afuera y Atrás del celular (`useCerrarModal`). Nunca más anchos que la pantalla (`max-h-[90dvh]`, sin scroll horizontal). Visor del comprobante a pantalla completa con el monto esperado al lado |
| QR de pago | `QrPago`: el QR de cobro real de la tienda (BNB, sin monto; `public/qr-bnb.jpg` desde la 8A, o `NEXT_PUBLIC_QR_TIENDA_IMAGEN` si Render la define), con el monto grande, el código como referencia, "Guardar QR" y "Copiar monto". El cliente escribe el monto al pagar |
| Filtro (chip) | `claseFiltro`: `rounded-full`, 44 px, activo en `acento`; con la cantidad al lado cuando sirve ("Bajo 3") |
| Encabezado del panel | `EncabezadoAdmin`: título, una línea de para qué sirve la pantalla y acciones a la derecha (filtros, "Nuevo") |
| Cifras del panel | `TarjetasResumen` / `Cifra`: título, ícono en recuadro con tono (acento, pendiente, error, camino), cifra en `font-titulo` con `tabular-nums`. 2 columnas en celular (los montos en Bs. ocupan las 2) y hasta 4 en escritorio. Pueden funcionar como filtro (envíos) |
| Tarjeta de pedido o pago (panel) | Tres partes: código + cliente + insignias · datos en lista `Dato: valor` · pie con el monto y las acciones (`claseBoton(..., 'chico')`) |
| Modal | `role="dialog"`, cierra con Esc, foco inicial en "Cancelar" |
| Skeleton | Bloques con la forma del contenido final y brillo suave (`animate-pulse`) |
| Vacío | Ícono Lucide en un recuadro, frase clara y una acción ("Ver catálogo") |
| Error | Borde rojo, qué pasó y botón "Reintentar" |

## 8. Movimiento y accesibilidad

- Transiciones de 150–200 ms en hover/foco. Entrada escalonada **solo en el hero** de la portada.
- Confirmaciones visibles al agregar al carrito (el botón cambia a "Agregado" con ícono).
- Todo respeta `prefers-reduced-motion: reduce` (se desactiva la animación).
- **Foco visible** en todo elemento interactivo: anillo de 2 px `acento` con separación.
- Texto alternativo en toda imagen con contenido; ilustraciones decorativas con `aria-hidden`.
- Áreas táctiles de 44 px mínimo en celular.

## 9. Cómo se ve cada pantalla

| Pantalla | Estructura |
|---|---|
| **Portada** | Hero a pantalla ancha con la foto de Villa Charcas, título, buscador y "Ver catálogo" · categorías con foto y color · productos destacados reales (carrusel horizontal en celular) · "Cómo comprar" en 3 pasos (elige → paga con QR → recibe en tu pueblo) · zonas de envío con costo y tiempo (de la base) · llamada a distribuidores · footer |
| **Catálogo** | Título y conteo, buscador + orden, filtros de categoría con ícono, grilla 1/2/3/4 columnas, vacío con "Limpiar filtros" |
| **Ficha** | Foto grande a la izquierda; categoría, nombre, precio por unidad, disponibilidad, selector de cantidad y botón a la derecha; bloque de envío desde Villa Charcas (pueblo, Culpina, Incahuasi y Sucre) y "Otros productos de la categoría" |
| **Carrito** | Visible sin cuenta · ítems con − / + de 44 px y "Quitar" con Deshacer · resumen con envío estimado · sin sesión: "Iniciar sesión y comprar" · sincronizado entre pestañas |
| **Checkout** (fase 9E, compra en 3 clics) | Una sola pantalla: zona, datos rellenados con la última compra (editables) y forma de pago con QR marcado · "Confirmar pedido · Bs. X" dentro del cuadro "Tu compra" (sticky a la derecha); en celular, barra fija abajo con el total y el botón, y "Tu compra" plegable arriba · Efectivo al recibir desactivado con su texto en zonas sin efectivo · errores junto a cada campo (borde rojo `claseCampo`, mensaje `ErrorCampo`), vista y foco al primero · después: QR o cuenta con el monto y la foto del pago justo debajo, botón "Enviar" |
| **Textos de botones** | Cada botón dice adónde lleva: "Ir a pagar" (carrito → checkout) frente a "Seguir comprando" (→ catálogo), "Confirmar pedido", "Enviar" (foto del pago), "Volver a mis pedidos". Nada de "Continuar" o "Atrás" solos. Ningún texto promete avisos automáticos (no existen) |
| **Pedidos** | Lista con código en `font-titulo`, una insignia de estado para el cliente con su línea de "qué sigue", total alineado a la derecha y "Ver detalle"; detalle con "Qué sigue", QR con el monto si falta pagar y línea de tiempo con nombres simples (Pedido recibido, En camino) |
| **Panel admin** | Menú lateral con íconos Lucide (en celular, una fila que se desplaza y centra la opción activa). Cada pantalla: `EncabezadoAdmin` → cifras (`TarjetasResumen`) → filtros → lista. Inventario en columnas desde `md` (producto, stock, estado, acciones) y en tarjetas en celular; pagos y envíos en tarjetas de tres partes; los 4 grupos de envíos son cifras que filtran |
| **Panel del proveedor** (`/distribuidor`, fase 6A) | Sin menú lateral: «Panel del proveedor» en trigo, nombre comercial como título, ciudad y días de entrega · cifras (presentaciones, disponibles, productos que cubre, entrega) · chips «Las que vendo / Ya no vendo» · tarjetas de presentación: producto, presentación y cuánto trae, precio mayorista grande, **costo por unidad de venta en verde** y entrega; acciones Editar, Marcar sin stock / disponible y «Dejar de vender» (rojo, con confirmación; nunca se borra) · formulario que pregunta «¿Cuántos «litro» trae?» en la unidad de la tienda y muestra al instante «= Bs. 82,00 por litro» |
| **Distribuidores** (`/admin/abastecimiento/distribuidores`, fase 6A) | Cifras (activos, presentaciones, productos con proveedor, cuentas sin ficha en ámbar) · aviso si hay cuentas sin ficha · tarjeta por proveedor con insignias (Activo, «Cuenta de prueba»), Editar ficha y WhatsApp · «Ver lo que vende» plegable con las mismas tarjetas de presentación |
| **Abastecimiento** (`/admin/abastecimiento`, fase 6B) | Un solo ítem en el menú con 2 pestañas (chips): «Reponer y órdenes» y «Distribuidores» · **Para reponer**: tarjeta por producto en su mínimo o hasta 1,5× el mínimo, con casilla, insignia (Agotado, En el mínimo, Cerca del mínimo), selector de proveedor y presentación (el más barato por unidad primero, marcado «más barato») y cantidad sugerida editable con «= 60 litros · Bs. X · stock 12 → 72» · «Pedir otro producto» con buscador para el resto de lo que tiene proveedor · barra con «N productos para pedir» y **Armar orden** (junta por proveedor en su borrador) · **Órdenes de compra**: chips por estado con la cantidad y tarjetas de tres partes (código + proveedor + insignias · datos · total y «Ver orden») |
| **Orden de compra** (`/admin/abastecimiento/ordenes/[id]`) | Código en `font-titulo`, proveedor, insignia de estado y una línea de qué sigue · columna principal: líneas en tarjetas (en borrador, editor con cantidad, Guardar, Quitar y «Sumar otro producto de este proveedor»), Datos (`Dato: valor`) · columna lateral (abajo en celular): Acciones según el estado (Enviar, Avisar por WhatsApp, Registrar recepción, Cancelar en rojo) y línea de tiempo con el punto del color del estado · **Recepción en modal**: una caja por línea con «llegaron (de N)» y la vista previa «= 60 litros · costo Bs. 80,00/litro · stock 12 → 72 · costo promedio Bs. X → Y»; si todo queda en 0 pide confirmar «No llegó nada: se registra todo como faltante» |
| **Margen** (`/admin/margen`) | Cifras (margen promedio, con costo real, costo estimado en ámbar, margen negativo en rojo) · tabla desde 768 px (producto, precio, costo, margen Bs., margen %) y tarjetas en celular · ordenado del margen más chico al más grande; negativo en rojo y negrita; insignia «Estimado» (ámbar) mientras el costo sale del proveedor más barato · en `/admin`, tarjeta «Margen promedio» con los 3 productos que dejan menos |
| **Orden del proveedor** (`/distribuidor/ordenes/[id]`) | «Orden de compra de AML AgroTech» en trigo, código, insignia y qué sigue · líneas con su precio (nunca stock, costos de la tienda ni clientes) · Acciones: fecha con mínimo hoy (`fechaHoyLocal()`) y «Aceptar orden»; transportista + guía y «Despachar»; «Rechazar orden» en rojo con motivo · en `/distribuidor`, sección «Órdenes de la tienda» arriba de las presentaciones, con aviso ámbar si hay órdenes por responder |
| **Recibo de compra** (PDF, fase 7) | Carta, Helvetica, legible en blanco y negro: franja verde arriba, «AML AgroTech» y datos de la tienda a la izquierda, «RECIBO DE COMPRA», N.º y fecha de Bolivia a la derecha · recuadro «Recibo de compra — documento sin valor fiscal (no es factura)» · bloques Cliente / Entrega / Pago / Estado del pedido con títulos en verde · tabla con línea gruesa bajo el encabezado y líneas finas entre filas · QR pequeño a la izquierda y totales a la derecha (TOTAL en verde) · pie con código y «Página N de M» · cancelado: marca de agua ANULADA en rojo al 18 %. En la web: botón secundario «Descargar recibo de compra (PDF)» debajo del seguimiento y «Nota PDF» chico en la tarjeta del panel |
| **Footer** | Marca y frase, navegación, contacto, equipo (Grupo 20: Aldo Martínez Lima y Miguel Alejandro Nava Mamani · USFX · SIS324), créditos de fotos e íconos |
