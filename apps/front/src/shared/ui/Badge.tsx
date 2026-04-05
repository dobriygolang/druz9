import { cn } from '../lib/cn'

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'orange' | 'indigo' | 'amber' | 'live'
  className?: string
  children: React.ReactNode
  dot?: boolean
}

export function Badge({ variant = 'default', className, children, dot }: BadgeProps) {
  const variants = {
    default: 'bg-[#f1f5f9] text-[#475569]',
    success: 'bg-[#e8f9ef] text-[#166534]',
    warning: 'bg-[#fef3c7] text-[#92400e]',
    danger: 'bg-[#fef2f2] text-[#dc2626]',
    info: 'bg-[#eff6ff] text-[#3730a3]',
    orange: 'bg-[#fff7ed] text-[#FF8400]',
    indigo: 'bg-[#eff6ff] text-[#6366f1]',
    amber: 'bg-[#fef3c7] text-[#92400e]',
    live: 'bg-[#fef3c7] text-[#92400e] font-semibold',
  }

  const dotColors = {
    default: 'bg-[#94a3b8]',
    success: 'bg-[#22c55e]',
    warning: 'bg-[#f59e0b]',
    danger: 'bg-[#ef4444]',
    info: 'bg-[#6366f1]',
    orange: 'bg-[#FF8400]',
    indigo: 'bg-[#6366f1]',
    amber: 'bg-[#f59e0b]',
    live: 'bg-[#f59e0b]',
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
