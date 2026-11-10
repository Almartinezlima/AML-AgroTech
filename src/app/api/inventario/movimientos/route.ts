import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarParametros } from '@/lib/api/validacion'
import { buscarClientes } from '@/lib/ecommerce/consultas'
import { esquemaMovimiento } from '@/lib/ecommerce/esquemas'
import type { Movimiento } from '@/types/comercio'

export const dynamic = 'force-dynamic'

const esquemaParametros = z.object({
  producto: z.uuid().optional(),
  formato: z.enum(['json', 'csv']).default('json'),
})

const MAX_FILAS = 2000

const formatoFecha = new Intl.DateTimeFormat('es-BO', {
  timeZone: 'America/La_Paz',
  dateStyle: 'short',
  timeStyle: 'short',
})

// Comillas para CSV y prefijo para que Excel no ejecute texto como fórmula
function celdaCsv(valor: string | number | null | undefined) {
  const texto = String(valor ?? '')
  const seguro = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto
  return `"${seguro.replace(/"/g, '""')}"`
}

function generarCsv(movimientos: Movimiento[]) {
  const cabecera = ['Fecha', 'SKU', 'Producto', 'Tipo', 'Cantidad', 'Stock anterior', 'Stock nuevo', 'Motivo', 'Usuario']
  const filas = movimientos.map((m) => [
    formatoFecha.format(new Date(m.created_at)),
    m.productos?.sku,
    m.productos?.nombre,
    m.tipo,
    m.cantidad,
    m.stock_anterior,
    m.stock_nuevo,
    m.motivo,
    m.usuario,
  ])
  // El BOM hace que Excel lea bien las tildes
  return '﻿' + [cabecera, ...filas].map((fila) => fila.map(celdaCsv).join(',')).join('\r\n')
}

// GET /api/inventario/movimientos — Solo admin. ?producto=<id> y ?formato=csv.
export const GET = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirAdmin()
  const { producto, formato } = validarParametros(request, esquemaParametros)

  let consulta = supabase
    .from('movimientos_inventario')
    .select('id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, pedido_id, usuario_id, created_at, productos(nombre, sku)')
    .order('created_at', { ascending: false })
    .limit(MAX_FILAS)

  if (producto) consulta = consulta.eq('producto_id', producto)

  const { data, error } = await consulta
  if (error) throw error

  const filas = data as unknown as Movimiento[]
  const usuarios = await buscarClientes(supabase, filas.map((m) => m.usuario_id))
  const movimientos = filas.map((m) => ({
    ...m,
    usuario: m.usuario_id ? usuarios.get(m.usuario_id)?.nombre ?? null : null,
  }))

  if (formato === 'csv') {
    return new NextResponse(generarCsv(movimientos), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="kardex.csv"',
      },
    })
  }

  return respuestaOk(movimientos)
})

// POST /api/inventario/movimientos — Solo admin. Registra una entrada o un ajuste.
export const POST = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirAdmin()
  const movimiento = await validarCuerpo(request, esquemaMovimiento)

  const { data, error } = await supabase.rpc('registrar_movimiento', {
    p_producto_id: movimiento.producto_id,
    p_tipo: movimiento.tipo,
    p_cantidad: movimiento.cantidad,
    p_motivo: movimiento.motivo,
  })

  if (error) throw error

  return respuestaOk(data, 201)
})
