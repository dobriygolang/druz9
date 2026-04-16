import { Link, useLocation } from 'react-router-dom'
import { Code2, BookOpen, Settings, BarChart3 } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

interface AdminNavItem {
  label: string
  icon: React.ReactNode
  href: string
  count?: number
}

export const ADMIN_NAV: AdminNavItem[] = [
  { label: 'Code Tasks', icon: <Code2 className="w-3.5 h-3.5" />, href: '/admin/code-tasks' },
  { label: 'Interview Prep', icon: <BookOpen className="w-3.5 h-3.5" />, href: '/admin/interview-prep' },
  { label: 'Analytics', icon: <BarChart3 className="w-3.5 h-3.5" />, href: '/admin/analytics' },
  { label: 'Config', icon: <Settings className="w-3.5 h-3.5" />, href: '/admin/config' },
]

export function AdminSidebar() {
  const location = useLocation()

  return (
    <aside className="w-[220px] min-h-screen bg-white border-r border-[#C1CFC4] flex flex-col flex-shrink-0">
      <nav className="flex-1 p-2.5 pt-4">
        <p className="px-3 mb-2 text-[10px] font-bold text-[#4B6B52] uppercase tracking-widest">Management</p>
        {ADMIN_NAV.map((item) => {
          const active = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium mb-0.5 transition-colors',
                active
                  ? 'bg-[#eff6ff] text-[#065F46]'
                  : 'text-[#4B6B52] hover:bg-[#F0F5F1]',
              )}
            >
              <span className={cn(active && 'text-[#059669]')}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
