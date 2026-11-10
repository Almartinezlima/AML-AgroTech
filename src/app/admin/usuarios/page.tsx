import GestionUsuarios from './_components/GestionUsuarios'

export default function UsuariosAdminPage() {
  return (
    <div className="min-h-screen bg-fondo py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-texto">Usuarios registrados</h1>
          <p className="text-texto-2 mt-1">Gestión de roles y acceso de las cuentas</p>
        </div>

        <GestionUsuarios />
      </div>
    </div>
  )
}
