import { cn } from '../lib/cn'

interface CardProps {
  className?: string
  children: React.ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  dark?: boolean
  border?: boolean
  orangeBorder?: boolean
}

export function Card({ className, children, padding = 'md', dark, border = true, orangeBorder }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  }

  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-200',
        dark ? 'bg-[#0f1629]' : 'bg-white hover:shadow-md',
        border && !orangeBorder && 'border',
        border && !orangeBorder && (dark ? 'border-[#1e293b]' : 'border-[#CBCCC9]'),
        orangeBorder && 'border border-[#FF8400]',
        paddings[padding],
        className,
      )}
    >
      {children}
    </div>
  )
}
