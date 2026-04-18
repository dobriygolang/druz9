export function Bar({
  value,
  max = 100,
  variant = 'ember',
  className = '',
}: {
  value: number
  max?: number
  variant?: 'ember' | 'moss'
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={`rpg-bar ${className}`}>
      <div
        className={variant === 'moss' ? 'rpg-bar__fill rpg-bar__fill--moss' : 'rpg-bar__fill'}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
