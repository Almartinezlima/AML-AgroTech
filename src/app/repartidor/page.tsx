'use client'
import { useCallback, useEffect, useState } from 'react'
import { LuBellRing, LuHandCoins, LuPackageSearch, LuSend, LuWallet } from 'react-icons/lu'
import { Cifra } from '@/components/admin/TarjetasResumen'
import { Aviso, BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import ModalConfirmacion from '@/components/ui/ModalConfirmacion'
import PasosAyuda from '@/components/ui/PasosAyuda'
import { claseBoton, clasePagina, claseTituloAdmin, claseTituloSeccion } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError, pedirApi } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { diaHora } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { EntregaDisponible, EntregaMia, PanelRepartidor } from '@/types/entrega'
import { TarjetaDisponible, TarjetaMia } from './_components/TarjetasEntrega'

// Enlace de invitación al grupo de Telegram (se carga en Render antes del build)
const GRUPO_TELEGRAM = process.env.NEXT_PUBLIC_TELEGRAM_GRUPO_REPARTIDORES?.trim() || null
// Cada cuánto se vuelve a mirar si hay entregas nuevas (o si otro ya tomó una)
const CADA_MS = 15_000

type Confirmar = { tipo: 'aceptar'; entrega: EntregaDisponible } | { tipo: 'recoger'; entrega: EntregaMia } | null

// Panel del repartidor externo (fase 9F), pensado para el celular: disponible / no disponible,
// entregas disponibles (el primero que acepta se la lleva), mis entregas, lo ganado y por cobrar.
export default function RepartidorPage() {
  const { datos: panel, cargando, error, recargar, setDatos } = useDatosApi<PanelRepartidor>('/api/repartidor/panel')
  const [confirmar, setConfirmar] = useState<Confirmar>(null)
  const [procesando, setProcesando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')
  const [aviso, setAviso] = useState('')

  // Se actualiza en silencio cada 15 s y al volver a la pestaña: la que tomó otro desaparece
  const refrescar = useCallback(async () => {
    try {
      setDatos(await pedirApi<PanelRepartidor>('/api/repartidor/panel'))
    } catch {
      // Sin conexión un momento: se mantiene lo último que se vio
    }
  }, [setDatos])

  useEffect(() => {
    const intervalo = window.setInterval(() => { if (document.visibilityState === 'visible') void refrescar() }, CADA_MS)
    const alVolver = () => { if (document.visibilityState === 'visible') void refrescar() }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('focus', alVolver)
    return () => {
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('focus', alVolver)
    }
  }, [refrescar])

  const cambiarDisponible = async (disponible: boolean) => {
    setProcesando(true)
    setAviso('')
    try {
      await enviarJson('/api/repartidor/disponibilidad', 'PATCH', { disponible })
      await refrescar()
    } catch (causa) {
      setAviso(mensajeDeError(causa))
    } finally {
      setProcesando(false)
    }
  }

  const ejecutar = async () => {
    if (!confirmar) return
    setProcesando(true)
    setErrorAccion('')
    try {
      const accion = confirmar.tipo === 'aceptar' ? 'aceptar' : 'tomar'
      await enviarJson(`/api/entregas/${confirmar.entrega.id}/${accion}`, 'POST', {})
      setConfirmar(null)
      setAviso('')
      await refrescar()
    } catch (causa) {
      // Otro repartidor la aceptó primero: se cierra el aviso y la lista se actualiza
      if (confirmar.tipo === 'aceptar') {
        setConfirmar(null)
        setAviso(mensajeDeError(causa))
        await refrescar()
      } else {
        setErrorAccion(mensajeDeError(causa))
      }
    } finally {
      setProcesando(false)
    }
  }

  const envoltura = (contenido: React.ReactNode) => (
    <div className={clasePagina}><div className="mx-auto max-w-2xl">{contenido}</div></div>
  )

  if (cargando && !panel) return envoltura(<BloqueCarga filas={3} alto="h-40" />)
  if (error || !panel) return envoltura(<BloqueError mensaje={error || 'No se pudo cargar tu panel.'} onReintentar={() => void recargar()} />)

  return envoltura(
    <>
      <header className="mb-5">
        <p className="text-sm font-semibold text-trigo">Reparto</p>
        <h1 className={claseTituloAdmin}>Mis entregas</h1>
        <p className="mt-1 text-texto-2">Acepta una entrega, recógela en la tienda y entrégala con el código del cliente.</p>
      </header>

      <div className="flex flex-col gap-5">
        {/* Interruptor grande: sin estar disponible no se ven ni se aceptan entregas */}
        <button
          type="button"
          role="switch"
          aria-checked={panel.disponible}
          disabled={procesando}
          onClick={() => void cambiarDisponible(!panel.disponible)}
          className={`flex w-full items-center justify-between gap-4 rounded-2xl border-2 p-4 text-left transition disabled:opacity-60 ${
            panel.disponible ? 'border-acento bg-acento/10' : 'border-borde bg-tarjeta'
          }`}
        >
          <span className="min-w-0">
            <span className="block font-titulo text-xl font-bold text-texto">{panel.disponible ? 'Estoy disponible' : 'No disponible'}</span>
            <span className="block text-sm text-texto-2">
              {panel.disponible ? 'Ves las entregas nuevas. Tócalo cuando termines tu jornada.' : 'Tócalo para ver y aceptar entregas.'}
            </span>
          </span>
          <span aria-hidden="true" className={`relative h-9 w-16 shrink-0 rounded-full transition ${panel.disponible ? 'bg-acento' : 'bg-borde'}`}>
            <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${panel.disponible ? 'left-8' : 'left-1'}`} />
          </span>
        </button>

        {GRUPO_TELEGRAM && (
          <a href={GRUPO_TELEGRAM} target="_blank" rel="noopener noreferrer" className={`${claseBoton('secundario')} w-full min-h-12`}>
            <LuSend className="h-5 w-5" aria-hidden="true" /> Unirme al grupo de Telegram
          </a>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Cifra titulo="Ganado" valor={formatoBs(panel.ganado)} detalle={`${panel.entregas_hechas} ${panel.entregas_hechas === 1 ? 'entrega' : 'entregas'}`} icono={LuWallet} tono="acento" />
          <Cifra titulo="Por cobrar" valor={formatoBs(panel.por_cobrar)}
            detalle={panel.ultimo_pago ? `Último pago ${diaHora(panel.ultimo_pago.pagado_en)}` : 'La tienda te paga lo acumulado'}
            icono={LuHandCoins} tono={panel.por_cobrar > 0 ? 'pendiente' : 'neutro'} />
        </div>

        {aviso && <Aviso tipo="advertencia">{aviso}</Aviso>}

        {panel.mias.length > 0 && (
          <section aria-labelledby="titulo-mias" className="flex flex-col gap-3">
            <h2 id="titulo-mias" className={claseTituloSeccion}>Mis entregas ({panel.mias.length})</h2>
            <ul className="flex flex-col gap-4">
              {panel.mias.map((e) => (
                <li key={e.id}>
                  <TarjetaMia entrega={e} procesando={procesando} onRecoger={() => { setErrorAccion(''); setConfirmar({ tipo: 'recoger', entrega: e }) }} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="titulo-disponibles" className="flex flex-col gap-3">
          <h2 id="titulo-disponibles" className={claseTituloSeccion}>Entregas disponibles</h2>
          {!panel.disponible ? (
            <BloqueVacio icono={LuBellRing} mensaje="Marca «Estoy disponible» para ver las entregas" />
          ) : panel.disponibles.length === 0 ? (
            <BloqueVacio icono={LuPackageSearch} mensaje="No hay entregas por ahora. Te avisamos en el grupo de Telegram." />
          ) : (
            <ul className="flex flex-col gap-4">
              {panel.disponibles.map((e) => (
                <li key={e.id}>
                  <TarjetaDisponible entrega={e} procesando={procesando} onAceptar={() => { setErrorAccion(''); setConfirmar({ tipo: 'aceptar', entrega: e }) }} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <PasosAyuda pasos={[
          'Marca «Estoy disponible» y únete al grupo de Telegram: ahí avisamos cada entrega nueva.',
          'Toca «Aceptar»: el primero que acepta se la lleva. Pasa por la tienda y toca «Recogí el pedido».',
          'Con el pedido en manos del cliente, pídele su código de 4 números. Ya está pagado con QR: no cobres nada.',
          'Ganas el costo de envío de cada entrega. La tienda te paga lo acumulado en «Por cobrar».',
        ]} />
      </div>

      {confirmar && (
        <ModalConfirmacion
          titulo={confirmar.tipo === 'aceptar' ? `¿Aceptas la entrega a ${confirmar.entrega.zona ?? 'su destino'}?` : `¿Recogiste ${confirmar.entrega.codigo}?`}
          mensaje={confirmar.tipo === 'aceptar'
            ? `Ganas ${formatoBs(confirmar.entrega.ganas)}. Pasa por la tienda a recogerla${confirmar.entrega.bultos ? ` (${confirmar.entrega.bultos} ${confirmar.entrega.bultos === 1 ? 'bulto' : 'bultos'})` : ''}.`
            : `Revisa que tengas ${confirmar.entrega.bultos ? `los ${confirmar.entrega.bultos} ${confirmar.entrega.bultos === 1 ? 'bulto' : 'bultos'}` : 'todos los bultos'}. El cliente verá que su pedido va en camino.`}
          textoConfirmar={confirmar.tipo === 'aceptar' ? 'Sí, la acepto' : 'Sí, lo tengo'}
          textoCancelar="Volver"
          procesando={procesando}
          error={errorAccion}
          onConfirmar={() => void ejecutar()}
          onCancelar={() => setConfirmar(null)}
        />
      )}
    </>
  )
}
