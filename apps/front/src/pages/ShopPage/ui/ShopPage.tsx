import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, RpgButton, PageHeader, Badge } from '@/shared/ui/pixel'
import {
  Bookshelf,
  Torch,
  PixelWindow,
  Fireplace,
  Rug,
  Statue,
  Chest,
  Banner,
  SpiritOrb,
  Hero,
  Sword,
  SlimePet,
  RavenPet,
  Trophy,
  Fireflies,
} from '@/shared/ui/sprites'
import { useTweaks, useLiveStats } from '@/shared/lib/gameState'
import { addToast } from '@/shared/lib/toasts'
import {
  shopApi,
  ItemCategory,
  ItemRarity,
  ItemCurrency,
  rarityLabel,
  type ShopItem,
  type ShopCategoryInfo,
} from '@/features/Shop'

// Mapping catalog iconRef → React sprite component. Unknown refs fall back
// to a neutral coin glyph so the grid still renders.
const ICON_REGISTRY: Record<string, (props: { scale?: number }) => ReactNode> = {
  Bookshelf:    (p) => <Bookshelf scale={p.scale ?? 2} />,
  Torch:        (p) => <Torch scale={p.scale ?? 2} />,
  PixelWindow:  (p) => <PixelWindow scale={p.scale ?? 2} />,
  Fireplace:    (p) => <Fireplace scale={p.scale ?? 2} />,
  Rug:          (p) => <Rug scale={p.scale ?? 2} w={14} />,
  Statue:       (p) => <Statue scale={p.scale ?? 2} />,
  Chest:        (p) => <Chest scale={p.scale ?? 2} open />,
  Banner:       (p) => <Banner scale={p.scale ?? 2} color="#7a3d12" />,
  SpiritOrb:    (p) => <SpiritOrb scale={p.scale ?? 2} />,
  Hero:         (p) => <Hero scale={p.scale ?? 2} />,
  Sword:        (p) => <Sword scale={p.scale ?? 2} />,
  SlimePet:     (p) => <SlimePet scale={p.scale ?? 2} />,
  RavenPet:     (p) => <RavenPet scale={p.scale ?? 2} />,
  Trophy:       (p) => <Trophy scale={p.scale ?? 2} tier="gold" />,
}

function renderIcon(iconRef: string, scale = 2): ReactNode {
  const fn = ICON_REGISTRY[iconRef]
  if (fn) return fn({ scale })
  // Generic placeholder: a small coloured square so items without a sprite
  // still render a clickable cell.
  return <div style={{ width: 28, height: 28, background: 'var(--parch-3)', border: '2px solid var(--ink-0)' }} />
}

function currencyGlyph(c: ItemCurrency): string {
  switch (c) {
    case ItemCurrency.GOLD: return '⚙'
    case ItemCurrency.GEMS: return '◆'
    case ItemCurrency.SHARDS: return '✦'
    default: return '·'
  }
}

export function ShopPage() {
  const { t } = useTranslation()
  // `tweaks` is kept for a future room-preview that renders the selected
  // item on the user's chosen layout — wire when the preview lands.
  useTweaks()
  const live = useLiveStats()
  const [categories, setCategories] = useState<ShopCategoryInfo[]>([])
  const [currentCategory, setCurrentCategory] = useState<ItemCategory>(ItemCategory.DECOR)
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set())
  const [rarityFilter, setRarityFilter] = useState<ItemRarity | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Load categories + inventory once; items refetch when category changes.
  useEffect(() => {
    let cancelled = false
    Promise.all([shopApi.listCategories(), shopApi.getInventory()])
      .then(([cats, inv]) => {
        if (cancelled) return
        setCategories(cats)
        setOwnedIds(new Set(inv.map((o) => o.item.id)))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    shopApi
      .listItems({
        category: currentCategory,
        rarity: rarityFilter === 'all' ? undefined : rarityFilter,
        limit: 48,
      })
      .then((resp) => {
        if (cancelled) return
        setItems(resp.items)
        if (resp.items.length > 0) setSelectedId((prev) => prev ?? resp.items[0].id)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [currentCategory, rarityFilter])

  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  )

  const purchase = useCallback(async (item: ShopItem) => {
    if (ownedIds.has(item.id) || purchasing) return
    setPurchasing(item.id)
    try {
      const resp = await shopApi.purchase(item.id)
      setOwnedIds((prev) => new Set(prev).add(item.id))
      addToast({
        kind: 'LOOT',
        title: t('shop.toast.purchasedTitle', { name: item.name }),
        body: t('shop.toast.remaining', { gold: resp.remainingGold, gems: resp.remainingGems }),
        icon: '◈',
        color: 'var(--r-epic)',
      })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      addToast({
        kind: 'QUEST',
        title: t('shop.toast.failedTitle'),
        body: msg ?? t('shop.toast.failedBody'),
        icon: '!',
        color: 'var(--rpg-danger)',
      })
    } finally {
      setPurchasing(null)
    }
  }, [ownedIds, purchasing])

  return (
    <>
      <PageHeader
        eyebrow={t('shop.eyebrow')}
        title={t('shop.title')}
        subtitle={t('shop.subtitle')}
        right={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="rpg-coin" style={{ fontSize: 14 }}>
              <span className="rpg-coin-icon" />
              {live.gold.toLocaleString()}
            </div>
            <div className="rpg-coin" style={{ fontSize: 14 }}>
              💎 {live.gems.toLocaleString()}
            </div>
            <Badge variant="ember">{t('shop.inventoryCount', { count: ownedIds.size })}</Badge>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr) 340px', gap: 18 }}>
        {/* Categories */}
        <Panel variant="recessed" style={{ padding: 10 }}>
          {categories.length === 0 && (
            <div style={{ padding: 10, fontSize: 12, color: 'var(--ink-2)' }}>
              {t('shop.loadingCategories')}
            </div>
          )}
          {categories.map((c) => (
            <div
              key={c.category}
              onClick={() => setCurrentCategory(c.category)}
              style={{
                padding: '10px 10px',
                marginBottom: 4,
                background: currentCategory === c.category ? 'var(--ink-0)' : 'var(--parch-0)',
                color: currentCategory === c.category ? 'var(--parch-0)' : 'var(--ink-0)',
                border: '2px solid var(--ink-0)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: 'Pixelify Sans, monospace',
                fontSize: 13,
                boxShadow: currentCategory === c.category ? '3px 3px 0 var(--ember-1)' : 'none',
              }}
            >
              <span>{c.name}</span>
              <span
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, opacity: 0.7, letterSpacing: '0.08em' }}
              >
                {c.itemCount}
              </span>
            </div>
          ))}

          <div className="rpg-divider" />
          <div
            className="font-silkscreen uppercase"
            style={{ fontSize: 9, padding: '0 4px', color: 'var(--ink-2)', letterSpacing: '0.1em' }}
          >
            {t('shop.rarity')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 4 }}>
            <span
              className={`rpg-badge ${rarityFilter === 'all' ? 'rpg-badge--ember' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setRarityFilter('all')}
            >
              {t('shop.all')}
            </span>
            {[ItemRarity.COMMON, ItemRarity.UNCOMMON, ItemRarity.RARE, ItemRarity.EPIC, ItemRarity.LEGENDARY].map((r) => (
              <span
                key={r}
                className={`rpg-badge ${rarityFilter === r ? 'rpg-badge--ember' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setRarityFilter(r)}
              >
                {t(`shop.rarityLabel.${rarityLabel[r]}`)}
              </span>
            ))}
          </div>
        </Panel>

        {/* Item grid */}
        <div>
          {loading && (
            <Panel style={{ marginBottom: 12 }}>
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-2)' }}>
                {t('shop.loadingItems')}
              </div>
            </Panel>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
            {items.map((it) => {
              const owned = ownedIds.has(it.id)
              const isSel = it.id === selectedId
              return (
                <div
                  key={it.id}
                  className={`rpg-item-card rpg-rarity-border--${rarityLabel[it.rarity]}`}
                  onClick={() => setSelectedId(it.id)}
                  data-price={`${currencyGlyph(it.currency)} ${it.price || 'drop'}`}
                  style={{
                    outline: isSel ? '3px solid var(--ember-1)' : 'none',
                    outlineOffset: 2,
                    cursor: 'pointer',
                    opacity: owned ? 0.7 : 1,
                    position: 'relative',
                  }}
                >
                  {owned && (
                    <div
                      className="font-silkscreen uppercase"
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 6,
                        fontSize: 8,
                        letterSpacing: '0.08em',
                        color: 'var(--moss-1)',
                      }}
                    >
                      {t('shop.owned')}
                    </div>
                  )}
                  <div className="rpg-item-card__art" style={{ overflow: 'hidden' }}>
                    {renderIcon(it.iconRef, 2)}
                  </div>
                  <div
                    style={{
                      fontFamily: 'Pixelify Sans, monospace',
                      fontSize: 12,
                      marginTop: 6,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {it.name}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 2,
                    }}
                  >
                    <span className={`rpg-rarity rpg-rarity--${rarityLabel[it.rarity]}`}>
                      {t(`shop.rarityLabel.${rarityLabel[it.rarity]}`)}
                    </span>
                    <span className="rpg-coin">
                      <span className="rpg-coin-icon" />
                      {it.price || '—'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          {!loading && items.length === 0 && (
            <Panel>
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-2)' }}>
                {t('shop.emptyCategory')}
              </div>
            </Panel>
          )}
        </div>

        {/* Preview */}
        <Panel style={{ position: 'relative', overflow: 'hidden' }}>
          {selectedItem ? (
            <>
              <div
                style={{
                  height: 180,
                  background: selectedItem.accentColor || 'var(--parch-2)',
                  border: '3px solid var(--ink-0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {renderIcon(selectedItem.iconRef, 4)}
                <Fireflies count={4} />
              </div>
              <h3 className="font-display" style={{ fontSize: 18, margin: '0 0 4px' }}>
                {selectedItem.name}
              </h3>
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em', marginBottom: 8 }}
              >
                {t(`shop.rarityLabel.${rarityLabel[selectedItem.rarity]}`)}
                {selectedItem.isSeasonal ? ` · ${t('shop.seasonal')}` : ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-1)', lineHeight: 1.5, marginBottom: 14 }}>
                {selectedItem.description || t('shop.descriptionFallback')}
              </div>
              {ownedIds.has(selectedItem.id) ? (
                <RpgButton variant="default" disabled style={{ width: '100%' }}>
                  {t('shop.alreadyOwned')}
                </RpgButton>
              ) : selectedItem.price > 0 ? (
                <RpgButton
                  variant="primary"
                  style={{ width: '100%' }}
                  onClick={() => void purchase(selectedItem)}
                  disabled={purchasing === selectedItem.id}
                >
                  {purchasing === selectedItem.id
                    ? t('shop.purchasing')
                    : t('shop.buyWithPrice', { glyph: currencyGlyph(selectedItem.currency), price: selectedItem.price })}
                </RpgButton>
              ) : (
                <RpgButton variant="ghost" disabled style={{ width: '100%' }}>
                  {t('shop.eventsOnly')}
                </RpgButton>
              )}
            </>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-2)' }}>
              {t('shop.selectItem')}
            </div>
          )}
        </Panel>
      </div>
    </>
  )
}
