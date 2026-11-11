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

Fondo crema, tarjetas blancas con sombra suave, verde de la marca, dorado trigo para detalles y textos oscuros. Tokens en `tailwind.config.ts` (`bg-fondo`, `text-acento`, etc.).

| Token | Valor | Uso | Contraste |
|---|---|---|---|
| `fondo` | `#f6f4ee` | Fondo de página (crema) | — |
| `tarjeta` | `#ffffff` | Tarjetas, menú, footer | — |
| `tarjeta-hover` | `#eef3ea` | Hover, campos de texto, avisos suaves | — |
| `borde` | `#dfe5d8` | Bordes y divisores | — |
| `acento` | `#15753a` | Botones, precios, enlaces, foco | 5,3:1 sobre crema; blanco encima 5,8:1 |
| `acento-hover` | `#166534` | Hover de la acción principal | — |
| `texto` | `#17251b` | Texto principal | 15:1 |
| `texto-2` | `#4a5a4e` | Texto secundario, etiquetas | 7:1 |
| `trigo` | `#836219` | Detalles con texto (zonas por flota, "Paso 1") | 5,1:1 |
| `trigo-suave` | `#d4b26a` | Solo decorativo (números grandes, rellenos) | — |

Estados (nunca solo color: siempre con texto): pendiente `#f59e0b` · verificado/entregado `#22c55e` · en camino `#3b82f6` · cancelado/rechazado `#ef4444`. El punto de la insignia usa ese color; **el texto usa su tono oscuro** (`#92400e`, `#166534`, `#1d4ed8`, `#b91c1c`) para pasar AA sobre blanco. El trigo **no es un estado**.

Sobre fotos (hero, categorías) el texto es blanco con velo oscuro debajo.

## 3. Tipografía

| Rol | Familia | Pesos | Clase |
|---|---|---|---|
| Títulos, cifras grandes, marca | **Bricolage Grotesque** | 600, 700, 800 | `font-titulo` |
| Texto, botones, formularios | **Figtree** | 400, 500, 600, 700 | `font-sans` (por defecto) |

- Cargadas con `next/font/google`: se sirven desde nuestro propio dominio, sin pedidos a Google en el navegador.
- **Escala** (móvil → escritorio): hero `text-4xl → text-7xl` · título de página `text-3xl → text-4xl` · sección `text-3xl → text-4xl` · tarjeta `text-base` (16 px) semibold · cuerpo 16 px · ayuda `text-sm` (15 px) · lo más chico `text-xs` (**14 px**). En `tailwind.config.ts` la escala `xs` vale 14 px y `sm` 15 px: ningún texto de contenido baja de 14 px. Menú en 16 px.
- Títulos con `tracking-tight` y `text-balance`; párrafos con `max-w-prose` (menos de 80 caracteres por línea).
- **Precios y cantidades** con `tabular-nums` para que las cifras no bailen.
- Sin MAYÚSCULAS sostenidas en etiquetas, sin acentuar una sola palabra del título con otro color.

## 4. Espaciado, grilla y forma

- Base de 4 px (escala de Tailwind). Secciones de portada `py-16 md:py-24`; páginas `py-8`; tarjetas `p-4 sm:p-5`.
- Contenedor `max-w-7xl` (portada, catálogo), `max-w-5xl` (ficha, admin), `max-w-2xl` (checkout).
- **Radios por jerarquía:** botones y campos `rounded-xl`, tarjetas `rounded-2xl`, insignias `rounded-full`, hero y bloques grandes `rounded-3xl`.
- Márgenes laterales de 16 px en celular. **Nunca scroll horizontal** en 360, 412 ni 1280 px.

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
- **Portada**: foto propia de un campo de papa en Villa Charcas (Aldo Martínez Lima), en `public/portada/villa-charcas.webp`, con `next/image` (`priority`, `placeholder="blur"`) y un velo oscuro suave solo del lado del texto, para que la foto se vea. Crédito en el hero y en el footer.
- **Créditos**: fuente, autor y licencia de cada foto en `docs/CREDITOS_IMAGENES.md`. Las de tienda son de uso referencial académico: reemplazarlas antes de comercializar.
- **Íconos**: Lucide (`react-icons/lu`, ISC) solo para la interfaz, `aria-hidden` si son decorativos. Sin emojis.

## 7. Componentes

| Componente | Reglas |
|---|---|
| Botón primario | Fondo `acento`, texto blanco, `font-bold`, `rounded-xl`, alto mínimo 44 px. Uno por pantalla/paso |
| Botón secundario | Borde `borde` → `acento` al pasar |
| Botón peligro | Borde rojo; la acción real va en un modal de confirmación propio |
| Campo | Fondo `tarjeta-hover`, etiqueta visible arriba (nunca solo placeholder), placeholder más tenue que la etiqueta |
| Tarjeta de producto | Foto cuadrada de borde a borde, etiqueta de categoría con color, nombre (2 líneas máx.), precio grande + unidad, disponibilidad con texto, botón ancho |
| Insignia de estado | Punto del color del estado + texto en su tono oscuro, `rounded-full`, fondo del color al 10 % |
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
| **Checkout** | 3 pasos (Entrega → Pago → Resumen), los ya hechos son clicables para volver · resumen fijo a la derecha en escritorio y plegable arriba en celular, desde el paso 1 · recojo: aviso de la tienda; en el pueblo: dirección; por flota: nombre y CI de quien recoge |
| **Pedidos** | Lista con código en `font-titulo`, estado y pago con insignias, total alineado a la derecha; detalle con línea de tiempo |
| **Panel admin** | Menú lateral con íconos Lucide (arriba en celular), cifras en tarjetas con ícono, gráficos y alertas de stock |
| **Footer** | Marca y frase, navegación, contacto, equipo (Grupo 20: Aldo Martínez Lima y Miguel Alejandro Nava Mamani · USFX · SIS324), créditos de fotos e íconos |
