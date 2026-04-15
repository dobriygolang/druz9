import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Target, Zap } from 'lucide-react'
import type { ProfileCompetency } from '@/entities/User/model/types'

interface Props {
  competencies: ProfileCompetency[]
  strongest: ProfileCompetency[]
  weakest: ProfileCompetency[]
  className?: string
}

const RADAR_SIZE = 260
const CENTER = RADAR_SIZE / 2
const RINGS = [25, 50, 75, 100]
const MAX_RADIUS = 105

function polarToXY(angleDeg: number, radius: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)]
}

export function StrengthRadar({ competencies, strongest, weakest, className }: Props) {
  const { t } = useTranslation()

  const axes = useMemo(() => {
    if (competencies.length === 0) return []
    const step = 360 / competencies.length
    return competencies.map((c, i) => ({
      ...c,
      angle: i * step,
    }))
  }, [competencies])

  const polygonPoints = useMemo(() => {
    if (axes.length === 0) return ''
    return axes
      .map(a => {
        const r = (Math.min(a.score, 100) / 100) * MAX_RADIUS
        const [x, y] = polarToXY(a.angle, r)
        return `${x},${y}`
      })
      .join(' ')
  }, [axes])

  if (competencies.length === 0) return null

  // Mobile: fall back to horizontal bars
  const mobileView = (
    <div className="flex flex-col gap-2 sm:hidden">
      {competencies.map(c => (
        <div key={c.key} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-xs font-medium text-[#111111] dark:text-[#e2e8f3]">{c.label}</span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[#E7E8E5] dark:bg-[#1e3158]">
            <div
              className="h-full rounded-full bg-[#6366F1] transition-all duration-700 ease-out"
              style={{ width: `${Math.min(c.score, 100)}%` }}
            />
          </div>
          <span className="w-8 text-right font-mono text-xs font-bold text-[#111111] dark:text-[#e2e8f3]">{c.score}</span>
        </div>
      ))}
    </div>
  )

  // Desktop: SVG radar
  const radarView = (
    <div className="hidden sm:flex sm:justify-center">
      <svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`} className="overflow-visible">
        <defs>
          <radialGradient id="radar-fill-grad">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.08" />
          </radialGradient>
        </defs>

        {/* Ring guides */}
        {RINGS.map(pct => (
          <circle
            key={pct}
            cx={CENTER}
            cy={CENTER}
            r={(pct / 100) * MAX_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.5}
            className="text-[#d8d9d6] dark:text-[#1e3158]"
          />
        ))}

        {/* Axis lines */}
        {axes.map(a => {
          const [x, y] = polarToXY(a.angle, MAX_RADIUS)
          return (
            <line
              key={a.key}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeWidth={0.5}
              className="text-[#d8d9d6] dark:text-[#1e3158]"
            />
          )
        })}

        {/* Filled polygon */}
        <polygon points={polygonPoints} fill="url(#radar-fill-grad)" stroke="#6366F1" strokeWidth={2} strokeLinejoin="round" className="transition-all duration-700" />

        {/* Score dots */}
        {axes.map(a => {
          const r = (Math.min(a.score, 100) / 100) * MAX_RADIUS
          const [x, y] = polarToXY(a.angle, r)
          return (
            <circle key={a.key} cx={x} cy={y} r={4} fill="#6366F1" stroke="white" strokeWidth={2} />
          )
        })}

        {/* Labels */}
        {axes.map(a => {
          const [x, y] = polarToXY(a.angle, MAX_RADIUS + 20)
          return (
            <text
              key={a.key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-[#475569] dark:fill-[#7e93b0] text-[11px] font-medium"
            >
              {a.label}
            </text>
          )
        })}
      </svg>
    </div>
  )

  return (
    <div className={`section-enter rounded-[28px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d] ${className ?? ''}`}>
      <h3 className="text-sm font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.radar.title')}</h3>
      <p className="mt-1 text-xs text-[#94a3b8]">{t('profile.radar.subtitle')}</p>

      <div className="mt-5">
        {radarView}
        {mobileView}
      </div>

      {/* Strength/weakness summary */}
      <div className="mt-5 flex flex-col gap-2">
        {strongest.length > 0 && (
          <div className="flex items-start gap-2">
            <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f59e0b]" />
            <p className="text-xs text-[#475569] dark:text-[#7e93b0]">
              <span className="font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.radar.strongest')}:</span>{' '}
              {strongest.map(s => `${s.label} (${t(`skill.${s.level}`)})`).join(' · ')}
            </p>
          </div>
        )}
        {competencies.some(c => c.scoreDelta30d > 0) && (
          <div className="flex items-start gap-2">
            <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#22c55e]" />
            <p className="text-xs text-[#475569] dark:text-[#7e93b0]">
              <span className="font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.radar.growing')}:</span>{' '}
              {competencies.filter(c => c.scoreDelta30d > 0).map(c => `${c.label} (+${c.scoreDelta30d})`).join(' · ')}
            </p>
          </div>
        )}
        {weakest.length > 0 && (
          <div className="flex items-start gap-2">
            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6366F1]" />
            <p className="text-xs text-[#475569] dark:text-[#7e93b0]">
              <span className="font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.radar.focus')}:</span>{' '}
              {weakest.map(w => `${w.label} (${t(`skill.${w.level}`)})`).join(' · ')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
