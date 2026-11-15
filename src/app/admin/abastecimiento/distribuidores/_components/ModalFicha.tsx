'use client'
import { useState } from 'react'
import { AvisoError } from '@/components/ui/Estados'
import Modal from '@/components/ui/Modal'
import { claseAyuda, claseBotonPrimario, claseBotonSecundario, claseEtiqueta, claseInput } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { CIUDADES_DISTRIBUIDOR, type CiudadDistribuidor, type CuentaSinFicha, type Distribuidor } from '@/types/abastecimiento'

interface ModalFichaProps {
  ficha: Distribuidor | null // null = nueva
  cuentas: CuentaSinFicha[]
  onCerrar: () => void
  onGuardado: () => void
}

// Ficha del proveedor: la carga el admin para una cuenta que ya tiene el rol distribuidor
export default function ModalFicha({ ficha, cuentas, onCerrar, onGuardado }: ModalFichaProps) {
  const [form, setForm] = useState({
    usuario_id: cuentas[0]?.id ?? '',
    nombre_comercial: ficha?.nombre_comercial ?? '',
    ciudad: (ficha?.ciudad ?? 'Sucre') as CiudadDistribuidor,
    telefono: ficha?.telefono ?? '',
    nit: ficha?.nit ?? '',
    dias_entrega: String(ficha?.dias_entrega ?? 3),
    activo: ficha?.activo ?? true,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const cambiar = (cambios: Partial<typeof form>) => setForm((f) => ({ ...f, ...cambios }))

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    const datos = {
      nombre_comercial: form.nombre_comercial,
      ciudad: form.ciudad,
      telefono: form.telefono,
      nit: form.nit,
      dias_entrega: Number(form.dias_entrega),
    }
    try {
      if (ficha) await enviarJson(`/api/distribuidores/${ficha.id}`, 'PATCH', { ...datos, activo: form.activo })
      else await enviarJson('/api/distribuidores', 'POST', { ...datos, usuario_id: form.usuario_id })
      onGuardado()
    } catch (causa) {
      setError(mensajeDeError(causa))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={ficha ? 'Editar distribuidor' : 'Nueva ficha de distribuidor'} bloqueado={guardando} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <AvisoError mensaje={error} />

        {!ficha && (
          <div>
            <label htmlFor="d-cuenta" className={claseEtiqueta}>Cuenta del distribuidor</label>
            <select id="d-cuenta" required value={form.usuario_id} onChange={(e) => cambiar({ usuario_id: e.target.value })} className={claseInput}>
              {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.email}</option>)}
            </select>
            <p className={claseAyuda}>Solo aparecen las cuentas con rol Distribuidor que aún no tienen ficha.</p>
          </div>
        )}

        <div>
          <label htmlFor="d-nombre" className={claseEtiqueta}>Nombre comercial</label>
          <input id="d-nombre" required minLength={2} maxLength={120} value={form.nombre_comercial}
            onChange={(e) => cambiar({ nombre_comercial: e.target.value })} placeholder="Ej: Agroinsumos del Sur" className={claseInput} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="d-ciudad" className={claseEtiqueta}>Ciudad</label>
            <select id="d-ciudad" value={form.ciudad} onChange={(e) => cambiar({ ciudad: e.target.value as CiudadDistribuidor })} className={claseInput}>
              {CIUDADES_DISTRIBUIDOR.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="d-dias" className={claseEtiqueta}>Días de entrega</label>
            <input id="d-dias" required type="number" inputMode="numeric" min="0" max="60" step="1" value={form.dias_entrega}
              onChange={(e) => cambiar({ dias_entrega: e.target.value })} className={claseInput} />
          </div>
          <div>
            <label htmlFor="d-telefono" className={claseEtiqueta}>Teléfono / WhatsApp</label>
            <input id="d-telefono" type="tel" inputMode="tel" maxLength={20} value={form.telefono}
              onChange={(e) => cambiar({ telefono: e.target.value })} placeholder="Ej: 70012345" className={claseInput} />
          </div>
          <div>
            <label htmlFor="d-nit" className={claseEtiqueta}>NIT (opcional)</label>
            <input id="d-nit" maxLength={20} value={form.nit} onChange={(e) => cambiar({ nit: e.target.value })} className={claseInput} />
          </div>
        </div>

        {ficha && (
          <label className="flex min-h-11 items-center gap-2 text-sm text-texto">
            <input type="checkbox" className="h-5 w-5 accent-acento" checked={form.activo} onChange={(e) => cambiar({ activo: e.target.checked })} />
            Distribuidor activo (si lo apagas, no entra a su panel)
          </label>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" disabled={guardando} onClick={onCerrar} className={claseBotonSecundario}>Cancelar</button>
          <button type="submit" disabled={guardando || (!ficha && !form.usuario_id)} className={claseBotonPrimario}>{guardando ? 'Guardando…' : 'Guardar ficha'}</button>
        </div>
      </form>
    </Modal>
  )
}
