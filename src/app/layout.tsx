import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { CarritoProvider } from '@/context/CarritoContext'
import { AuthProvider } from '@/context/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AML AgroTech - Insumos Agrícolas',
  description: 'Plataforma de comercio electrónico de insumos agrícolas en Bolivia',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-[#0a0f0a] text-[#f0fdf4] min-h-screen flex flex-col`}>
        <AuthProvider>
          <CarritoProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </CarritoProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
