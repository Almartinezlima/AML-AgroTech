import { entrarComoCliente, esperarCarga, exigirAdmin, expect, paginaAdmin, paginaDistribuidor, test } from './utilidades'

// Fase 6A: el distribuidor es el proveedor mayorista. Usa los 2 distribuidores de
// demostración de la migración 0014 y NO crea nada: lo único que cambia (disponible) lo
// deja como estaba.

interface PresentacionApi { id: string; distribuidor_id: string; disponible: boolean; activo: boolean }
interface DistribuidorApi { id: string; cuenta: { email: string } | null; presentaciones: PresentacionApi[] }

test.describe('Distribuidor (proveedor)', () => {
  test('el registro ya no ofrece la cuenta de distribuidor', async ({ page }) => {
    await page.goto('/auth/registro')
    await expect(page.getByRole('button', { name: 'Crear cuenta gratis' })).toBeVisible()
    await expect(page.getByText('Distribuidor', { exact: false })).toHaveCount(0)
    await expect(page.getByText('Tipo de cuenta')).toHaveCount(0)
  })

  test('un cliente no entra al panel del proveedor ni a su API', async ({ page }) => {
    await entrarComoCliente(page)
    await page.goto('/distribuidor')
    await expect(page).toHaveURL((url) => url.pathname === '/')
    const respuesta = await page.request.get('/api/distribuidor/presentaciones')
    expect(respuesta.status()).toBe(403)
  })

  test('el distribuidor ve solo lo suyo y no toca lo del otro', async ({ browser }) => {
    exigirAdmin()
    const admin = await paginaAdmin(browser)
    const resumen = await (await admin.request.get('/api/distribuidores')).json()
    const fichas = resumen.data.distribuidores as DistribuidorApi[]
    const sucre = fichas.find((f) => f.cuenta?.email === process.env.E2E_DIST1_EMAIL)
    const scz = fichas.find((f) => f.cuenta?.email === process.env.E2E_DIST2_EMAIL)
    expect(sucre && scz, 'los 2 distribuidores de la 0014 tienen ficha').toBeTruthy()
    const ajena = scz!.presentaciones.find((p) => p.activo)!

    const dist = await paginaDistribuidor(browser, 1)
    await esperarCarga(dist)
    await expect(dist.getByRole('heading', { level: 1 })).toHaveText('Agroinsumos del Sur')

    // Solo las suyas
    const propias = (await (await dist.request.get('/api/distribuidor/presentaciones')).json()).data as PresentacionApi[]
    expect(propias.length).toBeGreaterThan(0)
    expect(propias.every((p) => p.distribuidor_id === sucre!.id)).toBe(true)

    // La del otro no existe para él: ni editarla ni darla de baja
    const intento = await dist.request.patch(`/api/distribuidor/presentaciones/${ajena.id}`, { data: { precio_mayorista: 1 } })
    expect(intento.status()).toBe(404)

    // Ni el panel admin ni la lista de proveedores
    expect((await dist.request.get('/api/distribuidores')).status()).toBe(403)
    await dist.goto('/admin')
    await expect(dist).toHaveURL((url) => url.pathname === '/')

    // Ni una presentación a nombre de otro proveedor (el servidor pone siempre la suya)
    const ajenaDeOtro = await dist.request.post('/api/distribuidor/presentaciones', {
      data: { producto_id: '00000000-0000-4000-8000-000000000000', distribuidor_id: scz!.id, nombre: 'X', unidades_por_presentacion: 1, precio_mayorista: 1, disponible: true, dias_entrega: null },
    })
    expect(ajenaDeOtro.status()).toBe(422)
  })

  test('marcar sin stock se ve en el panel del admin y se puede revertir', async ({ browser }) => {
    exigirAdmin()
    const dist = await paginaDistribuidor(browser, 1)
    await esperarCarga(dist)
    const tarjeta = dist.locator('li', { has: dist.getByRole('button', { name: 'Marcar sin stock' }) }).first()
    const producto = (await tarjeta.locator('p').first().textContent())!.trim()
    const presentacion = (await tarjeta.locator('p').nth(1).textContent())!.split('·')[0].trim()

    await tarjeta.getByRole('button', { name: 'Marcar sin stock' }).click()
    const misma = dist.locator('li', { hasText: producto }).filter({ hasText: presentacion }).first()
    await expect(misma.getByText('Sin stock')).toBeVisible()

    try {
      const admin = await paginaAdmin(browser)
      await admin.goto('/admin/abastecimiento/distribuidores')
      await esperarCarga(admin)
      const ficha = admin.locator('li', { hasText: 'Agroinsumos del Sur' }).first()
      await ficha.getByText(/Ver lo que vende/).click()
      await expect(ficha.locator('li', { hasText: producto }).filter({ hasText: presentacion }).getByText('Sin stock')).toBeVisible()
    } finally {
      // Queda como estaba
      await misma.getByRole('button', { name: 'Marcar disponible' }).click()
      await expect(misma.getByText('Disponible', { exact: true })).toBeVisible()
    }
  })
})
