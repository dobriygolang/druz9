import { cn } from '../lib/cn'

interface PixelGardenerProps {
  mood?: 'idle' | 'happy' | 'watering'
  size?: number
  className?: string
}

/**
 * Pixel-art gardener mascot — pure SVG, no external assets.
 * 16x16 pixel grid scaled up. Three moods:
 *  - idle: standing with shovel
 *  - happy: arms up (celebration)
 *  - watering: holding watering can
 */
export function PixelGardener({ mood = 'idle', size = 64, className }: PixelGardenerProps) {
  const px = size / 16

  // Colors
  const skin = '#F4C99B'
  const hat = '#059669'
  const hatDark = '#047857'
  const shirt = '#34D399'
  const pants = '#5B4A3F'
  const boots = '#3D2E24'
  const tool = '#8B7355'
  const toolHead = '#94A3B8'
  const eye = '#1E1E1E'
  const cheek = '#E8A87C'

  const r = (x: number, y: number, w = 1, h = 1, fill: string) => (
    <rect key={`${x}-${y}-${fill}`} x={x * px} y={y * px} width={w * px} height={h * px} fill={fill} />
  )

  const hat_pixels = [
    r(5, 0, 6, 1, hat),       // hat brim top
    r(4, 1, 8, 1, hat),       // hat brim
    r(5, 2, 6, 1, hatDark),   // hat band
    r(6, 3, 4, 1, hat),       // hat crown
  ]

  const face_pixels = [
    r(5, 4, 6, 1, skin),      // forehead
    r(5, 5, 6, 1, skin),      // face upper
    r(6, 5, 1, 1, eye),       // left eye
    r(9, 5, 1, 1, eye),       // right eye
    r(5, 6, 6, 1, skin),      // face mid
    r(5, 6, 1, 1, cheek),     // left cheek
    r(10, 6, 1, 1, cheek),    // right cheek
    r(7, 6, 2, 1, '#D4956B'), // mouth/smile
    r(5, 7, 6, 1, skin),      // chin
  ]

  const body_idle = [
    r(5, 8, 6, 1, shirt),     // shoulders
    r(4, 8, 1, 1, skin),      // left hand
    r(11, 8, 1, 1, skin),     // right hand
    r(5, 9, 6, 1, shirt),     // torso
    r(5, 10, 6, 1, shirt),    // torso bottom
    r(5, 11, 6, 1, pants),    // belt
    r(5, 12, 3, 1, pants),    // left leg
    r(8, 12, 3, 1, pants),    // right leg
    r(5, 13, 3, 1, pants),    // left leg lower
    r(8, 13, 3, 1, pants),    // right leg lower
    r(5, 14, 3, 1, boots),    // left boot
    r(8, 14, 3, 1, boots),    // right boot
    r(4, 14, 1, 1, boots),    // left boot toe
    r(11, 14, 1, 1, boots),   // right boot toe
    // Shovel
    r(12, 6, 1, 8, tool),     // shovel handle
    r(11, 13, 3, 2, toolHead),// shovel head
  ]

  const body_happy = [
    r(5, 8, 6, 1, shirt),
    r(3, 6, 1, 1, skin),      // left hand raised
    r(3, 7, 1, 1, skin),
    r(12, 6, 1, 1, skin),     // right hand raised
    r(12, 7, 1, 1, skin),
    r(5, 9, 6, 1, shirt),
    r(4, 8, 1, 2, shirt),     // left arm up
    r(11, 8, 1, 2, shirt),    // right arm up
    r(5, 10, 6, 1, shirt),
    r(5, 11, 6, 1, pants),
    r(5, 12, 3, 1, pants),
    r(8, 12, 3, 1, pants),
    r(5, 13, 3, 1, pants),
    r(8, 13, 3, 1, pants),
    r(5, 14, 3, 1, boots),
    r(8, 14, 3, 1, boots),
    r(4, 14, 1, 1, boots),
    r(11, 14, 1, 1, boots),
    // Stars around
    r(2, 4, 1, 1, '#FBBF24'),
    r(13, 3, 1, 1, '#FBBF24'),
    r(1, 7, 1, 1, '#FBBF24'),
  ]

  const body_watering = [
    r(5, 8, 6, 1, shirt),
    r(5, 9, 6, 1, shirt),
    r(5, 10, 6, 1, shirt),
    r(11, 8, 1, 1, skin),     // right hand holding can
    r(11, 9, 1, 1, skin),
    r(4, 8, 1, 1, skin),      // left hand
    r(5, 11, 6, 1, pants),
    r(5, 12, 3, 1, pants),
    r(8, 12, 3, 1, pants),
    r(5, 13, 3, 1, pants),
    r(8, 13, 3, 1, pants),
    r(5, 14, 3, 1, boots),
    r(8, 14, 3, 1, boots),
    r(4, 14, 1, 1, boots),
    r(11, 14, 1, 1, boots),
    // Watering can
    r(12, 7, 3, 2, toolHead),
    r(12, 9, 1, 1, toolHead),
    r(14, 6, 1, 1, toolHead),  // spout
    // Water drops
    r(14, 8, 1, 1, '#0EA5E9'),
    r(13, 9, 1, 1, '#0EA5E9'),
    r(15, 9, 1, 1, '#38BDF8'),
    r(14, 10, 1, 1, '#38BDF8'),
  ]

  const bodyPixels = mood === 'happy' ? body_happy : mood === 'watering' ? body_watering : body_idle

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('pixel-art', className)}
      style={{ imageRendering: 'pixelated' }}
      aria-label="Pixel gardener mascot"
    >
      {hat_pixels}
      {face_pixels}
      {bodyPixels}
    </svg>
  )
}
