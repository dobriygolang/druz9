import { PixelGrid } from './PixelGrid'

export function Torch({ scale = 3 }: { scale?: number }) {
  const handle = `
...FF...
...FF...
.FFFFFF.
.F....F.
.F....F.
.FFFFFF.
..WWWW..
..WWWW..
`
  const flame = `
...RR...
..RYYR..
.RYYYYR.
.RYWWYR.
.RYYYYR.
..RYYR..
...RR...
`
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        className="rpg-flicker"
        style={{ position: 'absolute', left: -scale, top: -scale * 6 }}
      >
        <PixelGrid
          map={flame}
          palette={{ R: '#b8692a', Y: '#d48a3c', W: '#f6ead0' }}
          scale={scale}
        />
      </div>
      <PixelGrid map={handle} palette={{ F: '#5a3f27', W: '#3b2a1a' }} scale={scale} />
      <div
        style={{
          position: 'absolute',
          width: scale * 24,
          height: scale * 24,
          left: -scale * 8,
          top: -scale * 14,
          background:
            'radial-gradient(guild, rgba(233,184,102,0.5) 0%, transparent 70%)',
          pointerEvents: 'none',
          animation: 'rpg-flicker 1.4s ease-in-out infinite',
        }}
      />
    </div>
  )
}

export function Bookshelf({ scale = 3 }: { scale?: number }) {
  const map = `
FFFFFFFFFFFF
FBRRBGGBBRRF
FBRRBGGBBRRF
FBRRBGGBBRRF
FFFFFFFFFFFF
FRRBBRRBGGBF
FRRBBRRBGGBF
FRRBBRRBGGBF
FFFFFFFFFFFF
FGGRRBBRRBBF
FGGRRBBRRBBF
FGGRRBBRRBBF
FFFFFFFFFFFF
`
  return (
    <PixelGrid
      map={map}
      palette={{ F: '#3b2a1a', B: '#5a3f27', R: '#b8692a', G: '#3d6149' }}
      scale={scale}
    />
  )
}

export function Chest({ scale = 3, open = false }: { scale?: number; open?: boolean }) {
  const map = open
    ? `
.FFFFFFFFF.
FGGGGGGGGGF
F.YYYYYYY.F
F.YYYYYYY.F
FBBBBBBBBBF
FBGGBBBGGBF
FBBBBBBBBBF
FBBBBBBBBBF
FFFFFFFFFFF
`
    : `
.FFFFFFFFF.
FBBBBBBBBBF
FBGGBBBGGBF
FBBBBBBBBBF
FFFFFFFFFFF
FBBBBBBBBBF
FBGGBBBGGBF
FBBBBBBBBBF
FFFFFFFFFFF
`
  return (
    <PixelGrid
      map={map}
      palette={{ F: '#3b2a1a', B: '#7a593a', G: '#d48a3c', Y: '#e9b866' }}
      scale={scale}
    />
  )
}

export function Banner({
  scale = 3,
  crest = '★',
  color = '#3d6149',
}: {
  scale?: number
  crest?: string
  color?: string
}) {
  const map = `
FFFFFFFFF
FRRRRRRRF
FR......RF
FR......RF
FR......RF
FR......RF
FR......RF
FR......RF
.F......F.
..F....F..
...F..F...
....FF....
`
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <PixelGrid map={map} palette={{ F: '#3b2a1a', R: color }} scale={scale} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: scale * 3,
          textAlign: 'center',
          fontFamily: 'Pixelify Sans, Unbounded, monospace',
          fontSize: scale * 4,
          color: '#e9b866',
          fontWeight: 700,
          pointerEvents: 'none',
        }}
      >
        {crest}
      </div>
    </div>
  )
}

export function Rug({ scale = 3, w = 30 }: { scale?: number; w?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: scale,
            width: scale * w,
            background:
              i === 0 || i === 3
                ? '#5a3f27'
                : i === 1
                  ? '#b8692a'
                  : '#d48a3c',
            borderLeft: `${scale}px solid #3b2a1a`,
            borderRight: `${scale}px solid #3b2a1a`,
            boxSizing: 'border-box',
          }}
        />
      ))}
    </div>
  )
}

export function PixelWindow({
  scale = 3,
  night = false,
}: {
  scale?: number
  night?: boolean
}) {
  const map = `
FFFFFFFFFFF
FBBBBGBBBBF
FBBBBGBBBBF
FBBBBGBBBBF
FGGGGGGGGGF
FBBBBGBBBBF
FBBBBGBBBBF
FBBBBGBBBBF
FFFFFFFFFFF
`
  const palette = night
    ? { F: '#3b2a1a', B: '#2a3a5a', G: '#5a3f27' }
    : { F: '#3b2a1a', B: '#8fb8d4', G: '#5a3f27' }
  return <PixelGrid map={map} palette={palette} scale={scale} />
}

export function Fireplace({ scale = 3 }: { scale?: number }) {
  const frame = `
FFFFFFFFFFF
FSSSSSSSSSF
FSKKKKKKKSF
FSKRRYRKKSF
FSKRYWYRKSF
FSKKRRRKKSF
FSSSSSSSSSF
FFFFFFFFFFF
`
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <PixelGrid
        map={frame}
        palette={{
          F: '#3b2a1a',
          S: '#5a3f27',
          K: '#1a140e',
          R: '#b8692a',
          Y: '#d48a3c',
          W: '#e9b866',
        }}
        scale={scale}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(guild at 50% 60%, rgba(233,184,102,0.4), transparent 60%)',
          pointerEvents: 'none',
          animation: 'rpg-flicker 1.4s ease-in-out infinite',
        }}
      />
    </div>
  )
}

export function Statue({
  scale = 3,
  color = '#9fb89a',
}: {
  scale?: number
  color?: string
}) {
  const map = `
..SSSS..
.SSSSSS.
.SFFFFS.
.SFKKFS.
.SFFFFS.
..SBBS..
.SSBBSS.
SSSSSSSS
SSBBBBSS
SSBBBBSS
PPPPPPPP
`
  return (
    <PixelGrid
      map={map}
      palette={{ S: color, F: '#dcc690', K: '#3b2a1a', B: '#5a3f27', P: '#7a593a' }}
      scale={scale}
    />
  )
}
