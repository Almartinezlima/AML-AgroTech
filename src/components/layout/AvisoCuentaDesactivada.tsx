'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LuLock } from 'react-icons/lu'
import { useAuth } from '@/context/AuthContext'

// Franja visible en todo el sitio cuando la cuenta está desactivada
export default function AvisoCuentaDesactivada() {
  const { perfil } = useAuth()
  const ruta = usePathname()

  if (perfil?.activo !== false || ruta === '/cuenta-desactivada') return null

  return (
    <div role="alert" className="flex items-center justify-center gap-2 bg-red-950 border-b border-red-800 px-4 py-3 text-center text-sm text-red-200">
      <LuLock className="h-4 w-4 shrink-0" aria-hidden="true" /> Tu cuenta está desactivada.{' '}
      <Link href="/cuenta-desactivada" className="font-semibold underline">Ver más</Link>
    </div>
  )
}
