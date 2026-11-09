import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const RUTAS_CON_SESION = ['/pedidos', '/carrito', '/cuenta']
const RUTA_CUENTA_DESACTIVADA = '/cuenta-desactivada'

// Compara por segmentos: '/admin' cubre '/admin/usuarios' pero no '/administrar'
function coincide(ruta: string, base: string) {
  return ruta === base || ruta.startsWith(`${base}/`)
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Al redirigir se conservan las cookies de una sesión recién renovada
  const redirigir = (destino: string) => {
    const url = request.nextUrl.clone()
    url.pathname = destino
    url.search = ''
    const respuesta = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => respuesta.cookies.set(cookie))
    return respuesta
  }

  const ruta = request.nextUrl.pathname
  const esRutaAdmin = coincide(ruta, '/admin')
  const esRutaConSesion = RUTAS_CON_SESION.some((base) => coincide(ruta, base))
  const esAvisoDesactivada = coincide(ruta, RUTA_CUENTA_DESACTIVADA)

  if ((esRutaAdmin || esRutaConSesion) && !user) {
    return redirigir('/auth/login')
  }

  if (user && (esRutaAdmin || esRutaConSesion || esAvisoDesactivada)) {
    // El rol se lee de la base en cada petición, nunca de la pantalla
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol, activo')
      .eq('id', user.id)
      .maybeSingle()

    const desactivada = perfil?.activo === false

    if (esAvisoDesactivada && !desactivada) return redirigir('/')
    if (!esAvisoDesactivada && desactivada) return redirigir(RUTA_CUENTA_DESACTIVADA)
    // Sin perfil o con error de lectura, tampoco entra al panel
    if (esRutaAdmin && perfil?.rol !== 'admin') return redirigir('/')
  }

  if (!user && esAvisoDesactivada) {
    return redirigir('/')
  }

  // Si ya está logueado y va al login, redirige al inicio
  if (user && coincide(ruta, '/auth/login')) {
    return redirigir('/')
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
