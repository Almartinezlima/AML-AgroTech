'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { IconType } from 'react-icons'
import {
  LuBuilding2, LuChartColumn, LuCreditCard, LuMapPin, LuPackage, LuPackageCheck, LuPercent, LuShoppingCart, LuTruck, LuUsers, LuWarehouse,
} from 'react-icons/lu'

const OPCIONES: Array<{ href: string; texto: string; icono: IconType }> = [
  { href: '/admin', texto: 'Panel', icono: LuChartColumn },
  { href: '/admin/pedidos', texto: 'Pedidos', icono: LuShoppingCart },
  { href: '/admin/pagos', texto: 'Pagos', icono: LuCreditCard },
  // El panel de almacén está fuera de /admin: lo usan el admin y la cuenta de almacén
  { href: '/almacen', texto: 'Almacén', icono: LuPackageCheck },
  { href: '/admin/envios', texto: 'Envíos', icono: LuTruck },
  { href: '/admin/productos', texto: 'Productos', icono: LuPackage },
  { href: '/admin/inventario', texto: 'Inventario', icono: LuWarehouse },
  { href: '/admin/abastecimiento', texto: 'Abastecimiento', icono: LuBuilding2 },
  { href: '/admin/margen', texto: 'Margen', icono: LuPercent },
  { href: '/admin/zonas', texto: 'Zonas', icono: LuMapPin },
  { href: '/admin/usuarios', texto: 'Usuarios', icono: LuUsers },
]

export default function MenuAdmin() {
  const ruta = usePathname()
  const lista = useRef<HTMLUListElement>(null)

  // En celular el menú es una fila que se desplaza: centra la opción activa sin mover la página
  useEffect(() => {
    const contenedor = lista.current
    const activo = contenedor?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!contenedor || !activo || contenedor.scrollWidth <= contenedor.clientWidth) return
    contenedor.scrollLeft = activo.offsetLeft - (contenedor.clientWidth - activo.offsetWidth) / 2
  }, [ruta])

  return (
    <nav aria-label="Administración" className="bg-tarjeta border-b lg:border-b-0 lg:border-r border-borde lg:w-60 lg:shrink-0 py-2 lg:p-3">
      <p className="hidden lg:block px-3 pt-2 pb-3 text-xs font-semibold text-trigo">Administración</p>
      <ul ref={lista} className="relative flex gap-1 overflow-x-auto px-3 lg:grid lg:grid-cols-1 lg:overflow-visible lg:px-0">
        {OPCIONES.map(({ href, texto, icono: Icono }) => {
          const activo = href === '/admin' ? ruta === '/admin' : ruta.startsWith(href)
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={activo ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-2.5 whitespace-nowrap px-3 py-2 rounded-xl text-sm transition-colors ${
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
