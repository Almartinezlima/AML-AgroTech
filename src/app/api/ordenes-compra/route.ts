import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarParametros } from '@/lib/api/validacion'
import { COLUMNAS_ORDEN, migracionPendiente } from '@/lib/abastecimiento/consultas'
import { esquemaArmarOrdenes } from '@/lib/abastecimiento/esquemas'
import { llamarFuncionOrden } from '@/lib/abastecimiento/ordenesServidor'
import { esCorreoPrueba, parametroPruebas } from '@/lib/pruebas'
import { ESTADOS_ORDEN_COMPRA, type OrdenCompra, type OrdenCompraResumen } from '@/types/abastecimiento'

export const dynamic = 'force-dynamic'

const esquemaParametros = z.object({
  estado: z.enum(ESTADOS_ORDEN_COMPRA).optional(),
  pruebas: parametroPruebas,
})

type Fila = OrdenCompra & {
  distribuidor: (OrdenCompra['distribuidor'] & { cuenta: { email: string } | null }) | null
  lineas: { cantidad: number }[] | null
}

// GET /api/ordenes-compra — Solo admin. Sin las órdenes de proveedores de prueba
// (@amlagrotech.test) salvo que pida ?pruebas=1.
export const GET = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirAdmin()
  const { estado, pruebas } = validarParametros(request, esquemaParametros)

  let consulta = supabase
    .from('ordenes_compra')
    .select(`${COLUMNAS_ORDEN.replace('telefono)', 'telefono, cuenta:perfiles(email))')}, lineas:orden_compra_items(cantidad)`)
    .order('created_at', { ascending: false })
    .limit(200)
  if (estado) consulta = consulta.eq('estado', estado)

  const { data, error } = await consulta
  if (error) throw migracionPendiente(error)

  const ordenes: OrdenCompraResumen[] = (data as unknown as Fila[]).map(({ lineas, distribuidor, ...orden }) => {
    const { cuenta, ...ficha } = distribuidor ?? { cuenta: null }
    return {
      ...orden,
      distribuidor: distribuidor ? (ficha as OrdenCompra['distribuidor']) : null,
      cantidad_lineas: (lineas ?? []).filter((l) => l.cantidad > 0).length,
      es_prueba: esCorreoPrueba(cuenta?.email),
    }
  })

  return respuestaOk(pruebas ? ordenes : ordenes.filter((o) => !o.es_prueba))
})

// POST /api/ordenes-compra — Solo admin. "Armar orden": junta las líneas por proveedor en su
// borrador (lo crea si no hay). Devuelve los borradores tocados.
export const POST = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirAdmin()
  const { lineas } = await validarCuerpo(request, esquemaArmarOrdenes)

  const data = await llamarFuncionOrden<{ id: string; codigo: string; distribuidor_id: string }[]>(
    supabase, 'crear_ordenes_compra', { p_lineas: lineas }
  )
  return respuestaOk(data, 201)
})
