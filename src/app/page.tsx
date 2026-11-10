import Link from 'next/link'
import { LuArrowRight, LuStore } from 'react-icons/lu'
import CategoriasPortada from './_components/CategoriasPortada'
import ComoComprar from './_components/ComoComprar'
import Hero from './_components/Hero'
import ProductosDestacados from './_components/ProductosDestacados'
import ZonasPortada from './_components/ZonasPortada'

function Encabezado({ titulo, texto, enlace }: { titulo: string; texto: string; enlace?: { href: string; texto: string } }) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h2 className="font-titulo text-3xl font-bold tracking-tight text-texto sm:text-4xl">{titulo}</h2>
        <p className="mt-3 text-lg text-texto-2">{texto}</p>
      </div>
      {enlace && (
        <Link href={enlace.href} className="group inline-flex items-center gap-1.5 font-semibold text-acento hover:text-acento-hover">
          {enlace.texto} <LuArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <Hero />

      <section className="px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Encabezado titulo="Categorías" texto="Lo que necesitas para sembrar, regar y cuidar tu cultivo." />
          <CategoriasPortada />
        </div>
      </section>

      <section className="bg-gradient-to-b from-[#eaf1e4] to-fondo px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Encabezado
            titulo="Productos destacados"
            texto="Lo que más se lleva para la campaña, con stock disponible."
            enlace={{ href: '/catalogo', texto: 'Ver todo el catálogo' }}
          />
          <ProductosDestacados />
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Encabezado titulo="Cómo comprar" texto="Tres pasos y tu pedido sale de Villa Charcas." />
          <ComoComprar />
        </div>
      </section>

      <section className="border-y border-borde bg-tarjeta/40 px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Encabezado titulo="Zonas de envío" texto="Salimos desde Villa Charcas: al pueblo, a los municipios vecinos y a Sucre por flota." />
          <ZonasPortada />
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-acento/30 bg-gradient-to-br from-[#e3f1df] via-tarjeta to-[#f7efd9] p-8 text-center shadow-2xl shadow-black/10 sm:p-12">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-acento/20 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-trigo/15 blur-3xl" aria-hidden="true" />
          <LuStore className="relative mx-auto h-10 w-10 text-trigo" aria-hidden="true" />
          <h2 className="relative mt-4 font-titulo text-3xl font-bold tracking-tight text-texto sm:text-4xl">¿Tienes un negocio agropecuario?</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-lg text-texto-2">Regístrate como distribuidor y compra para tu tienda en Villa Charcas, Culpina o Incahuasi.</p>
          <Link href="/auth/registro" className="relative mt-8 inline-flex h-12 items-center rounded-2xl bg-acento px-7 font-bold text-white shadow-lg shadow-acento/30 transition hover:bg-acento-hover">
            Crear cuenta de distribuidor
          </Link>
        </div>
      </section>
    </div>
  )
}
