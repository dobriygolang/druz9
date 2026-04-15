import { useTranslation } from 'react-i18next'
import { Trophy, Swords, Clock } from 'lucide-react'
import { ActivityHeatmap } from '@/shared/ui/ActivityHeatmap'
import { Badge } from '@/shared/ui/Badge'
import type { ProfileProgress, FeedItem } from '@/entities/User/model/types'
import type { ArenaStats } from '../hooks/useProfileData'
import { computeLeague } from '../lib/computeLevel'

function timeAgo(iso: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return t('profile.feed.minutesAgo', { count: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t('profile.feed.hoursAgo', { count: hrs })
  const days = Math.floor(hrs / 24)
  return t('profile.feed.daysAgo', { count: days })
}

interface Props {
  activity: { date: string; count: number }[]
  arenaStats: ArenaStats | null
  progress: ProfileProgress | null
  feed: FeedItem[]
  className?: string
}

export function ActivitySection({ activity, arenaStats, progress, feed, className }: Props) {
  const { t } = useTranslation()
  const leagueLabel = t(`profile.leagueLabel.${computeLeague(arenaStats?.rating ?? 0)}`)

  return (
    <div className={`grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)] ${className ?? ''}`}>
      {/* Left: Heatmap + Feed */}
      <div className="flex flex-col gap-4">
        <div className="section-enter rounded-[28px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.activity.title')}</h3>
              <p className="mt-1 text-xs text-[#94a3b8]">{t('profile.activity.subtitle')}</p>
            </div>
            {progress && (
              <div className="rounded-2xl bg-[#f8fafc] px-3 py-2 text-right dark:bg-[#0f1629]">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">{t('profile.activity.activeDays')}</p>
                <p className="font-mono text-lg font-bold text-[#0f172a] dark:text-[#e2e8f3]">{progress.overview.practiceActiveDays}</p>
              </div>
            )}
          </div>
          {activity.length > 0 ? (
            <ActivityHeatmap activity={activity} />
          ) : (
            <div className="flex h-20 items-center justify-center rounded-xl bg-[#F2F3F0] dark:bg-[#0f1629]">
              <p className="text-xs text-[#94a3b8]">{t('profile.activity.empty')}</p>
            </div>
          )}
        </div>

        {/* Feed */}
        {feed.length > 0 && (
          <div className="section-enter rounded-[28px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
            <h3 className="text-sm font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.feed.title')}</h3>
            <div className="mt-3 flex flex-col gap-2">
              {feed.map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[#f8fafc] dark:hover:bg-[#0f1629]">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] dark:bg-[#1e2a4a]">
                    {item.type === 'mock_stage' ? (
                      <Trophy className="h-3 w-3 text-[#6366F1]" />
                    ) : (
                      <Swords className="h-3 w-3 text-[#22c55e]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[#111111] dark:text-[#e2e8f3]">{item.title}</p>
                    <p className="text-[11px] text-[#94a3b8]">
                      {item.description}
                      {item.score != null && <span className="ml-1 font-mono font-semibold text-[#6366F1]">{item.score}/100</span>}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-[#94a3b8]">
                    <Clock className="mr-0.5 inline h-2.5 w-2.5" />
                    {item.timestamp ? timeAgo(item.timestamp, t) : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Arena summary */}
      <div className="section-enter rounded-[28px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
        <h3 className="text-sm font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.arena.title')}</h3>
        <p className="mt-1 text-xs text-[#94a3b8]">{t('profile.arena.subtitle')}</p>

        {arenaStats ? (
          <>
            <div className="mt-5 rounded-[24px] bg-[linear-gradient(135deg,_#eef2ff,_#fff7ed)] p-4 dark:bg-[linear-gradient(135deg,_#1e2a4a,_#2a200a)]">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#64748b]">{t('profile.stats.rating')}</p>
                  <p className="mt-2 font-mono text-3xl font-bold text-[#111827] dark:text-[#e2e8f3]">{arenaStats.rating}</p>
                </div>
                <Badge variant="info">{leagueLabel}</Badge>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/80 dark:bg-white/10">
                <div
                  className="h-2 rounded-full bg-[#6366F1]"
                  style={{ width: `${Math.min((arenaStats.rating / 3000) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: t('profile.arena.matches'), value: arenaStats.matches },
                { label: t('profile.stats.wins'), value: arenaStats.wins },
                { label: t('profile.arena.losses'), value: arenaStats.losses },
                { label: t('profile.arena.winrate'), value: `${Math.round(arenaStats.winRate * 100)}%` },
              ].map(s => (
                <div key={s.label} className="rounded-2xl bg-[#f8fafc] px-4 py-3 dark:bg-[#0f1629]">
                  <p className="font-mono text-xl font-bold text-[#0f172a] dark:text-[#e2e8f3]">{s.value}</p>
                  <p className="mt-1 text-xs text-[#64748b]">{s.label}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-5 flex min-h-[180px] items-center justify-center rounded-[24px] bg-[#F2F3F0] text-center dark:bg-[#0f1629]">
            <p className="text-xs text-[#94a3b8]">{t('profile.arena.empty')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
