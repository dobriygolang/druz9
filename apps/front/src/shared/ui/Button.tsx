import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'orange' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center gap-2 font-medium rounded-xl transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'btn-game btn-ripple bg-[#059669] hover:bg-[#047857] hover:shadow-sm hover:-translate-y-0.5 text-white focus:ring-[#059669]',
      orange:  'btn-game btn-ripple bg-[#059669] hover:bg-[#047857] hover:shadow-sm hover:-translate-y-0.5 text-white focus:ring-[#059669]',
      secondary: [
        'bg-white hover:bg-[#E6F0E8] text-[#111111] border border-[#C1CFC4] focus:ring-[#C1CFC4]',
        'dark:bg-[#132420] dark:hover:bg-[#1A3028] dark:text-[#E2F0E8] dark:border-[#1E4035] dark:focus:ring-[#1E4035]',
      ].join(' '),
      ghost: [
        'bg-transparent hover:bg-[#E6F0E8] text-[#4B6B52] focus:ring-[#C1CFC4]',
        'dark:hover:bg-[#162E24] dark:text-[#7BA88A] dark:focus:ring-[#163028]',
      ].join(' '),
      danger: 'bg-[#ef4444] hover:bg-[#dc2626] hover:shadow-sm text-white focus:ring-[#ef4444]',
      dark:   'bg-[#1e293b] hover:bg-[#0B1210] text-[#e2e8f0] focus:ring-[#1E4035]',
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
