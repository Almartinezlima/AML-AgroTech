import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/api/supabase-servidor'
import { inicioPorRol, rutaInterna } from '@/lib/auth/redireccion'

// Vuelta de "Continuar con Google": cambia el código por la sesión (PKCE; el verificador
// quedó en una cookie al tocar el botón) y lleva a la persona a donde iba.
// Siempre redirige a este mismo origen; el destino pasa por rutaInterna (nada de
// redirecciones abiertas).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const codigo = searchParams.get('code')
  const siguiente = rutaInterna(searchParams.get('siguiente'), '')

  const volverAlLogin = () => {
    const url = new URL('/auth/login', origin)
    url.searchParams.set('error', 'google')
    if (siguiente) url.searchParams.set('siguiente', siguiente)
    return NextResponse.redirect(url)
  }

  // Sin código: la persona canceló en Google o Supabase devolvió un error
  if (!codigo || searchParams.has('error')) return volverAlLogin()

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(codigo)
  if (error || !data.user) return volverAlLogin()

  // Mismo criterio que el login con correo: el rol y el estado se leen de la base
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, activo')
    .eq('id', data.user.id)
    .maybeSingle()

  if (perfil?.activo === false) return NextResponse.redirect(new URL('/cuenta-desactivada', origin))
  // El proveedor y el repartidor entran a su panel si no venían de otra pantalla
  const inicio = inicioPorRol(perfil?.rol)
  return NextResponse.redirect(new URL(siguiente || inicio, origin))
}
