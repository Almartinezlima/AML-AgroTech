import { test as setup } from '@playwright/test'
import {
  DOMINIO_PRUEBAS, anularPedidoPrueba, credencialesAdmin, credencialesCliente, desactivarCuenta, paginaAdmin, usuariosDePrueba,
} from './utilidades'

interface PedidoListado {
  id: string
  codigo: string
  estado: string
  estado_pago: string
  cliente: { email: string } | null
}

// Corre una vez antes de todas las pruebas: cierra lo que dejó abierto una corrida anterior
// que se cortó a la mitad (pedidos del cliente fijo y cuentas de la prueba de registro).
// No toca los datos viejos de antes de la fase 2B: eso va en la fase de cierre.
setup('barrido de datos de prueba abiertos', async ({ browser }) => {
  const cliente = credencialesCliente()
  setup.skip(!cliente || !credencialesAdmin(), 'Sin las dos cuentas de prueba en .env.test.local no hay nada que barrer')

  const admin = await paginaAdmin(browser)
  try {
    const respuesta = await admin.request.get('/api/pedidos?alcance=todos&pruebas=1')
    if (!respuesta.ok()) throw new Error(`GET /api/pedidos: ${respuesta.status()}`)
    const pedidos = ((await respuesta.json()) as { data: PedidoListado[] }).data

    const abiertos = pedidos.filter(
      (p) =>
        p.cliente?.email.toLowerCase() === cliente!.email.toLowerCase() &&
        (p.estado !== 'cancelado' || p.estado_pago === 'reembolso_pendiente')
    )
    for (const pedido of abiertos) {
      await anularPedidoPrueba(admin, pedido.id)
      console.log(`Barrido: anulado ${pedido.codigo} (${pedido.estado})`)
    }

    // Solo las cuentas que crea la prueba de registro desde la fase 2B
    const registros = (await usuariosDePrueba(admin)).filter(
      (u) => u.activo && u.email.startsWith('e2e+registro-') && u.email.endsWith(DOMINIO_PRUEBAS)
    )
    for (const usuario of registros) {
      await desactivarCuenta(admin, usuario)
      console.log(`Barrido: desactivada ${usuario.email}`)
    }
  } finally {
    await admin.context().close()
  }
})
