import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import type { UsuarioAdmin } from '@/types/usuarios'

// Sin esto Next.js intentaría generar esta ruta en el build
export const dynamic = 'force-dynamic'

// GET /api/usuarios — Solo admin. Lista todos los perfiles.
export const GET = manejarRuta(async () => {
  const { supabase } = await requerirAdmin()

  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, email, rol, telefono, activo, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error

  return respuestaOk<UsuarioAdmin[]>(data as UsuarioAdmin[])
})
