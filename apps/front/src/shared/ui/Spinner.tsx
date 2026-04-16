import { cn } from '../lib/cn'

export function Spinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <div className={cn('border-2 border-[#C1CFC4] border-t-[#059669] rounded-full animate-spin', sizes[size], className)} />
  )
}
