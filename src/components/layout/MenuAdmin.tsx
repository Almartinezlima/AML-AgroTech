'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { IconType } from 'react-icons'
import {
  LuChartColumn, LuCreditCard, LuMapPin, LuPackage, LuShoppingCart, LuTruck, LuUsers, LuWarehouse,
} from 'react-icons/lu'

const OPCIONES: Array<{ href: string; texto: string; icono: IconType }> = [
  { href: '/admin', texto: 'Panel', icono: LuChartColumn },
  { href: '/admin/pedidos', texto: 'Pedidos', icono: LuShoppingCart },
  { href: '/admin/pagos', texto: 'Pagos', icono: LuCreditCard },
  { href: '/admin/envios', texto: 'Envíos', icono: LuTruck },
  { href: '/admin/productos', texto: 'Productos', icono: LuPackage },
  { href: '/admin/inventario', texto: 'Inventario', icono: LuWarehouse },
  { href: '/admin/zonas', texto: 'Zonas', icono: LuMapPin },
  { href: '/admin/usuarios', texto: 'Usuarios', icono: LuUsers },
]

export default function MenuAdmin() {
  const ruta = usePathname()

  return (
    <nav aria-label="Administración" className="bg-tarjeta border-b lg:border-b-0 lg:border-r border-borde lg:w-60 lg:shrink-0 p-3">
      <p className="hidden lg:block px-3 pt-2 pb-3 text-xs font-semibold text-trigo">Administración</p>
      <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-1">
        {OPCIONES.map(({ href, texto, icono: Icono }) => {
          const activo = href === '/admin' ? ruta === '/admin' : ruta.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={activo ? 'page' : undefined}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  activo ? 'bg-tarjeta-hover text-acento font-semibold ring-1 ring-acento/30' : 'text-texto-2 hover:bg-tarjeta-hover hover:text-texto'
                }`}
              >
                <Icono className="h-4 w-4 shrink-0" aria-hidden="true" /> {texto}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
