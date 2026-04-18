import { useEffect, useState } from 'react'
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
import type { ProfileProgress } from '@/entities/User/model/types'

export function ProfilePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [tweaks] = useTweaks()
  const [visitorMode, setVisitorMode] = useState(false)
  const [editRoom, setEditRoom] = useState(false)
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

  useEffect(() => {
    setInventoryFallback(buildInventory(t))
  }, [t])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    authApi.getProfileAchievements(user.id).then((a) => { if (!cancelled) setAchievements(a) }).catch(() => {})
    authApi.getProfileActivity(user.id).then((tl) => { if (!cancelled) setTimeline(tl) }).catch(() => {})
    authApi.getProfileProgress(user.id).then((p) => { if (!cancelled) setProgress(p) }).catch(() => {})
    shopApi.getInventory().then((items) => { if (!cancelled) setOwned(items) }).catch(() => {})
    return () => { cancelled = true }
  }, [user?.id])

  // Derive the three panels' data sources. When the backend hasn't
  // answered yet or failed we keep the hardcoded decor so the page
  // doesn't look broken.
  const stats = progress ? buildStatsFromProgress(progress, t) : buildStats(t)
  const inventory = owned && owned.length > 0 ? buildInventoryFromOwned(owned, t) : inventoryFallback
  const cosmetics = owned && owned.some((o) => o.equipped)
    ? buildCosmeticsFromOwned(owned.filter((o) => o.equipped))
    : fallbackCosmetics

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

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
  const displayName = fullName || user?.username || user?.telegramUsername || t('profile.title')
  const title = visitorMode ? `${displayName} · ${t('profile.visitorBadge', { defaultValue: 'visiting' })}` : displayName
  const subtitle = visitorMode
    ? t('profile.subtitleVisitor')
    : t('profile.subtitle')

  return (
    <>
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
              <RpgButton size="sm" onClick={() => setVisitorMode(false)}>
                {t('profile.exitVisitor')}
              </RpgButton>
              <RpgButton size="sm">{t('profile.sendGift')}</RpgButton>
              <RpgButton size="sm">{t('profile.follow')}</RpgButton>
              <RpgButton size="sm" variant="primary">
                {t('profile.challenge')}
              </RpgButton>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <RpgButton size="sm" onClick={() => setVisitorMode(true)}>
                {t('profile.viewAsVisitor')}
              </RpgButton>
              <RpgButton
                size="sm"
                variant={editRoom ? 'primary' : 'default'}
                onClick={() => setEditRoom((v) => !v)}
              >
                {editRoom ? t('profile.doneEditing') : t('profile.customize')}
              </RpgButton>
            </div>
          )
        }
      />

      {/* Chamber scene */}
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
            <Hero scale={5} pose={tweaks.heroPose} />
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
                <RpgButton size="sm">{t('profile.saveLayout')}</RpgButton>
                <RpgButton size="sm">{t('profile.reset')}</RpgButton>
              </>
            ) : (
              !visitorMode && (
                <>
                  <RpgButton size="sm" onClick={() => setEditRoom(true)}>
                    {t('profile.editLayout')}
                  </RpgButton>
                  <RpgButton size="sm">{t('profile.changeTheme')}</RpgButton>
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
      <div className="rpg-profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
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
            <Badge variant="ember">{t('profile.streakDays')}</Badge>
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
            >
              {t('profile.longestDays')}
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
              128/240
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
      <Panel variant="recessed" style={{ marginTop: 18 }}>
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
    </>
  )
}

function buildStats(t: (key: string) => string): Array<[string, string]> {
  return [
    [t('profile.stat.timeInWorld'), '214h 30m'],
    [t('profile.stat.tasksSolved'), '1,248'],
    [t('profile.stat.duelsWon'), '86 / 54'],
    [t('profile.stat.mockInterviews'), '42'],
    [t('profile.stat.podcastsHeard'), '73'],
    [t('profile.stat.trophies'), '38'],
  ]
}

function buildAchievements(t: (key: string) => string) {
  return [
    { t: t('profile.ach.firstBlood'), d: t('profile.ach.firstBloodDesc'), rare: 'common' as const },
    { t: t('profile.ach.nightOwl'), d: t('profile.ach.nightOwlDesc'), rare: 'uncommon' as const },
    { t: t('profile.ach.ravenWhisperer'), d: t('profile.ach.ravenWhispererDesc'), rare: 'rare' as const },
    { t: t('profile.ach.emberBearer'), d: t('profile.ach.emberBearerDesc'), rare: 'epic' as const },
    { t: t('profile.ach.siegebreaker'), d: t('profile.ach.siegebreakerDesc'), rare: 'epic' as const },
    { t: t('profile.ach.archmage'), d: t('profile.ach.archmageDesc'), rare: 'legendary' as const },
  ]
}

function buildTimeline(t: (key: string) => string) {
  return [
    { t: t('profile.tl.wonDuelWhen'), e: t('profile.tl.wonDuel'), meta: t('profile.tl.wonDuelMeta'), tag: 'arena' },
    { t: t('profile.tl.graphModuleWhen'), e: t('profile.tl.graphModule'), meta: t('profile.tl.graphModuleMeta'), tag: 'training' },
    { t: t('profile.tl.mockInterviewWhen'), e: t('profile.tl.mockInterview'), meta: t('profile.tl.mockInterviewMeta'), tag: 'mentor' },
    { t: t('profile.tl.equippedAuraWhen'), e: t('profile.tl.equippedAura'), meta: t('profile.tl.equippedAuraMeta'), tag: 'shop' },
    { t: t('profile.tl.guildRankWhen'), e: t('profile.tl.guildRank'), meta: t('profile.tl.guildRankMeta'), tag: 'guild' },
    { t: t('profile.tl.unlockedRavenWhen'), e: t('profile.tl.unlockedRaven'), meta: t('profile.tl.unlockedRavenMeta'), tag: 'trophy' },
  ]
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
