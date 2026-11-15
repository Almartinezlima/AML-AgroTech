'use client'
import { useState } from 'react'
import { LuBan, LuCircleCheck, LuCircleOff, LuPencil, LuRotateCcw } from 'react-icons/lu'
import TarjetaPresentacion from '@/components/abastecimiento/TarjetaPresentacion'
import ModalConfirmacion from '@/components/ui/ModalConfirmacion'
import { AvisoError } from '@/components/ui/Estados'
import { claseBoton } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import type { Presentacion } from '@/types/abastecimiento'

interface ListaPresentacionesProps {
  presentaciones: Presentacion[]
  diasFicha: number
  onEditar: (presentacion: Presentacion) => void
  onActualizado: () => void
}

// Las presentaciones del distribuidor con sus acciones. Nada se borra: "Dejar de vender"
// la desactiva y se puede volver a vender.
export default function ListaPresentaciones({ presentaciones, diasFicha, onEditar, onActualizado }: ListaPresentacionesProps) {
  const [dejando, setDejando] = useState<Presentacion | null>(null)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [error, setError] = useState('')

  const cambiar = async (presentacion: Presentacion, cambios: { disponible?: boolean; activo?: boolean }) => {
    setProcesando(presentacion.id)
    setError('')
    try {
      await enviarJson(`/api/distribuidor/presentaciones/${presentacion.id}`, 'PATCH', cambios)
      setDejando(null)
      onActualizado()
    } catch (causa) {
      setError(mensajeDeError(causa))
    } finally {
      setProcesando(null)
    }
  }

  return (
    <>
      <AvisoError mensaje={dejando ? '' : error} />
      <ul className="flex flex-col gap-3">
        {presentaciones.map((p) => (
          <TarjetaPresentacion
            key={p.id}
            presentacion={p}
            diasFicha={diasFicha}
            acciones={p.activo ? (
              <>
                <button onClick={() => onEditar(p)} className={claseBoton('secundario', 'chico')}>
                  <LuPencil className="h-4 w-4" aria-hidden="true" /> Editar
                </button>
                <button onClick={() => void cambiar(p, { disponible: !p.disponible })} disabled={procesando === p.id} className={claseBoton('secundario', 'chico')}>
                  {p.disponible
                    ? <><LuCircleOff className="h-4 w-4" aria-hidden="true" /> Marcar sin stock</>
                    : <><LuCircleCheck className="h-4 w-4" aria-hidden="true" /> Marcar disponible</>}
                </button>
                <button onClick={() => { setError(''); setDejando(p) }} className={claseBoton('peligro', 'chico')}>
                  <LuBan className="h-4 w-4" aria-hidden="true" /> Dejar de vender
                </button>
              </>
            ) : (
              <button onClick={() => void cambiar(p, { activo: true })} disabled={procesando === p.id} className={claseBoton('suave', 'chico')}>
                <LuRotateCcw className="h-4 w-4" aria-hidden="true" /> Volver a vender
              </button>
            )}
          />
        ))}
      </ul>

      {dejando && (
        <ModalConfirmacion
          titulo="Dejar de vender esta presentación"
          mensaje={`«${dejando.nombre}» de ${dejando.productos?.nombre ?? 'este producto'} ya no le aparecerá a la tienda para pedirte. Puedes volver a venderla cuando quieras.`}
          textoConfirmar="Sí, dejar de vender"
          textoCancelar="No, volver"
          peligro
          procesando={procesando === dejando.id}
          error={error}
          onConfirmar={() => void cambiar(dejando, { activo: false })}
          onCancelar={() => setDejando(null)}
        />
      )}
    </>
  )
}
