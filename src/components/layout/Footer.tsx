import Link from 'next/link'
import { LuMapPin, LuMessageCircle } from 'react-icons/lu'
import Marca from '@/components/Marca'
import { CREDITO_FOTO_PORTADA, ENLACE_CREDITOS } from '@/lib/portada'

const NUMERO_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_TIENDA

const claseTituloColumna = 'font-titulo text-sm font-bold text-texto mb-3'
const claseEnlace = 'text-sm text-texto-2 hover:text-acento transition-colors'

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-borde bg-tarjeta">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Marca />
            <p className="mt-4 max-w-xs text-sm text-texto-2">
              Insumos agrícolas con precios en bolivianos y envío a las provincias de Chuquisaca.
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-texto-2">
              <LuMapPin className="h-4 w-4 text-trigo" aria-hidden="true" /> Villa Charcas, Chuquisaca — Bolivia
            </p>
          </div>

          <nav aria-label="Tienda">
            <p className={claseTituloColumna}>Tienda</p>
            <ul className="flex flex-col gap-2">
              <li><Link href="/catalogo" className={claseEnlace}>Catálogo</Link></li>
              <li><Link href="/carrito" className={claseEnlace}>Carrito</Link></li>
              <li><Link href="/pedidos" className={claseEnlace}>Mis pedidos</Link></li>
              <li><Link href="/auth/registro" className={claseEnlace}>Crear cuenta</Link></li>
            </ul>
          </nav>

          <div>
            <p className={claseTituloColumna}>Atención</p>
            <ul className="flex flex-col gap-2 text-sm text-texto-2">
              <li>Pago por QR, transferencia o contra entrega</li>
              <li>Envíos por flota y encomienda</li>
              {NUMERO_WHATSAPP && (
                <li>
                  <a href={`https://wa.me/${NUMERO_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className={`${claseEnlace} inline-flex items-center gap-1.5`}>
                    <LuMessageCircle className="h-4 w-4" aria-hidden="true" /> Escríbenos por WhatsApp
                  </a>
                </li>
              )}
              <li><Link href="/api-docs" className={claseEnlace}>API REST (documentación)</Link></li>
            </ul>
          </div>

          <div>
            <p className={claseTituloColumna}>Equipo</p>
            <p className="text-sm text-texto">Grupo 20</p>
            <ul className="mt-1 flex flex-col gap-1 text-sm text-texto-2">
              <li>Aldo Martínez Lima</li>
              <li>Miguel Alejandro Nava Mamani</li>
            </ul>
            <p className="mt-3 text-sm text-texto-2">
              Ingeniería de Software (SIS324)<br />USFX — Universidad San Francisco Xavier de Chuquisaca
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-borde pt-6 text-xs text-texto-2/80 md:flex-row md:items-center md:justify-between">
          <p>© 2026 AML AgroTech · Proyecto académico, precios referenciales de Chuquisaca.</p>
          <p className="md:text-right">
            Fotos: tiendas agrícolas, Wikimedia Commons, Unsplash y propias —{' '}
            <a href={ENLACE_CREDITOS} target="_blank" rel="noopener noreferrer" className="underline decoration-trigo/50 hover:text-trigo">ver créditos</a>
            {' · '}Portada:{' '}
            <a href={CREDITO_FOTO_PORTADA.enlace} target="_blank" rel="noopener noreferrer" className="underline decoration-trigo/50 hover:text-trigo">{CREDITO_FOTO_PORTADA.autor}</a>
            {' · '}Íconos:{' '}
            <a href="https://lucide.dev" target="_blank" rel="noopener noreferrer" className="underline decoration-trigo/50 hover:text-trigo">Lucide</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
