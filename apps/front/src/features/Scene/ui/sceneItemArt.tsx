import type { ReactNode } from 'react'
import {
  Banner,
  Bookshelf,
  Chest,
  Fireplace,
  PixelWindow,
  RavenPet,
  Rug,
  SlimePet,
  SpiritOrb,
  Statue,
  Sword,
  Torch,
  Trophy,
} from '@/shared/ui/sprites'

const SPRITES: Record<string, (scale: number) => ReactNode> = {
  banner: (scale) => <Banner scale={scale} color="#7a3d12" />,
  bookshelf: (scale) => <Bookshelf scale={scale} />,
  chest: (scale) => <Chest scale={scale} open />,
  fireplace: (scale) => <Fireplace scale={scale} />,
  pixelwindow: (scale) => <PixelWindow scale={scale} />,
  ravenpet: (scale) => <RavenPet scale={scale} />,
  rug: (scale) => <Rug scale={scale} w={14} />,
  slimepet: (scale) => <SlimePet scale={scale} />,
  spiritorb: (scale) => <SpiritOrb scale={scale} />,
  statue: (scale) => <Statue scale={scale} />,
  sword: (scale) => <Sword scale={scale} />,
  torch: (scale) => <Torch scale={scale} />,
  trophy: (scale) => <Trophy scale={scale} tier="gold" />,
  victorypillar: (scale) => <Statue scale={scale} color="#dcc690" />,
}

function spriteKey(ref: string): string {
  return ref.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function isImageRef(ref?: string): ref is string {
  return Boolean(ref && (ref.startsWith('/') || ref.startsWith('http') || ref.startsWith('data:')))
}

export function renderSceneItemArt(iconRef?: string, label?: string, scale = 3): ReactNode {
  if (isImageRef(iconRef)) {
    return <img src={iconRef} alt={label ?? ''} draggable={false} style={{ width: '100%', display: 'block', pointerEvents: 'none' }} />
  }
  const render = iconRef ? SPRITES[spriteKey(iconRef)] : null
  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
      {render ? render(scale) : <Trophy scale={scale} tier="gold" />}
    </div>
  )
}
