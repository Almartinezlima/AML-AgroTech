# AML AgroTech — Brief de diseño

Sexto documento de la especificación. Manda sobre cualquier decisión visual; si el código se aparta de esto, se corrige el código o se actualiza este documento con el OK de Aldo.

## 1. Para quién y qué tiene que transmitir

- **Quién compra:** agricultores y distribuidores de Sucre y las provincias de Chuquisaca (Villa Charcas, Culpina, Incahuasi). Muchos entran desde el celular, con datos móviles y pantallas de 360 px.
- **Qué tiene que sentir:** una tienda **seria, local y confiable**, no una plantilla. "Esto lo atiende gente de acá y me llega al pueblo".
- **Trabajo principal de cada pantalla:** encontrar el insumo, saber el precio en Bs. y cuánto cuesta llevarlo, pagar sin miedo.

Principios:
1. **Claro antes que lindo.** Precio, unidad y disponibilidad siempre visibles. Español simple.
2. **Lo agrícola es el carácter.** La identidad sale del campo: fotos reales de productos, de cultivos y del valle andino, con color por categoría.
3. **Nada roto, nada vacío sin explicación.** Toda pantalla tiene carga (skeleton), vacío y error.
4. **Movimiento con motivo.** Solo responde a lo que hace la persona, más una entrada orquestada en la portada.

## 2. Color

Tema oscuro verde (CLAUDE.md). Tokens en `tailwind.config.ts` (`bg-fondo`, `text-acento`, etc.); el código anterior usa los mismos valores en hex.

| Token | Valor | Uso |
|---|---|---|
| `fondo` | `#0a0f0a` | Fondo de página |
| `tarjeta` | `#111811` | Tarjetas, menú, footer |
| `tarjeta-hover` | `#162016` | Hover, campos de texto |
| `borde` | `#1a2e1a` | Bordes y divisores |
| `acento` | `#22c55e` | Acción principal, precios, foco |
| `acento-hover` | `#16a34a` | Hover de la acción principal |
| `texto` | `#f0fdf4` | Texto principal |
| `texto-2` | `#86efac` | Texto secundario, etiquetas |
| `trigo` | `#d4b26a` | **Solo detalles**: números de pasos, sellos, zonas de provincia, créditos |

Estados (nunca solo color: siempre con texto): pendiente `#f59e0b` · verificado/entregado `#22c55e` · en camino `#3b82f6` · cancelado/rechazado `#ef4444`. **El trigo no es un estado** y no debe confundirse con el ámbar.

Contraste: texto `#f0fdf4` y `#86efac` sobre `#0a0f0a`/`#111811` superan AA. El trigo se usa en tamaños ≥ 14 px semibold o en elementos decorativos.

## 3. Tipografía

| Rol | Familia | Pesos | Clase |
|---|---|---|---|
| Títulos, cifras grandes, marca | **Bricolage Grotesque** | 600, 700, 800 | `font-titulo` |
| Texto, botones, formularios | **Figtree** | 400, 500, 600, 700 | `font-sans` (por defecto) |

- Cargadas con `next/font/google`: se sirven desde nuestro propio dominio, sin pedidos a Google en el navegador.
- **Escala** (móvil → escritorio): hero `text-4xl → text-6xl` · título de página `text-3xl` · sección `text-2xl → text-3xl` · tarjeta `text-base` semibold · cuerpo `text-base` · ayuda `text-sm` · meta `text-xs`.
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
- **Portada**: terrazas de cultivo en un valle andino (Unsplash), en `public/portada/`, con `next/image` (`priority`, `placeholder="blur"`) y velo oscuro para que el texto se lea. Crédito en el hero y en el footer.
- **Créditos**: fuente, autor y licencia de cada foto en `docs/CREDITOS_IMAGENES.md`. Las de tienda son de uso referencial académico: reemplazarlas antes de comercializar.
- **Íconos**: Lucide (`react-icons/lu`, ISC) solo para la interfaz, `aria-hidden` si son decorativos. Sin emojis.

## 7. Componentes

| Componente | Reglas |
|---|---|
| Botón primario | Fondo `acento`, texto `fondo`, `font-bold`, `rounded-xl`, alto mínimo 44 px. Uno por pantalla/paso |
| Botón secundario | Borde `borde` → `acento` al pasar |
| Botón peligro | Borde rojo; la acción real va en un modal de confirmación propio |
| Campo | Fondo `tarjeta-hover`, etiqueta visible arriba (nunca solo placeholder), placeholder más tenue que la etiqueta |
| Tarjeta de producto | Foto cuadrada de borde a borde, etiqueta de categoría con color, nombre (2 líneas máx.), precio grande + unidad, disponibilidad con texto, botón ancho |
| Insignia de estado | Texto + color del estado, `rounded-full`, fondo del color al 13 % |
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
| **Portada** | Hero a pantalla ancha con foto de valle andino, título, buscador y "Ver catálogo" · categorías con foto y color · productos destacados reales · "Cómo comprar" en 3 pasos (elige → paga con QR → recibe en tu pueblo) · zonas de envío con costo y tiempo (de la base) · llamada a distribuidores · footer |
| **Catálogo** | Título y conteo, buscador + orden, filtros de categoría con ícono, grilla 1/2/3/4 columnas, vacío con "Limpiar filtros" |
| **Ficha** | Foto grande a la izquierda; categoría, nombre, precio por unidad, disponibilidad, selector de cantidad y botón a la derecha; bloque de envío ("Llega a Sucre en 1 día, provincias 2–4 días") |
| **Carrito** | Lista de ítems con cantidad, resumen fijo a la derecha en escritorio, abajo en celular |
| **Checkout** | 3 pasos numerados (Entrega → Pago → Resumen), tarjetas seleccionables con ícono, resumen con subtotal + envío = total |
| **Pedidos** | Lista con código en `font-titulo`, estado y pago con insignias, total alineado a la derecha; detalle con línea de tiempo |
| **Panel admin** | Menú lateral con íconos Lucide (arriba en celular), cifras en tarjetas con ícono, gráficos y alertas de stock |
| **Footer** | Marca y frase, navegación, contacto, equipo (Grupo 20: Aldo Martínez Lima y Miguel Alejandro Nava Mamani · USFX · SIS324), créditos de fotos e íconos |
