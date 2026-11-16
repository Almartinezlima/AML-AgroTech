'use client'
import { useState } from 'react'
import { LuCheck, LuCopy } from 'react-icons/lu'
import { claseBoton } from '@/components/ui/estilos'

// Copia un dato (número de cuenta, monto, referencia) y confirma por 2 segundos
export default function BotonCopiar({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <button type="button" onClick={() => void copiar()} className={claseBoton('secundario', 'chico')} aria-label={`Copiar ${etiqueta}`}>
      {copiado
        ? <><LuCheck className="h-4 w-4" aria-hidden="true" /> Copiado</>
        : <><LuCopy className="h-4 w-4" aria-hidden="true" /> Copiar</>}
    </button>
  )
}
