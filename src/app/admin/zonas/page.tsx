'use client'
import { useCallback, useState } from 'react'
import { AvisoError, BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import Modal from '@/components/ui/Modal'
import { claseBotonPrimario, claseBotonSecundario, claseEtiqueta, claseInput, clasePagina, claseTarjeta } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { ETIQUETA_TIPO_ZONA, tiempoEntrega } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import { TIPOS_ZONA, type TipoZona, type ZonaEnvio } from '@/types/comercio'

const VACIO = { nombre: '', tipo: 'provincia' as TipoZona, costo: '0', dias_min: '1', dias_max: '2', permite_contra_entrega: false, orden: '10', activo: true }

export default function AdminZonasPage() {
  const { datos, cargando, error, recargar } = useDatosApi<ZonaEnvio[]>('/api/zonas-envio?alcance=todas')
  const [editando, setEditando] = useState<ZonaEnvio | 'nueva' | null>(null)
  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')

  const cerrar = useCallback(() => setEditando(null), [])
  const cambiar = (cambios: Partial<typeof VACIO>) => setForm((f) => ({ ...f, ...cambios }))

  const abrir = (zona: ZonaEnvio | 'nueva') => {
    setErrorForm('')
    setForm(zona === 'nueva' ? VACIO : {
      nombre: zona.nombre,
      tipo: zona.tipo,
      costo: String(zona.costo),
      dias_min: String(zona.dias_min),
      dias_max: String(zona.dias_max),
      permite_contra_entrega: zona.permite_contra_entrega,
      orden: String(zona.orden),
      activo: zona.activo,
    })
    setEditando(zona)
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setErrorForm('')
    const { activo, ...resto } = form
    const cuerpo = { ...resto, costo: Number(form.costo), dias_min: Number(form.dias_min), dias_max: Number(form.dias_max), orden: Number(form.orden) }
    try {
      if (editando === 'nueva') await enviarJson('/api/zonas-envio', 'POST', cuerpo)
      else if (editando) await enviarJson(`/api/zonas-envio/${editando.id}`, 'PATCH', { ...cuerpo, activo })
      cerrar()
      await recargar()
    } catch (causa) {
      setErrorForm(mensajeDeError(causa))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className={clasePagina}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <h1 className="text-3xl font-bold text-[#f0fdf4]">Zonas de envío</h1>
          <button onClick={() => abrir('nueva')} className={claseBotonPrimario}>+ Nueva zona</button>
        </div>

        {cargando ? (
          <BloqueCarga />
        ) : error || !datos ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : datos.length === 0 ? (
          <BloqueVacio icono="📍" mensaje="Aún no hay zonas de envío" />
        ) : (
          <ul className="flex flex-col gap-3">
            {datos.map((zona) => (
              <li key={zona.id} className={`${claseTarjeta} p-4 flex items-center justify-between gap-3 flex-wrap`}>
                <div className="min-w-0">
                  <p className="text-[#f0fdf4] font-semibold break-words">{zona.nombre}</p>
                  <p className="text-[#86efac] text-xs">
                    {ETIQUETA_TIPO_ZONA[zona.tipo]} · {tiempoEntrega(zona)} · {zona.permite_contra_entrega ? 'Con contra entrega' : 'Sin contra entrega'}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[#22c55e] font-bold">{formatoBs(zona.costo)}</span>
                  <Insignia info={zona.activo ? { etiqueta: 'Activa', color: '#22c55e' } : { etiqueta: 'Inactiva', color: '#ef4444' }} />
                  <button onClick={() => abrir(zona)} className={`${claseBotonSecundario} !px-3 !py-2 text-sm`}>Editar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editando && (
        <Modal titulo={editando === 'nueva' ? 'Nueva zona' : 'Editar zona'} bloqueado={guardando} onCerrar={cerrar}>
          <form onSubmit={guardar} className="flex flex-col gap-4">
            <AvisoError mensaje={errorForm} />
            <div><label htmlFor="z-nombre" className={claseEtiqueta}>Nombre</label><input id="z-nombre" required maxLength={100} value={form.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} className={claseInput} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="z-tipo" className={claseEtiqueta}>Tipo</label>
                <select id="z-tipo" value={form.tipo} onChange={(e) => cambiar({ tipo: e.target.value as TipoZona })} className={claseInput}>
                  {TIPOS_ZONA.map((t) => <option key={t} value={t}>{ETIQUETA_TIPO_ZONA[t]}</option>)}
                </select>
              </div>
              <div><label htmlFor="z-costo" className={claseEtiqueta}>Costo (Bs.)</label><input id="z-costo" required type="number" min="0" step="0.01" value={form.costo} onChange={(e) => cambiar({ costo: e.target.value })} className={claseInput} /></div>
              <div><label htmlFor="z-min" className={claseEtiqueta}>Días mínimos</label><input id="z-min" required type="number" min="0" value={form.dias_min} onChange={(e) => cambiar({ dias_min: e.target.value })} className={claseInput} /></div>
              <div><label htmlFor="z-max" className={claseEtiqueta}>Días máximos</label><input id="z-max" required type="number" min="0" value={form.dias_max} onChange={(e) => cambiar({ dias_max: e.target.value })} className={claseInput} /></div>
            </div>
            <label className="flex items-center gap-2 text-[#f0fdf4] text-sm"><input type="checkbox" className="accent-[#22c55e]" checked={form.permite_contra_entrega} onChange={(e) => cambiar({ permite_contra_entrega: e.target.checked })} /> Permite contra entrega</label>
            {editando !== 'nueva' && (
              <label className="flex items-center gap-2 text-[#f0fdf4] text-sm"><input type="checkbox" className="accent-[#22c55e]" checked={form.activo} onChange={(e) => cambiar({ activo: e.target.checked })} /> Zona activa</label>
            )}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button type="button" disabled={guardando} onClick={cerrar} className={claseBotonSecundario}>Cancelar</button>
              <button type="submit" disabled={guardando} className={claseBotonPrimario}>{guardando ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
