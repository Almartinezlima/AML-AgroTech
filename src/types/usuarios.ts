export const ROLES_USUARIO = ['admin', 'cliente', 'distribuidor'] as const

export type RolUsuario = (typeof ROLES_USUARIO)[number]

export const ETIQUETA_ROL: Record<RolUsuario, string> = {
  admin: 'Administrador',
  cliente: 'Cliente',
  distribuidor: 'Distribuidor',
}

export interface UsuarioAdmin {
  id: string
  nombre: string
  email: string
  rol: RolUsuario
  telefono: string | null
  activo: boolean
  created_at: string
}

export type CambiosUsuario = Partial<Pick<UsuarioAdmin, 'rol' | 'activo'>>
