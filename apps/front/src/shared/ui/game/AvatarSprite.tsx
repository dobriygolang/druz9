/**
 * AvatarSprite — simple SVG avatar with equippable layers.
 * V1: hand-drawn generic character (body + eyes + smile) + optional
 * hat / cloak / weapon overlays. Each layer is a pure SVG group so
 * new gear items are one file each.
 *
 * Later: swap the base SVG for user-uploaded pixel art, keep the same
 * layer slot API.
 */

import './game-tokens.css'
import './AvatarSprite.css'

interface Props {
  hat?: string       // shop item id
  cloak?: string
  weapon?: string
  size?: number
  /** Bob animation (idle). */
  idle?: boolean
  className?: string
}

/* Inline sub-sprite components — add more as shop items grow. */

function Hat({ id, color }: { id: string; color?: string }) {
  // Different hat shapes per item id.
  if (id === 'hat_scholar') {
    return (
      <g transform="translate(50 20)">
        <ellipse cx="0" cy="8" rx="26" ry="6" fill="#2A1810" />
        <path d="M -20 5 L -16 -10 L 16 -10 L 20 5 Z" fill={color ?? '#2A1810'} />
        <circle cx="0" cy="-10" r="4" fill={color ?? '#D4A940'} />
      </g>
    )
  }
  if (id === 'hat_wizard') {
    return (
      <g transform="translate(50 20)">
        <ellipse cx="0" cy="10" rx="28" ry="5" fill="#3A1E68" />
        <path d="M -18 10 L 0 -28 L 18 10 Z" fill={color ?? '#6B3FA0'} />
        <polygon points="0,-22 2,-18 -2,-18" fill="#FFE28A" />
        <circle cx="-6" cy="-5" r="1.5" fill="#FFE28A" opacity="0.7" />
        <circle cx="5" cy="-10" r="1" fill="#FFE28A" opacity="0.7" />
      </g>
    )
  }
  if (id === 'hat_crown') {
    return (
      <g transform="translate(50 20)">
        <path d="M -18 8 L -18 -6 L -10 0 L -2 -10 L 2 -10 L 10 0 L 18 -6 L 18 8 Z"
              fill="url(#gm-crown-grad)" stroke="#6B4F10" strokeWidth="1.5" />
        <circle cx="-10" cy="-4" r="2" fill="#E8703A" />
        <circle cx="0"   cy="-8" r="2.5" fill="#A52A2A" />
        <circle cx="10"  cy="-4" r="2" fill="#2E5FA0" />
      </g>
    )
  }
  if (id === 'hat_dragon') {
    return (
      <g transform="translate(50 22)">
        <ellipse cx="0" cy="6" rx="26" ry="6" fill="#1A0E06" />
        <path d="M -14 -4 L -22 -18 L -8 -6 Z" fill="#A52A2A" stroke="#1A0E06" strokeWidth="1" />
        <path d="M  14 -4 L  22 -18 L  8 -6 Z" fill="#A52A2A" stroke="#1A0E06" strokeWidth="1" />
        <path d="M -6 -2 L 0 -12 L 6 -2 Z" fill="#6B1515" stroke="#1A0E06" strokeWidth="1" />
      </g>
    )
  }
  return null
}

function Cloak({ id }: { id: string }) {
  const colors: Record<string, [string, string]> = {
    cloak_green:    ['#2E8B57', '#1A5530'],
    cloak_sapphire: ['#2E5FA0', '#143068'],
    cloak_phoenix:  ['#FF6A20', '#A52A2A'],
    cloak_void:     ['#6B3FA0', '#1A0E2A'],
  }
  const [c1, c2] = colors[id] ?? ['#6B3FA0', '#3A1E68']
  return (
    <g transform="translate(50 60)">
      <defs>
        <linearGradient id={`cloak-${id}-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <path d="M -28 0 L -20 45 L 20 45 L 28 0 L 20 -4 L -20 -4 Z"
            fill={`url(#cloak-${id}-grad)`}
            stroke="#1A1208" strokeWidth="1.5" />
    </g>
  )
}

function Weapon({ id }: { id: string }) {
  if (id === 'weapon_sword') {
    return (
      <g transform="translate(78 80) rotate(-25)">
        <rect x="-1.5" y="-22" width="3" height="26" fill="#C8D0E0" stroke="#2A2A2A" strokeWidth="0.8" />
        <rect x="-4"   y="4"  width="8" height="3" fill="#8B6914" />
        <rect x="-2"   y="7"  width="4" height="8" fill="#3A2410" />
      </g>
    )
  }
  if (id === 'weapon_staff') {
    return (
      <g transform="translate(78 80)">
        <rect x="-1" y="-30" width="2" height="40" fill="#6B4F10" />
        <circle cx="0" cy="-32" r="5" fill="#D4A940" opacity="0.8" />
        <circle cx="0" cy="-32" r="3" fill="#FFF8D0" />
      </g>
    )
  }
  if (id === 'weapon_bow') {
    return (
      <g transform="translate(78 80) rotate(15)">
        <path d="M 0 -22 Q -8 0 0 22" stroke="#8B6914" strokeWidth="2" fill="none" />
        <line x1="0" y1="-22" x2="0" y2="22" stroke="#F4E8CE" strokeWidth="0.6" />
      </g>
    )
  }
  if (id === 'weapon_hammer') {
    return (
      <g transform="translate(78 80)">
        <rect x="-1" y="-22" width="2" height="26" fill="#3A2410" />
        <rect x="-8" y="-26" width="16" height="10" fill="#A0A0A8" stroke="#2A2A2A" strokeWidth="1" />
      </g>
    )
  }
  if (id === 'weapon_scythe') {
    return (
      <g transform="translate(78 80) rotate(-15)">
        <rect x="-1" y="-22" width="2" height="32" fill="#3A2410" />
        <path d="M 1 -22 Q 16 -18 14 -6" stroke="#C0C0CC" strokeWidth="2.5" fill="none" />
      </g>
    )
  }
  return null
}

export function AvatarSprite({ hat, cloak, weapon, size = 96, idle = true, className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 100 130"
      width={size}
      height={size * 1.3}
      className={`gm-avatar ${idle ? 'gm-avatar-idle' : ''} ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gm-crown-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE28A" />
          <stop offset="100%" stopColor="#8B6914" />
        </linearGradient>
        <radialGradient id="gm-skin-grad" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#F8DCB8" />
          <stop offset="100%" stopColor="#D4A078" />
        </radialGradient>
      </defs>

      {/* Shadow */}
      <ellipse cx="50" cy="124" rx="22" ry="4" fill="#000" opacity="0.35" />

      {cloak && <Cloak id={cloak} />}

      {/* Legs */}
      <rect x="38" y="92" width="10" height="22" fill="#3A3042" rx="2" />
      <rect x="52" y="92" width="10" height="22" fill="#3A3042" rx="2" />
      {/* Boots */}
      <rect x="36" y="110" width="14" height="8" fill="#2A1A10" rx="2" />
      <rect x="50" y="110" width="14" height="8" fill="#2A1A10" rx="2" />

      {/* Torso */}
      <rect x="32" y="56" width="36" height="42" rx="5" fill="#2E6A38" stroke="#1A3A20" strokeWidth="1.5" />
      {/* Belt */}
      <rect x="32" y="85" width="36" height="6" fill="#3A2410" />
      <rect x="46" y="85" width="8" height="6" fill="#D4A940" />

      {/* Arms */}
      <rect x="24" y="58" width="10" height="30" rx="4" fill="#2E6A38" stroke="#1A3A20" strokeWidth="1.5" />
      <rect x="66" y="58" width="10" height="30" rx="4" fill="#2E6A38" stroke="#1A3A20" strokeWidth="1.5" />
      {/* Hands */}
      <circle cx="29" cy="90" r="5" fill="url(#gm-skin-grad)" stroke="#8B5030" strokeWidth="0.8" />
      <circle cx="71" cy="90" r="5" fill="url(#gm-skin-grad)" stroke="#8B5030" strokeWidth="0.8" />

      {/* Head */}
      <circle cx="50" cy="36" r="20" fill="url(#gm-skin-grad)" stroke="#8B5030" strokeWidth="1.5" />
      {/* Eyes */}
      <circle cx="43" cy="36" r="2" fill="#1A0E06" />
      <circle cx="57" cy="36" r="2" fill="#1A0E06" />
      <circle cx="43.5" cy="35.5" r="0.6" fill="#FFF" opacity="0.9" />
      <circle cx="57.5" cy="35.5" r="0.6" fill="#FFF" opacity="0.9" />
      {/* Cheeks (soft pink) */}
      <circle cx="40" cy="41" r="2.5" fill="#F8B0A0" opacity="0.5" />
      <circle cx="60" cy="41" r="2.5" fill="#F8B0A0" opacity="0.5" />
      {/* Mouth */}
      <path d="M 45 44 Q 50 48 55 44" stroke="#8B4020" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {hat && <Hat id={hat} />}
      {weapon && <Weapon id={weapon} />}
    </svg>
  )
}
