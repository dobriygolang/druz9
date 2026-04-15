import { cn } from '../lib/cn'
import { Avatar } from './Avatar'

interface PlayerFrameProps {
  name: string
  src?: string
  league?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const leagueRing: Record<string, string> = {
  bronze: 'ring-[#CD7F32]',
  silver: 'ring-[#C0C0C0]',
  gold: 'ring-[#FFD700]',
  platinum: 'ring-[#00CED1]',
  diamond: 'ring-[#B9F2FF]',
  master: 'ring-[#FF6B6B]',
}

export function PlayerFrame({ name, src, league, size = 'md', className }: PlayerFrameProps) {
  const ringClass = league ? leagueRing[league.toLowerCase()] ?? '' : ''

  return (
    <Avatar
      name={name}
      src={src}
      size={size}
      className={cn(
        ringClass && `ring-2 ${ringClass}`,
        'shadow-[0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
        className,
      )}
    />
  )
}
