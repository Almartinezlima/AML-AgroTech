'use client'
import { useState } from 'react'
import { LuPackageCheck, LuTruck } from 'react-icons/lu'
import { Cifra } from '@/components/admin/TarjetasResumen'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import ModalConfirmacion from '@/components/ui/ModalConfirmacion'
import PasosAyuda from '@/components/ui/PasosAyuda'
import { clasePagina, claseTituloAdmin } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { PedidoReparto } from '@/types/entrega'
import TarjetaReparto from './_components/TarjetaReparto'

type Grupo = 'por_salir' | 'en_camino'

const GRUPOS: Array<{ id: Grupo; titulo: string; vacio: string; estado: PedidoReparto['estado']; icono: typeof LuTruck }> = [
  { id: 'por_salir', titulo: 'Por salir', vacio: 'No hay pedidos empacados esperando', estado: 'empacado', icono: LuPackageCheck },
  { id: 'en_camino', titulo: 'En camino', vacio: 'No llevas pedidos en camino', estado: 'despachado', icono: LuTruck },
]

// Panel del repartidor (fase 9D), pensado para el celular: la cola a domicilio, el más antiguo
// primero. "Tomar y salir" registra quién lo lleva; "Entregar" pide el código del cliente.
export default function RepartidorPage() {
  const { datos, cargando, error, recargar } = useDatosApi<PedidoReparto[]>('/api/repartidor/pedidos')
  const [activo, setActivo] = useState<Grupo>('por_salir')
  const [tomando, setTomando] = useState<PedidoReparto | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  const delGrupo = (estado: PedidoReparto['estado']) => (datos ?? []).filter((p) => p.estado === estado)
  const grupo = GRUPOS.find((g) => g.id === activo) ?? GRUPOS[0]
  const lista = delGrupo(grupo.estado)

  const tomar = async () => {
    if (!tomando) return
    setProcesando(true)
    setErrorAccion('')
    try {
      await enviarJson(`/api/entregas/${tomando.id}/tomar`, 'POST', {})
      setTomando(null)
      setActivo('en_camino')
      await recargar()
    } catch (causa) {
      setErrorAccion(mensajeDeError(causa))
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className={clasePagina}>
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className="text-sm font-semibold text-trigo">Reparto</p>
          <h1 className={claseTituloAdmin}>Entregas a domicilio</h1>
          <p className="mt-1 text-texto-2">Lleva primero el más antiguo. Entrega solo con el código del cliente.</p>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-3">
          {GRUPOS.map((g) => (
            <Cifra
              key={g.id}
              titulo={g.titulo}
              valor={datos ? String(delGrupo(g.estado).length) : '—'}
              detalle={g.id === activo ? 'Mostrando' : 'Ver lista'}
              icono={g.icono}
              tono={g.id === 'por_salir' ? 'pendiente' : 'acento'}
              activa={g.id === activo}
              onClick={() => setActivo(g.id)}
            />
          ))}
        </div>

        {cargando && !datos ? <BloqueCarga filas={3} alto="h-48" />
          : error ? <BloqueError mensaje={error} onReintentar={() => void recargar()} />
          : lista.length === 0 ? <BloqueVacio icono={grupo.icono} mensaje={grupo.vacio} />
          : (
            <ul className="flex flex-col gap-4">
              {lista.map((p) => (
                <li key={p.id}>
                  <TarjetaReparto pedido={p} procesando={procesando} onTomar={() => { setErrorAccion(''); setTomando(p) }} />
                </li>
              ))}
            </ul>
          )}

        <div className="mt-8">
          <PasosAyuda pasos={[
            'En «Por salir», toca «Tomar y salir» en el pedido más antiguo: queda registrado que tú lo llevas.',
            'Si es efectivo al recibir, cobra el total y regístralo antes de entregar.',
            'Con el pedido ya en manos del cliente, pídele su código de 4 números y el nombre de quien recibe.',
          ]} />
        </div>
      </div>

      {tomando && (
        <ModalConfirmacion
          titulo={`¿Sales con ${tomando.codigo}?`}
          mensaje={`Queda registrado que tú lo llevas a ${tomando.zona ?? 'su destino'}${tomando.bultos ? ` (${tomando.bultos} ${tomando.bultos === 1 ? 'bulto' : 'bultos'})` : ''}. Revisa que tengas todos los bultos.`}
          textoConfirmar="Sí, tomar y salir"
          textoCancelar="Volver"
          procesando={procesando}
          error={errorAccion}
          onConfirmar={() => void tomar()}
          onCancelar={() => setTomando(null)}
        />
      )}
    </div>
  )
}
