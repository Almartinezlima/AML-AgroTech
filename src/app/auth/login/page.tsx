'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
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
  const router = useRouter()
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
    router.push(perfil?.activo === false ? '/cuenta-desactivada' : rutaInterna(siguiente))
    router.refresh()
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
    <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <span className="text-4xl">🌱</span>
            <span className="text-2xl font-bold text-[#f0fdf4]">AML <span className="text-[#22c55e]">AgroTech</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-[#f0fdf4]">Bienvenido de vuelta</h1>
          <p className="text-[#86efac] mt-1">Ingresa a tu cuenta para continuar</p>
        </div>

        <div className="bg-[#111811] border border-[#1a2e1a] rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {aviso && (
              <div role={aviso.tipo === 'error' ? 'alert' : 'status'}
                className={`rounded-xl px-4 py-3 text-sm border ${aviso.tipo === 'error'
                  ? 'bg-red-900 border-red-700 text-red-300'
                  : 'bg-[#162016] border-[#22c55e] text-[#86efac]'}`}>
                {aviso.tipo === 'error' ? '⚠️' : '📧'} {aviso.texto}
                {sinConfirmar && (
                  <button type="button" onClick={reenviar} disabled={reenviando}
                    className="block mt-2 font-semibold underline disabled:opacity-60">
                    {reenviando ? 'Reenviando...' : 'Reenviar correo'}
                  </button>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="text-[#86efac] text-sm font-medium mb-2 block">Correo electrónico</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                className="w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-[#86efac] text-sm font-medium mb-2 block">Contraseña</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 outline-none transition-colors"
              />
              <Link href="/auth/recuperar" className="inline-block mt-2 text-[#22c55e] text-sm hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-60 text-[#0a0f0a] font-bold py-3 rounded-xl transition-colors text-lg"
            >
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>

          </form>

          <div className="mt-6 pt-6 border-t border-[#1a2e1a] text-center">
            <p className="text-[#86efac] text-sm">
              ¿No tienes cuenta?{' '}
              <Link href="/auth/registro" className="text-[#22c55e] font-semibold hover:underline">
                Regístrate gratis
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[#86efac] text-xs mt-6">
          © 2026 AML AgroTech — Sucre, Bolivia 🌿
        </p>
      </div>
    </div>
  )
}
