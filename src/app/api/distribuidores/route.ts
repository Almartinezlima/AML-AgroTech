import type { NextRequest } from 'next/server'
import { ErrorApi, manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo } from '@/lib/api/validacion'
import { COLUMNAS_DISTRIBUIDOR, COLUMNAS_PRESENTACION } from '@/lib/abastecimiento/consultas'
import { esquemaCrearDistribuidor } from '@/lib/abastecimiento/esquemas'
import { esCorreoPrueba } from '@/lib/pruebas'
import type { CuentaSinFicha, Distribuidor, DistribuidorAdmin, Presentacion, ResumenDistribuidoresAdmin } from '@/types/abastecimiento'

export const dynamic = 'force-dynamic'

type FilaDistribuidor = Distribuidor & {
  cuenta: DistribuidorAdmin['cuenta']
  presentaciones: Presentacion[] | null
}

// GET /api/distribuidores — Solo admin. Las fichas con su cuenta y lo que vende cada uno,
// y las cuentas con rol distribuidor que todavía no tienen ficha.
export const GET = manejarRuta(async () => {
  const { supabase } = await requerirAdmin()

  const [fichas, cuentas] = await Promise.all([
    supabase
      .from('distribuidores')
      .select(`${COLUMNAS_DISTRIBUIDOR}, cuenta:perfiles(nombre, email, activo), presentaciones:presentaciones_distribuidor(${COLUMNAS_PRESENTACION})`)
      .order('activo', { ascending: false })
      .order('nombre_comercial'),
    supabase.from('perfiles').select('id, nombre, email').eq('rol', 'distribuidor').order('nombre'),
  ])

  if (fichas.error) throw fichas.error
  if (cuentas.error) throw cuentas.error

  const filas = fichas.data as unknown as FilaDistribuidor[]
  const conFicha = new Set(filas.map((f) => f.usuario_id))

  const distribuidores: DistribuidorAdmin[] = filas.map((f) => ({
    ...f,
    es_prueba: esCorreoPrueba(f.cuenta?.email),
    // Activas primero y por producto
    presentaciones: [...(f.presentaciones ?? [])].sort(
      (a, b) => Number(b.activo) - Number(a.activo) || (a.productos?.nombre ?? '').localeCompare(b.productos?.nombre ?? '', 'es')
    ),
  }))

  const resumen: ResumenDistribuidoresAdmin = {
    distribuidores,
    cuentas_sin_ficha: (cuentas.data as CuentaSinFicha[]).filter((c) => !conFicha.has(c.id)),
  }
  return respuestaOk(resumen)
})

// POST /api/distribuidores — Solo admin. Crea la ficha de una cuenta con rol distribuidor.
export const POST = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirAdmin()
  const ficha = await validarCuerpo(request, esquemaCrearDistribuidor)

  const { data, error } = await supabase
    .from('distribuidores')
    .insert(ficha)
    .select(COLUMNAS_DISTRIBUIDOR)
    .single()

  if (error?.code === '23505') throw new ErrorApi(409, 'DUPLICADO', 'Esa cuenta ya tiene una ficha de distribuidor.')
  if (error) throw error

  return respuestaOk(data as Distribuidor, 201)
})
