import { useState, type ReactNode } from 'react'
import { RpgButton, Badge } from '@/shared/ui/pixel'
import { Bookshelf, Banner, Hero, Fireplace, Fireflies, PixelCoin } from '@/shared/ui/sprites'

export interface CheckoutItem {
  name: string
  category: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  priceGold?: number
  color?: string
  desc?: string
  icon?: ReactNode
}

export function CheckoutModal({
  item,
  onClose,
  onPurchased,
}: {
  item: CheckoutItem | null
  onClose: () => void
  onPurchased?: (item: CheckoutItem) => void
}) {
  const [preview, setPreview] = useState<'room' | 'hero' | 'inventory'>('room')
  if (!item) return null
  const priceGold = item.priceGold ?? 1200
  const discount = Math.round(priceGold * 0.1)
  const total = priceGold - discount

  return (
    <div className="rpg-modal-backdrop" onClick={onClose}>
      <div
        className="rpg-modal rpg-panel rpg-panel--nailed"
        style={{ padding: 24, maxWidth: 880 }}
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
              style={{ color: 'var(--ember-1)', fontSize: 11, letterSpacing: '0.1em' }}
            >
              CHECKOUT · {item.category}
            </div>
            <h2
              className="font-display"
              style={{ whiteSpace: 'normal', fontSize: 22, margin: 0 }}
            >
              {item.name}
            </h2>
          </div>
          <RpgButton size="sm" onClick={onClose}>
            ✕
          </RpgButton>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 18 }}>
          {/* Preview */}
          <div>
            <div
              className="rpg-panel rpg-panel--recessed"
              style={{
                height: 260,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(180deg, #3d6149 0%, #1a140e 100%)',
                border: '3px solid var(--ink-0)',
              }}
            >
              {preview === 'room' && (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <div style={{ position: 'absolute', left: 40, bottom: 20 }}>
                    <Bookshelf scale={3} />
                  </div>
                  <div style={{ position: 'absolute', left: 160, bottom: 20 }}>
                    <Banner scale={3} color={item.color || '#3d6149'} />
                  </div>
                  <div style={{ position: 'absolute', left: '45%', bottom: 20 }}>
                    <Hero scale={4} />
                  </div>
                  <div style={{ position: 'absolute', right: 60, bottom: 20 }}>
                    <Fireplace scale={3} />
                  </div>
                  <Fireflies count={6} />
                </div>
              )}
              {preview === 'hero' && (
                <div style={{ transform: 'scale(2)' }}>
                  <Hero scale={5} pose="trophy" />
                </div>
              )}
              {preview === 'inventory' && (
                <div
                  style={{
                    width: 100,
                    height: 100,
                    background: item.color || '#3d6149',
                    border: '4px solid var(--ink-0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '6px 6px 0 rgba(0,0,0,0.4)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'Pixelify Sans, monospace',
                      fontSize: 14,
                      color: 'var(--parch-0)',
                    }}
                  >
                    item
                  </span>
                </div>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 10,
                justifyContent: 'center',
              }}
            >
              {(
                [
                  ['room', 'In room'],
                  ['hero', 'On hero'],
                  ['inventory', 'Isolated'],
                ] as const
              ).map(([id, t]) => (
                <span
                  key={id}
                  className={`rpg-tweak-chip ${preview === id ? 'rpg-tweak-chip--on' : ''}`}
                  onClick={() => setPreview(id)}
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="rpg-divider" />
            <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 10 }}>
              {item.desc ||
                'A premium item for your collection. Limited to season III.'}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge style={{ borderColor: `var(--r-${item.rarity})` }}>{item.rarity}</Badge>
              <Badge>season III</Badge>
              <Badge>limited · 14 days left</Badge>
            </div>
          </div>

          {/* Receipt */}
          <div className="rpg-panel rpg-panel--recessed" style={{ padding: 14 }}>
            <div
              className="font-silkscreen uppercase"
              style={{
                fontSize: 9,
                color: 'var(--ink-2)',
                marginBottom: 8,
                letterSpacing: '0.1em',
              }}
            >
              receipt
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: '1px dashed var(--ink-3)',
              }}
            >
              <span style={{ fontFamily: 'Pixelify Sans, monospace' }}>{item.name}</span>
              <span
                className="font-silkscreen uppercase"
                style={{ fontSize: 11, letterSpacing: '0.06em' }}
              >
                {priceGold} gp
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: '1px dashed var(--ink-3)',
              }}
            >
              <span style={{ color: 'var(--ink-2)', fontSize: 11 }}>guild discount · 10%</span>
              <span
                className="font-silkscreen uppercase"
                style={{ fontSize: 11, color: 'var(--moss-1)', letterSpacing: '0.06em' }}
              >
                -{discount} gp
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: '1px dashed var(--ink-3)',
              }}
            >
              <span style={{ color: 'var(--ink-2)', fontSize: 11 }}>season pass · +1 tier</span>
              <span
                className="font-silkscreen uppercase"
                style={{ fontSize: 11, color: 'var(--ember-1)', letterSpacing: '0.06em' }}
              >
                free
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
              }}
            >
              <span style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 18 }}>total</span>
              <span
                style={{
                  fontFamily: 'Pixelify Sans, monospace',
                  fontSize: 22,
                  color: 'var(--ember-1)',
                }}
              >
                {total} gp
              </span>
            </div>

            <div
              className="font-silkscreen uppercase"
              style={{
                fontSize: 9,
                color: 'var(--ink-2)',
                marginBottom: 8,
                marginTop: 8,
                letterSpacing: '0.1em',
              }}
            >
              pay with
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div
                className="rpg-panel rpg-panel--tight"
                style={{ padding: 8, border: '3px solid var(--ember-1)', cursor: 'pointer' }}
              >
                <PixelCoin scale={2} />
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 9, marginTop: 4, letterSpacing: '0.08em' }}
                >
                  8,420 gp
                </div>
              </div>
              <div className="rpg-panel rpg-panel--tight" style={{ padding: 8, cursor: 'pointer' }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    background: '#8fb8d4',
                    border: '2px solid var(--ink-0)',
                    transform: 'rotate(45deg)',
                  }}
                />
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 9, marginTop: 4, letterSpacing: '0.08em' }}
                >
                  124 💎
                </div>
              </div>
            </div>

            <RpgButton
              variant="primary"
              style={{ width: '100%', marginTop: 14 }}
              onClick={() => {
                onPurchased?.(item)
                onClose()
              }}
            >
              Confirm · {total} gp
            </RpgButton>
            <RpgButton variant="ghost" size="sm" style={{ width: '100%', marginTop: 6 }}>
              Try on (1h free)
            </RpgButton>
          </div>
        </div>
      </div>
    </div>
  )
}
