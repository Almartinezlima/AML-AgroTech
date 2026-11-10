'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Aviso } from '@/components/ui/Estados'
import { claseBotonPrimario, claseEtiqueta, claseInput } from '@/components/ui/estilos'
import MarcoAcceso from '../_components/MarcoAcceso'
import { mensajeErrorAuth } from '@/lib/auth/mensajes'
import { rutaInterna } from '@/lib/auth/redireccion'

type Aviso = { tipo: 'error' | 'ok'; texto: string }

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  // Correo que falta confirmar: habilita el botón "Reenviar correo"
  const [sinConfirmar, setSinConfirmar] = useState<string | null>(null)
  const [reenviando, setReenviando] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setAviso(null)
    setSinConfirmar(null)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setAviso({ tipo: 'error', texto: mensajeErrorAuth(error) })
      if (error.code === 'email_not_confirmed') setSinConfirmar(email)
      setCargando(false)
      return
    }

    // Una cuenta desactivada entra solo para ver el aviso
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('activo')
      .eq('id', data.user.id)
      .maybeSingle()

    const siguiente = new URLSearchParams(window.location.search).get('siguiente')
    // Navegación completa: el router de Next guarda precargas hechas SIN sesión
    // (p. ej. /carrito → login) y las reusaría; así se parte de cero con la cuenta nueva
    window.location.assign(perfil?.activo === false ? '/cuenta-desactivada' : rutaInterna(siguiente))
  }

  const reenviar = async () => {
    if (!sinConfirmar) return
    setReenviando(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: sinConfirmar,
      options: { emailRedirectTo: `${window.location.origin}/auth/login` },
    })
    setReenviando(false)
    setAviso(error
      ? { tipo: 'error', texto: mensajeErrorAuth(error) }
      : { tipo: 'ok', texto: `Te reenviamos el enlace a ${sinConfirmar}. Revisa también la carpeta de spam.` })
  }

  return (
    <MarcoAcceso
      titulo="Bienvenido de vuelta"
      subtitulo="Ingresa a tu cuenta para continuar"
      pie={<>¿No tienes cuenta?{' '}<Link href="/auth/registro" className="text-acento font-semibold hover:underline">Regístrate gratis</Link></>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {aviso && (
          <Aviso tipo={aviso.tipo}>
            {aviso.texto}
            {sinConfirmar && (
              <button type="button" onClick={reenviar} disabled={reenviando}
                className="block mt-2 font-semibold underline disabled:opacity-60">
                {reenviando ? 'Reenviando…' : 'Reenviar correo'}
              </button>
            )}
          </Aviso>
        )}

        <div>
          <label htmlFor="email" className={claseEtiqueta}>Correo electrónico</label>
          <input id="email" type="email" autoComplete="email" spellCheck={false} value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required className={claseInput} />
        </div>

        <div>
          <label htmlFor="password" className={claseEtiqueta}>Contraseña</label>
          <input id="password" type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} required className={claseInput} />
          <Link href="/auth/recuperar" className="inline-block mt-2 text-acento text-sm hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button type="submit" disabled={cargando} className={`${claseBotonPrimario} w-full text-lg`}>
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </MarcoAcceso>
  )
}
