import { expect, test } from '@playwright/test'
import { PRODUCTO_A, agregarAlCarrito, cerrarSesion, exigirRegistroDirecto, iniciarSesion, registrarCliente } from './utilidades'

test.describe('Seguridad', () => {
  for (const ruta of ['/admin', '/pedidos', '/checkout']) {
    test(`sin sesión, ${ruta} manda al login y recuerda a dónde iba`, async ({ page }) => {
      await page.goto(ruta)
      await expect(page).toHaveURL(new RegExp(`/auth/login\\?siguiente=${encodeURIComponent(ruta)}`))
      await expect(page.getByRole('heading', { name: 'Bienvenido de vuelta' })).toBeVisible()
    })
  }

  test('la API sin sesión responde 401 con el formato de error', async ({ request }) => {
    for (const ruta of ['/api/pedidos', '/api/usuarios', '/api/pagos', '/api/inventario/movimientos']) {
      const respuesta = await request.get(ruta)
      expect(respuesta.status(), ruta).toBe(401)
      const cuerpo = await respuesta.json()
      expect(cuerpo.error.codigo, ruta).toBe('NO_AUTENTICADO')
    }
  })

  test('login con contraseña mala muestra el motivo real', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Correo electrónico').fill(`e2e+inexistente${Date.now()}@amlagrotech.test`)
    await page.getByLabel('Contraseña').fill('contraseña-incorrecta')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    // (Next agrega su propio role="alert" vacío para anunciar rutas: se filtra por el texto)
    await expect(page.getByRole('alert').filter({ hasText: 'Correo o contraseña incorrectos' })).toBeVisible()
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('/auth/restablecer sin enlace válido no deja cambiar nada', async ({ page }) => {
    await page.goto('/auth/restablecer?code=codigo-falso-e2e')
    await expect(page.getByText('Enlace inválido o vencido')).toBeVisible()
    await expect(page.getByLabel('Contraseña nueva')).toHaveCount(0)
  })

  test.describe('con un cliente registrado', () => {
    test.beforeEach(async () => {
      await exigirRegistroDirecto()
    })

    test('un cliente que entra a /admin vuelve al inicio', async ({ page }) => {
      await registrarCliente(page)
      await page.goto('/admin')
      await expect(page).toHaveURL(/\/$/)
      await expect(page.getByRole('link', { name: 'Panel Admin' })).toHaveCount(0)
    })

    test('un cliente en /api/usuarios recibe 403', async ({ page }) => {
      await registrarCliente(page)
      const respuesta = await page.request.get('/api/usuarios')
      expect(respuesta.status()).toBe(403)
      expect((await respuesta.json()).error.codigo).toBe('SIN_PERMISO')
    })

    test('/auth/restablecer con una sesión normal abierta NO permite cambiar la contraseña', async ({ page }) => {
      await registrarCliente(page)
      // Sin enlace
      await page.goto('/auth/restablecer')
      await expect(page.getByText('Enlace inválido o vencido')).toBeVisible()
      await expect(page.getByLabel('Contraseña nueva')).toHaveCount(0)
      // Con un code que este navegador nunca pidió (el caso que cambió la contraseña del admin)
      await page.goto('/auth/restablecer?code=00000000-0000-0000-0000-000000000000')
      await expect(page.getByText('Enlace inválido o vencido')).toBeVisible()
      await expect(page.getByLabel('Contraseña nueva')).toHaveCount(0)
      // La sesión sigue abierta y nadie tocó la contraseña
      await page.goto('/pedidos')
      await expect(page).toHaveURL(/\/pedidos/)
    })

    test('después del login vuelve a donde iba', async ({ page, browser }) => {
      const cuenta = await registrarCliente(page)
      const otro = await (await browser.newContext()).newPage()
      await otro.goto('/pedidos')
      await expect(otro).toHaveURL(/siguiente=%2Fpedidos/)
      await iniciarSesion(otro, cuenta, '/pedidos')
      await expect(otro).toHaveURL(/\/pedidos$/)
      // Un destino externo se ignora
      const tercero = await (await browser.newContext()).newPage()
      await iniciarSesion(tercero, cuenta, '//sitio-malicioso.com')
      await expect(tercero).toHaveURL(/localhost:\d+\/$/)
    })

    test('el carrito de una cuenta no lo ve otra en el mismo navegador', async ({ page }) => {
      const primera = await registrarCliente(page)
      await agregarAlCarrito(page, PRODUCTO_A)
      await page.goto('/carrito')
      await expect(page.getByText(PRODUCTO_A)).toBeVisible()

      // Sale y entra otra persona en el mismo navegador
      await cerrarSesion(page)
      await registrarCliente(page)
      await page.goto('/carrito')
      await expect(page.getByText('Tu carrito está vacío')).toBeVisible()

      // La primera cuenta recupera su carrito al volver
      await cerrarSesion(page)
      await iniciarSesion(page, primera, '/carrito')
      await expect(page.getByText(PRODUCTO_A)).toBeVisible()
    })
  })
})
