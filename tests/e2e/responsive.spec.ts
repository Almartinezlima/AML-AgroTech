import { type Page } from '@playwright/test'
import { PRODUCTO_A, agregarAlCarrito, entrarComoCliente, exigirAdmin, expect, paginaAdmin, test } from './utilidades'

const ANCHO = 360

async function sinScrollHorizontal(page: Page, ruta: string) {
  await page.goto(ruta)
  await page.waitForLoadState('networkidle')
  // Se espera a que se vaya el skeleton para medir la pantalla real
  await expect(page.getByRole('status', { name: 'Cargando' })).toHaveCount(0)
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(ancho, `${ruta} mide ${ancho}px en una pantalla de ${ANCHO}px`).toBeLessThanOrEqual(ANCHO)
}

test.describe('Celular de 360 px sin scroll horizontal', () => {
  test.use({ viewport: { width: ANCHO, height: 780 }, isMobile: true, hasTouch: true })

  for (const ruta of ['/', '/catalogo', '/auth/login', '/auth/registro', '/auth/recuperar', '/auth/restablecer']) {
    test(`público: ${ruta}`, async ({ page }) => {
      await sinScrollHorizontal(page, ruta)
    })
  }

  test('cliente: carrito y checkout', async ({ page }) => {
    await entrarComoCliente(page)
    await agregarAlCarrito(page, PRODUCTO_A)
    await sinScrollHorizontal(page, '/carrito')
    await sinScrollHorizontal(page, '/checkout')
    await sinScrollHorizontal(page, '/pedidos')
  })

  test('admin: panel', async ({ browser }) => {
    exigirAdmin()
    const admin = await paginaAdmin(browser)
    await admin.setViewportSize({ width: ANCHO, height: 780 })
    for (const ruta of ['/admin', '/admin/pedidos', '/admin/pagos', '/admin/envios', '/admin/usuarios', '/admin/inventario']) {
      await sinScrollHorizontal(admin, ruta)
    }
  })
})
