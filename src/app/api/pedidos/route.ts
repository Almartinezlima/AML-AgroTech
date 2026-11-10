import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin, requerirSesion } from '@/lib/api/sesion'
import { validarCuerpo, validarParametros } from '@/lib/api/validacion'
import { buscarClientes, COLUMNAS_PEDIDO_RESUMEN } from '@/lib/ecommerce/consultas'
import { esquemaCrearPedido } from '@/lib/ecommerce/esquemas'
import { ESTADOS_PEDIDO, type PedidoCreado, type PedidoResumen } from '@/types/comercio'

export const dynamic = 'force-dynamic'

const esquemaParametros = z.object({
  alcance: z.enum(['propios', 'todos']).default('propios'),
  estado: z.enum(ESTADOS_PEDIDO).optional(),
})

// GET /api/pedidos — Los propios. Con ?alcance=todos, solo admin.
export const GET = manejarRuta(async (request: NextRequest) => {
  const { alcance, estado } = validarParametros(request, esquemaParametros)
  const sesion = alcance === 'todos' ? await requerirAdmin() : await requerirSesion()

  let consulta = sesion.supabase
    .from('pedidos')
    .select(COLUMNAS_PEDIDO_RESUMEN)
    .order('created_at', { ascending: false })

  if (alcance === 'propios') consulta = consulta.eq('usuario_id', sesion.user.id)
  if (estado) consulta = consulta.eq('estado', estado)

  const { data, error } = await consulta
  if (error) throw error

  const pedidos = data as unknown as PedidoResumen[]

  if (alcance === 'propios') return respuestaOk(pedidos)

  const clientes = await buscarClientes(sesion.supabase, pedidos.map((p) => p.usuario_id))
  return respuestaOk(pedidos.map((p) => ({ ...p, cliente: clientes.get(p.usuario_id) ?? null })))
})

// POST /api/pedidos — Crea el pedido. Precios y totales los calcula la base.
export const POST = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirSesion()
  const pedido = await validarCuerpo(request, esquemaCrearPedido)

  const { data, error } = await supabase.rpc('crear_pedido', {
    p_items: pedido.items,
    p_zona_id: pedido.zona_id,
    p_direccion: pedido.direccion ?? null,
    p_telefono: pedido.telefono,
    p_metodo_pago: pedido.metodo_pago,
    p_notas: pedido.notas ?? null,
  })

  if (error) throw error

  return respuestaOk(data as PedidoCreado, 201)
})
