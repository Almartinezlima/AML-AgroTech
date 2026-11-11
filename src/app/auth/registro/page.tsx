'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { mensajeErrorAuth } from '@/lib/auth/mensajes'
import { rutaInterna } from '@/lib/auth/redireccion'
import { useConsultaSiguiente } from '@/lib/auth/useSiguiente'
import RevisaCorreo from './_components/RevisaCorreo'
import { LuTruck, LuUser } from 'react-icons/lu'
import { Aviso } from '@/components/ui/Estados'
import { claseBotonPrimario, claseEtiqueta, claseInput } from '@/components/ui/estilos'
import MarcoAcceso from '../_components/MarcoAcceso'

const roles = [
  { valor: 'cliente', label: 'Cliente / Agricultor', icono: LuUser, descripcion: 'Compra insumos agrícolas' },
  { valor: 'distribuidor', label: 'Distribuidor', icono: LuTruck, descripcion: 'Vende y distribuye productos' },
]

const CORREO_YA_REGISTRADO = 'Ese correo ya está registrado. Inicia sesión o recupera tu contraseña.'

export default function RegistroPage() {
  const consulta = useConsultaSiguiente()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('cliente')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [revisarCorreo, setRevisarCorreo] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setCargando(true)
    const supabase = createClient()

    // Si había otra cuenta abierta en este navegador, se cierra antes de crear la nueva
    const { data: { session: sesionPrevia } } = await supabase.auth.getSession()
    if (sesionPrevia) await supabase.auth.signOut({ scope: 'local' })

    // El perfil lo crea el trigger handle_new_user a partir de estos datos
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, rol, telefono: telefono || null },
        emailRedirectTo: `${window.location.origin}/auth/login`,
      },
    })

    if (authError) {
      setError(mensajeErrorAuth(authError))
      setCargando(false)
      return
    }

    // Con "Confirm email" encendido, un correo ya registrado vuelve sin identidades
    if (data.user && data.user.identities?.length === 0) {
      setError(CORREO_YA_REGISTRADO)
      setCargando(false)
      return
    }

    // Con "Confirm email" apagado, Supabase ya devuelve la sesión: entra directo
    if (data.session) {
      const siguiente = new URLSearchParams(window.location.search).get('siguiente')
      // Navegación completa: el router de Next guarda precargas hechas SIN sesión
      // (p. ej. /carrito → login) y las reusaría; así se parte de cero con la cuenta nueva
      window.location.assign(rutaInterna(siguiente, '/catalogo'))
      return
    }

    setCargando(false)
    setRevisarCorreo(true)
  }

  if (revisarCorreo) return <RevisaCorreo nombre={nombre} email={email} />

  return (
    <MarcoAcceso
      titulo="Crear cuenta"
      subtitulo="Compra insumos con precios en Bs. y envío a tu pueblo"
      pie={<>¿Ya tienes cuenta?{' '}<Link href={`/auth/login${consulta}`} className="text-acento font-semibold hover:underline">Iniciar sesión</Link></>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <Aviso tipo="error">
            {error}
            {error === CORREO_YA_REGISTRADO && (
              <span className="block mt-2">
                <Link href="/auth/login" className="font-semibold underline">Iniciar sesión</Link>
                {' o '}
                <Link href="/auth/recuperar" className="font-semibold underline">recuperar contraseña</Link>
              </span>
            )}
          </Aviso>
        )}

        <fieldset>
          <legend className="text-texto-2 text-sm font-medium mb-3">Tipo de cuenta</legend>
          <div className="grid grid-cols-2 gap-3">
            {roles.map(({ valor, label, descripcion, icono: Icono }) => (
              <button key={valor} type="button" onClick={() => setRol(valor)} aria-pressed={rol === valor}
                className={`p-3 rounded-xl border text-left transition ${
                  rol === valor ? 'border-acento bg-tarjeta-hover ring-1 ring-acento/40' : 'border-borde bg-tarjeta-hover hover:border-acento/60'
                }`}>
                <Icono className={`h-6 w-6 mb-2 ${rol === valor ? 'text-acento' : 'text-texto-2'}`} aria-hidden="true" />
                <div className={`text-sm font-semibold ${rol === valor ? 'text-acento' : 'text-texto'}`}>{label}</div>
                <div className="text-texto-2 text-xs mt-0.5">{descripcion}</div>
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="nombre" className={claseEtiqueta}>Nombre completo</label>
          <input id="nombre" type="text" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Juan Mamani Flores" required className={claseInput} />
        </div>

        <div>
          <label htmlFor="email" className={claseEtiqueta}>Correo electrónico</label>
          <input id="email" type="email" autoComplete="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com" required className={claseInput} />
        </div>

        <div>
          <label htmlFor="telefono" className={claseEtiqueta}>Teléfono / WhatsApp</label>
          <input id="telefono" type="tel" inputMode="tel" autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej: 70012345" className={claseInput} />
        </div>

        <div>
          <label htmlFor="password" className={claseEtiqueta}>Contraseña</label>
          <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres" required minLength={8} className={claseInput} />
        </div>

        <button type="submit" disabled={cargando} className={`${claseBotonPrimario} w-full text-lg`}>
          {cargando ? 'Creando cuenta…' : 'Crear cuenta gratis'}
        </button>
      </form>
    </MarcoAcceso>
  )
}
