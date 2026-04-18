import type { ButtonHTMLAttributes } from 'react'

export type RpgButtonVariant = 'default' | 'primary' | 'moss' | 'ghost'
export type RpgButtonSize = 'md' | 'sm' | 'icon'

export interface RpgButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: RpgButtonVariant
  size?: RpgButtonSize
}

export function RpgButton({
  variant = 'default',
  size = 'md',
  className = '',
  ...rest
}: RpgButtonProps) {
  const cls = [
    'rpg-btn',
    variant === 'primary' && 'rpg-btn--primary',
    variant === 'moss' && 'rpg-btn--moss',
    variant === 'ghost' && 'rpg-btn--ghost',
    size === 'sm' && 'rpg-btn--sm',
    size === 'icon' && 'rpg-btn--icon',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return <button className={cls} {...rest} />
}
