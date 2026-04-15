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
      <div className="mobile-sticky-surface bg-[#F2F3F0]/88 px-4 pt-4 pb-0 dark:bg-[#0b0d16]/88 md:px-6 md:pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111111] dark:text-[#e2e8f3]">Growth</h1>
            <p className="text-sm text-[#666666] dark:text-[#4d6380] mt-0.5">Готовься к собеседованиям и развивайся</p>
          </div>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:px-0">
          <div className="inline-flex min-w-full gap-2 rounded-[24px] border border-[#d8d9d6] bg-white/72 p-1.5 shadow-[0_18px_34px_rgba(15,23,42,0.06)] backdrop-blur dark:border-[#1a2540] dark:bg-[#10192b]/72 md:min-w-0">
            {TABS.map(tab => (
              <Link
                key={tab.id}
                to={tab.href}
                className={cn(
                  'whitespace-nowrap rounded-[18px] px-4 py-2.5 text-sm font-medium transition-all',
                  active === tab.id
                    ? 'bg-[#111111] text-white shadow-[0_14px_24px_rgba(15,23,42,0.14)] dark:bg-white dark:text-[#08101f]'
                    : 'text-[#666666] dark:text-[#4d6380] hover:bg-white/80 hover:text-[#111111] dark:hover:bg-[#161f34] dark:hover:text-[#c8d8ec]'
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}
