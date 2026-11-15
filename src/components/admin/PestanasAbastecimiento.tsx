'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { claseFilaFiltros, claseFiltro } from '@/components/ui/estilos'

const PESTANAS = [
  { href: '/admin/abastecimiento', texto: 'Reponer y órdenes' },
  { href: '/admin/abastecimiento/distribuidores', texto: 'Distribuidores' },
]

// Las 2 pantallas de Abastecimiento (un solo ítem en el menú del panel)
export default function PestanasAbastecimiento() {
  const ruta = usePathname()
  const activa = ruta.startsWith('/admin/abastecimiento/distribuidores') ? PESTANAS[1].href : PESTANAS[0].href

  return (
    <nav aria-label="Secciones de abastecimiento" className={`${claseFilaFiltros} mb-6`}>
      {PESTANAS.map((p) => (
        <Link key={p.href} href={p.href} aria-current={activa === p.href ? 'page' : undefined} className={claseFiltro(activa === p.href)}>
          {p.texto}
        </Link>
      ))}
    </nav>
  )
}
