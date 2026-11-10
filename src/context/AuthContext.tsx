'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'

interface PerfilUsuario {
  id: string
  nombre: string
  email: string
  rol: 'admin' | 'cliente' | 'distribuidor'
  telefono?: string | null
  activo: boolean
}

interface AuthContextType {
  user: User | null
  session: Session | null
  perfil: PerfilUsuario | null
  cargando: boolean
  cerrarSesion: () => Promise<void>
  recargarPerfil: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)
  const [cargando, setCargando] = useState(true)
  const supabase = createClient()
  // Usuario vigente: una respuesta lenta de otra cuenta no debe pisar el perfil actual
  const usuarioActual = useRef<string | null>(null)

  const cargarPerfil = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('perfiles')
      .select('id, nombre, email, rol, telefono, activo')
      .eq('id', userId)
      .maybeSingle()
    if (usuarioActual.current === userId) setPerfil(data ?? null)
  }, [supabase])

  useEffect(() => {
    // INITIAL_SESSION llega siempre al suscribirse, así que no hace falta leer la sesión aparte
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      const nuevoId = nuevaSesion?.user.id ?? null
      const cambioDeCuenta = usuarioActual.current !== nuevoId
      usuarioActual.current = nuevoId

      setSession(nuevaSesion)
      setUser(nuevaSesion?.user ?? null)

      if (!nuevoId) {
        setPerfil(null)
        setCargando(false)
        return
      }

      // Si entró otra cuenta, el perfil anterior se borra de inmediato (nunca se muestra el rol de otro)
      if (cambioDeCuenta) {
        setPerfil(null)
        setCargando(true)
      }
      // Se difiere: llamar a Supabase dentro de este callback puede trabar
      // otras operaciones de Auth, como updateUser al restablecer la contraseña
      setTimeout(() => {
        void cargarPerfil(nuevoId).finally(() => {
          if (usuarioActual.current === nuevoId) setCargando(false)
        })
      }, 0)
    })

    return () => subscription.unsubscribe()
  }, [supabase, cargarPerfil])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    usuarioActual.current = null
    setPerfil(null)
  }

  const recargarPerfil = async () => {
    if (user) await cargarPerfil(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, session, perfil, cargando, cerrarSesion, recargarPerfil }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
