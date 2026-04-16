import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Code2, Crown, Eye, Flame, Swords, Target, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '@/shared/ui/Avatar'
import { apiClient } from '@/shared/api/base'
import { PageMeta } from '@/shared/ui/PageMeta'
import { PixelHeroScene } from '@/shared/ui/PixelHeroScene'


interface LeaderboardUser {
  userId: string
  username: string
  avatarUrl?: string
  wins: number
}


export function PracticeHubPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const [leaders, setLeaders] = useState<LeaderboardUser[]>([])
  const [leadersLoading, setLeadersLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get('/api/v1/code-editor/leaderboard', { params: { limit: 5 } })
      .then(res => {
        const data = res.data?.leaderboard ?? res.data?.users ?? res.data ?? []
        setLeaders(Array.isArray(data) ? data.slice(0, 5) : [])
      })
      .catch(() => setLeaders([]))
      .finally(() => setLeadersLoading(false))
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <PageMeta title={t('practice.meta.title')} description={t('practice.meta.description')} canonicalPath="/practice" />
      <PixelHeroScene scene="practice" className="hidden md:block" />
      <div className="mobile-sticky-surface bg-[#F0F5F1]/88 px-4 pt-4 pb-0 dark:bg-[#070E0C]/88 md:px-6 md:pt-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#111111] dark:text-[#E2F0E8]">{t('practice.title')}</h1>
            <p className="text-sm text-[#4B6B52] dark:text-[#4A7058] mt-0.5">{t('practice.subtitle')}</p>
          </div>
        </div>

        {(() => {
          const modeCards = [
            { icon: Code2, title: 'Code Rooms', sub: t('practice.card.rooms'), href: '/practice/code-rooms' },
            { icon: Swords, title: 'Arena Duels', sub: t('practice.card.arena'), href: '/practice/arena' },
            { icon: Flame, title: 'Daily Challenge', sub: t('practice.card.daily'), href: '/practice/daily' },
          ]
          const challengeCards = [
            { icon: Crown, title: 'Weekly Boss', sub: t('practice.card.weeklyBoss'), href: '/practice/weekly-boss' },
            { icon: Zap, title: 'Speed Run', sub: t('practice.card.speedRun'), href: '/practice/speed-run' },
            { icon: Eye, title: 'Blind Review', sub: t('practice.card.blindReview'), href: '/practice/blind-review' },
            { icon: Target, title: 'Algorithm Prep', sub: t('practice.card.solo'), href: '/prepare/interview-prep?category=algorithm' },
          ]
          const allCards = [...modeCards, ...challengeCards]

          const renderCard = (f: typeof allCards[number]) => {
            const Icon = f.icon
            const isAct = location.pathname.startsWith(f.href)
            return (
              <button
                key={f.title}
                onClick={() => navigate(f.href)}
                className={`section-enter card-notch min-w-[280px] snap-center flex items-center gap-3 border px-4 py-4 text-left transition-all md:min-w-0 ${
                  isAct
                    ? 'border-[#059669] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(236,253,245,0.98))] shadow-[0_18px_34px_rgba(5,150,105,0.12)] dark:bg-[linear-gradient(145deg,_rgba(19,36,32,0.98),_rgba(13,42,31,0.74))]'
                    : 'border-[#C1CFC4] bg-white/86 shadow-[0_12px_24px_rgba(11,18,16,0.06)] dark:border-[#163028] dark:bg-[#132420]/92 dark:hover:border-[#059669]/40'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isAct ? 'bg-[#ecfdf5] dark:bg-[#0d2a1f]' : 'bg-[#F0F5F1] dark:bg-[#162E24]'}`}>
                  <Icon className="w-4 h-4 text-[#059669]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#111111] dark:text-[#C1D9CA] leading-tight">{f.title}</p>
                  <p className="text-xs text-[#4B6B52] dark:text-[#4A7058] leading-tight mt-0.5">{f.sub}</p>
                </div>
                {isAct && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#059669] flex-shrink-0" />}
              </button>
            )
          }

          return (
            <div className="-mx-4 mb-5 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:px-0 md:overflow-visible">
              {/* Mobile: single horizontal scroll row */}
              <div className="flex snap-x gap-3 md:hidden">
                {allCards.map(renderCard)}
              </div>
              {/* Desktop: two rows — 3 modes + 4 challenges */}
              <div className="hidden md:flex md:flex-col md:gap-3">
                <div className="grid grid-cols-3 gap-3">
                  {modeCards.map(renderCard)}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {challengeCards.map(renderCard)}
                </div>
              </div>
            </div>
          )
        })()}

        <div className="mb-5">
          <h2 className="text-sm font-semibold text-[#111111] dark:text-[#C1D9CA] mb-3">{t('practice.leaders')}</h2>
          {leadersLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#132420] rounded-xl border border-[#C1CFC4] dark:border-[#163028] animate-pulse w-40 h-12" />
              ))}
            </div>
          ) : leaders.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar md:flex-wrap md:overflow-visible">
              {leaders.map((u, idx) => (
                <div
                  key={u.userId}
                  className="section-enter flex min-w-fit items-center gap-2.5 rounded-2xl border border-[#C1CFC4] bg-white px-4 py-2 shadow-[0_10px_22px_rgba(15,23,42,0.05)] dark:border-[#163028] dark:bg-[#132420]"
                >
                  <span className="text-xs font-mono font-bold text-[#059669] w-4 text-center">{idx + 1}</span>
                  <Avatar name={u.username} src={u.avatarUrl} size="xs" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#111111] dark:text-[#C1D9CA] truncate">{u.username}</p>
                    <p className="text-[10px] text-[#4B6B52] dark:text-[#4A7058]">{t('practice.wins', { count: u.wins })}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#4B6B52] dark:text-[#4A7058]">{t('practice.noLeaders')}</p>
          )}
        </div>

      </div>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}
