import { useTranslation } from 'react-i18next'
import type { ProfileProgress } from '@/entities/User/model/types'
import type { ArenaStats } from '../hooks/useProfileData'
import { computeLeague } from '../lib/computeLevel'

interface Props {
  theirProgress: ProfileProgress | null
  theirArenaStats: ArenaStats | null
  myProgress: ProfileProgress | null
  myArenaStats: ArenaStats | null
  onChallenge?: () => void
  className?: string
}

export function ProfileComparison({
  theirProgress,
  theirArenaStats,
  myProgress,
  myArenaStats,
  onChallenge,
  className,
}: Props) {
  const { t } = useTranslation()

  if (!myProgress && !myArenaStats) return null

  return (
    <div className={`section-enter flex flex-col gap-3 rounded-[20px] border border-[#d8d9d6] bg-white px-4 py-3 shadow-[0_12px_26px_rgba(15,23,42,0.06)] dark:border-[#1a2540] dark:bg-[#161c2d] md:flex-row md:items-center md:justify-between ${className ?? ''}`}>
      <div className="flex flex-col gap-1 text-sm text-[#475569] dark:text-[#7e93b0]">
        <p>
          <span className="font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.comparison.rating')}</span>{' '}
          {t('profile.comparison.theirs', {
            rating: theirArenaStats?.rating ?? 0,
            league: t(`profile.leagueLabel.${computeLeague(theirArenaStats?.rating ?? 0)}`),
          })}{' '}
          ·{' '}
          {t('profile.comparison.yours', {
            rating: myArenaStats?.rating ?? 0,
            league: t(`profile.leagueLabel.${computeLeague(myArenaStats?.rating ?? 0)}`),
          })}
        </p>
        <p>
          <span className="font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.comparison.streak')}</span>{' '}
          {t('profile.comparison.theirsStreak', { days: theirProgress?.overview.currentStreakDays ?? 0 })}{' '}
          ·{' '}
          {t('profile.comparison.yoursStreak', { days: myProgress?.overview.currentStreakDays ?? 0 })}
        </p>
      </div>
      <button
        onClick={onChallenge}
        className="inline-flex items-center justify-center rounded-full bg-[#111111] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0f172a] dark:bg-white dark:text-[#08101f] dark:hover:bg-[#e2e8f3]"
      >
        {t('profile.comparison.challenge')}
      </button>
    </div>
  )
}
