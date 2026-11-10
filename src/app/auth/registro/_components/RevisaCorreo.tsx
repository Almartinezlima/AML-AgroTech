'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { mensajeErrorAuth } from '@/lib/auth/mensajes'

// Pantalla para cuando Supabase pide confirmar el correo antes de entrar
export default function RevisaCorreo({ nombre, email }: { nombre: string; email: string }) {
  const [reenviando, setReenviando] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null)

  const reenviar = async () => {
    setReenviando(true)
    setAviso(null)
    const { error } = await createClient().auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/login` },
    })
    setReenviando(false)
    setAviso(error
      ? { tipo: 'error', texto: mensajeErrorAuth(error) }
      : { tipo: 'ok', texto: 'Listo, te enviamos el enlace otra vez.' })
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center px-4">
      <div role="status" className="bg-[#111811] border border-[#22c55e] rounded-2xl p-8 sm:p-12 text-center max-w-md w-full">
        <div className="text-6xl mb-4">📧</div>
        <h2 className="text-2xl font-bold text-[#f0fdf4] mb-2">Revisa tu correo</h2>
        <p className="text-[#86efac] mb-2">Bienvenido, <span className="text-[#22c55e] font-semibold">{nombre}</span>.</p>
        <p className="text-[#86efac] text-sm mb-6">
          Te enviamos un enlace a <span className="text-[#f0fdf4] break-all">{email}</span> para activar tu cuenta.
          Ábrelo y después inicia sesión. Revisa también la carpeta de spam.
        </p>

        {aviso && (
          <p className={`text-sm mb-4 ${aviso.tipo === 'error' ? 'text-red-300' : 'text-[#86efac]'}`}>
            {aviso.tipo === 'error' ? '⚠️' : '✅'} {aviso.texto}
          </p>
        )}

        <button type="button" onClick={reenviar} disabled={reenviando}
          className="w-full mb-3 border border-[#22c55e] text-[#22c55e] hover:bg-[#162016] disabled:opacity-60 font-semibold py-3 rounded-xl transition-colors">
          {reenviando ? 'Reenviando...' : 'Reenviar correo'}
        </button>
        <Link href="/auth/login" className="block w-full bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a] font-bold py-3 rounded-xl transition-colors">
          Iniciar sesión
        </Link>
      </div>
    </div>
  )
}
