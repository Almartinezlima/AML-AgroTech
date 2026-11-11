'use client'
import { useAuth } from '@/context/AuthContext'
import { LuLock } from 'react-icons/lu'

export default function CuentaDesactivadaPage() {
  const { cerrarSesion } = useAuth()

  const salir = async () => {
    await cerrarSesion()
    // Navegación completa: no queda en memoria nada de la cuenta que salió
    window.location.assign('/')
  }

  return (
    <div className="min-h-screen bg-fondo flex items-center justify-center px-4">
      <div className="bg-tarjeta border border-red-300 rounded-2xl p-8 sm:p-12 text-center max-w-md w-full">
        <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-300"><LuLock className="h-8 w-8" aria-hidden="true" /></span>
        <h1 className="text-2xl font-bold text-texto mb-2">Tu cuenta está desactivada</h1>
        <p className="text-texto-2 mb-8">
          No puedes hacer pedidos ni entrar a tu cuenta por ahora. Si crees que es un error,
          comunícate con AML AgroTech.
        </p>
        <button onClick={salir}
          className="w-full bg-acento hover:bg-acento-hover text-white font-bold py-3 rounded-xl transition-colors">
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
