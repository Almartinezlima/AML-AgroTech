import Link from 'next/link'
import { LuMapPinOff } from 'react-icons/lu'
import Marca from '@/components/Marca'
import { claseBotonPrimario, claseBotonSecundario } from '@/components/ui/estilos'

// Página no encontrada, con la marca y salidas claras
export default function NoEncontrado() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-fondo px-4 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-borde bg-tarjeta p-8 text-center shadow-sm sm:p-10">
        <div className="mb-6"><Marca tamano="grande" /></div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-tarjeta-hover text-trigo">
          <LuMapPinOff className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-titulo text-3xl font-bold tracking-tight text-texto">No encontramos esta página</h1>
        <p className="mt-3 text-texto-2">Puede que el enlace esté mal escrito o que la página ya no exista.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/catalogo" className={claseBotonPrimario}>Ver catálogo</Link>
          <Link href="/" className={claseBotonSecundario}>Ir al inicio</Link>
        </div>
      </div>
    </div>
  )
}
