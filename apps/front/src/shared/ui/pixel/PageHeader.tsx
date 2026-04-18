import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingBottom: 14,
        borderBottom: '3px dashed var(--ink-3)',
        gap: 16,
      }}
    >
      <div style={{ minWidth: 0 }}>
        {eyebrow && (
          <div
            className="font-silkscreen uppercase"
            style={{ color: 'var(--ember-1)', fontSize: 11, letterSpacing: '0.08em' }}
          >
            {eyebrow}
          </div>
        )}
        <h1
          className="font-display"
          style={{ margin: '4px 0 2px', fontSize: 32, fontWeight: 700, lineHeight: 1.1 }}
        >
          {title}
        </h1>
        {subtitle && (
          <div style={{ color: 'var(--ink-2)', maxWidth: 560, fontSize: 14 }}>{subtitle}</div>
        )}
      </div>
      {right}
    </div>
  )
}
