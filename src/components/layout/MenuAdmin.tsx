'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const OPCIONES = [
  { href: '/admin', texto: 'Panel', icono: '📊' },
  { href: '/admin/pedidos', texto: 'Pedidos', icono: '🛒' },
  { href: '/admin/pagos', texto: 'Pagos', icono: '💳' },
  { href: '/admin/envios', texto: 'Envíos', icono: '🚚' },
  { href: '/admin/productos', texto: 'Productos', icono: '📦' },
  { href: '/admin/inventario', texto: 'Inventario', icono: '🏬' },
  { href: '/admin/zonas', texto: 'Zonas', icono: '📍' },
  { href: '/admin/usuarios', texto: 'Usuarios', icono: '👥' },
]

export default function MenuAdmin() {
  const ruta = usePathname()

  return (
    <nav aria-label="Administración" className="bg-[#111811] border-b lg:border-b-0 lg:border-r border-[#1a2e1a] lg:w-56 lg:shrink-0 p-3">
      <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-1">
        {OPCIONES.map((opcion) => {
          const activo = opcion.href === '/admin' ? ruta === '/admin' : ruta.startsWith(opcion.href)
          return (
            <li key={opcion.href}>
              <Link
                href={opcion.href}
                aria-current={activo ? 'page' : undefined}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activo ? 'bg-[#162016] text-[#22c55e] font-semibold' : 'text-[#86efac] hover:bg-[#162016]'
                }`}
              >
                <span>{opcion.icono}</span> {opcion.texto}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
