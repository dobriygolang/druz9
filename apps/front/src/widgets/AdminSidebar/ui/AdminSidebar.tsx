import { Link, useLocation } from 'react-router-dom'
import { Code2, Gamepad2, BookOpen, Settings, BarChart3 } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

interface AdminNavItem {
  label: string
  icon: React.ReactNode
  href: string
  count?: number
}

const ADMIN_NAV: AdminNavItem[] = [
  { label: 'Code Tasks', icon: <Code2 className="w-3.5 h-3.5" />, href: '/admin/code-tasks' },
  { label: 'Code Game', icon: <Gamepad2 className="w-3.5 h-3.5" />, href: '/admin/code-game' },
  { label: 'Interview Prep', icon: <BookOpen className="w-3.5 h-3.5" />, href: '/admin/interview-prep' },
  { label: 'Config', icon: <Settings className="w-3.5 h-3.5" />, href: '/admin/config' },
  { label: 'Analytics', icon: <BarChart3 className="w-3.5 h-3.5" />, href: '/admin/analytics' },
]

export function AdminSidebar() {
  const location = useLocation()

  return (
    <aside className="w-[220px] min-h-screen bg-white border-r border-[#e2e8f0] flex flex-col flex-shrink-0">
      <nav className="flex-1 p-2.5 pt-4">
        <p className="px-3 mb-2 text-[10px] font-bold text-[#475569] uppercase tracking-widest">Управление</p>
        {ADMIN_NAV.map((item) => {
          const active = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium mb-0.5 transition-colors',
                active
                  ? 'bg-[#eff6ff] text-[#3730a3]'
                  : 'text-[#475569] hover:bg-[#f8fafc]',
              )}
            >
              <span className={cn(active && 'text-[#FF8400]')}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
