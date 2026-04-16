import { useMemo } from 'react'
import { cn } from '../lib/cn'

interface PixelGardenProps {
  /** Number of skills/trees to show (0-8) */
  treeCount?: number
  /** Streak days — affects water/rain */
  streak?: number
  /** Level — affects ground richness */
  level?: number
  className?: string
}

/**
 * Pixel-art garden visualization for user profile.
 * Trees grow based on skill count, ground gets richer with level.
 */
export function PixelGarden({ treeCount = 3, streak = 0, level = 1, className }: PixelGardenProps) {
  const px = 4 // pixel size
  const width = 64 * px // 256px
  const height = 20 * px // 80px

  const trees = useMemo(() => {
    const result: { x: number; height: number; type: 'small' | 'medium' | 'large' }[] = []
    const count = Math.min(treeCount, 8)
    const spacing = width / (count + 1)

    for (let i = 0; i < count; i++) {
      const x = Math.round(spacing * (i + 1) / px)
      const h = i < 2 ? 'large' : i < 5 ? 'medium' : 'small'
      result.push({ x, height: 0, type: h })
    }
    return result
  }, [treeCount, width])

  const groundColor = level >= 10 ? '#059669' : level >= 5 ? '#10B981' : '#34D399'
  const groundDark = level >= 10 ? '#047857' : level >= 5 ? '#059669' : '#10B981'
  const dirtColor = '#8B7355'
  const dirtDark = '#6B5B45'
  const trunkColor = '#8B7355'
  const leafColor = '#059669'
  const leafLight = '#34D399'
  const leafDark = '#047857'
  const flowerColor = '#F472B6'
  const waterColor = '#38BDF8'

  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect key={`${x}-${y}-${fill}-${w}`} x={x * px} y={y * px} width={w * px} height={h * px} fill={fill} />
  )

  const renderTree = (treeX: number, type: 'small' | 'medium' | 'large', idx: number) => {
    const base = 15 // ground level
    const rects: JSX.Element[] = []
    const k = `t${idx}`

    if (type === 'large') {
      // Trunk
      rects.push(<rect key={`${k}tr`} x={(treeX) * px} y={(base - 5) * px} width={px} height={5 * px} fill={trunkColor} />)
      // Canopy
      rects.push(<rect key={`${k}c1`} x={(treeX - 2) * px} y={(base - 7) * px} width={5 * px} height={2 * px} fill={leafColor} />)
      rects.push(<rect key={`${k}c2`} x={(treeX - 3) * px} y={(base - 9) * px} width={7 * px} height={2 * px} fill={leafColor} />)
      rects.push(<rect key={`${k}c3`} x={(treeX - 2) * px} y={(base - 11) * px} width={5 * px} height={2 * px} fill={leafLight} />)
      rects.push(<rect key={`${k}c4`} x={(treeX - 1) * px} y={(base - 12) * px} width={3 * px} height={1 * px} fill={leafDark} />)
    } else if (type === 'medium') {
      rects.push(<rect key={`${k}tr`} x={(treeX) * px} y={(base - 3) * px} width={px} height={3 * px} fill={trunkColor} />)
      rects.push(<rect key={`${k}c1`} x={(treeX - 1) * px} y={(base - 5) * px} width={3 * px} height={2 * px} fill={leafColor} />)
      rects.push(<rect key={`${k}c2`} x={(treeX) * px} y={(base - 6) * px} width={1 * px} height={1 * px} fill={leafLight} />)
    } else {
      // Small — sprout
      rects.push(<rect key={`${k}tr`} x={(treeX) * px} y={(base - 2) * px} width={px} height={2 * px} fill={leafColor} />)
      rects.push(<rect key={`${k}l1`} x={(treeX - 1) * px} y={(base - 2) * px} width={px} height={px} fill={leafLight} />)
      rects.push(<rect key={`${k}l2`} x={(treeX + 1) * px} y={(base - 3) * px} width={px} height={px} fill={leafLight} />)
    }

    // Random flower near base
    if (idx % 3 === 0) {
      rects.push(<rect key={`${k}f`} x={(treeX + 2) * px} y={(base - 1) * px} width={px} height={px} fill={flowerColor} />)
    }

    return rects
  }

  // Water drops if streak > 0
  const waterDrops = streak > 0 ? [
    r(8, 3, 1, 1, waterColor),
    r(24, 2, 1, 1, waterColor),
    r(40, 4, 1, 1, waterColor),
    r(56, 3, 1, 1, waterColor),
  ].slice(0, Math.min(streak, 4)) : []

  return (
    <div className={cn('relative', className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ imageRendering: 'pixelated' }}
        aria-label="Your pixel garden"
        className="pixel-border rounded-lg"
      >
        {/* Sky */}
        <rect width={width} height={15 * px} fill="#ECFDF5" className="dark:fill-[#0B1210]" />

        {/* Ground layers */}
        <rect y={15 * px} width={width} height={2 * px} fill={groundColor} />
        <rect y={17 * px} width={width} height={1 * px} fill={groundDark} />
        <rect y={18 * px} width={width} height={2 * px} fill={dirtColor} />

        {/* Ground texture */}
        {Array.from({ length: 16 }, (_, i) => (
          <rect key={`gt${i}`} x={i * 4 * px} y={15 * px} width={px} height={px} fill={leafLight} opacity={0.4} />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={`gd${i}`} x={(i * 8 + 2) * px} y={18 * px} width={2 * px} height={px} fill={dirtDark} />
        ))}

        {/* Trees */}
        {trees.map((tree, i) => renderTree(tree.x, tree.type, i))}

        {/* Water drops */}
        {waterDrops}

        {/* Sun */}
        <rect x={56 * px} y={1 * px} width={3 * px} height={3 * px} fill="#FBBF24" />
        <rect x={55 * px} y={2 * px} width={px} height={px} fill="#FDE68A" />
        <rect x={60 * px} y={2 * px} width={px} height={px} fill="#FDE68A" />
      </svg>
    </div>
  )
}
