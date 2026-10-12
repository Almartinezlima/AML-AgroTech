'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useCarrito } from '@/context/CarritoContext'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { totalItems } = useCarrito()
  const { user, perfil, cerrarSesion } = useAuth()
  const router = useRouter()

  const handleCerrarSesion = async () => {
    await cerrarSesion()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-[#111811] border-b border-[#1a2e1a] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          <Link href="/" className="flex items-center gap-2">
            <span className="text-[#22c55e] text-2xl">🌱</span>
            <span className="font-bold text-xl text-[#f0fdf4]">AML <span className="text-[#22c55e]">AgroTech</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-[#86efac] hover:text-[#22c55e] transition-colors">Inicio</Link>
            <Link href="/catalogo" className="text-[#86efac] hover:text-[#22c55e] transition-colors">Catálogo</Link>
            {user && <Link href="/pedidos" className="text-[#86efac] hover:text-[#22c55e] transition-colors">Mis Pedidos</Link>}
            {user && perfil?.rol === 'admin' && (
              <Link href="/admin" className="text-[#86efac] hover:text-[#22c55e] transition-colors">
                Panel Admin
              </Link>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/carrito" className="relative text-[#86efac] hover:text-[#22c55e] transition-colors">
              <span className="text-2xl">🛒</span>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#22c55e] text-[#0a0f0a] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-[#86efac] text-sm">
                  👤 {perfil?.nombre ?? user.email}
                </span>
                <button onClick={handleCerrarSesion}
                  className="border border-[#22c55e] text-[#22c55e] hover:bg-[#162016] font-semibold px-4 py-2 rounded-lg transition-colors text-sm">
                  Salir
                </button>
              </div>
            ) : (
              <Link href="/auth/login" className="bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a] font-semibold px-4 py-2 rounded-lg transition-colors text-sm">
                Ingresar
              </Link>
            )}
          </div>

          <button onClick={() => setMenuAbierto(!menuAbierto)} className="md:hidden text-[#86efac] hover:text-[#22c55e]">
            <span className="text-2xl">{menuAbierto ? '✕' : '☰'}</span>
          </button>
        </div>

        {menuAbierto && (
          <div className="md:hidden border-t border-[#1a2e1a] py-4 flex flex-col gap-4">
            <Link href="/" className="text-[#86efac] hover:text-[#22c55e]" onClick={() => setMenuAbierto(false)}>Inicio</Link>
            <Link href="/catalogo" className="text-[#86efac] hover:text-[#22c55e]" onClick={() => setMenuAbierto(false)}>Catálogo</Link>
            {user && <Link href="/pedidos" className="text-[#86efac] hover:text-[#22c55e]" onClick={() => setMenuAbierto(false)}>Mis Pedidos</Link>}
            {user && perfil?.rol === 'admin' && (
              <Link href="/admin" className="text-[#86efac] hover:text-[#22c55e]" onClick={() => setMenuAbierto(false)}>
                Panel Admin
              </Link>
            )}
            <Link href="/carrito" className="text-[#86efac] hover:text-[#22c55e]" onClick={() => setMenuAbierto(false)}>
              🛒 Carrito {totalItems > 0 && `(${totalItems})`}
            </Link>
            {user ? (
              <button onClick={handleCerrarSesion} className="text-left text-red-400 hover:text-red-300">Cerrar sesión</button>
            ) : (
              <Link href="/auth/login" className="bg-[#22c55e] text-[#0a0f0a] font-semibold px-4 py-2 rounded-lg text-center" onClick={() => setMenuAbierto(false)}>Ingresar</Link>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
