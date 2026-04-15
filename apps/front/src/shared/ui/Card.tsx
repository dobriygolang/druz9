import { cn } from '../lib/cn'

interface CardProps {
  className?: string
  children: React.ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  dark?: boolean
  border?: boolean
  orangeBorder?: boolean
  onClick?: React.MouseEventHandler<HTMLDivElement>
}

export function Card({ className, children, padding = 'md', dark, border = true, orangeBorder, onClick }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl transition-all duration-200',
        dark
          ? 'bg-[#0f1629] border-[#1e293b]'
          : 'bg-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:bg-[#161c2d] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]',
        border && !orangeBorder && 'border',
        border && !orangeBorder && (dark ? 'border-[#1e293b]' : 'border-[#CBCCC9] dark:border-[#1e3158]'),
        orangeBorder && 'border border-[#6366F1] dark:border-[#818cf8]',
        onClick && 'cursor-pointer',
        paddings[padding],
        className,
      )}
    >
      {children}
    </div>
  )
}
