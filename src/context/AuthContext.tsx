'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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

  const cargarPerfil = async (userId: string) => {
    const { data } = await supabase
      .from('perfiles')
      .select('id, nombre, email, rol, telefono, activo')
      .eq('id', userId)
      .single()
    if (data) setPerfil(data)
  }

  useEffect(() => {
    const inicializar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await cargarPerfil(session.user.id)
      }
      setCargando(false)
    }

    inicializar()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          // Se difiere: llamar a Supabase dentro de este callback puede trabar
          // otras operaciones de Auth, como updateUser al restablecer la contraseña
          const userId = session.user.id
          setTimeout(() => {
            void cargarPerfil(userId).finally(() => setCargando(false))
          }, 0)
        } else {
          setPerfil(null)
          setCargando(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
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
