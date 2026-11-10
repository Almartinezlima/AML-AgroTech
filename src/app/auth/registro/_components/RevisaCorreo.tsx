'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { mensajeErrorAuth } from '@/lib/auth/mensajes'
import { LuMailCheck } from 'react-icons/lu'
import { Aviso } from '@/components/ui/Estados'
import Resultado from '@/components/ui/Resultado'
import { claseBotonPrimario, claseBotonSecundario } from '@/components/ui/estilos'
import MarcoAcceso from '../../_components/MarcoAcceso'

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
    <MarcoAcceso titulo="Revisa tu correo">
      <Resultado icono={LuMailCheck} titulo={`Bienvenido, ${nombre}`} tono="exito">
        <p className="text-texto-2 text-sm mb-6">
          Te enviamos un enlace a <span className="text-texto break-all">{email}</span> para activar tu cuenta.
          Ábrelo y después inicia sesión. Revisa también la carpeta de spam.
        </p>
      </Resultado>

      {aviso && <div className="mb-4"><Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso></div>}

      <div className="flex flex-col gap-3">
        <button type="button" onClick={reenviar} disabled={reenviando} className={`${claseBotonSecundario} w-full`}>
          {reenviando ? 'Reenviando…' : 'Reenviar correo'}
        </button>
        <Link href="/auth/login" className={`${claseBotonPrimario} w-full`}>Iniciar sesión</Link>
      </div>
    </MarcoAcceso>
  )
}
