import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-500 text-[#4B6B52] dark:text-[#7BA88A]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg transition-colors',
            'bg-[#E2F0E8] border border-[#e2e8f0] text-[#0B1210] placeholder-[#94a3b8]',
            'focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]',
            'dark:bg-[#0B1210] dark:border-[#1E4035] dark:text-[#E2F0E8] dark:placeholder-[#3d5570]',
            'dark:focus:ring-[#059669]/20 dark:focus:border-[#34D399]',
            error && 'border-[#ef4444] focus:ring-[#ef4444]/20',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-[#ef4444] dark:text-[#f87171]">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
