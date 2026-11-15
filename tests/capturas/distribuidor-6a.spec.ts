import type { Page } from '@playwright/test'
import { esperarCarga, expect, paginaAdmin, paginaDistribuidor, test } from '../e2e/utilidades'

// Capturas de la fase 6A a 1280, 412 y 360 px, midiendo el scroll horizontal. Solo leen: el
// formulario de "Nueva presentación" se llena pero no se envía.
//   CAPTURAS_SPEC=distribuidor-6a.spec.ts E2E_BASE_URL=http://localhost:3210 npx playwright test --config tests/capturas/playwright.capturas.ts
const SALIDA = process.env.CAPTURAS_DIR ?? 'test-results/capturas'
const ANCHOS = [1280, 412, 360]

async function capturar(page: Page, nombre: string, completa = true) {
  for (const ancho of ANCHOS) {
    await page.setViewportSize({ width: ancho, height: 860 })
    await page.waitForTimeout(400)
    const medida = await page.evaluate(() => document.documentElement.scrollWidth)
    console.log(`${nombre} ${ancho} px → página de ${medida} px${medida > ancho ? '  ← SCROLL HORIZONTAL' : ''}`)
    expect(medida, `${nombre} a ${ancho} px`).toBeLessThanOrEqual(ancho)
    await page.screenshot({ path: `${SALIDA}/fase6a-${nombre}-${ancho}.png`, fullPage: completa })
  }
  await page.setViewportSize({ width: 1280, height: 860 })
}

test('capturas de la fase 6A', async ({ page, browser }) => {
  // Público: registro sin tipo de cuenta y la sección de proveedores de la portada
  await page.goto('/auth/registro')
  await expect(page.getByRole('button', { name: 'Crear cuenta gratis' })).toBeVisible()
  await capturar(page, '1-registro')

  await page.goto('/')
  const seccion = page.getByRole('heading', { name: '¿Eres proveedor mayorista?' })
  await seccion.scrollIntoViewIfNeeded()
  await capturar(page, '2-portada-proveedor', false)

  // Panel del proveedor
  const dist = await paginaDistribuidor(browser, 1)
  await esperarCarga(dist)
  await expect(dist.getByRole('heading', { level: 1 })).toBeVisible()
  await capturar(dist, '3-distribuidor')

  await dist.getByRole('button', { name: 'Nueva presentación' }).click()
  const modal = dist.getByRole('dialog')
  await modal.getByLabel('Producto de la tienda').selectOption({ label: 'Gramoxone Paraquat (se vende por litro)' })
  await modal.getByLabel('Presentación').fill('Caja 12 × 1 L')
  await modal.getByLabel(/Cuántos/).fill('12')
  await modal.getByLabel('Precio mayorista (Bs.)').fill('816')
  await expect(modal.getByText('= Bs. 68,00 por litro')).toBeVisible()
  await capturar(dist, '4-nueva-presentacion', false)
  await modal.getByRole('button', { name: 'Cancelar' }).click()

  // Panel del admin: proveedores con lo que vende el primero
  const admin = await paginaAdmin(browser)
  await admin.goto('/admin/abastecimiento/distribuidores')
  await esperarCarga(admin)
  await admin.getByText(/Ver lo que vende/).first().click()
  await capturar(admin, '5-admin-distribuidores')
})
