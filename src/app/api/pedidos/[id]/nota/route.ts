import { NextResponse } from 'next/server'
import { ErrorApi, manejarRuta } from '@/lib/api/respuestas'
import { requerirSesion } from '@/lib/api/sesion'
import { validarUuid } from '@/lib/api/validacion'
import { buscarClientes } from '@/lib/ecommerce/consultas'
import { MENSAJE_NOTA_CANCELADO, MENSAJE_NOTA_NO_DISPONIBLE, nombreArchivoNota, situacionNota } from '@/lib/ecommerce/notaVenta'
import { generarNotaPdf, type DatosNotaPdf } from '@/lib/ecommerce/notaVentaPdf'

// pdfkit necesita Node (fs, Buffer) y cada nota se arma al momento: sin caché
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COLUMNAS_NOTA =
  'id, codigo, usuario_id, estado, estado_pago, metodo_pago, subtotal, costo_envio, total, created_at, ' +
  'direccion_entrega, telefono_contacto, recoge_nombre, recoge_ci, zonas_envio(nombre, tipo), ' +
  'pedido_items(nombre_producto, precio_unitario, cantidad, subtotal, productos(unidad)), seguimiento_pedido(estado)'

type PedidoNota = Omit<DatosNotaPdf, 'cliente' | 'anulada' | 'enlacePedido' | 'whatsapp'> & {
  usuario_id: string
  seguimiento_pedido: Array<{ estado: DatosNotaPdf['estado'] }>
}

// Origen público del sitio: en Render la app corre detrás de un proxy
function origenPublico(request: Request) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const protocolo = request.headers.get('x-forwarded-proto') ?? 'http'
  return host ? `${protocolo.split(',')[0]}://${host.split(',')[0]}` : new URL(request.url).origin
}

// GET /api/pedidos/:id/nota — PDF de la nota de venta. Dueño o admin.
// 401 sin sesión · 404 si no existe o es ajeno · 409 si todavía no hay venta confirmada.
export const GET = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase, user, perfil } = await requerirSesion()
  const id = validarUuid(params.id)

  let consulta = supabase.from('pedidos').select(COLUMNAS_NOTA).eq('id', id)
  // Además de la RLS: el cliente solo ve los suyos
  if (perfil.rol !== 'admin') consulta = consulta.eq('usuario_id', user.id)
  const { data, error } = await consulta.maybeSingle()

  if (error) throw error
  if (!data) throw new ErrorApi(404, 'NO_ENCONTRADO', 'El pedido no existe.')

  const pedido = data as unknown as PedidoNota
  const situacion = situacionNota(pedido)
  if (situacion === 'no_disponible') {
    throw new ErrorApi(409, 'NOTA_NO_DISPONIBLE', pedido.estado === 'cancelado' ? MENSAJE_NOTA_CANCELADO : MENSAJE_NOTA_NO_DISPONIBLE)
  }

  const clientes = await buscarClientes(supabase, [pedido.usuario_id])
  const cliente = clientes.get(pedido.usuario_id)

  const pdf = await generarNotaPdf({
    ...pedido,
    cliente: cliente ? { nombre: cliente.nombre, telefono: cliente.telefono } : null,
    anulada: situacion === 'anulada',
    enlacePedido: `${origenPublico(request)}/pedidos/${pedido.id}`,
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_TIENDA ?? null,
  })

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombreArchivoNota(pedido.codigo)}"`,
      'Content-Length': String(pdf.length),
      'Cache-Control': 'private, no-store',
    },
  })
})
