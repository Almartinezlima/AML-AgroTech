import { LuBike, LuLock, LuTruck, LuUser, LuUsers } from 'react-icons/lu'
import TarjetasResumen from '@/components/admin/TarjetasResumen'
import type { UsuarioAdmin } from '@/types/usuarios'

export default function ResumenUsuarios({ usuarios }: { usuarios: UsuarioAdmin[] }) {
  const desactivadas = usuarios.filter((u) => !u.activo).length
  return (
    <TarjetasResumen etiqueta="Resumen de usuarios" cifras={[
      { titulo: 'Total usuarios', icono: LuUsers, valor: String(usuarios.length), tono: 'acento' },
      { titulo: 'Clientes', icono: LuUser, valor: String(usuarios.filter((u) => u.rol === 'cliente').length), tono: 'acento' },
      { titulo: 'Distribuidores', icono: LuTruck, valor: String(usuarios.filter((u) => u.rol === 'distribuidor').length), tono: 'camino' },
      // Repartidores externos (fase 9F): se registran como clientes y el admin les asigna el rol
      { titulo: 'Repartidores', icono: LuBike, valor: String(usuarios.filter((u) => u.rol === 'repartidor').length), detalle: 'Entregas a domicilio', tono: 'acento' },
      { titulo: 'Desactivadas', icono: LuLock, valor: String(desactivadas), tono: desactivadas > 0 ? 'error' : 'neutro' },
    ]} />
  )
}
