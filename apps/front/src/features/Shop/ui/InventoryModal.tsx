import { useEffect, useMemo, useState } from 'react'
import { Panel, RpgButton } from '@/shared/ui/pixel'
import { shopApi } from '../api/shopApi'
import type { OwnedItem } from '../model/types'

// Known slot labels — unknown slots still render with raw key.
const SLOT_LABEL: Record<string, string> = {
  pose: 'Pose',
  pet: 'Companion',
  room: 'Room',
  ambience: 'Ambience',
  head: 'Headgear',
  body: 'Body',
  back: 'Cape',
  aura: 'Aura',
  frame: 'Frame',
}

function groupBySlot(items: OwnedItem[]): Record<string, OwnedItem[]> {
  const out: Record<string, OwnedItem[]> = {}
  for (const o of items) {
    const slot = (o.item.slot ?? '').trim()
    if (!slot) continue
    if (!out[slot]) out[slot] = []
    out[slot].push(o)
  }
  return out
}

export function InventoryModal({
  open,
  onClose,
  initialItems,
  onInventoryChange,
}: {
  open: boolean
  onClose: () => void
  initialItems: OwnedItem[]
  onInventoryChange?: (items: OwnedItem[]) => void
}) {
  const [items, setItems] = useState<OwnedItem[]>(initialItems)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const groups = useMemo(() => groupBySlot(items), [items])
  const slotKeys = Object.keys(groups).sort()

  const handleEquip = async (itemId: string, unequip: boolean) => {
    setBusy(itemId)
    setError(null)
    try {
      const fresh = await shopApi.equipCosmetic(itemId, unequip)
      setItems(fresh)
      onInventoryChange?.(fresh)
    } catch (e: unknown) {
      // Roll back UI — keep previous inventory visible.
      const msg = e instanceof Error ? e.message : 'Could not update item'
      setError(msg)
    } finally {
      setBusy(null)
    }
  }

  if (!open) return null

  return (
    <div
      className="rpg-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'grid', placeItems: 'center', zIndex: 1000,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, width: '92%' }}>
        <Panel variant="default" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <h2 className="font-display" style={{ fontSize: 18 }}>Avatar inventory</h2>
            <RpgButton onClick={onClose} size="sm" variant="ghost">Close</RpgButton>
          </div>
          {slotKeys.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-2)' }}>
              Nothing to equip yet — buy cosmetics in the Tavern.
            </div>
          )}
          {error && (
            <div className="rpg-alert" style={{ marginBottom: 10, color: '#c85050' }}>{error}</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {slotKeys.map((slot) => {
              const rows = groups[slot]
              return (
                <div key={slot}>
                  <div
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 6 }}
                  >
                    {SLOT_LABEL[slot] ?? slot}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                    {rows.map((o) => {
                      const isBusy = busy === o.item.id || busy === o.item.slug
                      return (
                        <div
                          key={o.item.id}
                          className={`rpg-item-card rpg-rarity-border--${rarityKey(o.item.rarity)}`}
                          style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}
                        >
                          <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 12 }}>{o.item.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--ink-2)' }}>{o.item.slug}</div>
                          {o.equipped ? (
                            <RpgButton
                              size="sm"
                              variant="ghost"
                              disabled={isBusy}
                              onClick={() => handleEquip(o.item.id, true)}
                            >
                              {isBusy ? '…' : 'Unequip'}
                            </RpgButton>
                          ) : (
                            <RpgButton
                              size="sm"
                              disabled={isBusy}
                              onClick={() => handleEquip(o.item.id, false)}
                            >
                              {isBusy ? '…' : 'Equip'}
                            </RpgButton>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function rarityKey(r: number): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
  switch (r) {
    case 5: return 'legendary'
    case 4: return 'epic'
    case 3: return 'rare'
    case 2: return 'uncommon'
    default: return 'common'
  }
}
