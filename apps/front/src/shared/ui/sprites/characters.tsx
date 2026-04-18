import { PixelGrid } from './PixelGrid'

/* -------- Hero — cloaked adventurer -------- */
const HERO_MAP = `
........HHHHHHHH........
......HHSSSSSSSSHH......
.....HSSFFFSSFFFSSH.....
.....HSFFFFFSFFFSFH.....
.....HSFKKFSSFFKKFH.....
.....HSSFFSFFSFFFSH.....
.....HHSSSSMMSSSSHH.....
......HHCCCCCCHH........
.....CCCCGGCCCCCCC......
....CCCBBBGGBBBCCCCC....
....CBBBBBGGBBBBBBC.....
....CBBBLBBGBBLBBBC.....
....CBBBBBGGBBBBBBC.....
....CBBBBBGGBBBBBBC.....
.....CCCBBGGBBBCCC......
......PPPPGGPPPPPP......
.....PPPPPPPPPPPPP......
.....PP...PP..PPPP......
.....BB...BB...BBB......
.....BB...BB...BBB......
`

const HERO_PALETTE: Record<string, string> = {
  H: '#3b2a1a',
  S: '#5a3f27',
  F: '#e4c8a0',
  K: '#3b2a1a',
  M: '#b8692a',
  C: '#7a593a',
  B: '#3d6149',
  G: '#d48a3c',
  L: '#6b8a6a',
  P: '#3b2a1a',
}

export type HeroPose = 'idle' | 'wave' | 'trophy'

export function Hero({
  scale = 4,
  pose = 'idle',
  className = '',
}: {
  scale?: number
  pose?: HeroPose
  className?: string
}) {
  return (
    <div
      className={`hero-sprite ${className}`}
      style={{ display: 'inline-block', position: 'relative' }}
    >
      <div className="rpg-idle-bob">
        <PixelGrid map={HERO_MAP} palette={HERO_PALETTE} scale={scale} />
      </div>
      {pose === 'wave' && (
        <div style={{ position: 'absolute', top: scale * 5, right: -scale * 3 }}>
          <PixelGrid
            map={`..BB..\n.BBBB.\nBBBBBB\n.BBBB.`}
            palette={{ B: '#e4c8a0' }}
            scale={scale}
          />
        </div>
      )}
      {pose === 'trophy' && (
        <div style={{ position: 'absolute', top: -scale * 3, left: scale * 6 }}>
          <PixelGrid
            map={`EEEEE\nEGGGE\nEGGGE\n.EEE.\n..G..\n.GGG.`}
            palette={{ E: '#7a3d12', G: '#e9b866' }}
            scale={scale}
          />
        </div>
      )}
    </div>
  )
}

/* -------- Companion pets -------- */
export function SlimePet({ scale = 3 }: { scale?: number }) {
  const map = `
...BBBB...
..BGGGGB..
.BGGWGGGB.
BGGGGGGGB
BGGKGGKGB
BGGGGGGGB
.BBBBBBB.
`
  const palette = { B: '#2d4a35', G: '#6b8a6a', W: '#9fb89a', K: '#1a140e' }
  return (
    <div className="rpg-idle-bob">
      <PixelGrid map={map} palette={palette} scale={scale} />
    </div>
  )
}

export function RavenPet({ scale = 3 }: { scale?: number }) {
  const map = `
...BBBB..
..BBBBBB.
.BBBBBBBB
BBOBBBBB.
BBBBBBB..
.BBBBB...
..YY.....
`
  const palette = { B: '#1a140e', O: '#e9b866', Y: '#b8692a' }
  return (
    <div className="rpg-idle-bob">
      <PixelGrid map={map} palette={palette} scale={scale} />
    </div>
  )
}

export function SpiritOrb({ scale = 3 }: { scale?: number }) {
  const map = `
..BBBB..
.BGGGGB.
BGGWGGGB
BGWWWGGB
BGGGGGGB
.BGGGGB.
..BBBB..
`
  const palette = { B: '#3b2a1a', G: '#b8692a', W: '#e9b866' }
  return (
    <div
      className="rpg-idle-bob"
      style={{ filter: 'drop-shadow(0 0 6px rgba(233, 184, 102, 0.7))' }}
    >
      <PixelGrid map={map} palette={palette} scale={scale} />
    </div>
  )
}
