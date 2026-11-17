import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarParametros } from '@/lib/api/validacion'
import { buscarClientes, firmarComprobante } from '@/lib/ecommerce/consultas'
import { ESTADOS_PAGO, type PagoAdmin } from '@/types/comercio'

export const dynamic = 'force-dynamic'

const ESTADOS_REEMBOLSO: string[] = ['reembolso_pendiente', 'reembolsado']

// vista=efectivo: contra entrega cobrada por el repartidor o el almacén, por rendir (0018)
const esquemaParametros = z.object({
  estado: z.enum(ESTADOS_PAGO).optional(),
  vista: z.enum(['efectivo']).optional(),
})

const COLUMNAS_PAGO = 'id, pedido_id, metodo, monto, estado, motivo_rechazo, comprobante_path, created_at, pedidos!inner(codigo, estado, usuario_id, total)'
const COLUMNAS_COBRO = ', cobrado_en, monto_cobrado, cobrado_por'

// GET /api/pagos — Solo admin. Los comprobantes van con URL firmada de corta duración.
// Todos los pagos, de cualquier cuenta.
export const GET = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirAdmin()
  const { estado, vista } = validarParametros(request, esquemaParametros)

  const consultar = (conCobro: boolean) => {
    let consulta = supabase
      .from('pagos')
      .select(conCobro ? COLUMNAS_PAGO + COLUMNAS_COBRO : COLUMNAS_PAGO)
      .order('created_at', { ascending: false })
    if (vista === 'efectivo') {
      consulta = consulta.eq('metodo', 'contra_entrega').eq('estado', 'pendiente').not('cobrado_en', 'is', null)
    } else if (estado) {
      consulta = consulta.eq('estado', estado)
    }
    return consulta
  }

  // Sin la 0018 no existen las columnas del cobro: la lista de siempre (y sin efectivo por rendir)
  let { data, error } = await consultar(true)
  if (error?.code === '42703') {
    if (vista === 'efectivo') return respuestaOk<PagoAdmin[]>([])
    ;({ data, error } = await consultar(false))
  }
  if (error) throw error

  // Los pedidos cancelados solo aparecen si tienen un reembolso que atender o ya hecho
  const delNegocio = (data as unknown as Omit<PagoAdmin, 'comprobante_url'>[]).filter(
    (p) => p.pedidos?.estado !== 'cancelado' || ESTADOS_REEMBOLSO.includes(p.estado)
  )
  // Los nombres de quién cobró (personal) salen de perfiles igual que los de los clientes
  const cobradores = delNegocio.map((p) => (p as unknown as { cobrado_por?: string | null }).cobrado_por)
  const clientes = await buscarClientes(supabase, [...delNegocio.map((p) => p.pedidos?.usuario_id), ...cobradores])
  const deCliente = (pago: (typeof delNegocio)[number]) => (pago.pedidos ? clientes.get(pago.pedidos.usuario_id) ?? null : null)

  const resultado = await Promise.all(
    delNegocio.map(async (pago) => ({
      ...pago,
      comprobante_url: await firmarComprobante(supabase, pago.comprobante_path),
      cliente: deCliente(pago),
      cobrado_por: pago.cobrado_por ? clientes.get(pago.cobrado_por)?.nombre ?? null : null,
    }))
  )

  return respuestaOk<PagoAdmin[]>(resultado)
})
