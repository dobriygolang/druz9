import { Outlet, useLocation, Link } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

const TABS = [
  { id: 'interview-prep', label: 'Interview Prep', href: '/growth/interview-prep' },
]

export function GrowthHubPage() {
  const location = useLocation()
  const active = TABS.find(t => location.pathname.startsWith(t.href))?.id ?? 'interview-prep'

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-6 pt-6 pb-0 bg-[#F2F3F0] dark:bg-[#0b0d16]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111111] dark:text-[#e2e8f3]">Growth</h1>
            <p className="text-sm text-[#666666] dark:text-[#4d6380] mt-0.5">Готовься к собеседованиям и развивайся</p>
          </div>
        </div>
        <div className="flex items-center gap-0 border-b border-[#CBCCC9] dark:border-[#1a2540]">
          {TABS.map(tab => (
            <Link
              key={tab.id}
              to={tab.href}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                active === tab.id
                  ? 'border-[#6366F1] text-[#111111] dark:text-[#e2e8f3]'
                  : 'border-transparent text-[#666666] dark:text-[#4d6380] hover:text-[#111111] dark:hover:text-[#c8d8ec]'
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}
