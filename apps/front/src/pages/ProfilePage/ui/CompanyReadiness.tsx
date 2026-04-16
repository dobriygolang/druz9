import { useTranslation } from 'react-i18next'
import { Building2 } from 'lucide-react'
import { Badge } from '@/shared/ui/Badge'
import type { CompanyReadinessItem } from '../lib/computeReadiness'

interface Props {
  readiness: CompanyReadinessItem[]
  className?: string
}

export function CompanyReadiness({ readiness, className }: Props) {
  const { t } = useTranslation()

  if (readiness.length === 0) {
    return (
      <div className={`section-enter rounded-[28px] border border-[#C1CFC4] bg-white p-5 dark:border-[#163028] dark:bg-[#132420] ${className ?? ''}`}>
        <h3 className="text-sm font-semibold text-[#111111] dark:text-[#E2F0E8]">{t('profile.progress.companyReadiness')}</h3>
        <p className="mt-1 text-xs text-[#94a3b8]">{t('profile.progress.companyReadinessSubtitle')}</p>
        <div className="mt-5 flex min-h-[100px] items-center justify-center rounded-2xl bg-[#F0F5F1] dark:bg-[#0f1629]">
          <p className="text-xs text-[#94a3b8]">{t('profile.company.empty')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`section-enter rounded-[28px] border border-[#C1CFC4] bg-white p-5 dark:border-[#163028] dark:bg-[#132420] ${className ?? ''}`}>
      <h3 className="text-sm font-semibold text-[#111111] dark:text-[#E2F0E8]">{t('profile.progress.companyReadiness')}</h3>
      <p className="mt-1 text-xs text-[#94a3b8]">{t('profile.progress.companyReadinessSubtitle')}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {readiness.map(item => {
          const toneColor = item.tone === 'success' ? '#22c55e' : item.tone === 'warning' ? '#f59e0b' : '#ef4444'
          const toneBg = item.tone === 'success' ? '#F0FDF4' : item.tone === 'warning' ? '#ecfdf5' : '#FEF2F2'
          const nextLabel = item.nextStageKind ? t(`profile.stage.${item.nextStageKind}`) : ''
          return (
            <div
              key={item.name}
              className="flex flex-col gap-3 rounded-[20px] border border-[#E4EBE5] bg-[#FAFAFA] p-4 dark:border-[#1E4035] dark:bg-[#0f1629]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 shrink-0 text-[#94a3b8]" />
                  <span className="truncate text-sm font-semibold text-[#111111] dark:text-[#E2F0E8]">{item.name}</span>
                </div>
                <Badge variant={item.tone === 'success' ? 'success' : item.tone === 'warning' ? 'warning' : 'danger'}>
                  {item.percent}%
                </Badge>
              </div>

              {/* Progress ring inline */}
              <div className="flex items-center gap-3">
                <svg width={40} height={40} viewBox="0 0 40 40">
                  <circle cx={20} cy={20} r={16} fill="none" stroke="#E4EBE5" strokeWidth={3} className="dark:stroke-[#1E4035]" />
                  <circle
                    cx={20} cy={20} r={16} fill="none"
                    stroke={toneColor} strokeWidth={3} strokeLinecap="round"
                    strokeDasharray={100.5} strokeDashoffset={100.5 * (1 - item.percent / 100)}
                    className="transition-all duration-700 -rotate-90 origin-center"
                  />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#4B6B52] dark:text-[#7BA88A]">
                    {t('profile.progress.completedStages', { completed: item.completed, total: item.total })}
                  </p>
                  {item.nextStageKind && item.percent < 100 && (
                    <p className="mt-0.5 text-[11px] text-[#94a3b8]">
                      {t('profile.company.next')}: {nextLabel}
                    </p>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full" style={{ backgroundColor: toneBg }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${item.percent}%`, backgroundColor: toneColor }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
