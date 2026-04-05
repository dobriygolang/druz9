import { Outlet, Link, useLocation } from 'react-router-dom'
import { AdminSidebar } from '@/widgets/AdminSidebar/ui/AdminSidebar'
import { useAuth } from '@/app/providers/AuthProvider'
import { Avatar } from '@/shared/ui/Avatar'
import { Badge } from '@/shared/ui/Badge'
import { cn } from '@/shared/lib/cn'

const ADMIN_TABS = [
  { label: 'Code Tasks', href: '/admin/code-tasks' },
  { label: 'Code Game', href: '/admin/code-game' },
  { label: 'Interview Prep', href: '/admin/interview-prep' },
  { label: 'Config', href: '/admin/config' },
  { label: 'Analytics', href: '/admin/analytics' },
]

export function AdminLayout() {
  const location = useLocation()
  const { user } = useAuth()
  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : 'Admin'

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc]">
      {/* Top bar */}
      <header className="h-[52px] bg-white border-b border-[#e2e8f0] flex items-center justify-between px-6 flex-shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#FF8400] rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-white">L</span>
            </div>
            <span className="text-sm font-semibold text-[#0f172a]">Lunaris Admin</span>
          </div>
          <nav className="flex items-center gap-1">
            {ADMIN_TABS.map((tab) => (
              <Link
                key={tab.href}
                to={tab.href}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  location.pathname === tab.href
                    ? 'bg-[#FF8400] text-[#0f172a]'
                    : 'text-[#64748b] hover:bg-[#f1f5f9]',
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="text-[11px] font-semibold bg-[#1a1a0e] text-[#fbbf24]">Admin</Badge>
          <Avatar name={displayName} size="xs" className="w-7 h-7 text-xs" />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
