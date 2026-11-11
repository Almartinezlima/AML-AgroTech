import { expect, test } from '@playwright/test'
import {
  PRODUCTO_B, agregarAlCarrito, exigirAdmin, exigirRegistroDirecto, finalizarCompra,
  idDeProducto, paginaAdmin, registrarCliente, stockDe,
} from './utilidades'

test.describe('Inventario', () => {
  test('el stock baja al comprar, vuelve al cancelar y queda en el kardex', async ({ page, browser }) => {
    await exigirRegistroDirecto()
    exigirAdmin()

    const productoId = await idDeProducto(page, PRODUCTO_B)
    const inicial = await stockDe(page, productoId)

    // Compra 3 unidades
    await registrarCliente(page)
    await agregarAlCarrito(page, PRODUCTO_B)
    await page.goto('/carrito')
    const mas = page.getByRole('button', { name: `Agregar uno de ${PRODUCTO_B}` })
    await mas.click()
    await mas.click()
    // Codo PVC a Bs. 11,00 × 3
    await expect(page.getByText('Bs. 33,00').first()).toBeVisible()
    const pedido = await finalizarCompra(page, { zona: 'entrega en el pueblo', metodo: 'Contra entrega' })
    expect(await stockDe(page, productoId)).toBe(inicial - 3)

    // El cliente cancela: el stock vuelve
    await page.goto(`/pedidos/${pedido.id}`)
    await page.getByRole('button', { name: 'Cancelar pedido' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, cancelar' }).click()
    await expect(page.getByText('Cancelado', { exact: true }).first()).toBeVisible()
    expect(await stockDe(page, productoId)).toBe(inicial)

    // El kardex muestra la salida y la devolución de ese pedido
    const admin = await paginaAdmin(browser)
    await admin.goto(`/admin/inventario/${productoId}`)
    const venta = admin.locator('li', { hasText: `Venta ${pedido.codigo}` })
    const devolucion = admin.locator('li', { hasText: `Cancelación ${pedido.codigo}` })
    await expect(venta).toContainText('Salida')
    await expect(venta).toContainText('-3')
    await expect(devolucion).toContainText('Devolución')
    await expect(devolucion).toContainText('+3')
  })

  test('el admin registra una entrada y el stock sube', async ({ page, browser }) => {
    exigirAdmin()
    const productoId = await idDeProducto(page, PRODUCTO_B)
    const inicial = await stockDe(page, productoId)
    const admin = await paginaAdmin(browser)

    const registrar = async (tipo: 'entrada' | 'ajuste', cantidad: number, motivo: string) => {
      await admin.goto('/admin/inventario')
      const fila = admin.locator('li', { hasText: PRODUCTO_B })
      await fila.getByRole('button', { name: 'Movimiento' }).click()
      const modal = admin.getByRole('dialog')
      await modal.getByLabel('Tipo').selectOption(tipo)
      await modal.getByLabel(/Cantidad/).fill(String(cantidad))
      await modal.getByLabel('Motivo').fill(motivo)
      await modal.getByRole('button', { name: 'Registrar' }).click()
      await expect(modal).toHaveCount(0)
    }

    await registrar('entrada', 5, 'E2E: entrada de prueba')
    expect(await stockDe(page, productoId)).toBe(inicial + 5)

    await admin.goto(`/admin/inventario/${productoId}`)
    await expect(admin.locator('li', { hasText: 'E2E: entrada de prueba' }).first()).toContainText('+5')

    // Se deja el stock como estaba (queda registrado como ajuste en el kardex)
    await registrar('ajuste', -5, 'E2E: revierte la entrada de prueba')
    expect(await stockDe(page, productoId)).toBe(inicial)
  })
})
