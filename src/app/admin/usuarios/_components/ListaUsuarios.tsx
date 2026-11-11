import { ETIQUETA_ROL, ROLES_USUARIO, type RolUsuario, type UsuarioAdmin } from '@/types/usuarios'

interface ListaUsuariosProps {
  usuarios: UsuarioAdmin[]
  idPropio?: string
  onCambiarRol: (usuario: UsuarioAdmin, rol: RolUsuario) => void
  onCambiarEstado: (usuario: UsuarioAdmin) => void
}

type ControlesProps = Omit<ListaUsuariosProps, 'usuarios'> & { usuario: UsuarioAdmin }

const fechaCorta = (fecha: string) => new Date(fecha).toLocaleDateString('es-BO')

function InsigniaEstado({ activo }: { activo: boolean }) {
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
      activo ? 'bg-green-900 text-green-400' : 'bg-red-50 text-red-700'
    }`}>
      {activo ? 'Activa' : 'Desactivada'}
    </span>
  )
}

function SelectorRol({ usuario, idPropio, onCambiarRol }: ControlesProps) {
  return (
    <select
      value={usuario.rol}
      disabled={usuario.id === idPropio}
      onChange={(e) => onCambiarRol(usuario, e.target.value as RolUsuario)}
      aria-label={`Rol de ${usuario.nombre}`}
      className="bg-tarjeta-hover border border-borde focus:border-acento disabled:opacity-60 text-texto text-sm rounded-lg px-2 py-2 outline-none"
    >
      {ROLES_USUARIO.map((rol) => (
        <option key={rol} value={rol}>{ETIQUETA_ROL[rol]}</option>
      ))}
    </select>
  )
}

function BotonEstado({ usuario, idPropio, onCambiarEstado }: ControlesProps) {
  return (
    <button
      type="button"
      disabled={usuario.id === idPropio}
      onClick={() => onCambiarEstado(usuario)}
      className={`text-sm font-semibold border rounded-lg px-3 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        usuario.activo
          ? 'border-red-300 text-red-700 hover:bg-red-50'
          : 'border-acento text-acento hover:bg-tarjeta-hover'
      }`}
    >
      {usuario.activo ? 'Desactivar' : 'Activar'}
    </button>
  )
}

const Tu = () => <span className="text-acento text-xs font-normal">(tú)</span>

export default function ListaUsuarios({ usuarios, ...controles }: ListaUsuariosProps) {
  return (
    <>
      {/* Escritorio: tabla */}
      <div className="hidden md:block bg-tarjeta border border-borde rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-borde">
              {['Nombre', 'Correo', 'Teléfono', 'Registro', 'Rol', 'Estado', 'Acción'].map((columna) => (
                <th key={columna} scope="col" className="text-left text-texto-2 text-xs px-4 py-3">{columna}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="border-b border-borde last:border-0 hover:bg-tarjeta-hover">
                <td className="px-4 py-3 text-texto font-medium">
                  {usuario.nombre} {usuario.id === controles.idPropio && <Tu />}
                </td>
                <td className="px-4 py-3 text-texto-2 text-sm break-all">{usuario.email}</td>
                <td className="px-4 py-3 text-texto-2 text-sm">{usuario.telefono ?? '—'}</td>
                <td className="px-4 py-3 text-texto-2 text-sm whitespace-nowrap">{fechaCorta(usuario.created_at)}</td>
                <td className="px-4 py-3"><SelectorRol usuario={usuario} {...controles} /></td>
                <td className="px-4 py-3"><InsigniaEstado activo={usuario.activo} /></td>
                <td className="px-4 py-3"><BotonEstado usuario={usuario} {...controles} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Celular: tarjetas, para no tener scroll horizontal */}
      <ul className="md:hidden flex flex-col gap-3">
        {usuarios.map((usuario) => (
          <li key={usuario.id} className="bg-tarjeta border border-borde rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="text-texto font-semibold min-w-0 break-words">
                {usuario.nombre} {usuario.id === controles.idPropio && <Tu />}
              </p>
              <InsigniaEstado activo={usuario.activo} />
            </div>
            <p className="text-texto-2 text-sm break-all">{usuario.email}</p>
            <p className="text-texto-2 text-xs mt-1">
              {usuario.telefono ?? 'Sin teléfono'} · Registro: {fechaCorta(usuario.created_at)}
            </p>
            <div className="flex items-center justify-between gap-3 mt-3">
              <SelectorRol usuario={usuario} {...controles} />
              <BotonEstado usuario={usuario} {...controles} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
