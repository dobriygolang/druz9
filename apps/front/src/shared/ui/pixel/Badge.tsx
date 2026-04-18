import type { HTMLAttributes, ReactNode } from 'react'

export type BadgeVariant = 'default' | 'moss' | 'ember' | 'dark'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  children?: ReactNode
}

export function Badge({ variant = 'default', className = '', children, ...rest }: BadgeProps) {
  const cls = [
    'rpg-badge',
    variant === 'moss' && 'rpg-badge--moss',
    variant === 'ember' && 'rpg-badge--ember',
    variant === 'dark' && 'rpg-badge--dark',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  )
}
