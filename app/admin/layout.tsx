
import { AdminSidebar } from './components/admin-sidebar'
import { AdminHeader } from './components/admin-header'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TODO: Add admin authentication check here
  // For now, we'll allow access but you should implement proper admin auth

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}