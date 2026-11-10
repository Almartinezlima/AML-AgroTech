'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

// Franja visible en todo el sitio cuando la cuenta está desactivada
export default function AvisoCuentaDesactivada() {
  const { perfil } = useAuth()
  const ruta = usePathname()

  if (perfil?.activo !== false || ruta === '/cuenta-desactivada') return null

  return (
    <div role="alert" className="bg-red-900 border-b border-red-700 px-4 py-3 text-center text-sm text-red-200">
      ⚠️ Tu cuenta está desactivada.{' '}
      <Link href="/cuenta-desactivada" className="font-semibold underline">Ver más</Link>
    </div>
  )
}
