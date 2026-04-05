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
  const active = TABS.find(t => location.pathname.startsWith(`/community/${t.id}`))?.id ?? 'people'

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Header */}
      <div className="px-6 pt-6 pb-0 bg-[#F2F3F0]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111111]">Community</h1>
            <p className="text-sm text-[#666666] mt-0.5">Найди коллег и единомышленников</p>
          </div>
          {active === 'events' && (
            <Link
              to="/community/events"
              className="px-5 py-2 bg-[#FF8400] rounded-full text-sm font-medium text-[#0f172a] hover:bg-[#ea7700] transition-colors"
            >
              + Create Event
            </Link>
          )}
          {active === 'people' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск людей..."
                className="pl-9 pr-4 py-2 w-[280px] bg-white border border-[#CBCCC9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20"
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-[#CBCCC9]">
          {TABS.map(tab => (
            <Link
              key={tab.id}
              to={tab.href}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active === tab.id
                  ? 'border-[#FF8400] text-[#111111]'
                  : 'border-transparent text-[#666666] hover:text-[#111111]'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <Outlet context={{ search }} />
      </div>
    </div>
  )
}
