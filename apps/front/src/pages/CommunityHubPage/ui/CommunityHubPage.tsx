import { Outlet, useLocation, Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

export function CommunityHubPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const isMobile = useIsMobile()
  const [search, setSearch] = useState('')
  const [openCreateEvent, setOpenCreateEvent] = useState(false)
  const tabs = [
    { id: 'people', label: t('community.tab.people'), href: '/community/people' },
    { id: 'events', label: t('community.tab.events'), href: '/community/events' },
    { id: 'circles', label: t('community.tab.circles'), href: '/community/circles' },
    { id: 'map', label: t('community.tab.map'), href: '/community/map' },
    { id: 'vacancies', label: t('community.tab.vacancies'), href: '/community/vacancies' },
    { id: 'podcasts', label: t('community.tab.podcasts'), href: '/community/podcasts' },
  ]
  const active = tabs.find(t => location.pathname.startsWith(`/community/${t.id}`))?.id ?? 'people'

  return (
    <div className="flex flex-col h-full">
      {isMobile ? (
        <div className="mobile-sticky-surface bg-[#F0F5F1]/88 px-4 pt-4 pb-0 dark:bg-[#070E0C]/88">
          <div className="mb-4 flex flex-col gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#111111] dark:text-[#E2F0E8]">{t('community.title')}</h1>
              <p className="mt-1 text-sm text-[#4B6B52] dark:text-[#4A7058]">{t('community.subtitleMobile')}</p>
            </div>

            {active === 'people' && (
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('community.searchPlaceholder')}
                  className="w-full rounded-2xl border border-[#C1CFC4] bg-white/88 py-3 pl-10 pr-4 text-sm text-[#111111] shadow-[0_10px_26px_rgba(15,23,42,0.06)] backdrop-blur focus:outline-none focus:ring-2 focus:ring-[#059669]/20 dark:border-[#163028] dark:bg-[#132420]/88 dark:text-[#C1D9CA]"
                />
              </div>
            )}
          </div>

          <div className="-mx-4 overflow-x-auto px-4 pb-1 no-scrollbar">
            <div className="inline-flex min-w-full gap-2 rounded-[24px] border border-[#d8d9d6] bg-white/72 p-1.5 shadow-[0_18px_34px_rgba(15,23,42,0.06)] backdrop-blur dark:border-[#163028] dark:bg-[#10192b]/72">
              {tabs.map(tab => (
                <Link
                  key={tab.id}
                  to={tab.href}
                  className={`whitespace-nowrap rounded-[18px] px-4 py-2.5 text-sm font-medium transition-all ${
                    active === tab.id
                      ? 'bg-[#111111] text-white shadow-[0_14px_24px_rgba(15,23,42,0.14)] dark:bg-white dark:text-[#08101f]'
                      : 'text-[#4B6B52] dark:text-[#4A7058] hover:bg-white/80 hover:text-[#111111] dark:hover:bg-[#161f34] dark:hover:text-[#C1D9CA]'
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-6 pt-6 pb-0 bg-[#F0F5F1] dark:bg-[#070E0C]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#111111] dark:text-[#E2F0E8]">{t('community.title')}</h1>
              <p className="text-sm text-[#4B6B52] dark:text-[#4A7058] mt-0.5">{t('community.subtitleDesktop')}</p>
            </div>
            {active === 'people' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('community.searchPlaceholder')}
                  className="pl-9 pr-4 py-2 w-[280px] bg-white dark:bg-[#132420] border border-[#C1CFC4] dark:border-[#163028] rounded-lg text-sm text-[#111111] dark:text-[#C1D9CA] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-0 border-b border-[#C1CFC4] dark:border-[#163028]">
            {tabs.map(tab => (
              <Link
                key={tab.id}
                to={tab.href}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  active === tab.id
                    ? 'border-[#059669] text-[#111111] dark:text-[#E2F0E8]'
                    : 'border-transparent text-[#4B6B52] dark:text-[#4A7058] hover:text-[#111111] dark:hover:text-[#C1D9CA]'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className={`flex-1 min-h-0${active === 'map' ? ' overflow-hidden' : ''}`}>
        <Outlet context={{ search, openCreateEvent, setOpenCreateEvent }} />
      </div>
    </div>
  )
}
