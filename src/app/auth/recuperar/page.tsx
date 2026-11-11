'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { mensajeErrorAuth } from '@/lib/auth/mensajes'
import { LuArrowLeft, LuMailCheck } from 'react-icons/lu'
import { Aviso, AvisoError } from '@/components/ui/Estados'
import Resultado from '@/components/ui/Resultado'
import { claseBotonPrimario, claseEtiqueta, claseInput } from '@/components/ui/estilos'
import MarcoAcceso from '../_components/MarcoAcceso'

export default function RecuperarPage() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setError('')

    const supabase = createClient()

    // Con una sesión abierta, el enlace podría terminar cambiando la contraseña equivocada:
    // se cierra solo en este navegador antes de pedirlo
    const { data: { session } } = await supabase.auth.getSession()
    if (session) await supabase.auth.signOut({ scope: 'local' })

    const { error: errorEnvio } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/restablecer`,
    })

    setCargando(false)

    if (errorEnvio) {
      setError(mensajeErrorAuth(errorEnvio))
      return
    }

    setEnviado(true)
  }

  return (
    <MarcoAcceso
      titulo="Recuperar contraseña"
      subtitulo="Te enviaremos un enlace a tu correo"
      pie={<Link href="/auth/login" className="inline-flex items-center gap-1 text-acento font-semibold hover:underline"><LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a iniciar sesión</Link>}
    >
      {enviado ? (
        // El mensaje no revela si el correo está registrado o no
        <Resultado icono={LuMailCheck} titulo="Revisa tu correo" tono="exito">
          <p className="text-texto-2 text-sm">
            Si <span className="break-all text-texto">{email}</span> tiene una cuenta, recibirás un enlace para crear una nueva contraseña.
            Ábrelo en este mismo navegador.
          </p>
        </Resultado>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {user && (
            <Aviso tipo="advertencia">
              Vas a cerrar la sesión de <span className="font-semibold break-all">{user.email}</span> en este navegador.
            </Aviso>
          )}

          <AvisoError mensaje={error} />

          <div>
            <label htmlFor="email" className={claseEtiqueta}>Correo electrónico</label>
            <input id="email" type="email" autoComplete="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com" required className={claseInput} />
          </div>

          <button type="submit" disabled={cargando} className={`${claseBotonPrimario} w-full`}>
            {cargando ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>
      )}
    </MarcoAcceso>
  )
}
