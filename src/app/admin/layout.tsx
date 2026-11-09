import MenuAdmin from '@/components/layout/MenuAdmin'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:flex lg:items-stretch">
      <MenuAdmin />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
