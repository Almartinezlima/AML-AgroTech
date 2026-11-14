# 07 — Reingeniería del catálogo

Rama: `fase/1-reingenieria`. Migración: `0008_reingenieria_catalogo.sql`, que se corre **antes** de publicar el código.

## Por qué

El catálogo tenía nombre, precio, unidad y una descripción corta. Las tiendas agro bolivianas en línea muestran además la **ficha técnica** del producto y su **precio de mercado**. Hicimos ingeniería inversa de esas tiendas para completar lo que ya teníamos **sin cambiar el diseño** de AML AgroTech.

## Fuentes analizadas

| Fuente | Qué es | Fecha de los datos |
|---|---|---|
| SurtiAgro | Tienda de insumos agrícolas del mercado de Santa Cruz (Bolivia) | Precios al 7 sep 2026 |

> Si en el análisis se revisaron otras tiendas, se agregan a esta tabla con su fecha.

## Qué se tomó

| Idea | Cómo quedó en AML AgroTech |
|---|---|
| Ficha técnica por producto | Composición (ingrediente activo o N-P-K), cultivos, modo de uso y dosis. Todos son opcionales y la ficha solo muestra los que tienen dato |
| Banda toxicológica en agroquímicos | Insignia con el color oficial de la etiqueta (roja, amarilla, azul, verde) y siempre con texto. **La base exige** que solo la tengan productos de Agroquímicos (trigger `validar_banda_toxicologica`) |
| Precio de referencia de mercado | Línea en la ficha: "Referencia de mercado: Bs. X (fuente, fecha). Nuestro precio incluye el flete hasta Villa Charcas." |
| Tendencia de precios | Insignia "Mercado al alza / estable / a la baja" en la ficha y en la tarjeta del catálogo. Habla del **mercado**, no de nuestro precio |
| Surtido de fertilizantes | 3 productos nuevos de uso común: Fosfato Diamónico 18-46-0, Cloruro de Potasio 0-0-60 y Urea Protegida con Polímero |

## Qué se descartó y por qué

| Descartado | Razón |
|---|---|
| Diseño, colores y maquetación de las tiendas | AML AgroTech tiene su propia identidad (tema claro agrícola, `docs/DISENO.md`). Copiar el aspecto de otra tienda la diluye y no aporta al agricultor |
| Fotos de producto de otras webs | Tienen derechos de su titular. Los 3 productos nuevos muestran la foto de su categoría (`public/categorias/agroquimicos.webp`, CC BY-SA 2.0) hasta tener fotos propias, y el texto alternativo lo aclara |
| Dosis y banda inventadas | Son datos de seguridad. Quedan vacíos hasta que Aldo los cargue desde el admin con la etiqueta en la mano |
| Composición dudosa | Carbotecnia Arranque queda sin composición porque ni el nombre ni la etiqueta conocida la dicen |
| Precio de Santa Cruz como precio de venta | Santa Cruz está a más de 600 km de Villa Charcas. Se muestra como **referencia** y el precio de venta incluye el flete |

## Precios antes y después

| SKU | Producto | Unidad | Antes (Bs.) | Después (Bs.) | Referencia SurtiAgro (Bs.) | Tendencia del mercado |
|---|---|---|---:|---:|---:|---|
| AGR-011 | Urea 46% N | saco 50kg | 240,00 | **340,00** | 325,00 | Al alza |
| AGR-003 | Calferquim NPK 15-15-15 | saco 50kg | 575,00 | **420,00** | 405,00 | Al alza |
| AGR-009 | Molimax NPK 20-20-20 | saco 50kg | 575,00 | **475,00** | 455,00 | Al alza |
| AGR-012 | Fosfato Diamónico 18-46-0 | saco 50kg | (nuevo) | **835,00** | 817,00 | Al alza |
| AGR-013 | Cloruro de Potasio 0-0-60 | saco 50kg | (nuevo) | **265,00** | 245,00 | Al alza |
| AGR-014 | Urea Protegida con Polímero | saco 50kg | (nuevo) | **375,00** | 360,00 | Al alza |

Calferquim y Molimax bajan de precio aunque el mercado esté al alza: los 575 Bs. de 2023 quedaron por encima del mercado actual. Por eso la insignia dice "Mercado al alza" y no "Precio al alza".

Los 3 productos nuevos entran con **stock 30**, cada uno con su movimiento de entrada en el kardex ("Stock inicial (migración 0008)"). Los pedidos anteriores no cambian: guardan su `precio_unitario`.

## Composición cargada

Solo datos seguros, sacados del nombre o de la etiqueta conocida: Basfoliar y Molimax N-P-K 20-20-20, Calferquim N-P-K 15-15-15, Urea 46 % N, Cipermetrina 25 % EC, Glifosato, Paraquat, Mancozeb, Clorotalonil (Bravonil), Espiromesifeno (Oberon) y el N-P-K de los 3 nuevos.

## Criterios de aceptación

- La ficha técnica solo aparece si el producto tiene al menos un dato, y muestra solo los campos con dato.
- La línea del precio de referencia se lee bien: 15 px, nunca menos de 14 px.
- La banda toxicológica en un producto que no es de Agroquímicos es rechazada por la base (422 desde la API).
- El admin puede editar los 9 campos nuevos. El campo de banda solo aparece en Agroquímicos.
- La API devuelve los campos nuevos en sus columnas explícitas y están documentados en `docs/api/openapi.yaml`.
