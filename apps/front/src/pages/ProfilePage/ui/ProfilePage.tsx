import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, RpgButton, Badge, PageHeader } from '@/shared/ui/pixel'
import {
  Hero,
  Torch,
  Bookshelf,
  Fireplace,
  Chest,
  Statue,
  Banner,
  Rug,
  PixelWindow,
  Fireflies,
  RoomScene,
  SpiritOrb,
  SlimePet,
  RavenPet,
  Trophy,
  Sword,
} from '@/shared/ui/sprites'
import { useTweaks } from '@/shared/lib/gameState'
import { useAuth } from '@/app/providers/AuthProvider'
import { authApi, type ProfileAchievement, type ProfileActivityEntry } from '@/features/Auth/api/authApi'
import { shopApi } from '@/features/Shop/api/shopApi'
import { ItemCategory, type OwnedItem, rarityLabel } from '@/features/Shop/model/types'
import { InventoryModal } from '@/features/Shop/ui/InventoryModal'
import type { ProfileProgress, User } from '@/entities/User/model/types'
import { SceneViewer } from '@/features/Scene/ui/SceneViewer'
import { SceneEditor } from '@/features/Scene/ui/SceneEditor'
import { renderSceneItemArt } from '@/features/Scene/ui/sceneItemArt'
import { SendGiftModal } from '@/features/Inbox/ui/SendGiftModal'
import { Tour } from '@/features/Tour/ui/Tour'

export function ProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId: routeUserId } = useParams<{ userId?: string }>()
  const { user } = useAuth()
  const [tweaks] = useTweaks()
  const [visitorProfile, setVisitorProfile] = useState<User | null>(null)
  const [editRoom, setEditRoom] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [giftOpen, setGiftOpen] = useState(false)
  const [inventoryFallback, setInventoryFallback] = useState(buildInventory(t))
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  // Achievements + activity timeline come from the backend; fall back to
  // the hard-coded defaults if the endpoint is offline so the page still
  // looks populated for a demo/dev environment.
  const [achievements, setAchievements] = useState<ProfileAchievement[] | null>(null)
  const [timeline, setTimeline] = useState<ProfileActivityEntry[] | null>(null)
  // Real backend data: profile progress (for STATS) + shop inventory
  // (for the INVENTORY grid and the equipped COSMETICS strip). Nulls
  // until loaded — then we switch from the t-prefixed fallbacks.
  const [progress, setProgress] = useState<ProfileProgress | null>(null)
  const [owned, setOwned] = useState<OwnedItem[] | null>(null)

  const fallbackAchievements = buildAchievements(t)
  const fallbackTimeline = buildTimeline(t)
  const fallbackCosmetics = buildCosmetics(t)
  const viewedUser = routeUserId && routeUserId !== user?.id ? visitorProfile : user
  const viewedUserId = routeUserId || user?.id || ''
  const visitorMode = Boolean(routeUserId && routeUserId !== user?.id)
  const canEditOwnProfile = !visitorMode && Boolean(user?.id)

  useEffect(() => {
    setInventoryFallback(buildInventory(t))
  }, [t])

  useEffect(() => {
    if (!routeUserId || routeUserId === user?.id) {
      setVisitorProfile(null)
      return
    }
    let cancelled = false
    authApi.getProfileById(routeUserId)
      .then((profile) => { if (!cancelled) setVisitorProfile(profile.user) })
      .catch(() => { if (!cancelled) setVisitorProfile(null) })
    return () => { cancelled = true }
  }, [routeUserId, user?.id])

  useEffect(() => {
    if (!viewedUserId) return
    let cancelled = false
    setAchievements(null)
    setTimeline(null)
    setProgress(null)
    authApi.getProfileAchievements(viewedUserId).then((a) => { if (!cancelled) setAchievements(a) }).catch(() => {})
    authApi.getProfileActivity(viewedUserId).then((tl) => { if (!cancelled) setTimeline(tl) }).catch(() => {})
    authApi.getProfileProgress(viewedUserId).then((p) => { if (!cancelled) setProgress(p) }).catch(() => {})
    return () => { cancelled = true }
  }, [viewedUserId])

  useEffect(() => {
    if (!canEditOwnProfile) {
      setOwned(null)
      return
    }
    let cancelled = false
    shopApi.getInventory().then((items) => { if (!cancelled) setOwned(items) }).catch(() => {})
    return () => { cancelled = true }
  }, [canEditOwnProfile])

  // Derive the three panels' data sources. When the backend hasn't
  // answered yet or failed we keep the hardcoded decor so the page
  // doesn't look broken.
  const stats = progress ? buildStatsFromProgress(progress, t) : buildStats(t)
  const inventory = owned && owned.length > 0 ? buildInventoryFromOwned(owned, t) : inventoryFallback
  const cosmetics = owned && owned.some((o) => o.equipped)
    ? buildCosmeticsFromOwned(owned.filter((o) => o.equipped))
    : fallbackCosmetics
  const sceneItemAssets = useMemo(() => {
    const assets: Record<string, { src?: string; label?: string }> = {}
    for (const row of owned ?? []) {
      assets[row.item.id] = { src: row.item.iconRef, label: row.item.name }
    }
    return assets
  }, [owned])

  const reorder = (from: number, to: number) => {
    if (from === to) return
    // Drag reorder only mutates the fallback list — when real inventory
    // loads we show it in backend order (acquiredAt DESC). Drag is a
    // demo affordance, not persisted yet.
    setInventoryFallback((prev) => {
      const next = prev.slice()
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const fullName = [viewedUser?.firstName, viewedUser?.lastName].filter(Boolean).join(' ').trim()
  const displayName = fullName || viewedUser?.username || viewedUser?.telegramUsername || t('profile.title')
  const title = visitorMode ? `${displayName} · ${t('profile.visitorBadge', { defaultValue: 'visiting' })}` : displayName
  const subtitle = visitorMode
    ? t('profile.subtitleVisitor')
    : t('profile.subtitle')

  return (
    <>
      <Tour
        tourId="profile_intro"
        steps={[
          { selector: '[data-tour=profile-scene]', title: t('profile.tour.sceneTitle', { defaultValue: 'Комната героя' }), body: t('profile.tour.sceneBody', { defaultValue: 'Здесь сохраняется расстановка предметов. У владельца доступен редактор, у гостя только просмотр.' }) },
          { selector: '[data-tour=profile-stats]', title: t('profile.tour.statsTitle', { defaultValue: 'Прогресс' }), body: t('profile.tour.statsBody', { defaultValue: 'Статы, достижения и недавние действия подтягиваются из backend-профиля.' }) },
          { selector: '[data-tour=profile-inventory]', title: t('profile.tour.inventoryTitle', { defaultValue: 'Экипировка' }), body: t('profile.tour.inventoryBody', { defaultValue: 'Надетые предметы остаются видимыми отдельно от комнаты.' }) },
        ]}
      />
      <PageHeader
        eyebrow={
          visitorMode
            ? t('profile.eyebrowVisitor', { name: displayName })
            : t('profile.eyebrow')
        }
        title={title}
        subtitle={subtitle}
        right={
          visitorMode ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <RpgButton size="sm" onClick={() => navigate('/profile')}>
                {t('profile.exitVisitor')}
              </RpgButton>
              <RpgButton size="sm" variant="primary" disabled={!viewedUserId} onClick={() => setGiftOpen(true)}>
                {t('profile.gift', { defaultValue: 'Подарить' })}
              </RpgButton>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <RpgButton size="sm" onClick={() => user?.id && navigate(`/profile/${user.id}`)}>
                {t('profile.viewAsVisitor')}
              </RpgButton>
              <RpgButton size="sm" variant="primary" onClick={() => setInventoryOpen(true)}>
                {t('profile.customize', { defaultValue: 'Customize avatar' })}
              </RpgButton>
            </div>
          )
        }
      />

      {/* Legacy hardcoded "chamber scene" — kept as a fallback ONLY when
          the user isn't logged in (so anonymous viewers still see decor).
          Signed-in users get the persisted ADR-003 SceneViewer below
          (which renders their actual saved layout, editable via toggle). */}
      {!user?.id && (
      <Panel nailed style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
        <RoomScene variant={tweaks.roomLayout} height={320}>
          {/* left cluster */}
          <div style={{ position: 'absolute', left: 24, top: 30 }}>
            <PixelWindow scale={3} />
          </div>
          <div style={{ position: 'absolute', left: 24, bottom: 14 }}>
            <Bookshelf scale={3} />
          </div>
          <div style={{ position: 'absolute', left: 150, bottom: 30 }}>
            <Torch scale={3} />
          </div>

          {/* banner + crest */}
          <div style={{ position: 'absolute', left: '36%', top: 14 }}>
            <Banner scale={3} color="#3d6149" crest="✦" />
          </div>

          {/* hero center stage */}
          <div style={{ position: 'absolute', left: '44%', bottom: 10 }}>
            <Hero scale={5} pose={tweaks.heroPose} slots={equippedSlots(owned)} />
            <div
              style={{
                position: 'absolute',
                left: -20,
                bottom: -8,
                width: 120,
                height: 30,
                borderRadius: '50%',
                background:
                  'radial-gradient(ellipse, rgba(233,184,102,0.35) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* pet */}
          {tweaks.pet === 'slime' && (
            <div style={{ position: 'absolute', left: '54%', bottom: 12 }}>
              <SlimePet scale={3} />
            </div>
          )}
          {tweaks.pet === 'raven' && (
            <div style={{ position: 'absolute', left: '54%', bottom: 20 }}>
              <RavenPet scale={3} />
            </div>
          )}
          {tweaks.pet === 'orb' && (
            <div style={{ position: 'absolute', left: '54%', bottom: 60 }}>
              <SpiritOrb scale={3} />
            </div>
          )}

          {/* right cluster */}
          <div style={{ position: 'absolute', right: 180, bottom: 14 }}>
            <Fireplace scale={3} />
          </div>
          <div
            style={{
              position: 'absolute',
              right: 40,
              bottom: 14,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 10,
            }}
          >
            <Chest scale={3} />
            <Statue scale={3} color="#9fb89a" />
          </div>

          {/* rug on floor */}
          <div style={{ position: 'absolute', left: '42%', bottom: 0 }}>
            <Rug scale={3} w={24} />
          </div>

          <Fireflies count={10} />

          {/* overlay label */}
          <div style={{ position: 'absolute', left: 16, bottom: 12 }}>
            <Badge variant="dark">{t('profile.chamberLabel')}</Badge>
          </div>
          <div
            style={{
              position: 'absolute',
              right: 16,
              top: 16,
              display: 'flex',
              gap: 6,
            }}
          >
            {editRoom ? (
              <>
                <RpgButton size="sm" onClick={() => setEditRoom(false)}>
                  {t('profile.saveLayout')}
                </RpgButton>
                <RpgButton size="sm" onClick={() => setInventoryFallback(buildInventory(t))}>
                  {t('profile.reset')}
                </RpgButton>
              </>
            ) : (
              !visitorMode && (
                <>
                  <RpgButton size="sm" onClick={() => setEditRoom(true)}>
                    {t('profile.editLayout')}
                  </RpgButton>
                  <RpgButton size="sm" onClick={() => navigate('/settings?tab=tweaks')}>
                    {t('profile.changeTheme')}
                  </RpgButton>
                </>
              )
            )}
          </div>

          {editRoom && (
            <>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage:
                    'repeating-linear-gradient(90deg, transparent 0 40px, rgba(233,184,102,0.2) 40px 41px), repeating-linear-gradient(0deg, transparent 0 40px, rgba(233,184,102,0.2) 40px 41px)',
                  pointerEvents: 'none',
                }}
              />
              {[
                { left: '24px', top: '30px' },
                { left: 'calc(54% - 20px)', top: '20px' },
                { left: '44%', top: 'calc(100% - 80px)' },
                { left: 'calc(100% - 220px)', top: '14px' },
              ].map((pos, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: pos.left,
                    top: pos.top,
                    width: 24,
                    height: 24,
                    border: '2px dashed var(--ember-3)',
                    background: 'rgba(233,184,102,0.15)',
                    cursor: 'move',
                  }}
                />
              ))}
            </>
          )}
        </RoomScene>
      </Panel>
      )}

      {/* ADR-003: persisted Hero Room. Owner sees an "Edit" toggle that
          flips the panel into SceneEditor (drag-and-drop). Visitors see
          the read-only canvas. Server enforces canEdit. */}
      {viewedUserId && (
        <Panel nailed data-tour="profile-scene" style={{ padding: 12, marginBottom: 18 }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}
          >
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--ember-1)' }}
            >
              {t('profile.savedScene', { defaultValue: 'твоя сцена' })}
            </div>
          </div>
          <SceneViewer
            scope="user_room"
            ownerId={viewedUserId}
            itemAssets={sceneItemAssets}
            maxHeight={360}
            renderEditor={(resp, refresh) => (
              <SceneRoomToggle resp={resp} ownerId={viewedUserId} itemAssets={sceneItemAssets} refresh={refresh} />
            )}
          />
        </Panel>
      )}

      {/* Edit catalog */}
      {editRoom && (
        <Panel variant="wood" style={{ marginBottom: 18, padding: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <h3 className="font-display" style={{ fontSize: 17, color: 'var(--parch-0)' }}>
              {t('profile.inventoryTitle')}
            </h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span
                className="font-silkscreen uppercase"
                style={{
                  color: 'var(--parch-2)',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                }}
              >
                {t('profile.itemsOwned')}
              </span>
              <RpgButton size="sm">{t('profile.browseShop')}</RpgButton>
            </div>
          </div>
          <div
            className="rpg-profile-inventory"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: 8,
            }}
          >
            {inventory.map((it, i) => (
              <div
                key={`${it.n}-${i}`}
                className={`rpg-rarity-border--${it.r === 'locked' ? 'common' : it.r}`}
                draggable={it.r !== 'locked'}
                onDragStart={(e) => {
                  if (it.r === 'locked') return
                  setDragIdx(i)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  if (dragIdx === null) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (overIdx !== i) setOverIdx(i)
                }}
                onDragLeave={() => {
                  if (overIdx === i) setOverIdx(null)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragIdx === null || it.r === 'locked') return
                  reorder(dragIdx, i)
                  setDragIdx(null)
                  setOverIdx(null)
                }}
                onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
                style={{
                  padding: 6,
                  border: '3px solid var(--ink-0)',
                  background: 'var(--parch-0)',
                  cursor: it.r === 'locked' ? 'default' : (dragIdx === i ? 'grabbing' : 'grab'),
                  opacity: dragIdx === i ? 0.35 : (it.r === 'locked' ? 0.5 : 1),
                  transform: overIdx === i && dragIdx !== null && dragIdx !== i ? 'translateY(-3px)' : 'none',
                  boxShadow: overIdx === i && dragIdx !== null && dragIdx !== i ? '0 3px 0 var(--ember-1)' : 'none',
                  transition: 'transform 0.1s, box-shadow 0.1s, opacity 0.1s',
                }}
              >
                <div
                  style={{
                    height: 40,
                    background: it.c,
                    border: '2px solid var(--ink-0)',
                    marginBottom: 4,
                  }}
                />
                <div
                  style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 10, lineHeight: 1.1 }}
                >
                  {it.n}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Profile grid */}
      <div data-tour="profile-stats" className="rpg-profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
        {/* Stats */}
        <Panel>
          <h3 className="font-display" style={{ fontSize: 17 }}>
            {t('profile.stats')}
          </h3>
          <div
            className="font-silkscreen uppercase"
            style={{
              fontSize: 10,
              color: 'var(--ink-2)',
              letterSpacing: '0.1em',
              marginBottom: 12,
            }}
          >
            {t('profile.allTime')}
          </div>
          {stats.map(([k, v], i) => (
            <div
              key={k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: i < stats.length - 1 ? '1px dashed var(--ink-3)' : 'none',
              }}
            >
              <span style={{ color: 'var(--ink-2)', fontSize: 13 }}>{k}</span>
              <span style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14 }}>{v}</span>
            </div>
          ))}
          <div className="rpg-divider" />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Badge variant="ember">
              {t('profile.streakDaysLive', {
                count: progress?.overview.currentStreakDays ?? 0,
                defaultValue: `streak ${progress?.overview.currentStreakDays ?? 0}d`,
              })}
            </Badge>
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
            >
              {t('profile.longestDaysLive', {
                count: progress?.overview.longestStreakDays ?? 0,
                defaultValue: `best ${progress?.overview.longestStreakDays ?? 0}d`,
              })}
            </span>
          </div>
        </Panel>

        {/* Achievements */}
        <Panel>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <h3 className="font-display" style={{ fontSize: 17 }}>
              {t('profile.pinned')}
            </h3>
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
            >
              {achievements
                ? `${achievements.filter((a) => a.progress >= 100).length}/${achievements.length}`
                : '—'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(achievements ?? fallbackAchievements.map(a => ({
              id: a.t, title: a.t, description: a.d, rarity: a.rare, earnedAt: null, progress: 100,
            }))).map((a) => (
              <div
                key={a.id}
                className={`rpg-rarity-border--${a.rarity}`}
                style={{
                  padding: 8,
                  border: '3px solid var(--ink-0)',
                  background: 'var(--parch-0)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Trophy
                    scale={2}
                    tier={a.rarity === 'legendary' ? 'gold' : a.rarity === 'epic' ? 'silver' : 'bronze'}
                  />
                  <div>
                    <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 12 }}>
                      {a.title}
                    </div>
                    <div className={`rpg-rarity rpg-rarity--${a.rarity}`}>{t(`profile.rare.${a.rarity}`)}</div>
                  </div>
                </div>
                <div
                  className="font-silkscreen uppercase"
                  style={{
                    fontSize: 9,
                    marginTop: 4,
                    color: 'var(--ink-2)',
                    letterSpacing: '0.08em',
                  }}
                >
                  {a.description}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Timeline */}
        <Panel>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <h3 className="font-display" style={{ fontSize: 17 }}>
              {t('profile.recentJourney')}
            </h3>
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
          >
              {t('profile.last7days')}
            </span>
          </div>
          {(timeline ?? fallbackTimeline.map(r => ({
            id: r.t, kind: r.tag, title: r.e, subtitle: r.meta, at: r.t,
          }))).map((r, i, arr) => (
            <div
              key={r.id ?? i}
              style={{
                display: 'flex',
                gap: 10,
                padding: '8px 0',
                borderBottom: i < arr.length - 1 ? '1px dashed var(--ink-3)' : 'none',
              }}
            >
              <div style={{ width: 6, background: 'var(--ember-1)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 12 }}>
                  {r.title}
                </div>
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                >
                  {r.at} · {r.subtitle}
                </div>
              </div>
              <Badge style={{ fontSize: 9, height: 18 }}>{t(`profile.tag.${r.kind}`)}</Badge>
            </div>
          ))}
        </Panel>
      </div>

      {/* Inventory strip */}
      <Panel data-tour="profile-inventory" variant="recessed" style={{ marginTop: 18 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 12,
          }}
          >
            <h3 className="font-display" style={{ fontSize: 17 }}>
              {t('profile.equipped')}
            </h3>
          <span
            className="font-silkscreen uppercase"
            style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
          >
            {t('profile.equippedMeta')}
          </span>
        </div>
        <div className="rpg-profile-cosmetics" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {cosmetics.map((c) => (
            <div key={c.t} className={`rpg-item-card rpg-rarity-border--${c.r}`}>
              <div className="rpg-item-card__art">{c.icon}</div>
              <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 11, marginTop: 4 }}>
                {c.t}
              </div>
              <div className={`rpg-rarity rpg-rarity--${c.r}`}>{t(`profile.rare.${c.r}`)}</div>
            </div>
          ))}
        </div>
      </Panel>

      <InventoryModal
        open={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
        initialItems={owned ?? []}
        onInventoryChange={setOwned}
      />
      {giftOpen && viewedUserId && (
        <SendGiftModal
          recipientId={viewedUserId}
          recipientName={displayName}
          onClose={() => setGiftOpen(false)}
        />
      )}
    </>
  )
}

// Derive HeroSlots from the currently-equipped inventory rows. Each slot
// only cares about the item's slug, not its full metadata, since the
// Hero sprite branches on slugs to pick overlays.
function equippedSlots(owned: OwnedItem[] | null): import('@/shared/ui/sprites').HeroSlots | undefined {
  if (!owned || owned.length === 0) return undefined
  const out: Record<string, string> = {}
  for (const o of owned) {
    if (!o.equipped) continue
    const slot = (o.item.slot ?? '').trim()
    if (!slot) continue
    out[slot] = o.item.slug
  }
  return out
}

// Zero-state stats for new users (before the progress endpoint responds).
// The hardcoded "214h 30m / 1,248 / 86 / 54 / 42 / 73 / 38" fixture lived
// here and made fresh accounts look like long-time veterans — removed.
function buildStats(t: (key: string) => string): Array<[string, string]> {
  return [
    [t('profile.stat.tasksSolved'), '0'],
    [t('profile.stat.duelsWon'), '0 / 0'],
    [t('profile.stat.mockInterviews'), '0'],
    [t('profile.stat.trophies'), '0'],
  ]
}

// Empty arrays — real data comes from the achievements + activity API.
// Having hardcoded demo content leak onto a fresh account is exactly the
// "it looks like I have progress I haven't earned" complaint from staging.
function buildAchievements(_: (key: string) => string) {
  return [] as Array<{ t: string; d: string; rare: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' }>
}

function buildTimeline(_: (key: string) => string) {
  return [] as Array<{ t: string; e: string; meta: string; tag: string }>
}

function buildCosmetics(t: (key: string) => string) {
  return [
    { t: t('profile.cos.moonveil'), r: 'epic' as const, icon: <SpiritOrb scale={2} /> },
    { t: t('profile.cos.emberward'), r: 'legendary' as const, icon: <Hero scale={2} /> },
    { t: t('profile.cos.siegebreaker'), r: 'rare' as const, icon: <Sword scale={2} /> },
    {
      t: t('profile.cos.oakleaf'),
      r: 'uncommon' as const,
      icon: <Banner scale={2} color="#3d6149" crest="◆" />,
    },
    { t: t('profile.cos.raven'), r: 'rare' as const, icon: <RavenPet scale={2} /> },
    {
      t: t('profile.cos.fireflies'),
      r: 'common' as const,
      icon: (
        <div style={{ width: 20, height: 20, background: 'var(--ember-3)', borderRadius: '50%' }} />
      ),
    },
  ]
}

// SceneRoomToggle — local helper that flips the saved-scene panel
// between read-only (SceneViewer) and edit (SceneEditor) for the owner.
// Visitor sessions never see the toggle (canEdit comes from the server).
function SceneRoomToggle({
  resp,
  ownerId,
  itemAssets,
  refresh,
}: {
  resp: import('@/features/Scene/api/sceneApi').SceneLayoutResponse
  ownerId: string
  itemAssets?: Record<string, { src?: string; label?: string }>
  refresh: () => void
}) {
  const [editing, setEditing] = useState(false)
  if (editing && resp.canEdit) {
    return (
      <SceneEditor
        scope="user_room"
        ownerId={ownerId}
        initial={resp.layout}
        onSaved={() => { setEditing(false); refresh() }}
        onCancel={() => setEditing(false)}
        maxHeight={360}
      />
    )
  }
  return (
    <div>
      <SceneCanvasInline layout={resp.layout} itemAssets={itemAssets} maxHeight={360} />
      {resp.canEdit && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button className="rpg-btn rpg-btn--sm rpg-btn--primary" onClick={() => setEditing(true)}>
            Редактировать сцену
          </button>
        </div>
      )}
    </div>
  )
}

// SceneCanvasInline duplicates SceneViewer's internal canvas markup so
// the toggle can render the read-only view without re-fetching the layout
// (we already have `resp` in hand). When SceneViewer is refactored to
// expose its canvas as a standalone component, this can be deleted.
function SceneCanvasInline({
  layout,
  itemAssets,
  maxHeight,
}: {
  layout: import('@/features/Scene/api/sceneApi').SceneLayout
  itemAssets?: Record<string, { src?: string; label?: string }>
  maxHeight: number
}) {
  if (!layout.items || layout.items.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, minHeight: 180,
        background: 'var(--parch-1, #f6e9c8)', border: '3px dashed var(--ink-1, #5b4331)',
        color: 'var(--ink-2, #7d6850)', fontFamily: 'Pixelify Sans, monospace',
      }}>
        Комната пуста — нажми «Редактировать сцену», чтобы расставить предметы.
      </div>
    )
  }
  const aspect = layout.width / Math.max(1, layout.height)
  return (
    <div style={{
      position: 'relative', width: '100%', maxHeight,
      aspectRatio: `${layout.width} / ${layout.height}`,
      background: 'var(--parch-1, #f6e9c8)', border: '3px solid var(--ink-0, #2a1a0c)',
      overflow: 'hidden', boxShadow: '4px 4px 0 var(--ink-0, #2a1a0c)',
    }}>
      {[...layout.items].sort((a, b) => a.zIndex - b.zIndex).map((it, idx) => {
        const asset = itemAssets?.[it.itemId]
        const xPct = (it.x / layout.width) * 100
        const yPct = (it.y / layout.height) * 100
        const sizePct = 12 * it.scale
        const itemStyle: CSSProperties = {
            position: 'absolute',
            left: `${xPct}%`, top: `${yPct}%`,
            width: `${sizePct * aspect}%`,
            transform: `translate(-50%, -50%) rotate(${it.rotationDeg}deg) scaleX(${it.flipped ? -1 : 1})`,
            zIndex: it.zIndex, transformOrigin: 'center', pointerEvents: 'none',
        }
        return (
          <div key={`${it.itemId}-${idx}`} style={{
            ...itemStyle,
          }}>
            {renderSceneItemArt(asset?.src, asset?.label ?? it.itemId, 4)}
          </div>
        )
      })}
    </div>
  )
}

// ─── real-data builders ────────────────────────────────────────────────

function buildStatsFromProgress(p: ProfileProgress, t: (k: string) => string): Array<[string, string]> {
  const ov = p.overview
  const timeInWorld = formatHoursFromSessions(ov.practiceSessions + ov.completedMockSessions)
  const duels = `${ov.practicePassedSessions} / ${Math.max(0, ov.practiceSessions - ov.practicePassedSessions)}`
  return [
    [t('profile.stat.timeInWorld'), timeInWorld],
    [t('profile.stat.tasksSolved'), ov.practicePassedSessions.toLocaleString()],
    [t('profile.stat.duelsWon'), duels],
    [t('profile.stat.mockInterviews'), String(ov.completedMockSessions)],
    [t('profile.stat.podcastsHeard'), '—'],
    [t('profile.stat.trophies'), `${ov.level} (LVL)`],
  ]
}

function formatHoursFromSessions(sessions: number): string {
  // Rough placeholder: assume ~12min/session. The backend doesn't track
  // actual wall-clock yet; swap to a real `total_seconds` column when
  // the profile_overview gains one.
  const minutes = sessions * 12
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function buildInventoryFromOwned(items: OwnedItem[], t: (k: string) => string) {
  // Up to 14 tiles, then two "get more" lockers at the end — matches
  // the original grid rhythm so the hardcoded look-and-feel carries.
  const tiles = items.slice(0, 14).map((o) => ({
    n: o.item.name,
    c: o.item.accentColor || '#3d6149',
    r: (rarityLabel[o.item.rarity] || 'common') as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'locked',
  }))
  while (tiles.length < 16) {
    tiles.push({ n: t('profile.inv.getMore'), c: 'var(--parch-3)', r: 'locked' })
  }
  return tiles
}

function buildCosmeticsFromOwned(equipped: OwnedItem[]) {
  // Only cosmetics/pets/ambient slots appear in the "equipped" strip.
  const visible = equipped.filter(
    (o) =>
      o.item.category === ItemCategory.COSMETICS ||
      o.item.category === ItemCategory.PETS ||
      o.item.category === ItemCategory.AMBIENT,
  )
  return visible.slice(0, 6).map((o) => ({
    t: o.item.name,
    r: (rarityLabel[o.item.rarity] || 'common') as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary',
    icon: (
      <div
        style={{
          width: 20,
          height: 20,
          background: o.item.accentColor || 'var(--ember-3)',
          border: '2px solid var(--ink-0)',
        }}
      />
    ),
  }))
}

function buildInventory(t: (key: string) => string) {
  return [
    { n: t('profile.inv.bannerMoss'), c: '#3d6149', r: 'rare' as const },
    { n: t('profile.inv.bookshelf'), c: '#7a593a', r: 'common' as const },
    { n: t('profile.inv.torch'), c: '#b8692a', r: 'common' as const },
    { n: t('profile.inv.fireplace'), c: '#a23a2a', r: 'uncommon' as const },
    { n: t('profile.inv.stoneStatue'), c: '#9fb89a', r: 'epic' as const },
    { n: t('profile.inv.emberRug'), c: '#b8692a', r: 'rare' as const },
    { n: t('profile.inv.chestGold'), c: '#dcc690', r: 'rare' as const },
    { n: t('profile.inv.windowDusk'), c: '#3b6a8f', r: 'uncommon' as const },
    { n: t('profile.inv.ravenPerch'), c: '#3b2a1e', r: 'legendary' as const },
    { n: t('profile.inv.spiritOrb'), c: '#8fb8d4', r: 'epic' as const },
    { n: t('profile.inv.crystalLamp'), c: '#a27ac8', r: 'legendary' as const },
    { n: t('profile.inv.mossCarpet'), c: '#6b8a6a', r: 'common' as const },
    { n: t('profile.inv.weaponRack'), c: '#5a3f27', r: 'uncommon' as const },
    { n: t('profile.inv.trophyShelf'), c: '#e9b866', r: 'epic' as const },
    { n: t('profile.inv.getMore'), c: 'var(--parch-3)', r: 'locked' as const },
    { n: t('profile.inv.getMore'), c: 'var(--parch-3)', r: 'locked' as const },
  ]
}
