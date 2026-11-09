import { ErrorApi, manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirSesion } from '@/lib/api/sesion'
import { validarUuid } from '@/lib/api/validacion'
import { buscarClientes, COLUMNAS_PEDIDO_DETALLE, firmarComprobante } from '@/lib/ecommerce/consultas'
import type { PedidoDetalle } from '@/types/comercio'

export const dynamic = 'force-dynamic'

// GET /api/pedidos/:id — Dueño o admin.
export const GET = manejarRuta<{ params: { id: string } }>(async (_request, { params }) => {
  const { supabase, user, perfil } = await requerirSesion()
  const id = validarUuid(params.id)
  const esAdmin = perfil.rol === 'admin'

  let consulta = supabase
    .from('pedidos')
    .select(COLUMNAS_PEDIDO_DETALLE)
    .eq('id', id)
    .order('created_at', { referencedTable: 'seguimiento_pedido', ascending: true })

  if (!esAdmin) consulta = consulta.eq('usuario_id', user.id)

  const { data, error } = await consulta.maybeSingle()

  if (error) throw error
  if (!data) throw new ErrorApi(404, 'NO_ENCONTRADO', 'El pedido no existe.')

  const pedido = data as unknown as Omit<PedidoDetalle, 'comprobante_url'>
  const comprobanteUrl = await firmarComprobante(supabase, pedido.pagos?.comprobante_path)
  const clientes = esAdmin ? await buscarClientes(supabase, [pedido.usuario_id]) : null

  return respuestaOk<PedidoDetalle>({
    ...pedido,
    comprobante_url: comprobanteUrl,
    cliente: clientes?.get(pedido.usuario_id) ?? null,
  })
})
