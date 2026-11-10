import type { Metadata } from 'next'
import { Bricolage_Grotesque, Figtree } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import AvisoCuentaDesactivada from '@/components/layout/AvisoCuentaDesactivada'
import { CarritoProvider } from '@/context/CarritoContext'
import { AuthProvider } from '@/context/AuthContext'

// Tipografía de docs/DISENO.md: se sirve desde nuestro dominio (next/font)
const fuenteTitulo = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--fuente-titulo', display: 'swap' })
const fuenteTexto = Figtree({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--fuente-texto', display: 'swap' })

export const metadata: Metadata = {
  title: 'AML AgroTech — Insumos agrícolas en Chuquisaca',
  description: 'Agroquímicos, semillas, riego, cañerías y herramientas con precios en Bs. y envío a Sucre, Villa Charcas, Culpina e Incahuasi.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es-BO" className={`${fuenteTitulo.variable} ${fuenteTexto.variable}`}>
      <body className="font-sans bg-fondo text-texto min-h-screen flex flex-col">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-acento focus:px-4 focus:py-2 focus:font-semibold focus:text-fondo">
          Saltar al contenido
        </a>
        <AuthProvider>
          <CarritoProvider>
            <Navbar />
            <AvisoCuentaDesactivada />
            <main id="contenido" className="flex-1">
              {children}
            </main>
            <Footer />
          </CarritoProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
