import Image from 'next/image'
import Link from 'next/link'
import { LuMapPin, LuQrCode, LuSearch, LuTruck } from 'react-icons/lu'
import { CREDITO_FOTO_PORTADA } from '@/lib/portada'
import fotoValle from '../../../public/portada/villa-charcas.webp'

const VENTAJAS = [
  { icono: LuTruck, texto: 'Envío a Villa Charcas, Culpina e Incahuasi' },
  { icono: LuQrCode, texto: 'Pago con QR, transferencia o contra entrega' },
  { icono: LuMapPin, texto: 'Precios en bolivianos, desde Villa Charcas' },
]

// Portada: foto propia de Villa Charcas a pantalla ancha, propuesta de valor y buscador
export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <Image
        src={fotoValle}
        alt="Campo de papa en flor en Villa Charcas, Chuquisaca, al atardecer"
        priority
        placeholder="blur"
        sizes="100vw"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      {/* Velo para que el texto se lea sobre la foto */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-fondo via-fondo/80 to-fondo/20" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-fondo via-transparent to-fondo/40" aria-hidden="true" />

      <div className="mx-auto flex min-h-[640px] max-w-7xl flex-col justify-center px-4 py-20 sm:px-6 md:min-h-[720px] lg:px-8">
        <div className="max-w-2xl">
          <p className="animate-entrada inline-flex items-center gap-2 rounded-full border border-trigo/40 bg-fondo/60 px-4 py-1.5 text-sm font-medium text-trigo backdrop-blur">
            <LuMapPin className="h-4 w-4" aria-hidden="true" /> Villa Charcas · Chuquisaca · Bolivia
          </p>

          <h1 className="animate-entrada mt-6 font-titulo text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl" style={{ animationDelay: '80ms' }}>
            Todo para tu campo, con envío hasta tu pueblo
          </h1>

          <p className="animate-entrada mt-6 max-w-xl text-lg text-[#d1fae5] sm:text-xl" style={{ animationDelay: '160ms' }}>
            Semillas, fertilizantes, riego, cañerías y herramientas para la agricultura de los valles de Chuquisaca.
          </p>

          <form action="/catalogo" method="get" role="search" className="animate-entrada mt-8 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: '240ms' }}>
            <label htmlFor="buscar-portada" className="sr-only">Buscar productos</label>
            <div className="relative flex-1">
              <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4b5d4b]" aria-hidden="true" />
              <input
                id="buscar-portada"
                name="q"
                type="search"
                placeholder="Busca urea, semilla de papa, aspersor…"
                autoComplete="off"
                className="h-14 w-full rounded-2xl border border-white/20 bg-white pl-12 pr-4 text-base text-[#0a0f0a] shadow-2xl shadow-black/40 outline-none placeholder:text-[#6b7b6b] focus:ring-4 focus:ring-acento/40"
              />
            </div>
            <button type="submit" className="h-14 rounded-2xl bg-acento px-7 text-base font-bold text-fondo shadow-2xl shadow-acento/30 transition hover:bg-acento-hover active:scale-[0.98]">
              Buscar
            </button>
          </form>

          <div className="animate-entrada mt-5 flex flex-wrap items-center gap-4" style={{ animationDelay: '320ms' }}>
            <Link href="/catalogo" className="inline-flex h-12 items-center rounded-2xl border border-white/30 bg-white/10 px-6 font-semibold text-white backdrop-blur transition hover:bg-white/20">
              Ver catálogo
            </Link>
            <Link href="/auth/registro" className="text-sm font-semibold text-[#bbf7d0] underline-offset-4 hover:underline">
              Crear cuenta gratis
            </Link>
          </div>

          <ul className="animate-entrada mt-10 grid gap-3 text-sm text-[#d1fae5] sm:grid-cols-3" style={{ animationDelay: '400ms' }}>
            {VENTAJAS.map(({ icono: Icono, texto }) => (
              <li key={texto} className="flex items-start gap-2">
                <Icono className="mt-0.5 h-4 w-4 shrink-0 text-acento" aria-hidden="true" /> {texto}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <a href={CREDITO_FOTO_PORTADA.enlace} target="_blank" rel="noopener noreferrer"
        className="absolute bottom-3 right-4 text-[11px] text-white/60 hover:text-white">
        Foto: {CREDITO_FOTO_PORTADA.autor} · Villa Charcas
      </a>
    </section>
  )
}
