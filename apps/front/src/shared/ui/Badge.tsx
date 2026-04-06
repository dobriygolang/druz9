import { cn } from '../lib/cn'

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'orange' | 'indigo' | 'amber' | 'live'
  className?: string
  children: React.ReactNode
  dot?: boolean
}

export function Badge({ variant = 'default', className, children, dot }: BadgeProps) {
  const variants = {
    default: 'bg-[#f1f5f9] text-[#475569] dark:bg-[#1c2436] dark:text-[#7e93b0]',
    success: 'bg-[#e8f9ef] text-[#166534] dark:bg-[#0d2a1f] dark:text-[#4ade80]',
    warning: 'bg-[#fef3c7] text-[#92400e] dark:bg-[#2a200a] dark:text-[#fbbf24]',
    danger:  'bg-[#fef2f2] text-[#dc2626] dark:bg-[#2a0f0f] dark:text-[#f87171]',
    info:    'bg-[#eff6ff] text-[#3730a3] dark:bg-[#0d1e40] dark:text-[#818cf8]',
    orange:  'bg-[#fff7ed] text-[#6366F1] dark:bg-[#1f1206] dark:text-[#818cf8]',
    indigo:  'bg-[#eff6ff] text-[#6366f1] dark:bg-[#1e1e4a] dark:text-[#818cf8]',
    amber:   'bg-[#fef3c7] text-[#92400e] dark:bg-[#2a200a] dark:text-[#fbbf24]',
    live:    'bg-[#fef3c7] text-[#92400e] font-semibold dark:bg-[#2a200a] dark:text-[#fbbf24]',
  }

  const dotColors = {
    default: 'bg-[#94a3b8] dark:bg-[#4d6380]',
    success: 'bg-[#22c55e] dark:bg-[#4ade80]',
    warning: 'bg-[#f59e0b] dark:bg-[#fbbf24]',
    danger:  'bg-[#ef4444] dark:bg-[#f87171]',
    info:    'bg-[#6366f1] dark:bg-[#818cf8]',
    orange:  'bg-[#6366F1] dark:bg-[#818cf8]',
    indigo:  'bg-[#6366f1] dark:bg-[#818cf8]',
    amber:   'bg-[#f59e0b] dark:bg-[#fbbf24]',
    live:    'bg-[#f59e0b] dark:bg-[#fbbf24]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full',
        variants[variant],
        className,
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
      )}
      {children}
    </span>
  )
}
