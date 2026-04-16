import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[#4B6B52]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 text-sm bg-[#E2F0E8] border border-[#e2e8f0] rounded-lg text-[#0B1210] placeholder-[#94a3b8] resize-none',
            'focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]',
            'transition-colors',
            error && 'border-[#ef4444]',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-[#ef4444]">{error}</p>}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
