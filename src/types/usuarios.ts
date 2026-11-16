// almacen y repartidor: migración 0017. Solo el admin asigna roles.
export const ROLES_USUARIO = ['admin', 'cliente', 'distribuidor', 'almacen', 'repartidor'] as const

export type RolUsuario = (typeof ROLES_USUARIO)[number]

export const ETIQUETA_ROL: Record<RolUsuario, string> = {
  admin: 'Administrador',
  cliente: 'Cliente',
  distribuidor: 'Distribuidor',
  almacen: 'Almacén',
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
