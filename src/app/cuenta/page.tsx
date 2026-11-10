'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase'
import { Aviso, AvisoError } from '@/components/ui/Estados'

const claseInput = 'w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] rounded-xl px-4 py-3 outline-none transition-colors'

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
      <div className="min-h-screen bg-[#0a0f0a] py-8 px-4">
        <div className="max-w-md mx-auto bg-[#111811] border border-[#1a2e1a] rounded-2xl p-8 animate-pulse">
          <div className="h-7 w-40 bg-[#162016] rounded mb-6" />
          <div className="h-12 bg-[#162016] rounded-xl mb-4" />
          <div className="h-12 bg-[#162016] rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] py-8 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-[#f0fdf4]">Mi cuenta</h1>
        <p className="text-[#86efac] mt-1 mb-6 break-all">{perfil?.email ?? user?.email}</p>

        <form onSubmit={guardar} className="bg-[#111811] border border-[#1a2e1a] rounded-2xl p-6 sm:p-8 flex flex-col gap-5">
          {error && (
            <AvisoError mensaje={error} />
          )}
          {guardado && (
            <Aviso tipo="ok">Cambios guardados</Aviso>
          )}

          <div>
            <label htmlFor="nombre" className="text-[#86efac] text-sm font-medium mb-2 block">Nombre completo</label>
            <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required className={claseInput} />
          </div>

          <div>
            <label htmlFor="telefono" className="text-[#86efac] text-sm font-medium mb-2 block">Teléfono / WhatsApp</label>
            <input id="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={claseInput} />
          </div>

          <button type="submit" disabled={guardando || !perfil}
            className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-60 text-[#0a0f0a] font-bold py-3 rounded-xl transition-colors">
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  )
}
