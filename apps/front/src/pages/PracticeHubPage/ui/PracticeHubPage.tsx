import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Code2, Swords, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '@/shared/ui/Avatar'
import { apiClient } from '@/shared/api/base'
import { PageMeta } from '@/shared/ui/PageMeta'


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
      <div className="mobile-sticky-surface bg-[#F2F3F0]/88 px-4 pt-4 pb-0 dark:bg-[#0b0d16]/88 md:px-6 md:pt-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#111111] dark:text-[#e2e8f3]">{t('practice.title')}</h1>
            <p className="text-sm text-[#666666] dark:text-[#4d6380] mt-0.5">{t('practice.subtitle')}</p>
          </div>
        </div>

        <div className="-mx-4 mb-5 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:px-0">
          <div className="flex snap-x gap-3 md:grid md:grid-cols-3 md:overflow-visible">
          {[
            { icon: Code2, title: 'Code Rooms', sub: t('practice.card.rooms'), href: '/practice/code-rooms' },
            { icon: Swords, title: 'Arena Duels', sub: t('practice.card.arena'), href: '/practice/arena' },
            { icon: Target, title: 'Solo Practice', sub: t('practice.card.solo'), href: '/practice/solo' },
          ].map(f => {
            const Icon = f.icon
            const isAct = location.pathname.startsWith(f.href)
            return (
              <button
                key={f.title}
                onClick={() => navigate(f.href)}
                className={`section-enter min-w-[280px] snap-center flex items-center gap-3 rounded-[24px] border px-4 py-4 text-left transition-all md:min-w-0 ${
                  isAct
                    ? 'border-[#6366F1] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(238,242,255,0.98))] shadow-[0_18px_34px_rgba(99,102,241,0.12)] dark:bg-[linear-gradient(145deg,_rgba(22,28,45,0.98),_rgba(30,30,74,0.74))]'
                    : 'border-[#CBCCC9] bg-white/86 shadow-[0_12px_24px_rgba(15,23,42,0.06)] dark:border-[#1a2540] dark:bg-[#161c2d]/92 dark:hover:border-[#6366F1]/40'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isAct ? 'bg-[#EEF2FF] dark:bg-[#1e1e4a]' : 'bg-[#F2F3F0] dark:bg-[#1a2236]'}`}>
                  <Icon className="w-4 h-4 text-[#6366F1]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#111111] dark:text-[#c8d8ec] leading-tight">{f.title}</p>
                  <p className="text-xs text-[#666666] dark:text-[#4d6380] leading-tight mt-0.5">{f.sub}</p>
                </div>
                {isAct && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#6366F1] flex-shrink-0" />}
              </button>
            )
          })}
        </div>
        </div>

        <div className="mb-5">
          <h2 className="text-sm font-semibold text-[#111111] dark:text-[#c8d8ec] mb-3">{t('practice.leaders')}</h2>
          {leadersLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#161c2d] rounded-xl border border-[#CBCCC9] dark:border-[#1a2540] animate-pulse w-40 h-12" />
              ))}
            </div>
          ) : leaders.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar md:flex-wrap md:overflow-visible">
              {leaders.map((u, idx) => (
                <div
                  key={u.userId}
                  className="section-enter flex min-w-fit items-center gap-2.5 rounded-2xl border border-[#CBCCC9] bg-white px-4 py-2 shadow-[0_10px_22px_rgba(15,23,42,0.05)] dark:border-[#1a2540] dark:bg-[#161c2d]"
                >
                  <span className="text-xs font-mono font-bold text-[#6366F1] w-4 text-center">{idx + 1}</span>
                  <Avatar name={u.username} src={u.avatarUrl} size="xs" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#111111] dark:text-[#c8d8ec] truncate">{u.username}</p>
                    <p className="text-[10px] text-[#666666] dark:text-[#4d6380]">{t('practice.wins', { count: u.wins })}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#666666] dark:text-[#4d6380]">{t('practice.noLeaders')}</p>
          )}
        </div>

      </div>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}
