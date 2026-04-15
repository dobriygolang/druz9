import { Outlet, useLocation, Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useState } from 'react'

const TABS = [
  { id: 'people', label: 'People', href: '/community/people' },
  { id: 'events', label: 'Events', href: '/community/events' },
  { id: 'circles', label: 'Circles', href: '/community/circles' },
  { id: 'map', label: 'Map', href: '/community/map' },
  { id: 'vacancies', label: 'Вакансии', href: '/community/vacancies' },
]

export function CommunityHubPage() {
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [openCreateEvent, setOpenCreateEvent] = useState(false)
  const active = TABS.find(t => location.pathname.startsWith(`/community/${t.id}`))?.id ?? 'people'

  return (
    <div className="flex flex-col h-full min-h-screen">
      <div className="mobile-sticky-surface bg-[#F2F3F0]/88 px-4 pt-4 pb-0 dark:bg-[#0b0d16]/88 md:px-6 md:pt-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#111111] dark:text-[#e2e8f3]">Community</h1>
            <p className="mt-1 text-sm text-[#666666] dark:text-[#4d6380]">Найди коллег, круги и офлайн-активность рядом</p>
          </div>

          {active === 'people' && (
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск людей..."
                className="w-full rounded-2xl border border-[#CBCCC9] bg-white/88 py-3 pl-10 pr-4 text-sm text-[#111111] shadow-[0_10px_26px_rgba(15,23,42,0.06)] backdrop-blur focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 dark:border-[#1a2540] dark:bg-[#161c2d]/88 dark:text-[#c8d8ec] md:w-[300px]"
              />
            </div>
          )}
        </div>

        <div className="-mx-4 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:px-0">
          <div className="inline-flex min-w-full gap-2 rounded-[24px] border border-[#d8d9d6] bg-white/72 p-1.5 shadow-[0_18px_34px_rgba(15,23,42,0.06)] backdrop-blur dark:border-[#1a2540] dark:bg-[#10192b]/72 md:min-w-0">
            {TABS.map(tab => (
              <Link
                key={tab.id}
                to={tab.href}
                className={`whitespace-nowrap rounded-[18px] px-4 py-2.5 text-sm font-medium transition-all ${
                  active === tab.id
                    ? 'bg-[#111111] text-white shadow-[0_14px_24px_rgba(15,23,42,0.14)] dark:bg-white dark:text-[#08101f]'
                    : 'text-[#666666] dark:text-[#4d6380] hover:bg-white/80 hover:text-[#111111] dark:hover:bg-[#161f34] dark:hover:text-[#c8d8ec]'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1">
        <Outlet context={{ search, openCreateEvent, setOpenCreateEvent }} />
      </div>
    </div>
  )
}
