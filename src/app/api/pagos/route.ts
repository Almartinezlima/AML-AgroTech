import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarParametros } from '@/lib/api/validacion'
import { buscarClientes, firmarComprobante } from '@/lib/ecommerce/consultas'
import { ESTADOS_PAGO, type PagoAdmin } from '@/types/comercio'

export const dynamic = 'force-dynamic'

const ESTADOS_REEMBOLSO: string[] = ['reembolso_pendiente', 'reembolsado']

const esquemaParametros = z.object({
  estado: z.enum(ESTADOS_PAGO).optional(),
})

const COLUMNAS_PAGO = 'id, pedido_id, metodo, monto, estado, motivo_rechazo, comprobante_path, created_at, pedidos!inner(codigo, estado, usuario_id, total)'

// GET /api/pagos — Solo admin. Los comprobantes van con URL firmada de corta duración.
// Todos los pagos, de cualquier cuenta. Desde la 9F solo hay QR (sin efectivo por rendir).
export const GET = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirAdmin()
  const { estado } = validarParametros(request, esquemaParametros)

  let consulta = supabase.from('pagos').select(COLUMNAS_PAGO).order('created_at', { ascending: false })
  if (estado) consulta = consulta.eq('estado', estado)

  const { data, error } = await consulta
  if (error) throw error

  // Los pedidos cancelados solo aparecen si tienen un reembolso que atender o ya hecho
  const delNegocio = (data as unknown as Omit<PagoAdmin, 'comprobante_url'>[]).filter(
    (p) => p.pedidos?.estado !== 'cancelado' || ESTADOS_REEMBOLSO.includes(p.estado)
  )
  const clientes = await buscarClientes(supabase, delNegocio.map((p) => p.pedidos?.usuario_id))
  const deCliente = (pago: (typeof delNegocio)[number]) => (pago.pedidos ? clientes.get(pago.pedidos.usuario_id) ?? null : null)

  const resultado = await Promise.all(
    delNegocio.map(async (pago) => ({
      ...pago,
      comprobante_url: await firmarComprobante(supabase, pago.comprobante_path),
      cliente: deCliente(pago),
    }))
  )

  return respuestaOk<PagoAdmin[]>(resultado)
})
