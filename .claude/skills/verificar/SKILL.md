---
name: verificar
description: Verificación de AML AgroTech antes de dar por terminado un cambio. Corre tsc, lint y build, prueba la API tocada y saca capturas en 1280, 412 y 360 px, y arma el reporte de evidencia para Aldo. Usar al terminar de programar, antes de proponer un commit.
---

# Verificar un cambio

Reglas en CLAUDE.md: principios 6 y 10, "Diseño". Esto es el procedimiento.

## 1. Código

1. `npx tsc --noEmit` — sin errores.
2. `npm run lint` — sin errores (los warnings se anotan).
3. `npm run build` — tiene que compilar: es lo mismo que hará Render.
4. Si algo falla, se arregla y se vuelve a correr. Nunca se reporta "terminado" con fallas.

## 2. API (si se tocó `src/app/api/**`)

Con `npm run dev` corriendo, probar cada ruta tocada con `curl` o `Invoke-RestMethod`:
- Sin sesión → tiene que responder **401**.
- Con rol equivocado (cliente en ruta de admin) → **403**.
- Datos inválidos → **400/422** con `{ error: { codigo, mensaje } }`.
- Caso correcto → 200/201 con `{ data }`.
Las pruebas con sesión las hace Aldo iniciando sesión en el navegador: **nunca** usar la service role ni crear sesiones por script.

## 3. Capturas

Script temporal **fuera del repo** (scratchpad de la sesión), con Playwright (`npx playwright` si no está, pedir OK antes de instalar):

```js
import { chromium } from 'playwright'
// node captura.mjs http://localhost:3000 /catalogo <carpeta-salida> catalogo
const [BASE, RUTA, SALIDA, NOMBRE] = process.argv.slice(2)
const navegador = await chromium.launch()
for (const ancho of [1280, 412, 360]) {
  const pagina = await navegador.newPage({ viewport: { width: ancho, height: 800 } })
  await pagina.goto(`${BASE}${RUTA}`, { waitUntil: 'networkidle' })
  await pagina.waitForTimeout(800)
  const anchoPagina = await pagina.evaluate(() => document.documentElement.scrollWidth)
  console.log(`${ancho} px → ${anchoPagina} px${anchoPagina > ancho ? '  ← SCROLL HORIZONTAL' : ''}`)
  await pagina.screenshot({ path: `${SALIDA}/${NOMBRE}-${ancho}.png`, fullPage: true })
  await pagina.close()
}
await navegador.close()
```

- Páginas públicas (`/`, `/catalogo`, `/auth/*`): sin sesión.
- Páginas con sesión (`/admin/*`, `/pedidos`, `/carrito`): las revisa Aldo logueado, o se capturan con respuestas de Supabase interceptadas (`page.route`), siempre con datos inventados y sin secretos.
- **Mirar cada captura**: nada cortado, encimado ni con scroll horizontal; estados de carga, vacío y error correctos.

## 4. Reporte a Aldo

**Evidencia**
- tsc / lint / build: resultado.
- API: tabla ruta → caso → código obtenido.
- Capturas: ruta de cada archivo y ancho de página por tamaño.
- Lo que no se pudo verificar y por qué.

**Para revisar vos**
- Escritorio (≥ 1280 px): qué mirar.
- Celular (360 px): qué mirar.
- Flujo a probar logueado: pasos concretos.

Después se espera el OK de Aldo. El cierre sigue en la skill `cerrar-frente`.
