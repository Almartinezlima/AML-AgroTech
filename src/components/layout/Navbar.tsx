'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LuLayoutDashboard, LuLogOut, LuMenu, LuShoppingCart, LuUser, LuX } from 'react-icons/lu'
import Marca from '@/components/Marca'
import { useCarrito } from '@/context/CarritoContext'
import { useAuth } from '@/context/AuthContext'

const claseEnlace = (activo: boolean) =>
  `inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-base font-medium transition-colors ${activo ? 'text-texto bg-tarjeta-hover' : 'text-texto-2 hover:text-texto hover:bg-tarjeta-hover'}`

export default function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { totalItems } = useCarrito()
  const { user, perfil, cerrarSesion } = useAuth()
  const ruta = usePathname()
  const esAdmin = user && perfil?.rol === 'admin'

  const handleCerrarSesion = async () => {
    await cerrarSesion()
    // Navegación completa: no queda en memoria nada de la cuenta que salió
    window.location.assign('/')
  }

  const enlaces = [
    { href: '/', texto: 'Inicio', visible: true },
    { href: '/catalogo', texto: 'Catálogo', visible: true },
    { href: '/pedidos', texto: 'Mis Pedidos', visible: Boolean(user) },
  ].filter((e) => e.visible)

  const activo = (href: string) => (href === '/' ? ruta === '/' : ruta.startsWith(href))
  const cerrarMenu = () => setMenuAbierto(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-borde bg-tarjeta/90 backdrop-blur supports-[backdrop-filter]:bg-tarjeta/75" aria-label="Principal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Marca />

          <div className="hidden md:flex items-center gap-1">
            {enlaces.map((e) => (
              <Link key={e.href} href={e.href} className={claseEnlace(activo(e.href))} aria-current={activo(e.href) ? 'page' : undefined}>
                {e.texto}
              </Link>
            ))}
            {esAdmin && (
              <Link href="/admin" className={`${claseEnlace(activo('/admin'))} inline-flex items-center gap-1.5`}>
                <LuLayoutDashboard className="h-4 w-4" aria-hidden="true" /> Panel Admin
              </Link>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/carrito" aria-label={`Carrito, ${totalItems} producto${totalItems === 1 ? '' : 's'}`}
              className="relative grid h-10 w-10 place-items-center rounded-xl text-texto-2 hover:text-texto hover:bg-tarjeta-hover transition-colors">
              <LuShoppingCart className="h-5 w-5" aria-hidden="true" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-acento text-white text-xs font-bold grid place-items-center tabular-nums">
                  {totalItems}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <Link href="/cuenta" className="inline-flex max-w-48 items-center gap-2 rounded-xl px-3 py-2 text-base text-texto-2 hover:text-texto hover:bg-tarjeta-hover transition-colors">
                  <LuUser className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{perfil?.nombre ?? user.email}</span>
                </Link>
                <button onClick={handleCerrarSesion}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-borde px-3 py-2 text-base font-semibold text-texto-2 hover:border-acento hover:text-texto transition-colors">
                  <LuLogOut className="h-4 w-4" aria-hidden="true" /> Salir
                </button>
              </div>
            ) : (
              <Link href="/auth/login" className="inline-flex min-h-11 items-center rounded-xl bg-acento px-5 py-2 text-base font-semibold text-white hover:bg-acento-hover transition-colors">
                Ingresar
              </Link>
            )}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <Link href="/carrito" aria-label={`Carrito, ${totalItems} producto${totalItems === 1 ? '' : 's'}`}
              className="relative grid h-11 w-11 place-items-center rounded-xl text-texto-2 hover:text-texto">
              <LuShoppingCart className="h-5 w-5" aria-hidden="true" />
              {totalItems > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-5 h-5 px-1 rounded-full bg-acento text-white text-xs font-bold grid place-items-center tabular-nums">{totalItems}</span>
              )}
            </Link>
            <button onClick={() => setMenuAbierto(!menuAbierto)} aria-expanded={menuAbierto} aria-controls="menu-movil"
              aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
              className="grid h-11 w-11 place-items-center rounded-xl text-texto-2 hover:text-texto">
              {menuAbierto ? <LuX className="h-6 w-6" aria-hidden="true" /> : <LuMenu className="h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {menuAbierto && (
          <div id="menu-movil" className="md:hidden border-t border-borde py-3 flex flex-col gap-1">
            {enlaces.map((e) => (
              <Link key={e.href} href={e.href} className={claseEnlace(activo(e.href))} onClick={cerrarMenu}>{e.texto}</Link>
            ))}
            {esAdmin && <Link href="/admin" className={claseEnlace(activo('/admin'))} onClick={cerrarMenu}>Panel Admin</Link>}
            <Link href="/carrito" className={claseEnlace(activo('/carrito'))} onClick={cerrarMenu}>
              Carrito {totalItems > 0 && `(${totalItems})`}
            </Link>
            {user && <Link href="/cuenta" className={claseEnlace(activo('/cuenta'))} onClick={cerrarMenu}>Mi cuenta</Link>}
            {user ? (
              <button onClick={handleCerrarSesion} className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-left text-base text-red-700 hover:bg-tarjeta-hover">
                <LuLogOut className="h-4 w-4" aria-hidden="true" /> Cerrar sesión
              </button>
            ) : (
              <Link href="/auth/login" className="mt-1 rounded-xl bg-acento px-4 py-2.5 text-center font-semibold text-white" onClick={cerrarMenu}>Ingresar</Link>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
