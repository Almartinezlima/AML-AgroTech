'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ModalConfirmacion from '@/components/ui/ModalConfirmacion'
import { useAuth } from '@/context/AuthContext'
import { pedirApi } from '@/lib/api/cliente'
import { ETIQUETA_ROL, ROLES_USUARIO, type CambiosUsuario, type RolUsuario, type UsuarioAdmin } from '@/types/usuarios'
import ListaUsuarios from './ListaUsuarios'
import ResumenUsuarios from './ResumenUsuarios'
import SkeletonUsuarios from './SkeletonUsuarios'
import { LuTriangleAlert, LuUsers } from 'react-icons/lu'

interface AccionPendiente {
  usuario: UsuarioAdmin
  cambios: CambiosUsuario
  titulo: string
  mensaje: string
  textoConfirmar: string
  peligro: boolean
}

// Sin mayúsculas ni tildes, para buscar "Maria" y encontrar "María"
const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function GestionUsuarios() {
  const { user } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState<RolUsuario | 'todos'>('todos')
  const [accion, setAccion] = useState<AccionPendiente | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setErrorCarga('')
    try {
      setUsuarios(await pedirApi<UsuarioAdmin[]>('/api/usuarios'))
    } catch (error) {
      setErrorCarga(error instanceof Error ? error.message : 'No se pudieron cargar los usuarios.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const visibles = useMemo(() => {
    const termino = normalizar(busqueda.trim())
    return usuarios.filter((u) => {
      const coincideRol = filtroRol === 'todos' || u.rol === filtroRol
      const coincideTexto = normalizar(`${u.nombre} ${u.email} ${u.telefono ?? ''}`).includes(termino)
      return coincideRol && coincideTexto
    })
  }, [usuarios, busqueda, filtroRol])

  const pedirCambioRol = (usuario: UsuarioAdmin, rol: RolUsuario) => {
    setErrorAccion('')
    setAccion({
      usuario,
      cambios: { rol },
      titulo: 'Cambiar rol',
      mensaje: `${usuario.nombre} pasará de ${ETIQUETA_ROL[usuario.rol]} a ${ETIQUETA_ROL[rol]}.`,
      textoConfirmar: 'Cambiar rol',
      peligro: rol === 'admin',
    })
  }

  const pedirCambioEstado = (usuario: UsuarioAdmin) => {
    setErrorAccion('')
    setAccion({
      usuario,
      cambios: { activo: !usuario.activo },
      titulo: usuario.activo ? 'Desactivar cuenta' : 'Activar cuenta',
      mensaje: usuario.activo
        ? `${usuario.nombre} no podrá comprar ni entrar a su cuenta hasta que la actives de nuevo.`
        : `${usuario.nombre} volverá a tener acceso a su cuenta.`,
      textoConfirmar: usuario.activo ? 'Desactivar' : 'Activar',
      peligro: usuario.activo,
    })
  }

  const cancelarAccion = useCallback(() => setAccion(null), [])

  const confirmarAccion = async () => {
    if (!accion) return
    setProcesando(true)
    setErrorAccion('')
    try {
      const actualizado = await pedirApi<UsuarioAdmin>(`/api/usuarios/${accion.usuario.id}`, {
        method: 'PATCH',
        body: JSON.stringify(accion.cambios),
      })
      setUsuarios((actuales) => actuales.map((u) => (u.id === actualizado.id ? actualizado : u)))
      setAccion(null)
    } catch (error) {
      setErrorAccion(error instanceof Error ? error.message : 'No se pudo guardar el cambio.')
    } finally {
      setProcesando(false)
    }
  }

  if (cargando) return <SkeletonUsuarios />

  if (errorCarga) {
    return (
      <div role="alert" className="bg-tarjeta border border-red-300 rounded-xl p-8 text-center">
        <LuTriangleAlert className="mx-auto mb-3 h-10 w-10 text-red-700" aria-hidden="true" />
        <p className="text-texto font-semibold mb-1">No se pudieron cargar los usuarios</p>
        <p className="text-texto-2 text-sm mb-5">{errorCarga}</p>
        <button onClick={() => void cargar()}
          className="bg-acento hover:bg-acento-hover text-white font-bold px-6 py-2.5 rounded-xl transition-colors">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <>
      <ResumenUsuarios usuarios={usuarios} />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, correo o teléfono"
          aria-label="Buscar usuarios"
          className="flex-1 min-w-0 bg-tarjeta border border-borde focus:border-acento text-texto rounded-xl px-4 py-3 outline-none transition-colors"
        />
        <select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value as RolUsuario | 'todos')}
          aria-label="Filtrar por rol"
          className="bg-tarjeta border border-borde focus:border-acento text-texto rounded-xl px-4 py-3 outline-none transition-colors"
        >
          <option value="todos">Todos los roles</option>
          {ROLES_USUARIO.map((rol) => (
            <option key={rol} value={rol}>{ETIQUETA_ROL[rol]}</option>
          ))}
        </select>
      </div>

      {visibles.length === 0 ? (
        <div className="bg-tarjeta border border-borde rounded-xl text-center py-16 px-4">
          <LuUsers className="mx-auto h-12 w-12 text-texto-2" aria-hidden="true" />
          <p className="text-texto-2 mt-4 text-lg">
            {usuarios.length === 0 ? 'Aún no hay usuarios registrados' : 'Ningún usuario coincide con la búsqueda'}
          </p>
        </div>
      ) : (
        <ListaUsuarios
          usuarios={visibles}
          idPropio={user?.id}
          onCambiarRol={pedirCambioRol}
          onCambiarEstado={pedirCambioEstado}
        />
      )}

      {accion && (
        <ModalConfirmacion
          titulo={accion.titulo}
          mensaje={accion.mensaje}
          textoConfirmar={accion.textoConfirmar}
          peligro={accion.peligro}
          procesando={procesando}
          error={errorAccion}
          onConfirmar={() => void confirmarAccion()}
          onCancelar={cancelarAccion}
        />
      )}
    </>
  )
}
