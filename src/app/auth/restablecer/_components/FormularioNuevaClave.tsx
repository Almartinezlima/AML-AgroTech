'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { mensajeErrorAuth } from '@/lib/auth/mensajes'
import { AvisoError } from '@/components/ui/Estados'
import { claseBotonPrimario, claseEtiqueta, claseInput } from '@/components/ui/estilos'

export interface CuentaRecuperada {
  userId: string
  email: string
}

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
      <div role="note" className="bg-tarjeta-hover border border-borde rounded-xl px-4 py-3 text-sm text-texto-2">
        Vas a cambiar la contraseña de{' '}
        <span data-testid="correo-recuperacion" className="text-texto font-semibold break-all">{cuenta.email}</span>
      </div>

      <AvisoError mensaje={error} />

      <div>
        <label htmlFor="password" className={claseEtiqueta}>Contraseña nueva</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres" required minLength={8} autoComplete="new-password" className={claseInput} />
      </div>

      <div>
        <label htmlFor="confirmacion" className={claseEtiqueta}>Repite la contraseña</label>
        <input id="confirmacion" type="password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)}
          required minLength={8} autoComplete="new-password" className={claseInput} />
      </div>

      <button type="submit" disabled={guardando} className={`${claseBotonPrimario} w-full`}>
        {guardando ? 'Guardando…' : 'Guardar contraseña'}
      </button>
    </form>
  )
}
