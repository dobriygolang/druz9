import { useToasts } from '@/shared/lib/toasts'

export function ToastStack() {
  const { toasts, dismiss } = useToasts()
  if (!toasts.length) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 110,
        right: 20,
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rpg-panel rpg-panel--nailed"
          style={{
            padding: '12px 16px',
            minWidth: 280,
            maxWidth: 340,
            animation: 'rpg-toast-in 0.2s ease-out',
            cursor: 'pointer',
            pointerEvents: 'all',
          }}
          onClick={() => dismiss(t.id)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                background: t.color ?? 'var(--ember-1)',
                border: '3px solid var(--ink-0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--parch-0)',
                fontFamily: 'Silkscreen, Unbounded, monospace',
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              {t.icon ?? '✦'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, color: 'var(--ember-1)', letterSpacing: '0.08em' }}
              >
                {t.kind}
              </div>
              <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 14, lineHeight: 1.2 }}>
                {t.title}
              </div>
              {t.body && (
                <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>{t.body}</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
