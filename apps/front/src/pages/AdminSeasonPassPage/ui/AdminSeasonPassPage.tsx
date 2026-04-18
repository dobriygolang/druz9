import { useEffect, useState } from 'react'
import { adminApi } from '@/features/Admin/api/adminApi'
import { Panel, RpgButton } from '@/shared/ui/pixel'

interface SeasonPassRow {
  id: string
  seasonNumber: number
  title: string
  subtitle: string
  startsAt: string
  endsAt: string
  maxTier: number
  xpPerTier: number
  premiumPriceGems: number
}

interface TierRow {
  tier: number
  freeRewardKind: number
  freeRewardAmount: number
  freeRewardLabel: string
  premiumRewardKind: number
  premiumRewardAmount: number
  premiumRewardLabel: string
}

const REWARD_KIND_LABELS: Record<number, string> = {
  0: '—', 1: 'Gold', 2: 'Gems', 3: 'XP', 4: 'Frame',
  5: 'Pet', 6: 'Emote', 7: 'Banner', 8: 'Aura', 9: 'Cosmetic',
}

const EMPTY_PASS: Omit<SeasonPassRow, 'id'> = {
  seasonNumber: 1, title: '', subtitle: '', startsAt: '', endsAt: '',
  maxTier: 40, xpPerTier: 500, premiumPriceGems: 950,
}

const EMPTY_TIER: TierRow = {
  tier: 1, freeRewardKind: 1, freeRewardAmount: 100, freeRewardLabel: '100 Gold',
  premiumRewardKind: 2, premiumRewardAmount: 10, premiumRewardLabel: '10 Gems',
}

export function AdminSeasonPassPage() {
  const [passes, setPasses] = useState<SeasonPassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [passDraft, setPassDraft] = useState<(SeasonPassRow | Omit<SeasonPassRow, 'id'>) | null>(null)
  const [tierEditor, setTierEditor] = useState<{ passId: string; tier: TierRow } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    setLoading(true)
    try {
      const rows = (await adminApi.listSeasonPasses()) as SeasonPassRow[]
      setPasses(rows)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  const savePass = async () => {
    if (!passDraft) return
    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        seasonNumber: (passDraft as SeasonPassRow).seasonNumber,
        title: passDraft.title,
        subtitle: passDraft.subtitle,
        startsAt: passDraft.startsAt,
        endsAt: passDraft.endsAt,
        maxTier: passDraft.maxTier,
        xpPerTier: passDraft.xpPerTier,
        premiumPriceGems: passDraft.premiumPriceGems,
      }
      const id = (passDraft as SeasonPassRow).id
      if (id) await adminApi.updateSeasonPass(id, payload)
      else await adminApi.createSeasonPass(payload)
      setPassDraft(null)
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'save failed')
    } finally {
      setSaving(false)
    }
  }

  const delPass = async (id: string) => {
    if (!confirm('Delete this season pass?')) return
    try {
      await adminApi.deleteSeasonPass(id)
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'delete failed')
    }
  }

  const saveTier = async () => {
    if (!tierEditor) return
    setSaving(true)
    setError(null)
    try {
      await adminApi.upsertSeasonPassTier(tierEditor.passId, tierEditor.tier.tier, {
        freeRewardKind: tierEditor.tier.freeRewardKind,
        freeRewardAmount: tierEditor.tier.freeRewardAmount,
        freeRewardLabel: tierEditor.tier.freeRewardLabel,
        premiumRewardKind: tierEditor.tier.premiumRewardKind,
        premiumRewardAmount: tierEditor.tier.premiumRewardAmount,
        premiumRewardLabel: tierEditor.tier.premiumRewardLabel,
      })
      setTierEditor(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'save tier failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Season Pass Admin</h2>
        <RpgButton onClick={() => setPassDraft({ ...EMPTY_PASS })} size="sm">+ New Pass</RpgButton>
      </div>

      {error && <div style={{ color: '#e74', marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ color: '#aaa' }}>Loading…</div>
      ) : passes.length === 0 ? (
        <Panel style={{ padding: 24, textAlign: 'center', color: '#aaa' }}>No season passes yet.</Panel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {passes.map(p => (
            <Panel key={p.id} style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>S{p.seasonNumber} — {p.title}</div>
                  <div style={{ color: '#aaa', fontSize: 13 }}>{p.subtitle}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    {p.startsAt?.slice(0, 10)} → {p.endsAt?.slice(0, 10)} · {p.maxTier} tiers · {p.xpPerTier} XP/tier · {p.premiumPriceGems}💎
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <RpgButton size="sm" onClick={() => setTierEditor({ passId: p.id, tier: { ...EMPTY_TIER } })}>+ Tier</RpgButton>
                  <RpgButton size="sm" variant="ghost" onClick={() => setPassDraft({ ...p })}>Edit</RpgButton>
                  <RpgButton size="sm" variant="ghost" onClick={() => delPass(p.id)}>Del</RpgButton>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* Pass create/edit modal */}
      {passDraft && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Panel style={{ padding: 24, width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px' }}>{(passDraft as SeasonPassRow).id ? 'Edit Pass' : 'New Pass'}</h3>
            {[
              ['Season #', 'seasonNumber', 'number'],
              ['Title', 'title', 'text'],
              ['Subtitle', 'subtitle', 'text'],
              ['Starts At (RFC3339)', 'startsAt', 'text'],
              ['Ends At (RFC3339)', 'endsAt', 'text'],
              ['Max Tier', 'maxTier', 'number'],
              ['XP per Tier', 'xpPerTier', 'number'],
              ['Premium Gems', 'premiumPriceGems', 'number'],
            ].map(([label, key, type]) => (
              <label key={key} style={{ display: 'block', marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 3 }}>{label}</div>
                <input
                  type={type}
                  value={String((passDraft as Record<string, unknown>)[key as string] ?? '')}
                  onChange={e => setPassDraft(prev => ({ ...prev!, [key as string]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                  style={{ width: '100%', background: '#1a1a2e', border: '1px solid #333', borderRadius: 4, padding: '6px 8px', color: '#fff' }}
                />
              </label>
            ))}
            {error && <div style={{ color: '#e74', marginBottom: 10 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <RpgButton size="sm" variant="ghost" onClick={() => setPassDraft(null)}>Cancel</RpgButton>
              <RpgButton size="sm" onClick={savePass} disabled={saving}>{saving ? 'Saving…' : 'Save'}</RpgButton>
            </div>
          </Panel>
        </div>
      )}

      {/* Tier upsert modal */}
      {tierEditor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Panel style={{ padding: 24, width: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px' }}>Upsert Tier</h3>
            <label style={{ display: 'block', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 3 }}>Tier #</div>
              <input type="number" value={tierEditor.tier.tier}
                onChange={e => setTierEditor(prev => prev && ({ ...prev, tier: { ...prev.tier, tier: Number(e.target.value) } }))}
                style={{ width: '100%', background: '#1a1a2e', border: '1px solid #333', borderRadius: 4, padding: '6px 8px', color: '#fff' }}
              />
            </label>
            {(['free', 'premium'] as const).map(track => (
              <div key={track} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#e9b866', marginBottom: 6, textTransform: 'capitalize' }}>{track} reward</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 8 }}>
                  <label>
                    <div style={{ fontSize: 11, color: '#aaa' }}>Kind</div>
                    <select
                      value={tierEditor.tier[`${track}RewardKind`]}
                      onChange={e => setTierEditor(prev => prev && ({ ...prev, tier: { ...prev.tier, [`${track}RewardKind`]: Number(e.target.value) } }))}
                      style={{ width: '100%', background: '#1a1a2e', border: '1px solid #333', borderRadius: 4, padding: '6px 4px', color: '#fff' }}
                    >
                      {Object.entries(REWARD_KIND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <label>
                    <div style={{ fontSize: 11, color: '#aaa' }}>Amount</div>
                    <input type="number" value={tierEditor.tier[`${track}RewardAmount`]}
                      onChange={e => setTierEditor(prev => prev && ({ ...prev, tier: { ...prev.tier, [`${track}RewardAmount`]: Number(e.target.value) } }))}
                      style={{ width: '100%', background: '#1a1a2e', border: '1px solid #333', borderRadius: 4, padding: '6px 4px', color: '#fff' }}
                    />
                  </label>
                  <label>
                    <div style={{ fontSize: 11, color: '#aaa' }}>Label</div>
                    <input type="text" value={tierEditor.tier[`${track}RewardLabel`]}
                      onChange={e => setTierEditor(prev => prev && ({ ...prev, tier: { ...prev.tier, [`${track}RewardLabel`]: e.target.value } }))}
                      style={{ width: '100%', background: '#1a1a2e', border: '1px solid #333', borderRadius: 4, padding: '6px 4px', color: '#fff' }}
                    />
                  </label>
                </div>
              </div>
            ))}
            {error && <div style={{ color: '#e74', marginBottom: 10 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <RpgButton size="sm" variant="ghost" onClick={() => setTierEditor(null)}>Cancel</RpgButton>
              <RpgButton size="sm" onClick={saveTier} disabled={saving}>{saving ? 'Saving…' : 'Save Tier'}</RpgButton>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
