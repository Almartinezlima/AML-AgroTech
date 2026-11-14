import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarParametros } from '@/lib/api/validacion'
import { buscarClientes, firmarComprobante } from '@/lib/ecommerce/consultas'
import { esCorreoPrueba, parametroPruebas } from '@/lib/pruebas'
import { ESTADOS_PAGO, type PagoAdmin } from '@/types/comercio'

export const dynamic = 'force-dynamic'

const ESTADOS_REEMBOLSO: string[] = ['reembolso_pendiente', 'reembolsado']

const esquemaParametros = z.object({ estado: z.enum(ESTADOS_PAGO).optional(), pruebas: parametroPruebas })

// GET /api/pagos — Solo admin. Los comprobantes van con URL firmada de corta duración.
// Sin los pagos de cuentas de prueba (@amlagrotech.test) salvo ?pruebas=1.
export const GET = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirAdmin()
  const { estado, pruebas } = validarParametros(request, esquemaParametros)

  let consulta = supabase
    .from('pagos')
    .select('id, pedido_id, metodo, monto, estado, motivo_rechazo, comprobante_path, created_at, pedidos!inner(codigo, estado, usuario_id)')
    .order('created_at', { ascending: false })

  if (estado) consulta = consulta.eq('estado', estado)

  const { data, error } = await consulta
  if (error) throw error

  // Los pedidos cancelados solo aparecen si tienen un reembolso que atender o ya hecho
  const delNegocio = (data as unknown as Omit<PagoAdmin, 'comprobante_url'>[]).filter(
    (p) => p.pedidos?.estado !== 'cancelado' || ESTADOS_REEMBOLSO.includes(p.estado)
  )
  const clientes = await buscarClientes(supabase, delNegocio.map((p) => p.pedidos?.usuario_id))
  const deCliente = (pago: (typeof delNegocio)[number]) => (pago.pedidos ? clientes.get(pago.pedidos.usuario_id) ?? null : null)
  const pagos = pruebas ? delNegocio : delNegocio.filter((p) => !esCorreoPrueba(deCliente(p)?.email))

  const resultado = await Promise.all(
    pagos.map(async (pago) => ({
      ...pago,
      comprobante_url: await firmarComprobante(supabase, pago.comprobante_path),
      cliente: deCliente(pago),
    }))
  )

  return respuestaOk<PagoAdmin[]>(resultado)
})
