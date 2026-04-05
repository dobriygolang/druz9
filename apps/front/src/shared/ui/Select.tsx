import { cn } from '../lib/cn'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function Select({ label, options, value, onChange, placeholder, className, disabled }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-[#475569]">{label}</label>
      )}
      <select
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-[#0f172a]',
          'focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]',
          'transition-colors appearance-none cursor-pointer disabled:opacity-50',
          className,
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
