'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { mensajeErrorAuth } from '@/lib/auth/mensajes'

export interface CuentaRecuperada {
  userId: string
  email: string
}

const claseInput = 'w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 outline-none transition-colors'

interface Props {
  cuenta: CuentaRecuperada
  onExito: () => void
  onSesionInvalida: () => void
}

export default function FormularioNuevaClave({ cuenta, onExito, onSesionInvalida }: Props) {
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

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

    // Si mientras tanto entró otra cuenta en otra pestaña, no se toca nada
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user.id !== cuenta.userId) {
      setGuardando(false)
      onSesionInvalida()
      return
    }

    const { error: errorCambio } = await supabase.auth.updateUser({ password })

    if (errorCambio) {
      setError(mensajeErrorAuth(errorCambio))
      setGuardando(false)
      return
    }

    // Se cierran todas las sesiones de la cuenta: hay que entrar con la contraseña nueva
    await supabase.auth.signOut()
    setGuardando(false)
    onExito()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div role="note" className="bg-[#162016] border border-[#1a2e1a] rounded-xl px-4 py-3 text-sm text-[#86efac]">
        Vas a cambiar la contraseña de{' '}
        <span data-testid="correo-recuperacion" className="text-[#f0fdf4] font-semibold break-all">{cuenta.email}</span>
      </div>

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
  )
}
