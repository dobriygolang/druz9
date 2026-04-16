import { cn } from '../lib/cn'

interface CardProps {
  className?: string
  children: React.ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  dark?: boolean
  border?: boolean
  orangeBorder?: boolean
  notch?: boolean
  onClick?: React.MouseEventHandler<HTMLDivElement>
}

export function Card({ className, children, padding = 'md', dark, border = true, orangeBorder, notch, onClick }: CardProps) {
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
        notch && 'card-notch',
        dark
          ? 'bg-[#070E0C] border-[#1E4035]'
          : 'bg-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:bg-[#132420] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]',
        border && !orangeBorder && 'border',
        border && !orangeBorder && (dark ? 'border-[#1E4035]' : 'border-[#C1CFC4] dark:border-[#1E4035]'),
        orangeBorder && 'border border-[#059669] dark:border-[#34D399]',
        onClick && 'cursor-pointer',
        paddings[padding],
        className,
      )}
    >
      {children}
    </div>
  )
}
