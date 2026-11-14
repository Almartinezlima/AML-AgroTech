import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarParametros } from '@/lib/api/validacion'
import { esCorreoPrueba, parametroPruebas } from '@/lib/pruebas'
import type { UsuarioAdmin } from '@/types/usuarios'

// Sin esto Next.js intentaría generar esta ruta en el build
export const dynamic = 'force-dynamic'

const esquemaParametros = z.object({ pruebas: parametroPruebas })

// GET /api/usuarios — Solo admin. Lista los perfiles, sin las cuentas de prueba
// (@amlagrotech.test) salvo ?pruebas=1.
export const GET = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirAdmin()
  const { pruebas } = validarParametros(request, esquemaParametros)

  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, email, rol, telefono, activo, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error

  const usuarios = data as UsuarioAdmin[]
  return respuestaOk<UsuarioAdmin[]>(pruebas ? usuarios : usuarios.filter((u) => !esCorreoPrueba(u.email)))
})
