/**
 * DragonSilhouette — decorative SVG used as page watermark / corner
 * accent. Variants for different mood (coiled, flying, roaring).
 * Positioning is the parent's job — set `position: absolute` + inset.
 */

import './DragonSilhouette.css'

interface Props {
  variant?: 'coiled' | 'flying' | 'resting'
  color?: string
  opacity?: number
  size?: number
  className?: string
  /** Horizontal flip (for opposite corners). */
  flip?: boolean
}

export function DragonSilhouette({
  variant = 'coiled',
  color = '#2A1810',
  opacity = 0.08,
  size = 320,
  flip,
  className = '',
}: Props) {
  return (
    <svg
      viewBox="0 0 300 300"
      width={size}
      height={size}
      className={`gm-dragon gm-dragon-${variant} ${className}`}
      style={{ opacity, transform: flip ? 'scaleX(-1)' : undefined }}
      aria-hidden="true"
    >
      {variant === 'coiled' && (
        <>
          <path
            d="M 40 180 Q 20 120 70 90 Q 130 70 160 110 Q 200 140 230 100 Q 270 70 275 120
               Q 275 160 240 175 Q 210 195 180 175 Q 140 165 120 200 Q 90 235 60 215 Q 35 200 40 180 Z"
            fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round"
          />
          {/* Head */}
          <path d="M 230 90 L 268 82 L 278 100 L 260 110 L 240 105 Z" fill={color} />
          {/* Horn */}
          <path d="M 265 80 L 278 64 L 275 80 Z" fill={color} />
          {/* Eye */}
          <circle cx="260" cy="95" r="2" fill="#FFE28A" />
          {/* Spikes */}
          <path d="M 200 145 L 205 132 L 212 145 Z" fill={color} />
          <path d="M 160 170 L 164 158 L 170 170 Z" fill={color} />
          <path d="M 110 190 L 113 178 L 120 190 Z" fill={color} />
        </>
      )}

      {variant === 'flying' && (
        <>
          {/* Body */}
          <path
            d="M 80 160 L 150 140 L 220 160 L 210 175 L 150 165 L 90 175 Z"
            fill={color}
          />
          {/* Wing L */}
          <path
            d="M 100 150 L 30 100 Q 50 130 85 150 Z"
            fill={color} opacity="0.85"
          />
          {/* Wing R */}
          <path
            d="M 200 150 L 270 100 Q 250 130 215 150 Z"
            fill={color} opacity="0.85"
          />
          {/* Head */}
          <circle cx="225" cy="160" r="8" fill={color} />
          <path d="M 232 155 L 240 148 L 234 162 Z" fill={color} />
          {/* Tail */}
          <path d="M 80 165 Q 40 180 50 200 L 60 195 Q 55 185 82 172 Z" fill={color} />
        </>
      )}

      {variant === 'resting' && (
        <>
          <ellipse cx="150" cy="200" rx="100" ry="18" fill={color} />
          <path d="M 80 200 Q 70 170 110 165 Q 160 155 200 170 Q 230 180 225 200 Z" fill={color} />
          <circle cx="220" cy="180" r="12" fill={color} />
          <circle cx="223" cy="176" r="1.5" fill="#FFE28A" />
          <path d="M 228 170 L 238 160 L 232 175 Z" fill={color} />
          {/* Folded wing */}
          <path d="M 140 165 Q 130 135 170 140 Q 180 160 160 170 Z" fill={color} opacity="0.9" />
        </>
      )}
    </svg>
  )
}
