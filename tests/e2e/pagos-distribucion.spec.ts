import { type Page } from '@playwright/test'
import {
  PRODUCTO_A, agregarAlCarrito, datosDePruebaEnPanel, entrarComoCliente, expect, finalizarCompra, idDeProducto,
  imagenComprobante, limpiarDatosDePrueba, paginaAdmin, stockDe, test,
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
    const productoId = await idDeProducto(page, PRODUCTO_A)
    const stockInicial = await stockDe(page, productoId)

    // Cliente: compra a provincia con QR y sube su comprobante
    await entrarComoCliente(page)
    await agregarAlCarrito(page, PRODUCTO_A)
    const pedido = await finalizarCompra(page, { zona: 'Culpina', metodo: 'QR' })

    await page.goto(`/pedidos/${pedido.id}`)
    await page.getByLabel('Elegir foto del comprobante de la galería').setInputFiles({ name: 'comprobante-e2e.png', mimeType: 'image/png', buffer: imagenComprobante() })
    await page.getByRole('button', { name: 'Enviar comprobante' }).click()
    await expect(page.getByText('En revisión')).toBeVisible()
    await expect(page.getByRole('link', { name: /Ver comprobante subido/ })).toBeVisible()

    // Admin: con el interruptor apagado el pago de prueba no aparece; encendido, sí
    const admin = await paginaAdmin(browser)
    await admin.goto('/admin/pedidos')
    await datosDePruebaEnPanel(admin, false)
    await expect(admin.getByRole('link', { name: pedido.codigo, exact: true })).toHaveCount(0)
    await datosDePruebaEnPanel(admin, true)
    await expect(admin.getByRole('link', { name: pedido.codigo, exact: true })).toBeVisible()

    // Aprueba el pago (la preferencia del interruptor vale para todo el panel)
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
    await admin.context().close()

    // Cliente: ve la línea de tiempo completa con flota y guía
    await page.reload()
    const seguimiento = page.locator('section', { has: page.getByRole('heading', { name: 'Seguimiento' }) })
    // Nombres para el cliente (fase 4): Pendiente → Pedido recibido, Despachado → En camino
    for (const estado of ['Pedido recibido', 'Confirmado', 'Preparando', 'En camino', 'Entregado']) {
      // "Pedido recibido" aparece dos veces: al crear el pedido y al subir el comprobante
      await expect(seguimiento.getByText(estado, { exact: true }).first()).toBeVisible()
    }
    await expect(page.getByText('Trans Copacabana (E2E)')).toBeVisible()
    await expect(page.getByText(guia)).toBeVisible()
    await expect(page.getByText('Pago verificado').first()).toBeVisible()

    // Limpieza: el pedido entregado se anula y el stock vuelve a lo de antes
    expect(await stockDe(page, productoId)).toBe(stockInicial - 1)
    await limpiarDatosDePrueba(browser)
    expect(await stockDe(page, productoId)).toBe(stockInicial)
    await page.reload()
    await expect(page.getByText('Cancelado', { exact: true }).first()).toBeVisible()
  })
})
