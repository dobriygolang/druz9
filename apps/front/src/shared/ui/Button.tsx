import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'orange' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-[#6366f1] hover:bg-[#5558e3] hover:brightness-105 hover:shadow-sm hover:-translate-y-0.5 text-white focus:ring-[#6366f1]',
      orange: 'bg-[#FF8400] hover:bg-[#ea7700] hover:brightness-105 hover:shadow-sm hover:-translate-y-0.5 text-[#0f172a] focus:ring-[#FF8400]',
      secondary: 'bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] border border-[#cbd5e1] focus:ring-[#e2e8f0]',
      ghost: 'bg-transparent hover:bg-[#f1f5f9] text-[#64748b] focus:ring-[#e2e8f0]',
      danger: 'bg-[#ef4444] hover:bg-[#dc2626] hover:brightness-105 hover:shadow-sm text-white focus:ring-[#ef4444]',
      dark: 'bg-[#1e293b] hover:bg-[#0f172a] text-[#e2e8f0] focus:ring-[#334155]',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-sm',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
