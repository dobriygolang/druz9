interface SkeletonProps {
  width?: number | string
  height?: number | string
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 18, style }: SkeletonProps) {
  return (
    <div
      className="rpg-skeleton"
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      className="rpg-panel"
      style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, ...style }}
      aria-hidden="true"
    >
      <Skeleton height={12} width="55%" />
      <Skeleton height={18} width="80%" />
      <Skeleton height={11} width="40%" />
    </div>
  )
}

export function SkeletonRow({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: '1px dashed var(--ink-3)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        ...style,
      }}
      aria-hidden="true"
    >
      <Skeleton width={28} height={28} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton height={13} width="60%" />
        <Skeleton height={10} width="35%" />
      </div>
      <Skeleton width={50} height={22} style={{ flexShrink: 0 }} />
    </div>
  )
}
