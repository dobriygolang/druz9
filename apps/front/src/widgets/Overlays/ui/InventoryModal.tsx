import { useState } from 'react'
import { RpgButton, Badge } from '@/shared/ui/pixel'

const ITEMS = [
  { n: 'Moss Banner', c: '#3d6149', r: 'rare' as const, cat: 'deco' },
  { n: 'Ember Torch', c: '#b8692a', r: 'common' as const, cat: 'deco' },
  { n: 'Oak Bookshelf', c: '#7a593a', r: 'common' as const, cat: 'deco' },
  { n: 'Raven Familiar', c: '#3b2a1e', r: 'legendary' as const, cat: 'pet', equipped: true },
  { n: 'Moss Slime', c: '#6b8a6a', r: 'common' as const, cat: 'pet' },
  { n: 'Spirit Orb', c: '#8fb8d4', r: 'epic' as const, cat: 'pet' },
  { n: 'Knight Armor', c: '#5a3f27', r: 'rare' as const, cat: 'gear', equipped: true },
  { n: 'Scholar Robe', c: '#3b6a8f', r: 'uncommon' as const, cat: 'gear' },
  { n: 'Ember Crown', c: '#e9b866', r: 'legendary' as const, cat: 'gear' },
  { n: 'Stone Statue', c: '#9fb89a', r: 'epic' as const, cat: 'deco' },
  { n: 'Autumn Frame', c: '#b8692a', r: 'rare' as const, cat: 'frame', equipped: true },
  { n: 'Winter Frame', c: '#d4e2ec', r: 'rare' as const, cat: 'frame' },
  { n: 'Gold Chest', c: '#dcc690', r: 'rare' as const, cat: 'deco' },
  { n: 'Ember Aura', c: '#e9b866', r: 'epic' as const, cat: 'aura', equipped: true },
  { n: 'Moss Aura', c: '#3d6149', r: 'rare' as const, cat: 'aura' },
  { n: 'Trophy Shelf', c: '#a23a2a', r: 'epic' as const, cat: 'deco' },
]

const CATS: Array<[string, string, number]> = [
  ['all', 'All', 24],
  ['deco', 'Decor', 8],
  ['pet', 'Pets', 3],
  ['gear', 'Gear', 6],
  ['frame', 'Frames', 4],
  ['aura', 'Auras', 3],
]

export function InventoryModal({ onClose }: { onClose: () => void }) {
  const [cat, setCat] = useState('all')
  const filtered = cat === 'all' ? ITEMS : ITEMS.filter((x) => x.cat === cat)

  return (
    <div className="rpg-modal-backdrop" onClick={onClose}>
      <div
        className="rpg-modal rpg-panel rpg-panel--nailed"
        style={{ padding: 20, maxWidth: 960 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div>
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
            >
              INVENTORY · 24 owned
            </div>
            <h2 className="font-display" style={{ whiteSpace: 'normal', margin: 0, fontSize: 22 }}>
              Your treasures
            </h2>
          </div>
          <RpgButton size="sm" onClick={onClose}>
            ✕
          </RpgButton>
        </div>

        <div className="rpg-tabs" style={{ marginBottom: 12 }}>
          {CATS.map(([id, t, n]) => (
            <div
              key={id}
              className={`rpg-tab ${cat === id ? 'rpg-tab--active' : ''}`}
              onClick={() => setCat(id)}
            >
              {t} · {n}
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 10,
            maxHeight: 460,
            overflow: 'auto',
          }}
        >
          {filtered.map((it, i) => (
            <div
              key={`${it.n}-${i}`}
              className={`rpg-rarity-border--${it.r}`}
              style={{
                padding: 8,
                border: '3px solid var(--ink-0)',
                background: 'var(--parch-0)',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  height: 58,
                  background: it.c,
                  border: '2px solid var(--ink-0)',
                  marginBottom: 4,
                }}
              />
              <div
                style={{
                  fontFamily: 'Pixelify Sans, monospace',
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {it.n}
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 8, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
              >
                {it.r}
              </div>
              {it.equipped && (
                <Badge
                  variant="ember"
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    fontSize: 8,
                    padding: '2px 4px',
                  }}
                >
                  equipped
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
