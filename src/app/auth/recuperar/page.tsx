'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setError('')

    const { error: errorEnvio } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/restablecer`,
    })

    setCargando(false)

    if (errorEnvio?.code === 'over_email_send_rate_limit') {
      setError('Se enviaron demasiados correos. Espera unos minutos e intenta de nuevo.')
      return
    }

    if (errorEnvio) {
      setError('No se pudo enviar el correo. Intenta de nuevo.')
      return
    }

    setEnviado(true)
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#f0fdf4]">Recuperar contraseña</h1>
          <p className="text-[#86efac] mt-1">Te enviaremos un enlace a tu correo</p>
        </div>

        <div className="bg-[#111811] border border-[#1a2e1a] rounded-2xl p-6 sm:p-8">
          {enviado ? (
            // El mensaje no revela si el correo está registrado o no
            <div role="status" className="text-center">
              <div className="text-5xl mb-4">📧</div>
              <p className="text-[#f0fdf4] font-semibold mb-2">Revisa tu correo</p>
              <p className="text-[#86efac] text-sm">
                Si <span className="break-all">{email}</span> tiene una cuenta, recibirás un enlace para crear una nueva contraseña.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <div role="alert" className="bg-red-900 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">⚠️ {error}</div>
              )}

              <div>
                <label htmlFor="email" className="text-[#86efac] text-sm font-medium mb-2 block">Correo electrónico</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com" required
                  className="w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 outline-none transition-colors" />
              </div>

              <button type="submit" disabled={cargando}
                className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-60 text-[#0a0f0a] font-bold py-3 rounded-xl transition-colors">
                {cargando ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-[#1a2e1a] text-center">
            <Link href="/auth/login" className="text-[#22c55e] text-sm font-semibold hover:underline">← Volver a iniciar sesión</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
