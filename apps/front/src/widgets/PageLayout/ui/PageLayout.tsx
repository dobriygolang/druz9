import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'

export function PageLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
