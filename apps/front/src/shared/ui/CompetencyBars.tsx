import { cn } from '../lib/cn'

export interface CompetencyBarItem {
  key: string
  label: string
  score: number
  isFocus?: boolean
}

interface CompetencyBarsProps {
  items: CompetencyBarItem[]
  focusKey?: string
  className?: string
}

export function CompetencyBars({ items, focusKey, className }: CompetencyBarsProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {items.map((item) => {
        const isFocus = focusKey ? item.key === focusKey : item.isFocus
        return (
          <div key={item.key} className="flex items-center gap-3">
            <span
              className={cn(
                'w-28 shrink-0 text-xs font-medium truncate',
                isFocus
                  ? 'text-[#6366F1] dark:text-[#818cf8]'
                  : 'text-[#667085] dark:text-[#7e93b0]',
              )}
            >
              {item.label}
            </span>
            <div className="flex-1 h-2 rounded-full bg-[#E7E8E5] dark:bg-[#1e3158] overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700 ease-out',
                  isFocus
                    ? 'bg-[#6366F1] dark:bg-[#818cf8]'
                    : 'bg-[#a5b4fc] dark:bg-[#4338ca]',
                )}
                style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }}
              />
            </div>
            <span
              className={cn(
                'w-8 text-right text-xs font-mono tabular-nums',
                isFocus
                  ? 'text-[#6366F1] font-semibold dark:text-[#818cf8]'
                  : 'text-[#667085] dark:text-[#7e93b0]',
              )}
            >
              {item.score}
            </span>
          </div>
        )
      })}
    </div>
  )
}
