import { useState } from 'react'
import { adminApi } from '@/features/Admin/api/adminApi'
import { Panel, RpgButton } from '@/shared/ui/pixel'

export function AdminNotificationsPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [deepLink, setDeepLink] = useState('')
  const [audience, setAudience] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    setSending(true)
    setError(null)
    setResult(null)
    try {
      const ids = audience.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
      const r = await adminApi.broadcastNotification(title, body, deepLink, ids)
      setResult(`Queued for ${r.delivered} users`)
      setTitle(''); setBody(''); setDeepLink(''); setAudience('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'broadcast failed')
    } finally {
      setSending(false)
    }
  }

  const disabled = sending || !title.trim() || !body.trim() || !audience.trim()

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 className="font-display" style={{ fontSize: 22 }}>Notifications broadcast</h1>
      <Panel variant="recessed" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Body">
          <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <Field label="Deep link (optional)"><input value={deepLink} onChange={(e) => setDeepLink(e.target.value)} placeholder="/events/current" /></Field>
        <Field label="Target user IDs (UUIDs, comma/space separated)">
          <textarea rows={3} value={audience} onChange={(e) => setAudience(e.target.value)} />
        </Field>
        <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>
          Broadcast-to-all is disabled by design — paste explicit UUIDs to avoid accidental fan-out.
        </div>
        {error && <div style={{ color: '#c85050' }}>{error}</div>}
        {result && <div style={{ color: '#3d6149' }}>{result}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <RpgButton variant="primary" size="sm" disabled={disabled} onClick={send}>
            {sending ? 'Sending…' : 'Send broadcast'}
          </RpgButton>
        </div>
      </Panel>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
      <span className="font-silkscreen uppercase" style={{ color: 'var(--ink-2)', letterSpacing: '0.1em', fontSize: 10 }}>{label}</span>
      {children}
    </label>
  )
}
