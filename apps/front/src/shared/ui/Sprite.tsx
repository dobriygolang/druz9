/**
 * Generic pixel-art sprite renderer.
 * Takes a 2D character grid + color palette and renders crisp SVG pixel art.
 * Used across all RPG scene pages (Camp, Training Grounds, Guild Hall, etc.)
 */

interface SpriteProps {
  data: string[]
  palette: Record<string, string>
  pixel?: number
  className?: string
  style?: React.CSSProperties
}

export function Sprite({
  data, palette, pixel = 4, className, style,
}: SpriteProps) {
  const w = Math.max(...data.map(r => r.length))
  const h = data.length
  const rects: React.ReactNode[] = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < data[y].length; x++) {
      const c = palette[data[y][x]]
      if (c) rects.push(
        <rect key={`${x}.${y}`} x={x * pixel} y={y * pixel}
          width={pixel} height={pixel} fill={c} />,
      )
    }
  }
  return (
    <svg width={w * pixel} height={h * pixel}
      viewBox={`0 0 ${w * pixel} ${h * pixel}`}
      className={className} style={{ imageRendering: 'pixelated', ...style }}>
      {rects}
    </svg>
  )
}
