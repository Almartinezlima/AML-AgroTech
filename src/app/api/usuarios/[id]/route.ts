import { z } from 'zod'
import { ErrorApi, manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { ROLES_USUARIO, type UsuarioAdmin } from '@/types/usuarios'

const esquemaCambios = z
  .strictObject(
    {
      rol: z.enum(ROLES_USUARIO, { error: 'El rol no es válido.' }).optional(),
      activo: z.boolean({ error: 'El estado no es válido.' }).optional(),
    },
    { error: 'Solo se puede cambiar el rol o el estado.' }
  )
  .refine((cambios) => cambios.rol !== undefined || cambios.activo !== undefined, {
    message: 'Indica el rol o el estado a cambiar.',
  })

// PATCH /api/usuarios/:id — Solo admin. Cambia el rol o el estado de una cuenta.
export const PATCH = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase, user } = await requerirAdmin()
  const id = validarUuid(params.id)
  const cambios = await validarCuerpo(request, esquemaCambios)

  // Un admin no puede dejarse sin acceso a sí mismo
  const seQuitaRol = cambios.rol !== undefined && cambios.rol !== 'admin'
  if (id === user.id && (seQuitaRol || cambios.activo === false)) {
    throw new ErrorApi(403, 'OPERACION_PROPIA', 'No puedes quitarte tu propio rol ni desactivar tu cuenta.')
  }

  const { data, error } = await supabase
    .from('perfiles')
    .update(cambios)
    .eq('id', id)
    .select('id, nombre, email, rol, telefono, activo, created_at')
    .maybeSingle()

  if (error) throw error

  if (!data) {
    throw new ErrorApi(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no existe.')
  }

  return respuestaOk<UsuarioAdmin>(data as UsuarioAdmin)
})
