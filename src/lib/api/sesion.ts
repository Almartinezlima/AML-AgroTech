import type { User } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/api/supabase-servidor'
import { ErrorApi } from '@/lib/api/respuestas'
import type { RolUsuario } from '@/types/usuarios'

type ClienteServidor = Awaited<ReturnType<typeof createServerSupabaseClient>>

export interface SesionApi {
  supabase: ClienteServidor
  user: User
  perfil: { id: string; rol: RolUsuario; activo: boolean }
}

// Exige sesión válida y cuenta activa. 401 sin sesión, 403 si está desactivada.
export async function requerirSesion(): Promise<SesionApi> {
  const supabase = await createServerSupabaseClient()
  // getUser valida el token contra Supabase; getSession solo lee la cookie
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new ErrorApi(401, 'NO_AUTENTICADO', 'Debes iniciar sesión.')
  }

  const { data: perfil, error } = await supabase
    .from('perfiles')
    .select('id, rol, activo')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error

  if (!perfil) {
    throw new ErrorApi(403, 'PERFIL_INEXISTENTE', 'Tu cuenta no tiene un perfil asociado.')
  }

  if (!perfil.activo) {
    throw new ErrorApi(403, 'CUENTA_DESACTIVADA', 'Tu cuenta está desactivada.')
  }

  return { supabase, user, perfil: perfil as SesionApi['perfil'] }
}

// Exige además rol de administrador. 403 si no lo es.
export async function requerirAdmin(): Promise<SesionApi> {
  const sesion = await requerirSesion()

  if (sesion.perfil.rol !== 'admin') {
    throw new ErrorApi(403, 'SIN_PERMISO', 'No tienes permiso para esta acción.')
  }

  return sesion
}
