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
                  ? 'text-[#059669] dark:text-[#34D399]'
                  : 'text-[#7A9982] dark:text-[#7BA88A]',
              )}
            >
              {item.label}
            </span>
            <div className="flex-1 h-2 rounded-full bg-[#E4EBE5] dark:bg-[#1E4035] overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700 ease-out',
                  isFocus
                    ? 'bg-[#059669] dark:bg-[#34D399]'
                    : 'bg-[#6EE7B7] dark:bg-[#4338ca]',
                )}
                style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }}
              />
            </div>
            <span
              className={cn(
                'w-8 text-right text-xs font-mono tabular-nums',
                isFocus
                  ? 'text-[#059669] font-semibold dark:text-[#34D399]'
                  : 'text-[#7A9982] dark:text-[#7BA88A]',
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
