import React from 'react'
import { cn } from '../lib/cn'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  category: string
  unlocked_at?: string
}

interface AchievementBadgesProps {
  achievements: Achievement[]
  compact?: boolean
}

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({ achievements, compact = false }) => {
  const unlocked = achievements.filter(a => a.unlocked).length
  const total = achievements.length
  const cols = compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-3 sm:grid-cols-4'

  return (
    <div>
      {/* Section title */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-[#111111]">Достижения</h3>
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-[#fff7ed] text-[#6366F1]">
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
                ? 'bg-white border-[#CBCCC9] shadow-[0_0_8px_rgba(99,102,241,0.2)]'
                : 'bg-[#F2F3F0] border-transparent',
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
                achievement.unlocked ? 'text-[#666666]' : 'text-[#94a3b8]',
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
