import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pin, PinOff } from 'lucide-react'
import type { Achievement } from '@/entities/User/model/types'

const tierColors: Record<string, { ring: string; bg: string; glow: string }> = {
  bronze: { ring: '#cd7f32', bg: '#fef3e2', glow: 'shadow-[0_0_8px_rgba(205,127,50,0.3)]' },
  silver: { ring: '#94a3b8', bg: '#f1f5f9', glow: 'shadow-[0_0_8px_rgba(148,163,184,0.3)]' },
  gold: { ring: '#f59e0b', bg: '#fffbeb', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.4)]' },
  diamond: { ring: '#6366F1', bg: '#eef2ff', glow: 'shadow-[0_0_12px_rgba(99,102,241,0.4)]' },
}

interface Props {
  achievements: Achievement[]
  pinnedIds: string[]
  isOwn: boolean
  onTogglePin?: (id: string) => void
  className?: string
}

export function AchievementShowcase({ achievements, pinnedIds, isOwn, onTogglePin, className }: Props) {
  const { t } = useTranslation()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const pinned = achievements.filter(a => pinnedIds.includes(a.id) && a.unlocked)
  const unlocked = achievements.filter(a => a.unlocked)
  const locked = achievements.filter(a => !a.unlocked)

  if (achievements.length === 0) {
    return (
      <div className={`section-enter rounded-[28px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d] ${className ?? ''}`}>
        <h3 className="text-sm font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.tabs.achievements')}</h3>
        <div className="mt-5 flex min-h-[80px] items-center justify-center rounded-2xl bg-[#F2F3F0] dark:bg-[#0f1629]">
          <p className="text-xs text-[#94a3b8]">{t('profile.achievements.empty')}</p>
        </div>
      </div>
    )
  }

  const renderBadge = (a: Achievement, size: 'lg' | 'sm') => {
    const tc = tierColors[a.tier] ?? tierColors.bronze
    const isPinned = pinnedIds.includes(a.id)
    const isHovered = hoveredId === a.id
    const sizePx = size === 'lg' ? 'w-20 h-20' : 'w-14 h-14'
    const iconSize = size === 'lg' ? 'text-3xl' : 'text-xl'
    const progressPct = a.target > 0 ? Math.min(100, Math.round((a.progress / a.target) * 100)) : 0

    return (
      <div
        key={a.id}
        className="relative flex flex-col items-center gap-1.5"
        onMouseEnter={() => setHoveredId(a.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <div
          className={`${sizePx} flex items-center justify-center rounded-2xl border-2 transition-all duration-200 ${
            a.unlocked
              ? `${tc.glow} bg-white dark:bg-[#161c2d]`
              : 'border-[#E7E8E5] bg-[#F2F3F0] opacity-50 grayscale dark:border-[#1e3158] dark:bg-[#0f1629]'
          }`}
          style={a.unlocked ? { borderColor: tc.ring } : undefined}
        >
          <span className={`${iconSize} ${a.unlocked ? '' : 'grayscale'}`}>{a.icon}</span>
        </div>

        {/* Tier indicator dot */}
        {a.unlocked && (
          <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#161c2d]" style={{ backgroundColor: tc.ring }} />
        )}

        {/* Pin button */}
        {isOwn && a.unlocked && isHovered && (
          <button
            onClick={() => onTogglePin?.(a.id)}
            className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm border border-[#E7E8E5] hover:bg-[#f8fafc] dark:bg-[#161c2d] dark:border-[#1e3158]"
          >
            {isPinned ? <PinOff className="h-2.5 w-2.5 text-[#6366F1]" /> : <Pin className="h-2.5 w-2.5 text-[#94a3b8]" />}
          </button>
        )}

        <span className="max-w-[72px] truncate text-center text-[10px] font-medium text-[#475569] dark:text-[#7e93b0]">
          {a.title}
        </span>

        {/* Progress for locked */}
        {!a.unlocked && a.target > 0 && (
          <div className="flex w-14 flex-col items-center gap-0.5">
            <div className="h-1 w-full rounded-full bg-[#E7E8E5] dark:bg-[#1e3158]">
              <div className="h-1 rounded-full bg-[#94a3b8] transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-[9px] text-[#94a3b8]">{a.progress}/{a.target}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`section-enter rounded-[28px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d] ${className ?? ''}`}>
      <h3 className="text-sm font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.tabs.achievements')}</h3>
      <p className="mt-1 text-xs text-[#94a3b8]">
        {t('profile.achievements.count', { unlocked: unlocked.length, total: achievements.length })}
      </p>

      {/* Pinned achievements — larger */}
      {pinned.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">{t('profile.achievements.pinned')}</p>
          <div className="flex flex-wrap gap-4">
            {pinned.map(a => renderBadge(a, 'lg'))}
          </div>
        </div>
      )}

      {/* All achievements */}
      <div className="mt-4">
        <div className="flex flex-wrap gap-3">
          {[...unlocked.filter(a => !pinnedIds.includes(a.id)), ...locked].map(a => renderBadge(a, 'sm'))}
        </div>
      </div>
    </div>
  )
}
