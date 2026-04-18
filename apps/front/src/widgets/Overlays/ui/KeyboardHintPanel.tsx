import { RpgButton } from '@/shared/ui/pixel'

const SHORTCUTS = [
  { keys: 'g h', label: 'Go to Hub' },
  { keys: 'g t', label: 'Go to Training' },
  { keys: 'g a', label: 'Go to Arena' },
  { keys: 'g p', label: 'Go to Profile' },
  { keys: 'g g', label: 'Go to Guild' },
  { keys: 'g s', label: 'Go to Social' },
  { keys: 'g e', label: 'Go to Events' },
  { keys: 'g l', label: 'Go to Leaderboards' },
  { keys: 'g m', label: 'Go to Map' },
  { keys: 'g i', label: 'Go to Inbox' },
  { keys: '/',   label: 'Search' },
  { keys: '?',   label: 'Show this panel' },
]

export function KeyboardHintPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="rpg-modal-backdrop" onClick={onClose}>
      <div
        className="rpg-modal rpg-panel rpg-panel--nailed"
        style={{ padding: 28, maxWidth: 460 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em' }}>
              KEYBOARD SHORTCUTS
            </div>
            <h3 className="font-display" style={{ fontSize: 18, margin: 0 }}>Quick travel</h3>
          </div>
          <RpgButton size="sm" variant="ghost" onClick={onClose}>✕</RpgButton>
        </div>

        <div className="rpg-divider" style={{ marginBottom: 14 }} />

        {SHORTCUTS.map(({ keys, label }) => (
          <div
            key={keys}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: '1px dashed var(--ink-3)',
            }}
          >
            <span style={{ fontSize: 13 }}>{label}</span>
            <span
              className="font-silkscreen"
              style={{
                background: 'var(--ink-0)',
                color: 'var(--parch-0)',
                padding: '3px 8px',
                fontSize: 10,
                border: '2px solid var(--ink-1)',
                boxShadow: '2px 2px 0 var(--ember-1)',
              }}
            >
              {keys}
            </span>
          </div>
        ))}

        <div style={{ marginTop: 14, fontSize: 11, color: 'var(--ink-2)' }}>
          Shortcuts inactive when typing in editor or input fields.
        </div>
      </div>
    </div>
  )
}
