'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase'
import { Aviso, AvisoError } from '@/components/ui/Estados'

const claseInput = 'w-full bg-tarjeta-hover border border-borde focus:border-acento text-texto rounded-xl px-4 py-3 outline-none transition-colors'

export default function CuentaPage() {
  const { user, perfil, cargando, recargarPerfil } = useAuth()
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    if (perfil) {
      setNombre(perfil.nombre)
      setTelefono(perfil.telefono ?? '')
    }
  }, [perfil])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setGuardando(true)
    setError('')
    setGuardado(false)

    const { error: errorGuardado } = await createClient()
      .from('perfiles')
      .update({ nombre: nombre.trim(), telefono: telefono.trim() || null })
      .eq('id', user.id)

    if (errorGuardado) {
      setError('No se pudieron guardar los cambios. Intenta de nuevo.')
    } else {
      await recargarPerfil()
      setGuardado(true)
    }

    setGuardando(false)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-fondo py-8 px-4">
        <div className="max-w-md mx-auto bg-tarjeta border border-borde rounded-2xl p-8 animate-pulse">
          <div className="h-7 w-40 bg-tarjeta-hover rounded mb-6" />
          <div className="h-12 bg-tarjeta-hover rounded-xl mb-4" />
          <div className="h-12 bg-tarjeta-hover rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fondo py-8 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-texto">Mi cuenta</h1>
        <p className="text-texto-2 mt-1 mb-6 break-all">{perfil?.email ?? user?.email}</p>

        <form onSubmit={guardar} className="bg-tarjeta border border-borde rounded-2xl p-6 sm:p-8 flex flex-col gap-5">
          {error && (
            <AvisoError mensaje={error} />
          )}
          {guardado && (
            <Aviso tipo="ok">Cambios guardados</Aviso>
          )}

          <div>
            <label htmlFor="nombre" className="text-texto-2 text-sm font-medium mb-2 block">Nombre completo</label>
            <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required className={claseInput} />
          </div>

          <div>
            <label htmlFor="telefono" className="text-texto-2 text-sm font-medium mb-2 block">Teléfono / WhatsApp</label>
            <input id="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={claseInput} />
          </div>

          <button type="submit" disabled={guardando || !perfil}
            className="w-full bg-acento hover:bg-acento-hover disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors">
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  )
}
