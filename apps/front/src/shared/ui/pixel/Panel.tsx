import type { HTMLAttributes, ReactNode } from 'react'

export type PanelVariant = 'default' | 'tight' | 'recessed' | 'wood' | 'dark'

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: PanelVariant
  nailed?: boolean
  children?: ReactNode
}

export function Panel({
  variant = 'default',
  nailed = false,
  className = '',
  children,
  ...rest
}: PanelProps) {
  const cls = [
    'rpg-panel',
    variant === 'tight' && 'rpg-panel--tight',
    variant === 'recessed' && 'rpg-panel--recessed',
    variant === 'wood' && 'rpg-panel--wood',
    variant === 'dark' && 'rpg-panel--dark',
    nailed && 'rpg-panel--nailed',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  )
}
