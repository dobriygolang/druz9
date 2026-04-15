import { cn } from '../lib/cn'
import { useTranslation } from 'react-i18next'
import type { UserGoal } from '@/entities/User/model/types'

interface GoalSelectorProps {
  goal: UserGoal
  companies: string[]
  onChange: (goal: { kind: string; company?: string }) => void
  className?: string
}

export function GoalSelector({ goal, companies, onChange, className }: GoalSelectorProps) {
  const { t } = useTranslation()
  const goals: Array<{ kind: UserGoal['kind']; label: string }> = [
    { kind: 'general_growth', label: t('goal.generalGrowth') },
    { kind: 'weakest_first', label: t('goal.weakAreas') },
    { kind: 'company_prep', label: t('goal.company') },
  ]

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-xs font-medium text-[#64748b] dark:text-[#7e93b0]">{t('goal.label')}:</span>
      {goals.map(g => (
        <button
          key={g.kind}
          type="button"
          onClick={() => onChange({ kind: g.kind, company: g.kind === 'company_prep' ? (companies[0] ?? '') : '' })}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
            goal.kind === g.kind
              ? 'bg-[#111111] text-white shadow-sm dark:bg-white dark:text-[#08101f]'
              : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] dark:bg-[#1a2236] dark:text-[#94a3b8] dark:hover:bg-[#24324f]',
          )}
        >
          {g.label}
        </button>
      ))}
      {goal.kind === 'company_prep' && companies.length > 0 && (
        <select
          value={goal.company}
          onChange={e => onChange({ kind: 'company_prep', company: e.target.value })}
          className="rounded-full border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-medium text-[#111111] dark:border-[#1e3158] dark:bg-[#161c2d] dark:text-[#e2e8f3]"
        >
          {companies.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}
    </div>
  )
}
