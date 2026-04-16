import { useTranslation } from 'react-i18next'
import { Target, TrendingUp, Flame } from 'lucide-react'
import type { Achievement, ProfileCompetency } from '@/entities/User/model/types'

interface Milestone {
  icon: React.ReactNode
  text: string
  progress: number
  total: number
}

function findClosestMilestone(
  achievements: Achievement[],
  competencies: ProfileCompetency[],
  t: (key: string, opts?: Record<string, unknown>) => string,
): Milestone | null {
  // 1. Find highest-progress locked achievement
  let bestAch: Achievement | null = null
  let bestPct = 0
  for (const a of achievements) {
    if (a.unlocked || a.target <= 0) continue
    const pct = a.progress / a.target
    if (pct > bestPct) {
      bestPct = pct
      bestAch = a
    }
  }

  // 2. Find competency closest to next level threshold
  const levelThresholds = [
    { level: 'confident', min: 30 },
    { level: 'strong', min: 60 },
    { level: 'expert', min: 85 },
  ]
  let bestComp: { comp: ProfileCompetency; targetScore: number; label: string } | null = null
  let bestCompGap = Infinity
  for (const c of competencies) {
    for (const th of levelThresholds) {
      if (c.score < th.min) {
        const gap = th.min - c.score
        if (gap < bestCompGap && gap <= 20) {
          bestCompGap = gap
          bestComp = { comp: c, targetScore: th.min, label: th.level }
        }
        break
      }
    }
  }

  // Pick whichever is closer to completion
  if (bestAch && bestPct >= 0.5 && (!bestComp || bestPct > (1 - bestCompGap / 100))) {
    return {
      icon: <Target className="h-4 w-4 text-[#f59e0b]" />,
      text: t('profile.milestone.achievement', { remaining: bestAch.target - bestAch.progress, name: bestAch.title }),
      progress: bestAch.progress,
      total: bestAch.target,
    }
  }

  if (bestComp) {
    return {
        icon: <TrendingUp className="h-4 w-4 text-[#059669]" />,
      text: t('profile.milestone.skill', { score: bestComp.comp.score, target: bestComp.targetScore, name: bestComp.comp.label, level: t(`skill.${bestComp.label}`) }),
      progress: bestComp.comp.score,
      total: bestComp.targetScore,
    }
  }

  if (bestAch) {
    return {
      icon: <Flame className="h-4 w-4 text-[#f59e0b]" />,
      text: t('profile.milestone.achievement', { remaining: bestAch.target - bestAch.progress, name: bestAch.title }),
      progress: bestAch.progress,
      total: bestAch.target,
    }
  }

  return null
}

interface Props {
  achievements: Achievement[]
  competencies: ProfileCompetency[]
  isOwn: boolean
  className?: string
}

export function NextMilestone({ achievements, competencies, isOwn, className }: Props) {
  const { t } = useTranslation()

  if (!isOwn) return null

  const milestone = findClosestMilestone(achievements, competencies, t)
  if (!milestone) return null

  const pct = milestone.total > 0 ? Math.round((milestone.progress / milestone.total) * 100) : 0

  return (
    <div className={`section-enter flex items-center gap-3 rounded-[20px] border border-[#d8d9d6] bg-[linear-gradient(90deg,_#ecfdf5_0%,_#ecfdf5_100%)] px-4 py-3 shadow-sm dark:border-[#163028] dark:bg-[linear-gradient(90deg,_#2a200a_0%,_#1e2a4a_100%)] ${className ?? ''}`}>
      {milestone.icon}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[#111111] dark:text-[#E2F0E8]">{milestone.text}</p>
        <div className="mt-1.5 h-1 rounded-full bg-white/60 dark:bg-white/10">
          <div className="h-1 rounded-full bg-[#059669] transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="shrink-0 font-mono text-xs font-bold text-[#059669]">{pct}%</span>
    </div>
  )
}
