import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Panel, RpgButton, Bar, Badge, PageHeader } from '@/shared/ui/pixel'
import { Tour } from '@/features/Tour/ui/Tour'
import { Hero, Torch, Statue, Fireflies, Banner, SpiritOrb } from '@/shared/ui/sprites'
import { useGameUser } from '@/shared/lib/gameState'
import { useApi } from '@/shared/hooks/useApi'
import { useAuth } from '@/app/providers/AuthProvider'
import { authApi } from '@/features/Auth/api/authApi'
import type { ProfileProgress } from '@/entities/User/model/types'
import { hubApi, type HubOverview } from '@/features/Hub/api/hubApi'
import { DemoFlowOverlay } from '@/widgets/Overlays'

// Fallback nodes used pre-auth or when progress endpoint is offline.
// In normal operation `buildJourneyNodes()` derives them from real
// competencies so the path reflects actual progress.
const FALLBACK_JOURNEY_NODES = [
  { x: 20, y: 110, label: 'start', on: true, cur: false },
  { x: 120, y: 72, label: 'arrays', on: false, cur: false },
  { x: 220, y: 88, label: 'trees', on: false, cur: false },
  { x: 320, y: 60, label: 'graphs', on: false, cur: false },
  { x: 420, y: 48, label: 'dp', on: false, cur: false },
  { x: 500, y: 30, label: 'systems', on: false, cur: false },
]

const NODE_COORDS = [
  { x: 20, y: 110 },
  { x: 120, y: 72 },
  { x: 220, y: 88 },
  { x: 320, y: 60 },
  { x: 420, y: 48 },
  { x: 500, y: 30 },
]

function buildJourneyNodes(progress: ProfileProgress | null) {
  if (!progress) return FALLBACK_JOURNEY_NODES
  const comps = progress.competencies ?? []
  if (comps.length === 0) return FALLBACK_JOURNEY_NODES
  // Show up to 6 competencies ordered by score descending. Nodes with
  // score >= 40 are "on"; the first one below threshold is "current".
  const ordered = [...comps].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 6)
  let currentMarked = false
  return ordered.map((c, idx) => {
    const coord = NODE_COORDS[idx] ?? NODE_COORDS[NODE_COORDS.length - 1]
    const score = c.score ?? 0
    const on = score >= 40
    const cur = !on && !currentMarked
    if (cur) currentMarked = true
    return {
      x: coord.x,
      y: coord.y,
      label: (c.label || c.key || '').slice(0, 10) || `skill-${idx}`,
      on,
      cur,
    }
  })
}

export function HubPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const localUser = useGameUser()
  const { user: authUser } = useAuth()
  const [demoOpen, setDemoOpen] = useState(false)
  const { data, loading, error, refetch } = useApi(() => hubApi.getOverview(), [])

  const [progress, setProgress] = useState<ProfileProgress | null>(null)
  useEffect(() => {
    if (!authUser?.id) return
    let cancelled = false
    authApi.getProfileProgress(authUser.id).then((p) => {
      if (!cancelled) setProgress(p)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [authUser?.id])
  const journeyNodes = useMemo(() => buildJourneyNodes(progress), [progress])

  if (loading && !data) {
    return (
      <Panel>
        <div className="font-display" style={{ fontSize: 20, marginBottom: 8 }}>
          {t('hub.loading')}
        </div>
        <div style={{ color: 'var(--ink-2)', fontSize: 14 }}>
          {t('hub.loadingBody')}
        </div>
      </Panel>
    )
  }

  if (error && !data) {
    return (
      <Panel>
        <div className="font-display" style={{ fontSize: 20, marginBottom: 8 }}>
          {t('hub.unavailable')}
        </div>
        <div style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 12 }}>{error}</div>
        <RpgButton variant="primary" onClick={refetch}>
          {t('common.retry')}
        </RpgButton>
      </Panel>
    )
  }

  const overview = data ?? emptyOverview(localUser.name)
  const headerTitle = t('hub.welcomeBack', { name: overview.player.displayName })
  const headerSubtitle = buildHeaderSubtitle(overview, t)
  const quest = overview.quest
  const guildTitle = overview.guild?.name ?? t('hub.noGuildYet')
  const guildMembers = overview.guild?.memberPreview ?? []

  return (
    <>
      <Tour
        tourId="hub_intro"
        steps={[
          { selector: '[data-hub-section="quest"]', title: 'Твой квест', body: 'Главный недельный квест и его прогресс. Кликай по шагам — попадёшь на нужную страницу.' },
          { selector: '[data-hub-section="arena"]', title: 'Арена', body: 'Превью открытых матчей. Один клик — и ты в дуэли.' },
          { selector: '[data-hub-section="guild"]', title: 'Гильдия', body: 'Что делает твоя гильдия прямо сейчас. Войти в зал — клик по карточке.' },
        ]}
      />
      <PageHeader
        eyebrow={t('hub.eyebrow')}
        title={headerTitle}
        subtitle={headerSubtitle}
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {overview.player.title && <Badge>{overview.player.title}</Badge>}
            {overview.player.levelLabel && <Badge variant="dark">{overview.player.levelLabel}</Badge>}
            {typeof overview.player.streakDays === 'number' && (
              <Badge variant="ember">{t('hub.streakDays', { count: overview.player.streakDays })}</Badge>
            )}
            <RpgButton
              size="sm"
              variant="primary"
              onClick={() => {
                // quest.actionUrl sometimes arrives empty from the backend
                // (no next_actions + no non-completed missions). Fall back
                // to /atlas so the button always does something.
                const href = quest?.actionUrl && quest.actionUrl.trim() !== '' ? quest.actionUrl : '/atlas'
                navigate(href)
              }}
            >
              {quest?.actionLabel ?? t('hub.continueQuest')}
            </RpgButton>
          </div>
        }
      />

      {error && (
        <Panel variant="recessed" style={{ marginBottom: 18 }}>
          <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>
            {t('hub.staleWarning')}
          </div>
        </Panel>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 18,
          marginBottom: 18,
        }}
      >
        <Panel nailed style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              position: 'relative',
              height: 220,
              background: 'linear-gradient(180deg, #6b8a6a 0%, #3d6149 100%)',
              borderBottom: '4px solid var(--ink-0)',
            }}
          >
            <svg
              viewBox="0 0 400 120"
              preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}
            >
              <polygon
                points="0,120 0,80 60,50 120,65 200,40 280,60 360,35 400,55 400,120"
                fill="#2d4a35"
              />
            </svg>
            <div style={{ position: 'absolute', left: 20, bottom: 6 }}>
              <Hero scale={4} pose="trophy" />
            </div>
            <div style={{ position: 'absolute', left: 170, bottom: 10 }}>
              <Torch scale={3} />
            </div>
            <div style={{ position: 'absolute', right: 30, bottom: 6 }}>
              <Statue scale={3} color="#c7ab6e" />
            </div>
            <Fireflies count={6} />
            <div style={{ position: 'absolute', left: 16, top: 14 }}>
              <Badge variant="ember">{t('hub.mainQuest')}</Badge>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            <h2 className="font-display" style={{ fontSize: 22, marginBottom: 6 }}>
              {quest?.title ?? t('hub.chooseNextQuest')}
            </h2>
            <div style={{ color: 'var(--ink-2)', marginBottom: 12, fontSize: 14 }}>
              {quest?.description ?? t('hub.questFallback')}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Bar value={quest?.progressPct ?? 0} />
              <span
                className="font-silkscreen uppercase"
                style={{ fontSize: 11, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
              >
                {quest?.progressPct ?? 0}%
              </span>
              <RpgButton size="sm" variant="primary" onClick={() => {
                // quest.actionUrl sometimes arrives empty from the backend
                // (no next_actions + no non-completed missions). Fall back
                // to /atlas so the button always does something.
                const href = quest?.actionUrl && quest.actionUrl.trim() !== '' ? quest.actionUrl : '/atlas'
                navigate(href)
              }}>
                {quest?.actionLabel ?? t('hub.resume')}
              </RpgButton>
            </div>
          </div>
        </Panel>

        <Panel variant="dark">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 10,
            }}
          >
            <h3 className="font-display" style={{ fontSize: 17, color: 'var(--parch-0)' }}>
              {t('hub.arenaLive')}
            </h3>
            <span
              className="font-silkscreen uppercase"
              style={{
                fontSize: 10,
                color: 'var(--parch-2)',
                letterSpacing: '0.08em',
                opacity: 0.7,
              }}
            >
              {t('hub.itemsCount', { count: overview.arena.items.length })}
            </span>
          </div>
          {overview.arena.items.length > 0 ? (
            overview.arena.items.map((item, i) => (
              <button
                key={`${item.label}-${i}`}
                onClick={() => navigate(item.actionUrl ?? '/arena')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  marginBottom: 6,
                  width: '100%',
                  background: 'rgba(246,234,208,0.06)',
                  border: '2px solid rgba(246,234,208,0.15)',
                  fontFamily: 'Silkscreen, Unbounded, monospace',
                  fontSize: 11,
                  letterSpacing: '0.04em',
                  color: 'var(--parch-0)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: 'var(--ember-3)' }}>⚔</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                {item.meta && (
                  <span
                    style={{
                      color: 'var(--parch-2)',
                      fontSize: 9,
                      textAlign: 'right',
                    }}
                  >
                    {item.meta}
                  </span>
                )}
              </button>
            ))
          ) : (
            <EmptyCopy
              title={t('hub.noArenaPreview')}
              body={t('hub.noArenaPreviewBody')}
            />
          )}
          <RpgButton
            variant="primary"
            style={{ width: '100%', marginTop: 10 }}
            onClick={() => navigate('/arena')}
          >
            {t('hub.enterArena')}
          </RpgButton>
        </Panel>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 18,
          marginBottom: 18,
        }}
      >
        <Panel>
          <HeaderRow title={t('hub.dailyPacts')} rightMono={t('hub.activeCount', { count: overview.dailyMissions.length })} />
          {overview.dailyMissions.length > 0 ? (
            overview.dailyMissions.map((mission) => (
              <button
                key={mission.key}
                onClick={() => navigate(mission.actionUrl && mission.actionUrl.trim() !== '' ? mission.actionUrl : '/atlas')}
                className={`rpg-quest ${mission.completed ? 'rpg-quest--done' : ''}`}
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
              >
                <div className="rpg-quest__check" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 13 }}>{mission.title}</div>
                  {mission.rewardLabel && (
                    <div
                      className="font-silkscreen uppercase"
                      style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                    >
                      {mission.rewardLabel}
                    </div>
                  )}
                </div>
                <span
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 11, color: 'var(--ink-1)', letterSpacing: '0.08em' }}
                >
                  {mission.progressLabel ?? `${mission.current}/${mission.target}`}
                </span>
              </button>
            ))
          ) : (
            <EmptyCopy
              title={t('hub.noDailyMissions')}
              body={t('hub.noDailyMissionsBody')}
            />
          )}
        </Panel>

        <Panel>
          <HeaderRow
            title={t('hub.guildTitleDynamic', { name: guildTitle })}
            right={overview.guild ? <Badge variant="moss">{t('hub.visibleCount', { count: guildMembers.length })}</Badge> : undefined}
            rightMono={!overview.guild ? t('hub.soloMode') : undefined}
          />
          {overview.guild ? (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Banner scale={3} color="#3d6149" crest="✦" />
                <div style={{ flex: 1 }}>
                  <div
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                  >
                    {t('hub.memberPreview')}
                  </div>
                  <div
                    style={{
                      fontFamily: 'Pixelify Sans, Unbounded, monospace',
                      fontSize: 14,
                      marginBottom: 4,
                    }}
                  >
                    {overview.guild.name}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <Bar value={Math.min(100, guildMembers.length * 20)} variant="moss" />
                  </div>
                  <div
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                  >
                    {t('hub.guildSummary')}
                  </div>
                </div>
              </div>
              <div className="rpg-divider" />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {guildMembers.length > 0 ? guildMembers.map((n) => <MemberChip key={n}>{n}</MemberChip>) : <MemberChip filled>{t('hub.empty')}</MemberChip>}
              </div>
              <RpgButton
                variant="moss"
                style={{ width: '100%', marginTop: 12 }}
                onClick={() => navigate(overview.guild?.actionUrl ?? '/guild')}
              >
                {t('hub.enterGuildHall')}
              </RpgButton>
            </>
          ) : (
            <EmptyCopy
              title={t('hub.noGuildConnected')}
              body={t('hub.noGuildConnectedBody')}
            />
          )}
        </Panel>

        <Panel variant="recessed">
          <HeaderRow title={t('hub.upcoming')} rightMono={t('hub.townBoard')} />
          {overview.events.length > 0 ? (
            overview.events.map((event) => (
              <button
                key={event.id}
                onClick={() => navigate(event.actionUrl ?? '/events')}
                style={{
                  padding: '10px 10px',
                  background: 'var(--parch-0)',
                  border: '2px solid var(--ink-0)',
                  marginBottom: 8,
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {event.startsAt && (
                  <div
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 9, color: 'var(--ink-2)', marginBottom: 2, letterSpacing: '0.08em' }}
                  >
                    {formatEventDate(event.startsAt, i18n.language)}
                  </div>
                )}
                <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 13 }}>{event.title}</div>
                {event.meta && (
                  <div
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                  >
                    {event.meta}
                  </div>
                )}
              </button>
            ))
          ) : (
            <EmptyCopy
              title={t('hub.noUpcomingEvents')}
              body={t('hub.noUpcomingEventsBody')}
            />
          )}
        </Panel>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 18,
        }}
      >
        <Panel>
          <HeaderRow
            title={t('hub.yourJourney')}
            right={
              <div style={{ display: 'flex', gap: 6 }}>
                {overview.player.levelLabel && <Badge>{overview.player.levelLabel}</Badge>}
                {typeof overview.player.streakDays === 'number' && <Badge>{t('hub.streakDays', { count: overview.player.streakDays })}</Badge>}
                {overview.player.achievements && <Badge>{t('hub.trophiesCount', { count: overview.player.achievements.unlocked })}</Badge>}
              </div>
            }
          />
          <svg viewBox="0 0 520 140" style={{ width: '100%', height: 140 }}>
            <path
              d="M 20 110 Q 80 40, 160 80 T 320 60 T 500 30"
              fill="none"
              stroke="#5a3f27"
              strokeWidth="3"
              strokeDasharray="6 4"
            />
            {journeyNodes.map((n, idx) => (
              <g key={`${n.label}-${idx}`}>
                <rect
                  x={n.x - 10}
                  y={n.y - 10}
                  width={20}
                  height={20}
                  fill={n.cur ? '#b8692a' : n.on ? '#3d6149' : '#c7ab6e'}
                  stroke="#3b2a1a"
                  strokeWidth="3"
                />
                <text
                  x={n.x}
                  y={n.y + 30}
                  textAnchor="middle"
                  fontFamily="Silkscreen"
                  fontSize="10"
                  fill="#3b2a1a"
                >
                  {t(`hub.node.${n.label}`, { defaultValue: n.label })}
                </text>
              </g>
            ))}
          </svg>
          <div className="rpg-divider" />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <RpgButton size="sm" onClick={() => navigate('/atlas')}>
              {t('hub.openRoadmap')}
            </RpgButton>
            <RpgButton size="sm" variant="ghost" onClick={() => navigate('/interview')}>
              {t('hub.bookMentor')}
            </RpgButton>
            <RpgButton size="sm" variant="primary" onClick={() => setDemoOpen(true)}>
              {t('hub.demoWalkthrough')}
            </RpgButton>
            <div style={{ flex: 1 }} />
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
            >
              {quest ? t('hub.questLinked', { url: quest.actionUrl }) : t('hub.noActiveRecommendation')}
            </span>
          </div>
        </Panel>

        <Panel variant="wood">
          <h3 className="font-display" style={{ fontSize: 17, color: 'var(--parch-0)' }}>
            {t('hub.merchantPick')}
          </h3>
          <div
            className="font-silkscreen uppercase"
            style={{
              color: 'var(--parch-2)',
              marginBottom: 12,
              fontSize: 10,
              letterSpacing: '0.1em',
            }}
          >
            {t('hub.merchantPending')}
          </div>
          {overview.merchantPicks.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {overview.merchantPicks.map((item) => (
                <button
                  key={item.id}
                  className={`rpg-item-card ${item.rarity ? `rpg-rarity-border--${item.rarity}` : ''}`}
                  onClick={() => navigate(item.actionUrl ?? '/shop')}
                  style={{ background: 'var(--parch-0)', textAlign: 'left', cursor: 'pointer' }}
                >
                  <div className="rpg-item-card__art" style={{ overflow: 'hidden' }}>
                    <MerchantIcon rarity={item.rarity} />
                  </div>
                  <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 12, marginTop: 6 }}>
                    {item.name}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 2,
                    }}
                  >
                    <span className={`rpg-rarity ${item.rarity ? `rpg-rarity--${item.rarity}` : ''}`}>{item.rarity ? t(`hub.rarity.${item.rarity}`) : t('hub.itemFallback')}</span>
                    {item.priceLabel && <span className="rpg-coin">{item.priceLabel}</span>}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyCopy
              title={t('hub.merchantEmpty')}
              body={t('hub.merchantEmptyBody')}
              dark
            />
          )}
          <RpgButton style={{ width: '100%', marginTop: 12 }} onClick={() => navigate('/shop')}>
            {t('hub.visitMerchant')}
          </RpgButton>
        </Panel>
      </div>
      {demoOpen && <DemoFlowOverlay onClose={() => setDemoOpen(false)} />}
    </>
  )
}

function HeaderRow({
  title,
  right,
  rightMono,
}: {
  title: string
  right?: React.ReactNode
  rightMono?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 10,
        gap: 8,
      }}
    >
      <h3 className="font-display" style={{ fontSize: 17, color: 'var(--ink-0)' }}>
        {title}
      </h3>
      {right ??
        (rightMono && (
          <span
            className="font-silkscreen uppercase"
            style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
          >
            {rightMono}
          </span>
        ))}
    </div>
  )
}

function MemberChip({
  children,
  filled = false,
}: {
  children: React.ReactNode
  filled?: boolean
}) {
  return (
    <div
      style={{
        padding: '3px 7px',
        border: '2px solid var(--ink-0)',
        background: filled ? 'var(--parch-2)' : 'var(--parch-0)',
        fontFamily: 'Silkscreen, Unbounded, monospace',
        fontSize: 9,
        letterSpacing: '0.06em',
      }}
    >
      {children}
    </div>
  )
}

function EmptyCopy({ title, body, dark = false }: { title: string; body: string; dark?: boolean }) {
  return (
    <div
      style={{
        border: `2px dashed ${dark ? 'rgba(246,234,208,0.24)' : 'var(--ink-3)'}`,
        padding: 12,
        color: dark ? 'var(--parch-2)' : 'var(--ink-2)',
      }}
    >
      <div className="font-display" style={{ fontSize: 16, color: dark ? 'var(--parch-0)' : 'var(--ink-0)', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 13 }}>{body}</div>
    </div>
  )
}

function MerchantIcon({ rarity }: { rarity?: string }) {
  if (rarity === 'rare' || rarity === 'epic') {
    return <SpiritOrb scale={3} />
  }
  return <Torch scale={2} />
}


function formatEventDate(value: string, locale: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildHeaderSubtitle(
  overview: HubOverview,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const parts = [
    overview.quest?.description,
    overview.events[0]?.title ? t('hub.nextEvent', { title: overview.events[0].title }) : '',
    typeof overview.player.streakDays === 'number' ? t('hub.streakShort', { count: overview.player.streakDays }) : '',
  ].filter(Boolean)
  return parts.join(' · ') || t('hub.quietTown')
}

function emptyOverview(name: string): HubOverview {
  return {
    player: { id: '', displayName: name },
    dailyMissions: [],
    quest: null,
    arena: { items: [] },
    events: [],
    guild: null,
    merchantPicks: [],
    activeSeason: null,
  }
}
