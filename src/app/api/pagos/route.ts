import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarParametros } from '@/lib/api/validacion'
import { buscarClientes, firmarComprobante } from '@/lib/ecommerce/consultas'
import { ESTADOS_PAGO, type PagoAdmin } from '@/types/comercio'

export const dynamic = 'force-dynamic'

const esquemaParametros = z.object({ estado: z.enum(ESTADOS_PAGO).optional() })

// GET /api/pagos — Solo admin. Los comprobantes van con URL firmada de corta duración.
export const GET = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirAdmin()
  const { estado } = validarParametros(request, esquemaParametros)

  let consulta = supabase
    .from('pagos')
    .select('id, pedido_id, metodo, monto, estado, motivo_rechazo, comprobante_path, created_at, pedidos!inner(codigo, estado, usuario_id)')
    .neq('pedidos.estado', 'cancelado')
    .order('created_at', { ascending: false })

  if (estado) consulta = consulta.eq('estado', estado)

  const { data, error } = await consulta
  if (error) throw error

  const pagos = data as unknown as Omit<PagoAdmin, 'comprobante_url'>[]
  const clientes = await buscarClientes(supabase, pagos.map((p) => p.pedidos?.usuario_id))

  const resultado = await Promise.all(
    pagos.map(async (pago) => ({
      ...pago,
      comprobante_url: await firmarComprobante(supabase, pago.comprobante_path),
      cliente: pago.pedidos ? clientes.get(pago.pedidos.usuario_id) ?? null : null,
    }))
  )

  return respuestaOk<PagoAdmin[]>(resultado)
})
