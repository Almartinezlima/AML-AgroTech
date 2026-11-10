'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { esSesionDeRecuperacion, leerEnlaceRecuperacion } from '@/lib/auth/recuperacion'
import FormularioNuevaClave, { type CuentaRecuperada } from './_components/FormularioNuevaClave'

type Estado = 'verificando' | 'listo' | 'invalido' | 'exitoso'

// Tiempo máximo para que Supabase canjee el enlace y avise con PASSWORD_RECOVERY
const ESPERA_ENLACE_MS = 4000

export default function RestablecerPage() {
  const [estado, setEstado] = useState<Estado>('verificando')
  const [cuenta, setCuenta] = useState<CuentaRecuperada | null>(null)
  const [motivo, setMotivo] = useState<string | null>(null)

  // El formulario se habilita SOLO con una sesión de recuperación (evento PASSWORD_RECOVERY
  // tras canjear el enlace). Una sesión normal abierta en el navegador NO cuenta.
  useEffect(() => {
    const supabase = createClient()
    let montado = true
    let temporizador: ReturnType<typeof setTimeout> | undefined

    const aceptar = (userId: string, email: string | undefined) => {
      if (!montado) return
      clearTimeout(temporizador)
      setCuenta({ userId, email: email ?? 'tu cuenta' })
      setEstado('listo')
    }
    const rechazar = (texto: string | null) => {
      if (!montado) return
      setMotivo(texto)
      setEstado((actual) => (actual === 'verificando' ? 'invalido' : actual))
    }

    const { traeEnlace, error } = leerEnlaceRecuperacion()
    if (error || !traeEnlace) {
      rechazar(error)
      return () => { montado = false }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'PASSWORD_RECOVERY' && sesion) aceptar(sesion.user.id, sesion.user.email)
    })

    // Si el aviso no llega (enlace ya usado, vencido o abierto en otro navegador), queda inválido.
    // Respaldo: una sesión cuyo token dice que nació de una recuperación reciente.
    supabase.auth.getSession().then(({ data }) => {
      temporizador = setTimeout(() => {
        if (esSesionDeRecuperacion(data.session) && data.session) {
          aceptar(data.session.user.id, data.session.user.email)
        } else {
          rechazar(null)
        }
      }, ESPERA_ENLACE_MS)
    })

    return () => {
      montado = false
      clearTimeout(temporizador)
      subscription.unsubscribe()
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-[#f0fdf4] text-center mb-8">Nueva contraseña</h1>

        <div className="bg-[#111811] border border-[#1a2e1a] rounded-2xl p-6 sm:p-8">
          {estado === 'verificando' && (
            <div className="animate-pulse flex flex-col gap-4" aria-label="Verificando enlace">
              <div className="h-12 bg-[#162016] rounded-xl" />
              <div className="h-12 bg-[#162016] rounded-xl" />
            </div>
          )}

          {estado === 'invalido' && (
            <div role="alert" className="text-center">
              <div className="text-5xl mb-4">⏰</div>
              <p className="text-[#f0fdf4] font-semibold mb-2">Enlace inválido o vencido</p>
              <p className="text-[#86efac] text-sm mb-2">
                Para cambiar la contraseña hay que abrir el enlace que llega al correo, en el mismo navegador donde se pidió.
              </p>
              {motivo && <p className="text-[#86efac] text-xs mb-2">Detalle: {motivo}</p>}
              <Link href="/auth/recuperar" className="block mt-4 bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a] font-bold py-3 rounded-xl transition-colors">
                Pedir otro enlace
              </Link>
            </div>
          )}

          {estado === 'exitoso' && (
            <div role="status" className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-[#f0fdf4] font-semibold mb-2">Tu contraseña fue actualizada</p>
              <p className="text-[#86efac] text-sm mb-6">Por seguridad cerramos la sesión. Entra con tu contraseña nueva.</p>
              <Link href="/auth/login" className="block bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a] font-bold py-3 rounded-xl transition-colors">
                Iniciar sesión
              </Link>
            </div>
          )}

          {estado === 'listo' && cuenta && (
            <FormularioNuevaClave
              cuenta={cuenta}
              onExito={() => setEstado('exitoso')}
              onSesionInvalida={() => setEstado('invalido')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
