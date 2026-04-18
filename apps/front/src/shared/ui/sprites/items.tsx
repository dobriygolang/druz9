import { PixelGrid } from './PixelGrid'

export type TrophyTier = 'gold' | 'silver' | 'bronze'

export function Trophy({
  scale = 3,
  tier = 'gold',
}: {
  scale?: number
  tier?: TrophyTier
}) {
  const c = tier === 'gold' ? '#d48a3c' : tier === 'silver' ? '#9fb89a' : '#b8692a'
  const h = tier === 'gold' ? '#e9b866' : tier === 'silver' ? '#dcc690' : '#d48a3c'
  const map = `
.CCCCCCC.
CHHHHHHHC
CHHCCCHHC
CHHHHHHHC
.CCCCCCC.
....C....
....C....
..CCCCC..
.CCCCCCC.
`
  return <PixelGrid map={map} palette={{ C: c, H: h }} scale={scale} />
}

export function PixelCoin({ scale = 2 }: { scale?: number }) {
  const map = `
.FFFF.
FHHHHF
FHGGHF
FHGGHF
FHHHHF
.FFFF.
`
  return (
    <PixelGrid
      map={map}
      palette={{ F: '#3b2a1a', H: '#e9b866', G: '#b8692a' }}
      scale={scale}
    />
  )
}

export function Sword({ scale = 3 }: { scale?: number }) {
  const map = `
....SS....
....SS....
....SS....
...WSSW...
...WSSW...
...WSSW...
...WSSW...
.HHHSSHHH.
.HHHSSHHH.
...GGGG...
...GGGG...
....BB....
....BB....
`
  return (
    <PixelGrid
      map={map}
      palette={{
        S: '#dcc690',
        W: '#9fb89a',
        H: '#7a593a',
        G: '#b8692a',
        B: '#3b2a1a',
      }}
      scale={scale}
    />
  )
}

export function Potion({
  scale = 3,
  color = '#b8692a',
}: {
  scale?: number
  color?: string
}) {
  const map = `
..BBB..
..BWB..
..BWB..
.BBBBB.
BCCCCCB
BCWCCCB
BCCCCCB
BCCCCCB
.BBBBB.
`
  return (
    <PixelGrid
      map={map}
      palette={{ B: '#3b2a1a', W: '#dcc690', C: color }}
      scale={scale}
    />
  )
}
