import { Outlet, Link, useLocation } from 'react-router-dom'
import { AdminSidebar } from '@/widgets/AdminSidebar/ui/AdminSidebar'
import { useAuth } from '@/app/providers/AuthProvider'
import { Avatar } from '@/shared/ui/Avatar'
import { Badge } from '@/shared/ui/Badge'
import { cn } from '@/shared/lib/cn'
import { ADMIN_NAV } from '@/widgets/AdminSidebar/ui/AdminSidebar'
import { useTranslation } from 'react-i18next'

export function AdminLayout() {
  const location = useLocation()
  const { user } = useAuth()
  const { t } = useTranslation()
  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : 'Admin'

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F5F1]">
      {/* Top bar */}
      <header className="h-[52px] bg-white border-b border-[#C1CFC4] flex items-center justify-between px-6 flex-shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#059669] rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-white">D</span>
            </div>
            <span className="text-sm font-semibold text-[#0B1210]">{t('admin.title')}</span>
          </div>
          <nav className="flex items-center gap-1">
            {ADMIN_NAV.map((tab) => (
              <Link
                key={tab.href}
                to={tab.href}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  location.pathname === tab.href
                    ? 'bg-[#059669] text-[#0B1210]'
                    : 'text-[#4B6B52] hover:bg-[#F0F5F1]',
                )}
              >
                {t(tab.labelKey)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="text-[11px] font-semibold bg-[#1a1a0e] text-[#fbbf24]">{t('admin.badge')}</Badge>
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
