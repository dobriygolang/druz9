import { Outlet, useLocation, Link } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

const TABS = [
  { id: 'code-rooms', label: 'Code Rooms', href: '/practice/code-rooms' },
  { id: 'arena', label: 'Arena', href: '/practice/arena' },
  { id: 'solo', label: 'Solo Practice', href: '/practice/solo' },
]

export function PracticeHubPage() {
  const location = useLocation()
  const active = TABS.find(t => location.pathname.startsWith(t.href))?.id ?? 'code-rooms'

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-6 pt-6 pb-0 bg-[#F2F3F0]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111111]">Practice</h1>
            <p className="text-sm text-[#666666] mt-0.5">Практикуйся и соревнуйся с другими</p>
          </div>
          {/* Pill tabs for mode selection */}
          <div className="flex items-center gap-1 p-1 bg-[#E7E8E5] border border-[#CBCCC9] rounded-full">
            {TABS.map(tab => (
              <Link
                key={tab.id}
                to={tab.href}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-full transition-colors',
                  active === tab.id ? 'bg-white text-[#111111] shadow-sm' : 'text-[#666666] hover:text-[#111111]'
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
