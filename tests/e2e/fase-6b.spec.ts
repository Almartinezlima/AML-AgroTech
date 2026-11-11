import { expect, test } from '@playwright/test'
import {
  PRODUCTO_A, PRODUCTO_B, agregarAlCarrito, exigirRegistroDirecto, finalizarCompra, imagenComprobante, registrarCliente,
} from './utilidades'

// Correcciones de la auditoría (fase 6B) que no necesitan la cuenta admin
test.describe('Fase 6B', () => {
  test('la búsqueda ignora tildes y busca en descripción y categoría; el filtro queda en la URL', async ({ page }) => {
    const resultados = async (q: string) => {
      await page.goto(`/catalogo?q=${encodeURIComponent(q)}`)
      await expect(page.getByText(/productos? con precios en bolivianos/)).toBeVisible()
      return page.getByRole('article').count()
    }
    expect(await resultados('valvula')).toBeGreaterThanOrEqual(1)
    expect(await resultados('maiz')).toBeGreaterThanOrEqual(2)
    expect(await resultados('fertilizante')).toBeGreaterThanOrEqual(3)
    expect(await resultados('abono')).toBeGreaterThanOrEqual(3)
    await expect(page.getByRole('link', { name: 'Urea 46% N', exact: true })).toBeVisible()

    // Filtro y orden en la URL: sobreviven a recargar
    await page.goto('/catalogo')
    await page.getByRole('button', { name: 'Riego', exact: true }).click()
    await page.getByLabel('Ordenar productos').selectOption('precio-desc')
    await expect(page).toHaveURL(/categoria=Riego/)
    await expect(page).toHaveURL(/orden=precio-desc/)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Riego', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByLabel('Ordenar productos')).toHaveValue('precio-desc')
  })

  test('el visitante ve su carrito sin cuenta y el login se pide recién en el checkout', async ({ page }) => {
    await agregarAlCarrito(page, PRODUCTO_A)
    await page.goto('/carrito')
    await expect(page).toHaveURL(/\/carrito$/)
    await expect(page.getByText(PRODUCTO_A)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Iniciar sesión y comprar' })).toBeVisible()

    await page.goto('/checkout')
    await expect(page).toHaveURL(/\/auth\/login\?siguiente=%2Fcheckout/)
    // "Regístrate" conserva a dónde iba
    await expect(page.getByRole('link', { name: 'Regístrate gratis' })).toHaveAttribute('href', /siguiente=%2Fcheckout/)
  })

  test('quitar del carrito se puede deshacer y el carrito se sincroniza entre pestañas', async ({ page }) => {
    await agregarAlCarrito(page, PRODUCTO_A)
    await agregarAlCarrito(page, PRODUCTO_B)
    await page.goto('/carrito')
    await page.getByRole('button', { name: 'Quitar', exact: true }).first().click()
    await expect(page.getByText('1 producto agregado')).toBeVisible()
    await page.getByRole('button', { name: 'Deshacer' }).click()
    await expect(page.getByText('2 productos agregados')).toBeVisible()

    // Otra pestaña agrega un producto: esta lo ve sin recargar
    const otra = await page.context().newPage()
    await otra.goto('/catalogo')
    await otra.getByLabel('Buscar producto').fill('Semilla Papa Desiree')
    await otra.getByRole('article').first().getByRole('button', { name: /Agregar al carrito/ }).click()
    await expect(page.getByText('3 productos agregados')).toBeVisible()
    await otra.close()
  })

  test('después de enviar el comprobante el cliente ya no puede cancelar solo', async ({ page }) => {
    await exigirRegistroDirecto()
    await registrarCliente(page)
    await agregarAlCarrito(page, PRODUCTO_A)
    const pedido = await finalizarCompra(page, { zona: 'Culpina', metodo: 'QR' })
    await page.goto(`/pedidos/${pedido.id}`)
    await expect(page.getByRole('button', { name: 'Cancelar pedido' })).toBeVisible()

    await page.getByLabel('Subir foto del comprobante').setInputFiles({ name: 'comprobante-e2e.png', mimeType: 'image/png', buffer: imagenComprobante() })
    await expect(page.getByAltText('Vista previa del comprobante')).toBeVisible()
    await page.getByRole('button', { name: 'Enviar comprobante' }).click()
    await expect(page.getByText('En revisión').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancelar pedido' })).toHaveCount(0)
    await expect(page.getByText(/Ya enviaste tu comprobante/)).toBeVisible()
  })

  test('producto y página inexistentes tienen su propio aviso', async ({ page }) => {
    await page.goto('/producto/abc')
    await expect(page.getByText('No encontramos este producto. Puede que ya no esté a la venta.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver catálogo' }).first()).toBeVisible()

    await page.goto('/esta-pagina-no-existe')
    await expect(page.getByRole('heading', { name: 'No encontramos esta página' })).toBeVisible()
  })

  test('la ficha muestra otros productos de la categoría', async ({ page }) => {
    await page.goto('/catalogo?q=Jacto')
    await page.getByRole('link', { name: 'Mochila Fumigadora Jacto 20L', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Otros productos de Herramientas' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Otros productos de Herramientas' }).locator('xpath=../..').getByRole('article')).toHaveCount(4)
  })
})
