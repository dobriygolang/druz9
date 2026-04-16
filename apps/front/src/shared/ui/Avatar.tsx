import { useEffect, useMemo, useState } from 'react'
import { cn } from '../lib/cn'

interface AvatarProps {
  name?: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  colorIndex?: number
}

const COLORS = [
  'bg-[#059669]',
  'bg-[#059669]',
  'bg-[#22c55e]',
  'bg-[#f59e0b]',
  'bg-[#ef4444]',
  'bg-[#0D9488]',
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
  const [imageFailed, setImageFailed] = useState(false)
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }

  const idx = colorIndex ?? (name.charCodeAt(0) ?? 0) % COLORS.length
  const color = COLORS[idx]
  const normalizedSrc = useMemo(() => normalizeAvatarSrc(src), [src])

  useEffect(() => {
    setImageFailed(false)
  }, [normalizedSrc])

  if (normalizedSrc && !imageFailed) {
    return (
      <img
        src={normalizedSrc}
        alt={name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
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

function normalizeAvatarSrc(src?: string): string {
  const trimmed = src?.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  if (trimmed.startsWith('http://')) return `https://${trimmed.slice('http://'.length)}`
  return trimmed
}
