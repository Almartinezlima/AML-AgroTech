'use client'
import { useAuth } from '@/context/AuthContext'
import { LuLock } from 'react-icons/lu'
import { claseBotonPrimario } from '@/components/ui/estilos'

export default function CuentaDesactivadaPage() {
  const { cerrarSesion } = useAuth()

  const salir = async () => {
    await cerrarSesion()
    // Navegación completa: no queda en memoria nada de la cuenta que salió
    window.location.assign('/')
  }

  return (
    <div className="min-h-screen bg-fondo flex items-center justify-center px-4">
      <div className="bg-tarjeta border border-estado-error/40 rounded-2xl shadow-tarjeta p-6 sm:p-12 text-center max-w-md w-full">
        <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-estado-error/5 text-estado-error-texto ring-1 ring-estado-error/40"><LuLock className="h-8 w-8" aria-hidden="true" /></span>
        <h1 className="text-2xl font-bold text-texto mb-2">Tu cuenta está desactivada</h1>
        <p className="text-texto-2 mb-8">
          No puedes hacer pedidos ni entrar a tu cuenta por ahora. Si crees que es un error,
          comunícate con AML AgroTech.
        </p>
        <button onClick={salir}
          className={`${claseBotonPrimario} w-full`}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
