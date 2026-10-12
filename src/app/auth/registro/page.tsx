'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const roles = [
  { valor: 'cliente', label: 'Cliente / Agricultor', icono: '👤', descripcion: 'Compra insumos agrícolas' },
  { valor: 'distribuidor', label: 'Distribuidor', icono: '🚚', descripcion: 'Vende y distribuye productos' },
]

export default function RegistroPage() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('cliente')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [exitoso, setExitoso] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setError('')

    // 1. Crear usuario en Supabase Auth
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, rol, telefono }
      }
    })

    if (authError) {
      setError(authError.message)
      setCargando(false)
      return
    }

    // 2. Insertar perfil en tabla perfiles
    if (data.user) {
      const { error: perfilError } = await supabase
        .from('perfiles')
        .insert({
          id: data.user.id,
          nombre,
          email,
          rol,
          telefono: telefono || null,
        })

      if (perfilError) {
        setError('Error al crear el perfil. Intenta de nuevo.')
        setCargando(false)
        return
      }
    }

    setCargando(false)
    setExitoso(true)
  }

  if (exitoso) {
    return (
      <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center px-4">
        <div className="bg-[#111811] border border-[#22c55e] rounded-2xl p-12 text-center max-w-md w-full">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-[#f0fdf4] mb-2">¡Registro exitoso!</h2>
          <p className="text-[#86efac] mb-2">Bienvenido, <span className="text-[#22c55e] font-semibold">{nombre}</span>.</p>
          <p className="text-[#86efac] text-sm mb-8">Revisa tu correo para confirmar tu cuenta.</p>
          <Link href="/auth/login" className="block w-full bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a] font-bold py-3 rounded-xl transition-colors">
            Iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

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

        <div className="bg-[#111811] border border-[#1a2e1a] rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {error && (
              <div className="bg-red-900 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="text-[#86efac] text-sm font-medium mb-3 block">Tipo de cuenta</label>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((r) => (
                  <button key={r.valor} type="button" onClick={() => setRol(r.valor)}
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
              <label className="text-[#86efac] text-sm font-medium mb-2 block">Nombre completo</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan Mamani Flores" required
                className="w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 outline-none transition-colors" />
            </div>

            <div>
              <label className="text-[#86efac] text-sm font-medium mb-2 block">Correo electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com" required
                className="w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 outline-none transition-colors" />
            </div>

            <div>
              <label className="text-[#86efac] text-sm font-medium mb-2 block">Teléfono / WhatsApp</label>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 70012345"
                className="w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 outline-none transition-colors" />
            </div>

            <div>
              <label className="text-[#86efac] text-sm font-medium mb-2 block">Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres" required minLength={8}
                className="w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 outline-none transition-colors" />
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
