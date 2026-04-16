import { cn } from '../lib/cn'

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'orange' | 'indigo' | 'amber' | 'live'
  className?: string
  children: React.ReactNode
  dot?: boolean
}

export function Badge({ variant = 'default', className, children, dot }: BadgeProps) {
  const variants = {
    default: 'bg-[#ecfdf5] text-[#4B6B52] dark:bg-[#1A3028] dark:text-[#7BA88A]',
    success: 'bg-[#e8f9ef] text-[#166534] dark:bg-[#0d2a1f] dark:text-[#4ade80]',
    warning: 'bg-[#fef3c7] text-[#92400e] dark:bg-[#2a200a] dark:text-[#fbbf24]',
    danger:  'bg-[#fef2f2] text-[#dc2626] dark:bg-[#2a0f0f] dark:text-[#f87171]',
    info:    'bg-[#ecfdf5] text-[#047857] dark:bg-[#0d2a1f] dark:text-[#34D399]',
    orange:  'bg-[#ecfdf5] text-[#059669] dark:bg-[#0d2a1f] dark:text-[#34D399]',
    indigo:  'bg-[#ecfdf5] text-[#059669] dark:bg-[#0d2a1f] dark:text-[#34D399]',
    amber:   'bg-[#fef3c7] text-[#92400e] dark:bg-[#2a200a] dark:text-[#fbbf24]',
    live:    'bg-[#fef3c7] text-[#92400e] font-semibold dark:bg-[#2a200a] dark:text-[#fbbf24]',
  }

  const dotColors = {
    default: 'bg-[#7A9982] dark:bg-[#4A7058]',
    success: 'bg-[#22c55e] dark:bg-[#4ade80]',
    warning: 'bg-[#f59e0b] dark:bg-[#fbbf24]',
    danger:  'bg-[#ef4444] dark:bg-[#f87171]',
    info:    'bg-[#059669] dark:bg-[#34D399]',
    orange:  'bg-[#059669] dark:bg-[#34D399]',
    indigo:  'bg-[#059669] dark:bg-[#34D399]',
    amber:   'bg-[#f59e0b] dark:bg-[#fbbf24]',
    live:    'bg-[#f59e0b] dark:bg-[#fbbf24]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-lg',
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
