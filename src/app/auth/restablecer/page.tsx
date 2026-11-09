'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Estado = 'verificando' | 'listo' | 'invalido' | 'exitoso'

const claseInput = 'w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 outline-none transition-colors'

export default function RestablecerPage() {
  const [estado, setEstado] = useState<Estado>('verificando')
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // El cliente de Supabase canjea solo el código del enlace; aquí se espera el resultado
  useEffect(() => {
    const supabase = createClient()
    let montado = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento) => {
      if (montado && evento === 'PASSWORD_RECOVERY') setEstado('listo')
    })

    supabase.auth.getSession().then(({ data }) => {
      if (montado) setEstado((actual) => (actual === 'listo' || data.session ? 'listo' : 'invalido'))
    })

    return () => {
      montado = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setGuardando(true)
    const supabase = createClient()
    const { error: errorCambio } = await supabase.auth.updateUser({ password })

    if (errorCambio) {
      setError(
        errorCambio.code === 'same_password'
          ? 'La nueva contraseña debe ser distinta de la anterior.'
          : 'No se pudo cambiar la contraseña. Pide un enlace nuevo.'
      )
      setGuardando(false)
      return
    }

    // Se cierra la sesión de recuperación para entrar con la contraseña nueva
    await supabase.auth.signOut()
    setGuardando(false)
    setEstado('exitoso')
  }

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
              <p className="text-[#f0fdf4] font-semibold mb-2">El enlace no es válido o ya venció</p>
              <p className="text-[#86efac] text-sm mb-6">Pide uno nuevo desde el mismo navegador donde abrirás el correo.</p>
              <Link href="/auth/recuperar" className="block bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a] font-bold py-3 rounded-xl transition-colors">
                Pedir otro enlace
              </Link>
            </div>
          )}

          {estado === 'exitoso' && (
            <div role="status" className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-[#f0fdf4] font-semibold mb-6">Tu contraseña fue actualizada</p>
              <Link href="/auth/login" className="block bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a] font-bold py-3 rounded-xl transition-colors">
                Iniciar sesión
              </Link>
            </div>
          )}

          {estado === 'listo' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <div role="alert" className="bg-red-900 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">⚠️ {error}</div>
              )}

              <div>
                <label htmlFor="password" className="text-[#86efac] text-sm font-medium mb-2 block">Contraseña nueva</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres" required minLength={8} autoComplete="new-password" className={claseInput} />
              </div>

              <div>
                <label htmlFor="confirmacion" className="text-[#86efac] text-sm font-medium mb-2 block">Repite la contraseña</label>
                <input id="confirmacion" type="password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)}
                  required minLength={8} autoComplete="new-password" className={claseInput} />
              </div>

              <button type="submit" disabled={guardando}
                className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-60 text-[#0a0f0a] font-bold py-3 rounded-xl transition-colors">
                {guardando ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
