'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { esSesionDeRecuperacion, leerEnlaceRecuperacion } from '@/lib/auth/recuperacion'
import { LuCircleCheck, LuClockAlert } from 'react-icons/lu'
import Resultado from '@/components/ui/Resultado'
import { claseBotonPrimario } from '@/components/ui/estilos'
import MarcoAcceso from '../_components/MarcoAcceso'
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
    <MarcoAcceso titulo="Nueva contraseña">
      {estado === 'verificando' && (
        <div className="flex flex-col gap-4" role="status" aria-label="Verificando enlace">
          <div className="esqueleto h-12 rounded-xl" />
          <div className="esqueleto h-12 rounded-xl" />
        </div>
      )}

      {estado === 'invalido' && (
        <Resultado icono={LuClockAlert} titulo="Enlace inválido o vencido" tono="error" rol="alert">
          <p className="text-texto-2 text-sm mb-2">
            Para cambiar la contraseña hay que abrir el enlace que llega al correo, en el mismo navegador donde se pidió.
          </p>
          {motivo && <p className="text-texto-2 text-xs mb-2">Detalle: {motivo}</p>}
          <Link href="/auth/recuperar" className={`${claseBotonPrimario} w-full mt-4`}>Pedir otro enlace</Link>
        </Resultado>
      )}

      {estado === 'exitoso' && (
        <Resultado icono={LuCircleCheck} titulo="Tu contraseña fue actualizada" tono="exito">
          <p className="text-texto-2 text-sm mb-6">Por seguridad cerramos la sesión. Entra con tu contraseña nueva.</p>
          <Link href="/auth/login" className={`${claseBotonPrimario} w-full`}>Iniciar sesión</Link>
        </Resultado>
      )}

      {estado === 'listo' && cuenta && (
        <FormularioNuevaClave
          cuenta={cuenta}
          onExito={() => setEstado('exitoso')}
          onSesionInvalida={() => setEstado('invalido')}
        />
      )}
    </MarcoAcceso>
  )
}
