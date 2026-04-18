import { useEffect, useState } from 'react'
import { adminApi } from '@/features/Admin/api/adminApi'
import { Panel, RpgButton } from '@/shared/ui/pixel'
import type { ShopItem } from '@/features/Shop/model/types'
import { ItemCategory, ItemCurrency, ItemRarity } from '@/features/Shop/model/types'

// Empty draft for "new item" mode. When editing an existing row the
// fields are pre-filled; category/rarity/currency fall back to
// UNCOMMON / COMMON / GOLD so a blank-out hitting the server uses sane
// defaults rather than UNSPECIFIED (which on the server means "no
// filter" for lists — storing it on a row would confuse the UI).
const EMPTY: ShopItem = {
  id: '',
  slug: '',
  name: '',
  description: '',
  category: ItemCategory.COSMETICS,
  rarity: ItemRarity.COMMON,
  currency: ItemCurrency.GOLD,
  price: 100,
  iconRef: 'Hero',
  accentColor: '#e9b866',
  isActive: true,
  isSeasonal: false,
  slot: '',
}

export function AdminShopPage() {
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<ShopItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    setLoading(true)
    try {
      const rows = (await adminApi.listShopItems()) as ShopItem[]
      setItems(rows)
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
        slug: draft.slug,
        name: draft.name,
        description: draft.description,
        category: draft.category,
        rarity: draft.rarity,
        currency: draft.currency,
        price: draft.price,
        iconRef: draft.iconRef,
        accentColor: draft.accentColor,
        isActive: draft.isActive,
        isSeasonal: draft.isSeasonal,
        slot: draft.slot ?? '',
      }
      if (draft.id) await adminApi.updateShopItem(draft.id, payload)
      else await adminApi.createShopItem(payload)
      setDraft(null)
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'save failed')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this item?')) return
    try {
      await adminApi.deleteShopItem(id)
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'delete failed')
    }
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="font-display" style={{ fontSize: 22 }}>Tavern / shop admin</h1>
        <RpgButton onClick={() => setDraft({ ...EMPTY })} size="sm" variant="primary">+ New item</RpgButton>
      </div>
      {error && <div style={{ color: '#c85050' }}>{error}</div>}
      <Panel variant="recessed">
        {loading ? <div>Loading…</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--ink-2)' }}>
                <th style={{ padding: 6 }}>Slug</th>
                <th style={{ padding: 6 }}>Name</th>
                <th style={{ padding: 6 }}>Cat</th>
                <th style={{ padding: 6 }}>Rarity</th>
                <th style={{ padding: 6 }}>Price</th>
                <th style={{ padding: 6 }}>Slot</th>
                <th style={{ padding: 6 }}>Active</th>
                <th style={{ padding: 6 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} style={{ borderTop: '1px solid var(--ink-3)' }}>
                  <td style={{ padding: 6, fontFamily: 'monospace' }}>{it.slug}</td>
                  <td style={{ padding: 6 }}>{it.name}</td>
                  <td style={{ padding: 6 }}>{ItemCategory[it.category] ?? it.category}</td>
                  <td style={{ padding: 6 }}>{ItemRarity[it.rarity] ?? it.rarity}</td>
                  <td style={{ padding: 6 }}>{it.price} {ItemCurrency[it.currency]}</td>
                  <td style={{ padding: 6 }}>{it.slot || '—'}</td>
                  <td style={{ padding: 6 }}>{it.isActive ? '✓' : '·'}</td>
                  <td style={{ padding: 6, display: 'flex', gap: 4 }}>
                    <RpgButton size="sm" onClick={() => setDraft({ ...it })}>Edit</RpgButton>
                    <RpgButton size="sm" variant="ghost" onClick={() => del(it.id)}>Del</RpgButton>
                  </td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr><td colSpan={8} style={{ padding: 12, textAlign: 'center', color: 'var(--ink-2)' }}>No items</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Panel>

      {draft && (
        <div
          className="rpg-modal-backdrop"
          onClick={() => setDraft(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 1000 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: '92%' }}>
            <Panel variant="default" style={{ padding: 18 }}>
              <h2 className="font-display" style={{ fontSize: 18, marginBottom: 12 }}>
                {draft.id ? 'Edit item' : 'New item'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Slug"><input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></Field>
                <Field label="Name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
                <Field label="Category">
                  <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: Number(e.target.value) as ItemCategory })}>
                    {Object.entries(ItemCategory).filter(([, v]) => typeof v === 'number').map(([k, v]) => (
                      <option key={k} value={v as number}>{k}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Rarity">
                  <select value={draft.rarity} onChange={(e) => setDraft({ ...draft, rarity: Number(e.target.value) as ItemRarity })}>
                    {Object.entries(ItemRarity).filter(([, v]) => typeof v === 'number').map(([k, v]) => (
                      <option key={k} value={v as number}>{k}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Currency">
                  <select value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: Number(e.target.value) as ItemCurrency })}>
                    {Object.entries(ItemCurrency).filter(([, v]) => typeof v === 'number').map(([k, v]) => (
                      <option key={k} value={v as number}>{k}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Price"><input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></Field>
                <Field label="Slot">
                  <select value={draft.slot ?? ''} onChange={(e) => setDraft({ ...draft, slot: e.target.value })}>
                    <option value="">— (not equippable)</option>
                    {['pose', 'pet', 'room', 'ambience', 'head', 'body', 'back', 'aura', 'frame'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Icon ref"><input value={draft.iconRef} onChange={(e) => setDraft({ ...draft, iconRef: e.target.value })} /></Field>
                <Field label="Accent color"><input value={draft.accentColor} onChange={(e) => setDraft({ ...draft, accentColor: e.target.value })} /></Field>
                <Field label="Active">
                  <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
                </Field>
                <Field label="Seasonal">
                  <input type="checkbox" checked={draft.isSeasonal} onChange={(e) => setDraft({ ...draft, isSeasonal: e.target.checked })} />
                </Field>
              </div>
              <Field label="Description">
                <textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} style={{ width: '100%' }} />
              </Field>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                <RpgButton size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancel</RpgButton>
                <RpgButton size="sm" variant="primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</RpgButton>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
      <span className="font-silkscreen uppercase" style={{ color: 'var(--ink-2)', letterSpacing: '0.1em' }}>{label}</span>
      {children}
    </label>
  )
}
