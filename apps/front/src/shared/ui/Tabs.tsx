import { cn } from '../lib/cn'

interface Tab {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  variant?: 'underline' | 'pill'
  className?: string
}

export function Tabs({ tabs, active, onChange, variant = 'underline', className }: TabsProps) {
  if (variant === 'pill') {
    return (
      <div className={cn('flex items-center gap-1 p-1 bg-[#E7E8E5] border border-[#CBCCC9] rounded-full', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-full transition-colors',
              active === tab.id
                ? 'bg-white text-[#18181b] shadow-sm'
                : 'text-[#64748b] hover:text-[#18181b]',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-xs text-[#94a3b8]">{tab.count}</span>
            )}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-0 border-b border-[#CBCCC9]', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
            active === tab.id
              ? 'border-[#FF8400] text-[#18181b]'
              : 'border-transparent text-[#64748b] hover:text-[#18181b]',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-xs text-[#94a3b8]">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}
