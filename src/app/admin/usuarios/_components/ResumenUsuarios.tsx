import { LuLock, LuTruck, LuUser, LuUsers } from 'react-icons/lu'
import type { UsuarioAdmin } from '@/types/usuarios'

export default function ResumenUsuarios({ usuarios }: { usuarios: UsuarioAdmin[] }) {
  const tarjetas = [
    { titulo: 'Total usuarios', icono: LuUsers, valor: usuarios.length, color: 'text-texto' },
    { titulo: 'Clientes', icono: LuUser, valor: usuarios.filter((u) => u.rol === 'cliente').length, color: 'text-acento' },
    { titulo: 'Distribuidores', icono: LuTruck, valor: usuarios.filter((u) => u.rol === 'distribuidor').length, color: 'text-blue-700' },
    { titulo: 'Desactivadas', icono: LuLock, valor: usuarios.filter((u) => !u.activo).length, color: 'text-red-700' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {tarjetas.map((t) => (
        <div key={t.titulo} className="bg-tarjeta border border-borde rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-texto-2 text-sm">{t.titulo}</span>
            <t.icono className="h-5 w-5 text-texto-2" aria-hidden="true" />
          </div>
          <div className={`text-3xl font-bold ${t.color}`}>{t.valor}</div>
        </div>
      ))}
    </div>
  )
}
