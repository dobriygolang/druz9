import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/cn'
import type { SkillLevel } from '@/entities/User/model/types'

interface SkillRingProps {
  score: number
  level: SkillLevel
  label: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
}

const sizeMap = { sm: 36, md: 48, lg: 64 }
const strokeMap = { sm: 3, md: 4, lg: 5 }

const levelColors: Record<SkillLevel, string> = {
  beginner: '#94a3b8',
  confident: '#6366F1',
  strong: '#6366F1',
  expert: '#f59e0b',
}

export function SkillRing({ score, level, label, size = 'md', className, onClick }: SkillRingProps) {
  const { t } = useTranslation()
  const [animatedScore, setAnimatedScore] = useState(0)
  const px = sizeMap[size]
  const sw = strokeMap[size]
  const radius = (px - sw) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(animatedScore / 100, 1)
  const offset = circumference * (1 - progress)
  const color = levelColors[level] ?? levelColors.beginner
  const gradientId = `skill-ring-${label.replace(/\s/g, '-')}`
  const levelLabels: Record<SkillLevel, string> = {
    beginner: t('skill.beginner'),
    confident: t('skill.confident'),
    strong: t('skill.strong'),
    expert: t('skill.expert'),
  }

  useEffect(() => {
    const t = setTimeout(() => setAnimatedScore(score), 80)
    return () => clearTimeout(t)
  }, [score])

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col items-center gap-1.5 rounded-2xl px-2 py-2 transition-colors',
        onClick && 'hover:bg-[#f8fafc] dark:hover:bg-[#1a2236] cursor-pointer',
        !onClick && 'cursor-default',
        className,
      )}
    >
      <div className="relative">
        <svg width={px} height={px} className="-rotate-90">
          <circle
            cx={px / 2}
            cy={px / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={sw}
            className="text-[#E7E8E5] dark:text-[#1e3158]"
          />
          <circle
            cx={px / 2}
            cy={px / 2}
            r={radius}
            fill={level === 'strong' || level === 'expert' ? `url(#${gradientId})` : 'none'}
            fillOpacity={level === 'strong' ? 0.08 : level === 'expert' ? 0.12 : 0}
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
          {(level === 'strong' || level === 'expert') && (
            <defs>
              <radialGradient id={gradientId}>
                <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </radialGradient>
            </defs>
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-xs font-bold text-[#111111] dark:text-[#e2e8f3]" style={{ fontSize: size === 'sm' ? 9 : size === 'md' ? 11 : 14 }}>
            {score}
          </span>
        </div>
        {level === 'expert' && (
          <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
        )}
      </div>
      <span className="text-[11px] font-medium text-[#111111] dark:text-[#e2e8f3] leading-tight text-center">{label}</span>
      <span
        className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-tight"
        style={{
          color,
          backgroundColor: level === 'expert' ? '#fffbeb' : level === 'beginner' ? '#f1f5f9' : '#eef2ff',
        }}
      >
        {levelLabels[level]}
      </span>
    </button>
  )
}
