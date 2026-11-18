'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import QRCode from 'qrcode'
import { LuArrowLeft, LuPrinter } from 'react-icons/lu'
import { BloqueCarga, BloqueError } from '@/components/ui/Estados'
import { claseBotonPrimario, claseBotonSecundario, clasePagina } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { DetallePreparacion } from '@/types/almacen'
import Etiqueta from './_components/Etiqueta'

// Etiquetas para pegar en cada bulto (fase 9C): una por bulto, con el QR del código del pedido.
// En pantalla se ven como vista previa; al imprimir sale una etiqueta por hoja.
export default function EtiquetaPage() {
  const { id } = useParams<{ id: string }>()
  const { datos: pedido, cargando, error, recargar } = useDatosApi<DetallePreparacion>(`/api/almacen/pedidos/${id}`)
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    if (!pedido) return
    let vigente = true
    QRCode.toDataURL(pedido.codigo, { errorCorrectionLevel: 'M', margin: 1, width: 360 })
      .then((url) => { if (vigente) setQr(url) })
      .catch(() => { if (vigente) setQr(null) })
    return () => { vigente = false }
  }, [pedido])

  const volver = <Link href={`/admin/preparar/pedidos/${id}`} className={claseBotonSecundario}>Volver al pedido</Link>

  if (cargando && !pedido) return <div className={clasePagina}><div className="mx-auto max-w-3xl"><BloqueCarga filas={1} alto="h-96" /></div></div>
  if (error || !pedido) {
    return <div className={clasePagina}><div className="mx-auto max-w-3xl"><BloqueError mensaje={error || 'No se pudo cargar el pedido.'} onReintentar={() => void recargar()}>{volver}</BloqueError></div></div>
  }

  // Antes de dejarlo listo todavía no se sabe cuántos bultos son: se imprime una sola
  const total = pedido.bultos ?? 1

  return (
    <div className={`${clasePagina} print:min-h-0 print:bg-white print:p-0`}>
      <style>{'@media print { @page { margin: 8mm; } }'}</style>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <Link href={`/admin/preparar/pedidos/${id}`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-acento hover:underline">
            <LuArrowLeft className="h-4 w-4" aria-hidden="true" /> {pedido.codigo}
          </Link>
          <button type="button" onClick={() => window.print()} disabled={!qr} className={claseBotonPrimario}>
            <LuPrinter className="h-5 w-5" aria-hidden="true" /> Imprimir {total === 1 ? 'etiqueta' : `${total} etiquetas`}
          </button>
        </div>

        <div className="flex flex-col items-center gap-6 print:block">
          {Array.from({ length: total }, (_, i) => (
            <Etiqueta key={i} pedido={pedido} qr={qr} bulto={i + 1} total={total} />
          ))}
        </div>
      </div>
    </div>
  )
}
