// repartidor: migración 0017. El rol almacén se quitó en la 0020 (lo hace el admin). Solo el admin asigna roles.
export const ROLES_USUARIO = ['admin', 'cliente', 'distribuidor', 'repartidor'] as const

export type RolUsuario = (typeof ROLES_USUARIO)[number]

export const ETIQUETA_ROL: Record<RolUsuario, string> = {
  admin: 'Administrador',
  cliente: 'Cliente',
  distribuidor: 'Distribuidor',
  repartidor: 'Repartidor',
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
