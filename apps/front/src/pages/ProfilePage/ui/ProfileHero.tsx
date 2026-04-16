import { MapPin, Calendar, Briefcase, Edit3, Share2, Trophy, Flame, Sparkles, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PlayerFrame } from '@/shared/ui/PlayerFrame'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import type { User, ProfileProgress } from '@/entities/User/model/types'
import type { ArenaStats } from '../hooks/useProfileData'
import { leagueFromEnum } from '../lib/computeLevel'

function daysSince(iso: string): number {
  try {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  } catch {
    return 0
  }
}

interface Props {
  user: User
  progress: ProfileProgress | null
  arenaStats: ArenaStats | null
  isOwn: boolean
  onEdit: () => void
  onBindTelegram: () => void
  onBindYandex: () => void
  bindingProvider: 'telegram' | 'yandex' | null
  bindError: string
}

export function ProfileHero({ user, progress, arenaStats, isOwn, onEdit, onBindTelegram, onBindYandex, bindingProvider, bindError }: Props) {
  const { t } = useTranslation()
  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.username
  const ov = progress?.overview
  const league = leagueFromEnum(arenaStats?.league)
  const leagueLabel = t(`profile.leagueLabel.${league}`)
  const daysOnPlatform = daysSince(user.createdAt)

  return (
    <section className="section-enter card-notch relative overflow-hidden border border-[#C1CFC4] bg-[linear-gradient(135deg,_#064E3B_0%,_#065F46_38%,_#0D9488_100%)] shadow-[0_26px_64px_rgba(5,150,105,0.16)] dark:border-[#1E4035]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_32%),radial-gradient(circle_at_80%_20%,_rgba(52,211,153,0.35),_transparent_26%),radial-gradient(circle_at_75%_80%,_rgba(14,165,233,0.15),_transparent_28%)]" />
      <div className="relative p-5 md:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
          <PlayerFrame
            name={displayName}
            src={user.avatarUrl || undefined}
            league={league}
            size="xl"
            className="shadow-[0_16px_32px_rgba(15,23,42,0.24)]"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A7F3D0]">{t('profile.hero.eyebrow')}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold text-white">{displayName}</h1>
                  {user.isTrusted && <Badge variant="info">{t('profile.badge.trusted')}</Badge>}
                  {user.isAdmin && <Badge variant="warning">{t('profile.badge.admin')}</Badge>}
                </div>
                {user.username && <p className="mt-1 text-xs text-[#C1D9CA]">@{user.username}</p>}
              </div>

              {isOwn && (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="rounded-full border-white/20 bg-white/12 text-white hover:bg-white/18" onClick={onEdit}>
                    <Edit3 className="w-3.5 h-3.5" /> {t('profile.edit')}
                  </Button>
                  <Button variant="secondary" size="sm" className="rounded-full border-white/20 bg-white/12 text-white hover:bg-white/18" onClick={() => navigator.clipboard.writeText(window.location.href)}>
                    <Share2 className="w-3.5 h-3.5" /> {t('profile.share')}
                  </Button>
                </div>
              )}
            </div>

            {/* Meta pills */}
            <div className="mt-4 flex flex-wrap gap-2">
              {user.region && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/85 backdrop-blur">
                  <MapPin className="w-3 h-3" /> {user.region}
                </span>
              )}
              {user.currentWorkplace && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/85 backdrop-blur">
                  <Briefcase className="w-3 h-3" /> {user.currentWorkplace}
                </span>
              )}
              {user.createdAt && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/85 backdrop-blur">
                  <Calendar className="w-3 h-3" /> {t('profile.daysOnPlatform', { days: daysOnPlatform })}
                </span>
              )}
            </div>

            {/* Connected providers */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {user.connectedProviders.includes('telegram') && (
                <span className="rounded-full bg-[#e8f4fd] px-2.5 py-1 text-[11px] font-medium text-[#0088cc]">Telegram</span>
              )}
              {user.connectedProviders.includes('yandex') && (
                <span className="rounded-full bg-[#fff7ed] px-2.5 py-1 text-[11px] font-medium text-[#ea580c]">Yandex</span>
              )}
              {isOwn && !user.connectedProviders.includes('telegram') && (
                <button onClick={onBindTelegram} disabled={!!bindingProvider} className="rounded-full border border-[#0088cc]/20 bg-[#e8f4fd] px-2.5 py-1 text-[11px] font-medium text-[#0088cc] transition-colors hover:bg-[#cce9fa] disabled:opacity-50">
                  {bindingProvider === 'telegram' ? t('profile.bind.opening') : t('profile.bind.linkTelegram')}
                </button>
              )}
              {isOwn && !user.connectedProviders.includes('yandex') && (
                <button onClick={onBindYandex} disabled={!!bindingProvider} className="rounded-full border border-[#ea580c]/20 bg-[#fff7ed] px-2.5 py-1 text-[11px] font-medium text-[#ea580c] transition-colors hover:bg-[#ffe4cc] disabled:opacity-50">
                  {bindingProvider === 'yandex' ? t('profile.bind.redirecting') : t('profile.bind.linkYandex')}
                </button>
              )}
              {bindError && <span className="text-[11px] text-red-500">{bindError}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Stat chips */}
      {(ov || arenaStats) && (
        <div className="grid grid-cols-2 gap-3 border-t border-white/10 px-5 pb-5 pt-4 sm:grid-cols-4 md:px-6 md:pb-6">
          {ov && (
            <div className="flex flex-col justify-between rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur">
              <div className="flex items-center gap-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ecfdf5]">
                  <TrendingUp className="w-3.5 h-3.5 text-[#059669]" />
                </div>
                <span className="font-mono text-base font-bold text-white">Lv.{ov.level}</span>
              </div>
              {/* Level progress bar */}
              <div className="mt-2 h-1 rounded-full bg-white/15">
                <div className="h-1 rounded-full bg-[#34D399] transition-all duration-700" style={{ width: `${Math.round(ov.levelProgress * 100)}%` }} />
              </div>
              <span className="mt-2 text-[11px] uppercase tracking-[0.16em] text-white/60">{t('profile.level', { level: ov.level })}</span>
            </div>
          )}
          {arenaStats && (
            <div className="flex flex-col justify-between rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur">
              <div className="flex items-center gap-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ecfdf5]">
                  <Trophy className="h-3.5 w-3.5 text-[#fbbf24]" />
                </div>
                <span className="font-mono text-base font-bold text-white">{arenaStats.rating}</span>
              </div>
              <span className="mt-3 text-[11px] uppercase tracking-[0.16em] text-white/60">
                {leagueLabel}
                {arenaStats.leagueRank > 0 && arenaStats.leagueTotal > 0
                  ? ` · #${arenaStats.leagueRank}/${arenaStats.leagueTotal}`
                  : ' ELO'}
              </span>
              {arenaStats.peakRating > arenaStats.rating && (
                <span className="mt-1 text-[10px] text-white/40">Peak: {arenaStats.peakRating}</span>
              )}
            </div>
          )}
          {ov && (
            <div className="flex flex-col justify-between rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur">
              <div className="flex items-center gap-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ecfdf5]">
                  <Flame className="w-3.5 h-3.5 text-[#f59e0b]" />
                </div>
                <span className="font-mono text-base font-bold text-white">{ov.currentStreakDays}d</span>
              </div>
              <span className="mt-3 text-[11px] uppercase tracking-[0.16em] text-white/60">
                {t('profile.stats.streak')}{ov.longestStreakDays > ov.currentStreakDays ? ` · ${t('profile.longestStreak', { days: ov.longestStreakDays })}` : ''}
              </span>
            </div>
          )}
          {ov && ov.activityPercentile > 0 && (
            <div className="flex flex-col justify-between rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur">
              <div className="flex items-center gap-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F0FDF4]">
                  <Sparkles className="w-3.5 h-3.5 text-[#22c55e]" />
                </div>
                <span className="font-mono text-base font-bold text-white">{t('profile.topPercent', { percent: 100 - ov.activityPercentile })}</span>
              </div>
              <span className="mt-3 text-[11px] uppercase tracking-[0.16em] text-white/60">{t('profile.activity.activeDays')}</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
