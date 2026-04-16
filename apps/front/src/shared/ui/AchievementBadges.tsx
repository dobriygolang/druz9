import React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/cn'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  category: string
  unlockedAt?: string
}

interface AchievementBadgesProps {
  achievements: Achievement[]
  compact?: boolean
}

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({ achievements, compact = false }) => {
  const { t } = useTranslation()
  const unlocked = achievements.filter(a => a.unlocked).length
  const total = achievements.length
  const cols = compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'

  return (
    <div>
      {/* Section title */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-[#111111]">{t('common.achievements')}</h3>
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-[#fff7ed] text-[#059669]">
          {unlocked}/{total}
        </span>
      </div>

      {/* Badges grid */}
      <div className={cn('grid gap-2', cols)}>
        {achievements.map(achievement => (
          <div
            key={achievement.id}
            className={cn(
              'flex flex-col items-center text-center p-2 rounded-xl border transition-transform duration-150 hover:scale-[1.03]',
              achievement.unlocked
                ? 'bg-white border-[#C1CFC4] shadow-[0_0_8px_rgba(5,150,105,0.2)]'
                : 'bg-[#F0F5F1] border-transparent',
            )}
          >
            <span
              className={cn('text-[32px] leading-none mb-1', !achievement.unlocked && 'grayscale')}
              style={{ fontSize: '32px' }}
            >
              {achievement.icon}
            </span>
            <p
              className={cn(
                'text-[12px] font-bold leading-tight',
                achievement.unlocked ? 'text-[#111111]' : 'text-[#94a3b8]',
              )}
            >
              {achievement.title}
            </p>
            <p
              className={cn(
                'text-[10px] mt-0.5 leading-tight',
                achievement.unlocked ? 'text-[#4B6B52]' : 'text-[#94a3b8]',
              )}
            >
              {achievement.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
