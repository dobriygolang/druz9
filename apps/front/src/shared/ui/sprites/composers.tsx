import type { ReactNode } from 'react'
import { PixelGrid } from './PixelGrid'

export type RoomVariant = 'cozy' | 'scholar' | 'warrior'

export function RoomScene({
  variant = 'cozy',
  children,
  height = 260,
}: {
  variant?: RoomVariant
  children?: ReactNode
  height?: number
}) {
  const wallColors = {
    cozy: { wall: '#dcc690', floor: '#7a593a', trim: '#5a3f27' },
    scholar: { wall: '#6b8a6a', floor: '#3d6149', trim: '#2d4a35' },
    warrior: { wall: '#a88850', floor: '#5a3f27', trim: '#3b2a1a' },
  }[variant]

  return (
    <div
      style={{
        position: 'relative',
        height,
        background: `linear-gradient(180deg, ${wallColors.wall} 0%, ${wallColors.wall} 62%, ${wallColors.floor} 62%, ${wallColors.floor} 100%)`,
        border: '4px solid var(--ink-0)',
        boxShadow:
          'inset 0 -14px 0 rgba(59,42,26,0.25), inset 0 4px 0 rgba(246,234,208,0.2), 4px 4px 0 var(--ink-0)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '38%',
          backgroundImage: `repeating-linear-gradient(90deg, transparent 0 46px, ${wallColors.trim} 46px 48px)`,
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '62%',
          height: 4,
          background: wallColors.trim,
        }}
      />
      {children}
    </div>
  )
}

export function Fireflies({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="rpg-firefly"
          style={{
            left: `${(i * 37) % 100}%`,
            top: `${30 + ((i * 17) % 60)}%`,
            animationDelay: `${(i * 0.7) % 5}s`,
            animationDuration: `${4 + (i % 3)}s`,
          }}
        />
      ))}
    </>
  )
}

export type NavIconKind =
  | 'hub'
  | 'profile'
  | 'guild'
  | 'arena'
  | 'training'
  | 'interview'
  | 'events'
  | 'podcasts'
  | 'map'
  | 'shop'
  | 'leaderboard'
  | 'social'
  | 'inbox'
  | 'challenges'
  | 'seasonpass'
  | 'settings'
  | 'coderoom'
  | 'war'
  | 'skills'

const NAV_MAPS: Record<NavIconKind, string> = {
  hub: `
.FFFFF.
FFFFFFF
FFFFFFF
FFFFFFF
.FFFFF.
..FFF..
`,
  profile: `
..FFF..
.FFFFF.
.FFFFF.
..FFF..
.FFFFF.
FFFFFFF
FFFFFFF
`,
  guild: `
FFFFFFF
FF.F.FF
F.FFF.F
FFFFFFF
F.FFF.F
FF.F.FF
FFFFFFF
`,
  arena: `
FF...FF
FFF.FFF
.FFFFF.
..FFF..
.FFFFF.
FFF.FFF
FF...FF
`,
  training: `
....FF.
...FFF.
..FFFF.
.FFF...
FFFF...
.FF....
F......
`,
  interview: `
.FFFFF.
FFFFFFF
FFFFFFF
.FFFFF.
...F...
.FFFFF.
F..F..F
`,
  events: `
.F...F.
FFFFFFF
FFFFFFF
F.FF.FF
FFFFFFF
F..FF.F
FFFFFFF
`,
  podcasts: `
.FFFFF.
FFFFFFF
FF.F.FF
FFFFFFF
.FFFFF.
...F...
.FFFFF.
`,
  map: `
FFFFFFF
F.FFF.F
FFF.FFF
F.FFF.F
FFF.FFF
F.FFF.F
FFFFFFF
`,
  shop: `
FFFFFFF
F.FFF.F
FFFFFFF
FFFFFFF
FF...FF
FF...FF
FF...FF
`,
  // Podium: bars of different heights — unique from 'arena' (crossed swords).
  leaderboard: `
...FFF.
...FFF.
.FFFFFF
.FFFFFF
FFFFFFF
FFFFFFF
FFFFFFF
`,
  // Two figures side-by-side — distinct from single 'profile'.
  social: `
.FF.FF.
FFFFFFF
FFFFFFF
.FF.FF.
FFFFFFF
F.F.F.F
FFFFFFF
`,
  // Envelope — unique.
  inbox: `
FFFFFFF
FFFFFFF
F.FFF.F
FF.F.FF
FFF.FFF
FFFFFFF
FFFFFFF
`,
  // Scroll / paper plane — unique from 'arena'.
  challenges: `
FFFFF..
.FFFFF.
..FFFFF
.FFFFF.
FFFFF..
FFF....
FF.....
`,
  // Ribbon / banner — unique from 'events' (grid).
  seasonpass: `
FFFFFFF
FFFFFFF
FFFFFFF
FFFFFFF
.F.F.F.
.F.F.F.
..F.F..
`,
  // Cog — for settings.
  settings: `
..FFF..
F.FFF.F
FFFFFFF
FFF.FFF
FFFFFFF
F.FFF.F
..FFF..
`,
  // Keyboard — for code rooms / collaborative coding.
  coderoom: `
FFFFFFF
F.F.F.F
F.F.F.F
FFFFFFF
FF...FF
FFFFFFF
FFFFFFF
`,
  // Crossed swords (war) — different from 'arena'.
  war: `
F.....F
FF...FF
.FF.FF.
..FFF..
.FF.FF.
FF...FF
F.....F
`,
  skills: `
...F...
..FFF..
.F.F.F.
FFFFFFF
.F.F.F.
..FFF..
...F...
`,
}

export function NavIcon({
  kind,
  size = 20,
  color = 'currentColor',
}: {
  kind: NavIconKind
  size?: number
  color?: string
}) {
  const map = NAV_MAPS[kind] || NAV_MAPS.hub
  return <PixelGrid map={map} palette={{ F: color }} scale={Math.ceil(size / 7)} />
}
