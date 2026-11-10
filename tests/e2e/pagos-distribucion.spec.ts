import { expect, test, type Page } from '@playwright/test'
import {
  PRODUCTO_A, agregarAlCarrito, exigirAdmin, exigirRegistroDirecto, finalizarCompra,
  imagenComprobante, paginaAdmin, registrarCliente,
} from './utilidades'

// Abre el modal de avance del pedido en el panel y lo confirma
async function avanzarPedido(admin: Page, codigo: string, estado: string, datos?: { flota: string; guia: string }) {
  await admin.goto('/admin/pedidos')
  const tarjeta = admin.locator('li', { has: admin.getByRole('link', { name: codigo, exact: true }) })
  await tarjeta.getByRole('button', { name: `Pasar a ${estado}` }).click()
  const modal = admin.getByRole('dialog')
  if (datos) {
    await modal.getByLabel(/Empresa de flota/).fill(datos.flota)
    await modal.getByLabel(/Número de guía/).fill(datos.guia)
  }
  await modal.getByLabel(/Nota para el seguimiento/).fill(`E2E: ${estado.toLowerCase()}`)
  await modal.getByRole('button', { name: 'Confirmar' }).click()
  await expect(modal).toHaveCount(0)
  await expect(tarjeta.getByText(estado, { exact: true }).first()).toBeVisible()
}

test.describe('Pagos y distribución', () => {
  test('comprobante → aprobación → preparación → despacho por flota → entrega', async ({ page, browser }) => {
    await exigirRegistroDirecto()
    exigirAdmin()

    // Cliente: compra a provincia con QR y sube su comprobante
    await registrarCliente(page)
    await agregarAlCarrito(page, PRODUCTO_A)
    const pedido = await finalizarCompra(page, { zona: 'Culpina', metodo: 'QR' })

    await page.goto(`/pedidos/${pedido.id}`)
    await page.getByLabel(/Comprobante/).setInputFiles({ name: 'comprobante-e2e.png', mimeType: 'image/png', buffer: imagenComprobante() })
    await page.getByRole('button', { name: 'Enviar comprobante' }).click()
    await expect(page.getByText('En revisión')).toBeVisible()
    await expect(page.getByRole('link', { name: /Ver comprobante subido/ })).toBeVisible()

    // Admin: aprueba el pago
    const admin = await paginaAdmin(browser)
    await admin.goto('/admin/pagos')
    const pago = admin.locator('li', { has: admin.getByRole('link', { name: pedido.codigo, exact: true }) })
    await pago.getByRole('button', { name: 'Aprobar' }).click()
    await admin.getByRole('dialog').getByRole('button', { name: 'Aprobar' }).click()
    await expect(pago).toHaveCount(0)

    // El pedido quedó confirmado y avanza hasta entregado
    await admin.goto('/admin/pedidos')
    const tarjeta = admin.locator('li', { has: admin.getByRole('link', { name: pedido.codigo, exact: true }) })
    await expect(tarjeta.getByText('Confirmado', { exact: true })).toBeVisible()
    await expect(tarjeta.getByText('Pago verificado')).toBeVisible()

    const guia = `E2E-${Date.now()}`
    await avanzarPedido(admin, pedido.codigo, 'Preparando')
    await avanzarPedido(admin, pedido.codigo, 'Despachado', { flota: 'Trans Copacabana (E2E)', guia })
    await avanzarPedido(admin, pedido.codigo, 'Entregado')

    // Cliente: ve la línea de tiempo completa con flota y guía
    await page.reload()
    const seguimiento = page.locator('section', { has: page.getByRole('heading', { name: 'Seguimiento' }) })
    for (const estado of ['Pendiente', 'Confirmado', 'Preparando', 'Despachado', 'Entregado']) {
      // "Pendiente" aparece dos veces: al crear el pedido y al subir el comprobante
      await expect(seguimiento.getByText(estado, { exact: true }).first()).toBeVisible()
    }
    await expect(page.getByText('Trans Copacabana (E2E)')).toBeVisible()
    await expect(page.getByText(guia)).toBeVisible()
    await expect(page.getByText('Pago verificado').first()).toBeVisible()
  })
})
