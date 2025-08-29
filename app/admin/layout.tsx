
import { AdminSidebar } from './components/admin-sidebar'
import { AdminHeader } from './components/admin-header'
import { AdminRouteGuard } from './components/admin-route-guard'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminRouteGuard>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <div className="flex">
          <AdminSidebar />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminRouteGuard>
  )
}