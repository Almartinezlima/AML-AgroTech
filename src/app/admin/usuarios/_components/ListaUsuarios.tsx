import Insignia, { INSIGNIA_ACTIVO, INSIGNIA_INACTIVO } from '@/components/ui/Insignia'
import { ETIQUETA_ROL, ROLES_USUARIO, type RolUsuario, type UsuarioAdmin } from '@/types/usuarios'
import { claseBoton, claseTarjeta } from '@/components/ui/estilos'

interface ListaUsuariosProps {
  usuarios: UsuarioAdmin[]
  idPropio?: string
  onCambiarRol: (usuario: UsuarioAdmin, rol: RolUsuario) => void
  onCambiarEstado: (usuario: UsuarioAdmin) => void
}

type ControlesProps = Omit<ListaUsuariosProps, 'usuarios'> & { usuario: UsuarioAdmin }

const fechaCorta = (fecha: string) => new Date(fecha).toLocaleDateString('es-BO')

// Misma insignia de estado que el resto del sitio (antes quedaba un verde del tema oscuro)
function InsigniaEstado({ activo }: { activo: boolean }) {
  return <Insignia info={activo ? { ...INSIGNIA_ACTIVO, etiqueta: 'Activa' } : { ...INSIGNIA_INACTIVO, etiqueta: 'Desactivada' }} />
}

function SelectorRol({ usuario, idPropio, onCambiarRol }: ControlesProps) {
  return (
    <select
      value={usuario.rol}
      disabled={usuario.id === idPropio}
      onChange={(e) => onCambiarRol(usuario, e.target.value as RolUsuario)}
      aria-label={`Rol de ${usuario.nombre}`}
      className="min-h-11 min-w-0 rounded-xl border border-borde bg-tarjeta-hover px-3 text-sm text-texto outline-none transition-colors hover:border-borde-fuerte focus:border-acento focus:ring-2 focus:ring-acento/25 disabled:opacity-60"
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
      className={claseBoton(usuario.activo ? 'peligro' : 'suave', 'chico')}
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
      <div className={`hidden md:block overflow-x-auto ${claseTarjeta}`}>
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
          <li key={usuario.id} className={`${claseTarjeta} p-4`}>
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
