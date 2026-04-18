import type { ReactNode } from 'react'

export function ComingSoon({
  title = 'Coming soon',
  note,
  children,
}: {
  title?: string
  note?: string
  children?: ReactNode
}) {
  return (
    <div className="rpg-panel rpg-panel--recessed" style={{ textAlign: 'center', padding: 40 }}>
      <div
        className="font-silkscreen uppercase"
        style={{ color: 'var(--ember-1)', fontSize: 11, letterSpacing: '0.1em' }}
      >
        Work in progress
      </div>
      <h2
        className="font-display"
        style={{ margin: '8px 0', fontSize: 28, color: 'var(--ink-0)' }}
      >
        {title}
      </h2>
      {note && (
        <p style={{ color: 'var(--ink-2)', maxWidth: 520, margin: '0 auto 12px' }}>{note}</p>
      )}
      {children}
    </div>
  )
}
