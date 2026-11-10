import type { UsuarioAdmin } from '@/types/usuarios'

export default function ResumenUsuarios({ usuarios }: { usuarios: UsuarioAdmin[] }) {
  const tarjetas = [
    { titulo: 'Total usuarios', icono: '👥', valor: usuarios.length, color: 'text-[#f0fdf4]' },
    { titulo: 'Clientes', icono: '👤', valor: usuarios.filter((u) => u.rol === 'cliente').length, color: 'text-[#22c55e]' },
    { titulo: 'Distribuidores', icono: '🚚', valor: usuarios.filter((u) => u.rol === 'distribuidor').length, color: 'text-[#3b82f6]' },
    { titulo: 'Desactivadas', icono: '🔒', valor: usuarios.filter((u) => !u.activo).length, color: 'text-[#ef4444]' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {tarjetas.map((t) => (
        <div key={t.titulo} className="bg-[#111811] border border-[#1a2e1a] rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[#86efac] text-sm">{t.titulo}</span>
            <span className="text-2xl">{t.icono}</span>
          </div>
          <div className={`text-3xl font-bold ${t.color}`}>{t.valor}</div>
        </div>
      ))}
    </div>
  )
}
