import { expect, test } from '@playwright/test'
import { PRODUCTO_A, PRODUCTO_B, agregarAlCarrito, exigirRegistroDirecto, finalizarCompra, registrarCliente } from './utilidades'

test.describe('Compra completa', () => {
  test.beforeEach(async () => {
    await exigirRegistroDirecto()
  })

  test('registrarse, armar el carrito y pedir a Culpina', async ({ page }) => {
    await registrarCliente(page)

    await agregarAlCarrito(page, PRODUCTO_A)
    await agregarAlCarrito(page, PRODUCTO_B)

    // El carrito sobrevive a una recarga
    await page.goto('/carrito')
    await expect(page.getByText('2 productos agregados')).toBeVisible()
    await page.reload()
    await expect(page.getByText('2 productos agregados')).toBeVisible()
    await expect(page.getByText(PRODUCTO_A)).toBeVisible()
    await expect(page.getByText(PRODUCTO_B)).toBeVisible()

    // En provincia no se ofrece contra entrega
    await page.goto('/checkout')
    await page.getByRole('radio', { name: /Culpina/ }).check()
    // Por flota se pide quién recoge, no una dirección
    await expect(page.getByLabel(/Dirección/)).toHaveCount(0)
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'nombre de quien recoge' })).toBeVisible()
    await page.getByLabel('Nombre de quien recoge').fill('Juan Mamani E2E')
    await page.getByLabel('CI de quien recoge').fill('12')
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'CI válido' })).toBeVisible()
    await page.getByLabel('CI de quien recoge').fill('1234567')
    await page.getByLabel('Teléfono / WhatsApp').fill('70012345')
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByRole('radio', { name: /QR/ })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Contra entrega/ })).toHaveCount(0)
    await expect(page.getByText('El pago contra entrega no está disponible para envíos a Culpina.')).toBeVisible()

    const pedido = await finalizarCompra(page, { zona: 'Culpina', metodo: 'QR', recogeNombre: 'Juan Mamani E2E', recogeCi: '1234567' })
    expect(pedido.envio).toBe(10)
    expect(pedido.total).toBeCloseTo(pedido.subtotal + 10, 2)
    expect(pedido.codigo).toMatch(/^AML-/)

    // El pedido aparece en Mis pedidos, con quién recoge en el detalle, y el carrito quedó vacío
    await page.goto('/pedidos')
    await expect(page.getByText(pedido.codigo)).toBeVisible()
    await page.goto(`/pedidos/${pedido.id}`)
    await expect(page.getByText(/Juan Mamani E2E/)).toBeVisible()
    await page.goto('/carrito')
    await expect(page.getByText('Tu carrito está vacío')).toBeVisible()
  })
})
