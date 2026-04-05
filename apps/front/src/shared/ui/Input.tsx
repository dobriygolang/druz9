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
          <label htmlFor={inputId} className="text-xs font-500 text-[#475569]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-[#0f172a] placeholder-[#94a3b8]',
            'focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]',
            'transition-colors',
            error && 'border-[#ef4444] focus:ring-[#ef4444]/20',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-[#ef4444]">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
