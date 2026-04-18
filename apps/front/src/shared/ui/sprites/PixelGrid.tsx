import { memo, type CSSProperties } from 'react'

export interface PixelGridProps {
  map: string
  palette: Record<string, string>
  scale?: number
  style?: CSSProperties
  className?: string
}

export const PixelGrid = memo(function PixelGrid({
  map,
  palette,
  scale = 4,
  style,
  className,
}: PixelGridProps) {
  const rows = map.trim().split('\n')
  const h = rows.length
  const w = Math.max(...rows.map((r) => r.length))
  const cells: JSX.Element[] = []
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const ch = row[x] || '.'
      if (ch === '.' || ch === ' ') continue
      const fill = palette[ch]
      if (!fill) continue
      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />)
    }
  })
  return (
    <svg
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      className={className}
      style={{ imageRendering: 'pixelated', display: 'block', ...style }}
    >
      {cells}
    </svg>
  )
})
