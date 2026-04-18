import { useEffect, useState } from 'react'
import { adminApi } from '@/features/Admin/api/adminApi'
import { Panel, RpgButton } from '@/shared/ui/pixel'

interface AIMentor {
  id: string
  name: string
  provider: string
  modelId: string
  tier: number
  promptTemplate: string
  isActive: boolean
}

const EMPTY: Omit<AIMentor, 'id'> = {
  name: '', provider: 'anthropic', modelId: 'claude-sonnet-4-6',
  tier: 0, promptTemplate: '', isActive: true,
}

export function AdminAIBotsPage() {
  const [mentors, setMentors] = useState<AIMentor[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<(AIMentor | Omit<AIMentor, 'id'>) | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    setLoading(true)
    try {
      const rows = (await adminApi.listAIMentors()) as AIMentor[]
      setMentors(rows)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        name: draft.name,
        provider: draft.provider,
        modelId: draft.modelId,
        tier: draft.tier,
        promptTemplate: draft.promptTemplate,
        isActive: draft.isActive,
      }
      const id = (draft as AIMentor).id
      if (id) await adminApi.updateAIMentor(id, payload)
      else await adminApi.createAIMentor(payload)
      setDraft(null)
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'save failed')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this AI mentor?')) return
    try {
      await adminApi.deleteAIMentor(id)
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'delete failed')
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 860 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>AI Mentors Admin</h2>
        <RpgButton onClick={() => setDraft({ ...EMPTY })} size="sm" variant="primary">+ New Mentor</RpgButton>
      </div>

      {error && <div style={{ color: '#e74', marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ color: '#aaa' }}>Loading…</div>
      ) : mentors.length === 0 ? (
        <Panel style={{ padding: 24, textAlign: 'center', color: '#aaa' }}>No AI mentors yet.</Panel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mentors.map(m => (
            <Panel key={m.id} style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>{m.name}</span>
                    <span style={{ fontSize: 11, background: m.tier === 0 ? '#2a3' : '#a63', borderRadius: 4, padding: '2px 6px', color: '#fff' }}>
                      {m.tier === 0 ? 'Free' : 'Premium'}
                    </span>
                    {!m.isActive && <span style={{ fontSize: 11, color: '#888' }}>(inactive)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                    {m.provider} / {m.modelId}
                  </div>
                  {m.promptTemplate && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 520 }}>
                      {m.promptTemplate}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <RpgButton size="sm" variant="ghost" onClick={() => setDraft({ ...m })}>Edit</RpgButton>
                  <RpgButton size="sm" variant="ghost" onClick={() => del(m.id)}>Del</RpgButton>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {draft && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Panel style={{ padding: 24, width: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px' }}>{(draft as AIMentor).id ? 'Edit Mentor' : 'New Mentor'}</h3>

            {[
              ['Name', 'name', 'text'],
              ['Provider', 'provider', 'text'],
              ['Model ID', 'modelId', 'text'],
            ].map(([label, key, type]) => (
              <label key={key} style={{ display: 'block', marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 3 }}>{label}</div>
                <input
                  type={type}
                  value={String((draft as Record<string, unknown>)[key] ?? '')}
                  onChange={e => setDraft(prev => ({ ...prev!, [key]: e.target.value }))}
                  style={{ width: '100%', background: '#1a1a2e', border: '1px solid #333', borderRadius: 4, padding: '6px 8px', color: '#fff' }}
                />
              </label>
            ))}

            <label style={{ display: 'block', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 3 }}>Tier</div>
              <select
                value={(draft as AIMentor).tier ?? 0}
                onChange={e => setDraft(prev => ({ ...prev!, tier: Number(e.target.value) }))}
                style={{ width: '100%', background: '#1a1a2e', border: '1px solid #333', borderRadius: 4, padding: '6px 8px', color: '#fff' }}
              >
                <option value={0}>0 — Free</option>
                <option value={1}>1 — Premium</option>
              </select>
            </label>

            <label style={{ display: 'block', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 3 }}>Prompt Template</div>
              <textarea
                rows={5}
                value={String((draft as Record<string, unknown>).promptTemplate ?? '')}
                onChange={e => setDraft(prev => ({ ...prev!, promptTemplate: e.target.value }))}
                style={{ width: '100%', background: '#1a1a2e', border: '1px solid #333', borderRadius: 4, padding: '6px 8px', color: '#fff', resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!(draft as AIMentor).isActive}
                onChange={e => setDraft(prev => ({ ...prev!, isActive: e.target.checked }))}
              />
              <span style={{ fontSize: 13 }}>Active</span>
            </label>

            {error && <div style={{ color: '#e74', marginBottom: 10 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <RpgButton size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancel</RpgButton>
              <RpgButton size="sm" variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</RpgButton>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
