import { test, type Page } from '@playwright/test'
import { idDeProducto } from '../e2e/utilidades'

// Capturas de diseño (antes/después). No es una prueba: se corre a mano con
//   npx playwright test --config tests/capturas/playwright.capturas.ts
// y guarda en CAPTURAS_DIR (por defecto test-results/capturas).
// Con CAPTURAS_SIMULAR_0004=1 se agrega a /api/productos la imagen_url que pone la
// migración 0004 (útil si todavía no se corrió): los demás datos son los reales.
const SALIDA = process.env.CAPTURAS_DIR ?? 'test-results/capturas'
const ANCHOS = [1280, 360]

async function simular0004(page: Page) {
  if (process.env.CAPTURAS_SIMULAR_0004 !== '1') return
  await page.route('**/api/productos**', async (ruta) => {
    const respuesta = await ruta.fetch()
    const cuerpo = await respuesta.json()
    const conFoto = (p: { sku?: string | null; imagen_url?: string | null }) =>
      p && p.sku && !p.imagen_url ? { ...p, imagen_url: `/productos/${p.sku}.webp` } : p
    cuerpo.data = Array.isArray(cuerpo.data) ? cuerpo.data.map(conFoto) : conFoto(cuerpo.data)
    await ruta.fulfill({ response: respuesta, json: cuerpo })
  })
}

async function capturar(page: Page, nombre: string) {
  for (const ancho of ANCHOS) {
    await page.setViewportSize({ width: ancho, height: 800 })
    // Recorre la página para que carguen las imágenes diferidas (lazy) antes de la captura
    const alto = await page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y < alto + 1600; y += 500) {
      await page.mouse.wheel(0, 500)
      await page.waitForTimeout(150)
    }
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${SALIDA}/${nombre}-${ancho}.png`, fullPage: true })
  }
}

test('capturas de portada, catálogo y ficha', async ({ page }) => {
  await simular0004(page)
  await page.goto('/')
  await capturar(page, 'portada')
  await page.goto('/catalogo')
  await capturar(page, 'catalogo')
  const id = await idDeProducto(page, 'Mochila Fumigadora Jacto 20L')
  await page.goto(`/producto/${id}`)
  await capturar(page, 'ficha')
})
