import EncabezadoAdmin from '@/components/admin/EncabezadoAdmin'
import { clasePagina } from '@/components/ui/estilos'
import GestionUsuarios from './_components/GestionUsuarios'

export default function UsuariosAdminPage() {
  return (
    <div className={clasePagina}>
      <div className="max-w-7xl mx-auto">
        <EncabezadoAdmin titulo="Usuarios registrados" descripcion="Cambia el rol de cada cuenta o desactívala." />

        <GestionUsuarios />
      </div>
    </div>
  )
}
