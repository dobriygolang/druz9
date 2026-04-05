import { cn } from '../lib/cn'

interface AvatarProps {
  name?: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  colorIndex?: number
}

const COLORS = [
  'bg-[#6366f1]',
  'bg-[#6366F1]',
  'bg-[#22c55e]',
  'bg-[#f59e0b]',
  'bg-[#ef4444]',
  'bg-[#8b5cf6]',
  'bg-[#06b6d4]',
]

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({ name = '', src, size = 'md', className, colorIndex }: AvatarProps) {
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }

  const idx = colorIndex ?? (name.charCodeAt(0) ?? 0) % COLORS.length
  const color = COLORS[idx]

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={cn('rounded-full object-cover', sizes[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0',
        sizes[size],
        color,
        className,
      )}
    >
      {getInitials(name)}
    </div>
  )
}
