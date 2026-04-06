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
      {/* Header */}
      <div className="px-6 pt-6 pb-0 bg-[#F2F3F0] dark:bg-[#0b0d16]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111111] dark:text-[#e2e8f3]">Community</h1>
            <p className="text-sm text-[#666666] dark:text-[#4d6380] mt-0.5">Найди коллег и единомышленников</p>
          </div>
          {active === 'people' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск людей..."
                className="pl-9 pr-4 py-2 w-[280px] bg-white dark:bg-[#161c2d] border border-[#CBCCC9] dark:border-[#1a2540] rounded-lg text-sm text-[#111111] dark:text-[#c8d8ec] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20"
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-[#CBCCC9] dark:border-[#1a2540]">
          {TABS.map(tab => (
            <Link
              key={tab.id}
              to={tab.href}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active === tab.id
                  ? 'border-[#6366F1] text-[#111111] dark:text-[#e2e8f3]'
                  : 'border-transparent text-[#666666] dark:text-[#4d6380] hover:text-[#111111] dark:hover:text-[#c8d8ec]'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <Outlet context={{ search, openCreateEvent, setOpenCreateEvent }} />
      </div>
    </div>
  )
}
