'use client'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function CuentaDesactivadaPage() {
  const { cerrarSesion } = useAuth()
  const router = useRouter()

  const salir = async () => {
    await cerrarSesion()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center px-4">
      <div className="bg-[#111811] border border-red-700 rounded-2xl p-8 sm:p-12 text-center max-w-md w-full">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-[#f0fdf4] mb-2">Tu cuenta está desactivada</h1>
        <p className="text-[#86efac] mb-8">
          No puedes hacer pedidos ni entrar a tu cuenta por ahora. Si crees que es un error,
          comunícate con AML AgroTech.
        </p>
        <button onClick={salir}
          className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a] font-bold py-3 rounded-xl transition-colors">
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
