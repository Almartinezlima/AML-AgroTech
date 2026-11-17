import { TEXTO_CODIGO_CLIENTE } from '@/lib/entrega/presentacion'
import type { CodigoEntrega as DatosCodigo } from '@/types/entrega'
import { LuKeyRound, LuLock } from 'react-icons/lu'

interface CodigoEntregaProps {
  codigo: DatosCodigo
  // En la lista de Mis pedidos va más compacto
  compacto?: boolean
}

// Código de entrega de 4 dígitos (fase 9D). Solo lo recibe el dueño del pedido desde la API.
export default function CodigoEntrega({ codigo, compacto = false }: CodigoEntregaProps) {
  if (codigo.bloqueado || !codigo.codigo) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl border border-estado-pendiente bg-estado-pendiente/10 px-4 py-3 text-estado-pendiente-texto">
        <LuLock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="text-sm">
          <span className="font-semibold">Tu código de entrega está bloqueado</span> por varios intentos fallidos.
          Comunícate con la tienda para revisarlo.
        </p>
      </div>
    )
  }

  return (
    <section
      aria-label="Código de entrega"
      className={`rounded-2xl border-2 border-acento bg-tarjeta text-center ${compacto ? 'px-4 py-3' : 'px-5 py-6'}`}
    >
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-acento">
        <LuKeyRound className="h-4 w-4" aria-hidden="true" /> Tu código de entrega
      </p>
      <p
        className={`font-titulo font-bold tabular-nums text-texto tracking-[0.3em] pl-[0.3em] ${compacto ? 'text-4xl mt-1' : 'text-6xl mt-2'}`}
        aria-label={`Código ${codigo.codigo.split('').join(' ')}`}
      >
        {codigo.codigo}
      </p>
      <p className={`text-texto ${compacto ? 'text-xs mt-1' : 'text-sm mt-3'} text-balance`}>{TEXTO_CODIGO_CLIENTE}</p>
    </section>
  )
}
