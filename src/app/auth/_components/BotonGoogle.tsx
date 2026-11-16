'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { mensajeErrorAuth } from '@/lib/auth/mensajes'
import { rutaInterna } from '@/lib/auth/redireccion'
import { Aviso } from '@/components/ui/Estados'
import { claseBotonSecundario } from '@/components/ui/estilos'

// Logo "G" de Google con sus 4 colores oficiales
function LogoGoogle() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

// "Continuar con Google": un toque, eliges tu cuenta y vuelves por /auth/callback.
// Una cuenta nueva nace siempre como cliente (lo decide handle_new_user en la base).
export default function BotonGoogle() {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const continuar = async () => {
    setCargando(true)
    setError('')
    const siguiente = rutaInterna(new URLSearchParams(window.location.search).get('siguiente'), '')
    const callback = new URL('/auth/callback', window.location.origin)
    if (siguiente) callback.searchParams.set('siguiente', siguiente)

    const { error: authError } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback.toString() },
    })
    // Si todo va bien el navegador ya se fue a Google; solo vuelve aquí si falló
    if (authError) {
      setError(mensajeErrorAuth(authError))
      setCargando(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Aviso tipo="error">{error}</Aviso>}
      <button
        type="button"
        onClick={continuar}
        disabled={cargando}
        className={`${claseBotonSecundario} w-full gap-3 disabled:cursor-wait`}
      >
        <LogoGoogle />
        {cargando ? 'Abriendo Google…' : 'Continuar con Google'}
      </button>
    </div>
  )
}

// Raya con "o con tu correo" entre Google y el formulario
export function SeparadorCorreo() {
  return (
    <div className="my-6 flex items-center gap-3 text-sm text-texto-2" role="separator" aria-label="o con tu correo">
      <span className="h-px flex-1 bg-borde" aria-hidden="true" />
      <span aria-hidden="true">o con tu correo</span>
      <span className="h-px flex-1 bg-borde" aria-hidden="true" />
    </div>
  )
}
