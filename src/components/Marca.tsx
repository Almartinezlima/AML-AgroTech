import Link from 'next/link'
import { LuSprout } from 'react-icons/lu'

// Logotipo: brote + "AML AgroTech"
export default function Marca({ tamano = 'normal', href = '/' }: { tamano?: 'normal' | 'grande'; href?: string }) {
  const grande = tamano === 'grande'
  return (
    <Link href={href} className="inline-flex items-center gap-2 group" aria-label="AML AgroTech, ir al inicio">
      <span className={`grid place-items-center rounded-xl bg-acento/10 ring-1 ring-acento/30 text-acento transition-colors group-hover:bg-acento/20 ${grande ? 'h-12 w-12' : 'h-9 w-9'}`}>
        <LuSprout className={grande ? 'h-7 w-7' : 'h-5 w-5'} aria-hidden="true" />
      </span>
      <span className={`font-titulo font-extrabold tracking-tight text-texto ${grande ? 'text-2xl' : 'text-xl'}`}>
        AML <span className="text-acento">AgroTech</span>
      </span>
    </Link>
  )
}
