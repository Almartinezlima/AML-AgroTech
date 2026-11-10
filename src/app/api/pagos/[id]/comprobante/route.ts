import { randomUUID } from 'crypto'
import { ErrorApi, manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirSesion } from '@/lib/api/sesion'
import { validarUuid } from '@/lib/api/validacion'
import { leerArchivo, TIPOS_COMPROBANTE } from '@/lib/api/archivos'

const MAX_COMPROBANTE = 3 * 1024 * 1024

// POST /api/pagos/:pedidoId/comprobante — Solo el dueño del pedido.
// La carpeta se llama [id] porque Next exige un mismo nombre con /pagos/[id]/verificar.
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase, user } = await requerirSesion()
  const pedidoId = validarUuid(params.id)

  // Se comprueba antes de subir para no dejar archivos sueltos
  const { data: pedido, error: errorPedido } = await supabase
    .from('pedidos')
    .select('id')
    .eq('id', pedidoId)
    .eq('usuario_id', user.id)
    .maybeSingle()

  if (errorPedido) throw errorPedido
  if (!pedido) throw new ErrorApi(404, 'NO_ENCONTRADO', 'El pedido no existe.')

  const { bytes, tipo } = await leerArchivo(request, TIPOS_COMPROBANTE, MAX_COMPROBANTE)
  const ruta = `${user.id}/${pedidoId}/${randomUUID()}.${tipo.extension}`

  const { error: errorSubida } = await supabase.storage
    .from('comprobantes')
    .upload(ruta, bytes, { contentType: tipo.mime })

  if (errorSubida) throw errorSubida

  const { data, error } = await supabase.rpc('registrar_comprobante', {
    p_pedido_id: pedidoId,
    p_path: ruta,
  })

  if (error) throw error

  return respuestaOk(data, 201)
})
