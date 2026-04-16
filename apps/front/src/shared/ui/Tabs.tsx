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

const VARIANT_STYLES = {
  pill: {
    container: 'flex items-center gap-1 p-1 bg-[#E4EBE5] border border-[#C1CFC4] rounded-full',
    button: 'px-4 py-1.5 text-sm font-medium rounded-full transition-colors',
    active: 'bg-white text-[#18181b] shadow-sm',
    inactive: 'text-[#7A9982] hover:text-[#18181b]',
  },
  underline: {
    container: 'flex items-center gap-0 border-b border-[#C1CFC4]',
    button: 'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
    active: 'border-[#059669] text-[#18181b]',
    inactive: 'border-transparent text-[#7A9982] hover:text-[#18181b]',
  },
} as const

export function Tabs({ tabs, active, onChange, variant = 'underline', className }: TabsProps) {
  const styles = VARIANT_STYLES[variant]

  return (
    <div className={cn(styles.container, className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(styles.button, active === tab.id ? styles.active : styles.inactive)}
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
