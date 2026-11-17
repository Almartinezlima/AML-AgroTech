import {
  exigirAdmin, exigirRegistroDirecto, expect, iniciarSesion, limpiarDatosDePrueba, paginaAdmin, registrarCuentaTemporal,
  test, usuariosDePrueba,
} from './utilidades'

// La única prueba que crea una cuenta: se registra por la pantalla y al final el admin la
// desactiva (no se puede borrar sin la service role, y tampoco se borra nada: regla del proyecto)
test.describe('Registro', () => {
  test('una cuenta nueva entra directo al catálogo y queda desactivada al terminar', async ({ page, browser }) => {
    await exigirRegistroDirecto()
    exigirAdmin()

    const cuenta = await registrarCuentaTemporal(page)
    await expect(page.getByRole('button', { name: 'Salir' })).toBeVisible()

    // Limpieza explícita para comprobarla: la cuenta queda desactivada
    await limpiarDatosDePrueba(browser)
    const admin = await paginaAdmin(browser)
    const usuario = (await usuariosDePrueba(admin)).find((u) => u.email === cuenta.email)
    expect(usuario?.activo).toBe(false)

    // Desde la 8A-2, /api/usuarios lista todos los perfiles (también los desactivados):
    // la cuenta sigue apareciendo, pero desactivada. Nada se borra.
    const lista = await admin.request.get('/api/usuarios')
    const visibles = ((await lista.json()) as { data: Array<{ email: string; activo: boolean }> }).data
    expect(visibles.find((u) => u.email === cuenta.email)?.activo).toBe(false)
    await admin.context().close()

    // Si intenta entrar, ve el aviso de cuenta desactivada
    const otro = await (await browser.newContext()).newPage()
    await iniciarSesion(otro, cuenta)
    await expect(otro).toHaveURL(/\/cuenta-desactivada/)
    await otro.context().close()
  })
})
