'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { mensajeErrorAuth } from '@/lib/auth/mensajes'
import { rutaInterna } from '@/lib/auth/redireccion'
import RevisaCorreo from './_components/RevisaCorreo'

const roles = [
  { valor: 'cliente', label: 'Cliente / Agricultor', icono: '👤', descripcion: 'Compra insumos agrícolas' },
  { valor: 'distribuidor', label: 'Distribuidor', icono: '🚚', descripcion: 'Vende y distribuye productos' },
]

const claseInput = 'w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 outline-none transition-colors'
const claseLabel = 'text-[#86efac] text-sm font-medium mb-2 block'
const CORREO_YA_REGISTRADO = 'Ese correo ya está registrado. Inicia sesión o recupera tu contraseña.'

export default function RegistroPage() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('cliente')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [revisarCorreo, setRevisarCorreo] = useState(false)
  const router = useRouter()

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
      router.push(rutaInterna(siguiente, '/catalogo'))
      router.refresh()
      return
    }

    setCargando(false)
    setRevisarCorreo(true)
  }

  if (revisarCorreo) return <RevisaCorreo nombre={nombre} email={email} />

  return (
    <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <span className="text-4xl">🌱</span>
            <span className="text-2xl font-bold text-[#f0fdf4]">AML <span className="text-[#22c55e]">AgroTech</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-[#f0fdf4]">Crear cuenta</h1>
          <p className="text-[#86efac] mt-1">Únete a la plataforma agrícola boliviana</p>
        </div>

        <div className="bg-[#111811] border border-[#1a2e1a] rounded-2xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {error && (
              <div role="alert" className="bg-red-900 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">
                ⚠️ {error}
                {error === CORREO_YA_REGISTRADO && (
                  <span className="block mt-2">
                    <Link href="/auth/login" className="font-semibold underline">Iniciar sesión</Link>
                    {' · '}
                    <Link href="/auth/recuperar" className="font-semibold underline">Recuperar contraseña</Link>
                  </span>
                )}
              </div>
            )}

            <div>
              <span className="text-[#86efac] text-sm font-medium mb-3 block">Tipo de cuenta</span>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((r) => (
                  <button key={r.valor} type="button" onClick={() => setRol(r.valor)} aria-pressed={rol === r.valor}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      rol === r.valor ? 'border-[#22c55e] bg-[#162016]' : 'border-[#1a2e1a] bg-[#162016] hover:border-[#22c55e]'
                    }`}>
                    <div className="text-2xl mb-1">{r.icono}</div>
                    <div className={`text-xs font-semibold ${rol === r.valor ? 'text-[#22c55e]' : 'text-[#f0fdf4]'}`}>{r.label}</div>
                    <div className="text-[#86efac] text-xs">{r.descripcion}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="nombre" className={claseLabel}>Nombre completo</label>
              <input id="nombre" type="text" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan Mamani Flores" required className={claseInput} />
            </div>

            <div>
              <label htmlFor="email" className={claseLabel}>Correo electrónico</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com" required className={claseInput} />
            </div>

            <div>
              <label htmlFor="telefono" className={claseLabel}>Teléfono / WhatsApp</label>
              <input id="telefono" type="tel" autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 70012345" className={claseInput} />
            </div>

            <div>
              <label htmlFor="password" className={claseLabel}>Contraseña</label>
              <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres" required minLength={8} className={claseInput} />
            </div>

            <button type="submit" disabled={cargando}
              className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-60 text-[#0a0f0a] font-bold py-3 rounded-xl transition-colors text-lg">
              {cargando ? 'Creando cuenta...' : 'Crear cuenta gratis'}
            </button>

          </form>

          <div className="mt-6 pt-6 border-t border-[#1a2e1a] text-center">
            <p className="text-[#86efac] text-sm">
              ¿Ya tienes cuenta?{' '}
              <Link href="/auth/login" className="text-[#22c55e] font-semibold hover:underline">Iniciar sesión</Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[#86efac] text-xs mt-6">© 2026 AML AgroTech — Sucre, Bolivia 🌿</p>
      </div>
    </div>
  )
}
