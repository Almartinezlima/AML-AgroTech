import { ErrorApi, manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirDistribuidor, requerirSesion } from '@/lib/api/sesion'
import { validarUuid } from '@/lib/api/validacion'
import { ordenParaAdmin, ordenParaProveedor } from '@/lib/abastecimiento/ordenesServidor'

export const dynamic = 'force-dynamic'

// GET /api/ordenes-compra/:id — El admin ve todo (con stock y costo para la recepción).
// El proveedor ve solo sus órdenes enviadas, sin stock, costos ni clientes; la de otro
// proveedor (o un borrador) no existe para él: 404.
export const GET = manejarRuta<{ params: { id: string } }>(async (_request, { params }) => {
  const id = validarUuid(params.id)
  const sesion = await requerirSesion()

  if (sesion.perfil.rol === 'admin') return respuestaOk(await ordenParaAdmin(sesion.supabase, id))

  if (sesion.perfil.rol === 'distribuidor') {
    const { supabase, distribuidorId } = await requerirDistribuidor()
    return respuestaOk(await ordenParaProveedor(supabase, id, distribuidorId))
  }

  throw new ErrorApi(403, 'SIN_PERMISO', 'No tienes permiso para esta acción.')
})
