import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, RpgButton, Badge, PageHeader, SkeletonRow } from '@/shared/ui/pixel'
import { Sword, Banner, Hero } from '@/shared/ui/sprites'
import { useAuth } from '@/app/providers/AuthProvider'
import { arenaApi, arenaMatchmaking, type ArenaLeaderboardEntry, type ArenaStats } from '@/features/Arena/api/arenaApi'
import { duelReplayApi, type ReplaySummary } from '@/features/DuelReplay'
import { useActiveSeason } from '@/features/Hub/api/useActiveSeason'
import { Tour } from '@/features/Tour/ui/Tour'

// Team slots are a pure UI concept for now: the authenticated user + one
// invite placeholder. Wire to a real team API when available.
interface TeamSlot {
  name: string
  tier?: string
  elo?: number
  you?: boolean
  friend?: boolean
  placeholder?: boolean
}

function tierFromRating(rating: number): string {
  if (rating >= 2200) return 'mythic'
  if (rating >= 2000) return 'grandmaster'
  if (rating >= 1800) return 'master'
  if (rating >= 1600) return 'diamond'
  if (rating >= 1400) return 'platinum'
  if (rating >= 1200) return 'gold'
  if (rating >= 1000) return 'silver'
  return 'bronze'
}

function relTime(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  const days = Math.floor(diff / 86_400_000)
  return days === 1 ? 'yesterday' : `${days}d`
}

export function ArenaHubPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const season = useActiveSeason()
  const [matchmaking, setMatchmaking] = useState(false)
  const [teamMatchmaking, setTeamMatchmaking] = useState(false)

  // Live data from API.
  const [ladder, setLadder] = useState<ArenaLeaderboardEntry[]>([])
  const [ladderLoaded, setLadderLoaded] = useState(false)
  const [recent, setRecent] = useState<ReplaySummary[]>([])
  const [stats, setStats] = useState<ArenaStats | null>(null)

  useEffect(() => {
    let cancelled = false
    arenaApi
      .getLeaderboard(5)
      .then((list) => { if (!cancelled) setLadder(list) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLadderLoaded(true) })
    duelReplayApi
      .listMine({ limit: 5 })
      .then((r) => { if (!cancelled) setRecent(r.replays) })
      .catch(() => {})
    if (user?.id) {
      arenaApi
        .getPlayerStats(user.id)
        .then((s) => { if (!cancelled) setStats(s) })
        .catch(() => {})
    }
    return () => { cancelled = true }
  }, [user?.id])

  const teamSlots = useMemo<TeamSlot[]>(() => [
    { name: user?.username ?? t('arenaHub.you'), tier: stats ? tierFromRating(stats.rating) : '—', elo: stats?.rating ?? 0, you: true },
    { name: t('arenaHub.inviteFriend'), placeholder: true },
  ], [user, stats, t])

  const MODES = [
    {
      title: t('arenaHub.mode.ranked'),
      desc: t('arenaHub.mode.rankedDesc'),
      reward: '+elo · +ember · +gold',
      hot: true,
      badge: 'queue 8s',
    },
    { title: t('arenaHub.mode.friendly'), desc: t('arenaHub.mode.friendlyDesc'), reward: 'xp · small coin' },
    {
      title: t('arenaHub.mode.gvg'),
      desc: t('arenaHub.mode.gvgDesc'),
      reward: 'seasonal relic · guild xp',
      badge: 'sat 12:00',
    },
    { title: t('arenaHub.mode.blitz'), desc: t('arenaHub.mode.blitzDesc'), reward: 'fast xp · tokens' },
  ]
  const startTeamQueue = () => {
    setTeamMatchmaking(true)
    setTimeout(() => { setTeamMatchmaking(false); navigate('/duel?mode=team2v2') }, 3000)
  }

  const [queueId, setQueueId] = useState<string | null>(null)
  const [queueWait, setQueueWait] = useState(0)
  const [soloOffer, setSoloOffer] = useState(false)

  // Poll the backend queue every 2s while waiting. On MATCHED, route to
  // the assigned match; on TIMEOUT surface the solo-timed fallback.
  useEffect(() => {
    if (!queueId) return
    let cancelled = false
    const tick = async () => {
      try {
        const s = await arenaMatchmaking.status(queueId)
        if (cancelled) return
        setQueueWait(s.waitedSeconds)
        if (s.status === 'MATCHED' && s.matchId) {
          setQueueId(null)
          setMatchmaking(false)
          navigate(`/arena/match/${s.matchId}`)
        } else if (s.status === 'TIMEOUT' || s.status === 'CANCELLED') {
          setQueueId(null)
          setMatchmaking(false)
          if (s.status === 'TIMEOUT') setSoloOffer(true)
        }
      } catch {
        // Keep polling on transient errors; client-side timeout handled
        // separately by the backend's 30s TIMEOUT status.
      }
    }
    const iv = setInterval(tick, 2000)
    void tick()
    return () => { cancelled = true; clearInterval(iv) }
  }, [queueId, navigate])

  const enterDuel = async () => {
    setMatchmaking(true)
    setSoloOffer(false)
    try {
      const { queueId: qid } = await arenaMatchmaking.enqueue('ranked_1v1')
      setQueueId(qid)
    } catch {
      // Fallback to the legacy client-side redirect so staging doesn't
      // deadlock if the queue RPC is unreachable.
      setMatchmaking(false)
      navigate('/duel?mode=ranked')
    }
  }

  const cancelQueue = async () => {
    if (queueId) {
      try { await arenaMatchmaking.leave(queueId) } catch { /* best-effort */ }
    }
    setQueueId(null)
    setMatchmaking(false)
  }

  const acceptSolo = () => {
    setSoloOffer(false)
    navigate('/duel?mode=solo_timed')
  }

  return (
    <>
      {/* ADR-004 — first-time-on-arena tour. Server tracks dismissal in
          user_tours; subsequent visits skip silently. */}
      <Tour
        tourId="arena_intro"
        steps={[
          {
            selector: '[data-tour=arena-modes]',
            title: 'Дуэли и режимы',
            body: 'Здесь живут все режимы боёв: ranked 1v1, casual и командные дуэли 2v2. Начни с ranked, чтобы видеть свой ELO.',
          },
          {
            selector: '[data-tour=arena-ladder]',
            title: 'Топ игроков',
            body: 'Лестница рангов сезона. Клик на любую строку — открывает профиль игрока.',
          },
          {
            selector: '[data-tour=arena-replays]',
            title: 'Реплеи',
            body: 'Можно пересмотреть любой свой бой кадр за кадром — полезно для разбора ошибок.',
          },
        ]}
      />

      {/* Matchmaking overlay */}
      {matchmaking && (
        <div className="rpg-modal-backdrop">
          <div className="rpg-panel rpg-panel--nailed" style={{ padding: 32, maxWidth: 400, textAlign: 'center' }}>
            <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 8 }}>
              {t('arenaHub.matchmaking')}
            </div>
            <h3 className="font-display" style={{ fontSize: 20, marginBottom: 4 }}>{t('arenaHub.searching')}</h3>
            <div style={{ color: 'var(--ink-2)', fontSize: 12, marginBottom: 16 }}>
              {t('arenaHub.eloInfo')} · {queueWait}s
            </div>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <div style={{ marginTop: 16 }}>
              <RpgButton size="sm" variant="ghost" onClick={cancelQueue}>Cancel</RpgButton>
            </div>
          </div>
        </div>
      )}

      {soloOffer && (
        <div className="rpg-modal-backdrop" onClick={() => setSoloOffer(false)}>
          <div className="rpg-panel rpg-panel--nailed" onClick={(e) => e.stopPropagation()}
            style={{ padding: 28, maxWidth: 420, textAlign: 'center' }}>
            <h3 className="font-display" style={{ fontSize: 18, marginBottom: 8 }}>No opponents online</h3>
            <div style={{ color: 'var(--ink-2)', fontSize: 12, marginBottom: 20 }}>
              Solo-timed mode — race the clock, results posted to the solo leaderboard.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <RpgButton size="sm" variant="ghost" onClick={() => setSoloOffer(false)}>Not now</RpgButton>
              <RpgButton size="sm" variant="primary" onClick={acceptSolo}>Play solo</RpgButton>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        eyebrow={t('arenaHub.eyebrow')}
        title={t('arenaHub.title')}
        subtitle={t('arenaHub.subtitle')}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <RpgButton size="sm" onClick={() => navigate('/duel/replay')}>
              {t('arenaHub.matchHistory')}
            </RpgButton>
            <RpgButton size="sm" variant="primary" onClick={enterDuel}>
              {t('arenaHub.findDuel')}
            </RpgButton>
          </div>
        }
      />

      <div
        className="rpg-arena-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr',
          gap: 18,
          marginBottom: 18,
        }}
      >
        {/* Ladder */}
        <Panel variant="dark" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '3px dashed rgba(246,234,208,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h3 className="font-display" style={{ fontSize: 17, color: 'var(--parch-0)' }}>
                {t('arenaHub.seasonLadder')}
              </h3>
              <span
                className="font-silkscreen uppercase"
                style={{ color: 'var(--parch-2)', fontSize: 10, letterSpacing: '0.08em', opacity: 0.7 }}
              >
                {season
                  ? `${t('arenaHub.season', { defaultValue: 'season' })} ${season.roman} · ${season.daysLeftLabel}`
                  : t('arenaHub.offSeason', { defaultValue: 'off-season' })}
              </span>
            </div>
          </div>
          <div style={{ padding: '14px 18px' }}>
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div
                className="font-silkscreen uppercase"
                style={{ color: 'var(--parch-2)', fontSize: 10, letterSpacing: '0.08em', opacity: 0.7 }}
              >
                {t('arenaHub.yourElo')}
              </div>
              <div
                style={{
                  fontFamily: 'Pixelify Sans, monospace',
                  fontSize: 52,
                  color: 'var(--ember-3)',
                  lineHeight: 1,
                }}
              >
                {stats?.rating ?? '—'}
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{
                  color: 'var(--parch-2)',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  marginTop: 4,
                  opacity: 0.7,
                }}
              >
                {stats ? `${stats.league} · rank ${stats.leagueRank}/${stats.leagueTotal}` : t('arenaHub.rank', { points: 0 })}
              </div>
            </div>
            <div style={{ height: 0, borderTop: '2px dashed rgba(246,234,208,0.2)', margin: '12px 0' }} />
            {ladder.length === 0 && (
              <div style={{ color: 'var(--parch-2)', opacity: 0.6, fontSize: 12, padding: '8px 0', textAlign: 'center' }}>
                {ladderLoaded ? t('arenaHub.ladderEmpty', { defaultValue: 'ladder is empty — be the first to climb' }) : t('arenaHub.ladderLoading', { defaultValue: 'loading ladder…' })}
              </div>
            )}
            {ladder.map((p, i) => {
              const isYou = p.userId === user?.id
              return (
                <div
                  key={p.userId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 8px',
                    borderBottom:
                      i < ladder.length - 1 ? '1px dashed rgba(246,234,208,0.15)' : 'none',
                    color: 'var(--parch-0)',
                    opacity: isYou ? 1 : 0.8,
                    background: isYou ? 'rgba(233,184,102,0.08)' : 'transparent',
                    fontSize: 12,
                  }}
                >
                  <span
                    className="font-silkscreen uppercase"
                    style={{
                      width: 24,
                      color: 'var(--ember-3)',
                      fontSize: 10,
                      letterSpacing: '0.08em',
                    }}
                  >
                    #{i + 1}
                  </span>
                  <span
                    style={{ flex: 1, fontFamily: 'Pixelify Sans, monospace', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}
                  >
                    {p.displayName}
                    {isYou && (
                      <span className="rpg-badge rpg-badge--ember" style={{ fontSize: 9 }}>
                        you
                      </span>
                    )}
                  </span>
                  <span
                    className="font-silkscreen uppercase"
                    style={{ opacity: 0.7, fontSize: 10, letterSpacing: '0.06em' }}
                  >
                    {p.league || tierFromRating(p.rating)}
                  </span>
                  <span
                    className="font-silkscreen uppercase"
                    style={{
                      color: 'var(--ember-3)',
                      width: 50,
                      textAlign: 'right',
                      fontSize: 11,
                      letterSpacing: '0.06em',
                    }}
                  >
                    {p.rating}
                  </span>
                </div>
              )
            })}
          </div>
        </Panel>

        {/* Mode picker */}
        <Panel>
          <h3 className="font-display" style={{ fontSize: 17 }}>
            {t('arenaHub.chooseBattle')}
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
            {t('arenaHub.modesInfo')}
          </div>
          {MODES.map((m) => (
            <div
              key={m.title}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: 14,
                background: m.hot ? 'var(--parch-0)' : 'var(--parch-2)',
                border: '3px solid var(--ink-0)',
                marginBottom: 8,
                borderLeft: m.hot ? '6px solid var(--ember-1)' : '3px solid var(--ink-0)',
                paddingLeft: m.hot ? 8 : 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  background: 'var(--ink-0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sword scale={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 15 }}>
                  {m.title}
                </div>
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                >
                  {m.desc}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  className="font-silkscreen uppercase"
                  style={{ color: 'var(--ember-1)', fontSize: 10, letterSpacing: '0.08em' }}
                >
                  {m.reward}
                </div>
                {m.badge && (
                  <Badge variant="ember" style={{ marginTop: 4 }}>
                    {m.badge}
                  </Badge>
                )}
              </div>
              <RpgButton size="sm" variant={m.hot ? 'primary' : 'default'} onClick={enterDuel}>
                {t('arenaHub.enter')}
              </RpgButton>
            </div>
          ))}
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18 }}>
        <Panel>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 10,
            }}
          >
            <h3 className="font-display" style={{ fontSize: 17 }}>
              {t('arenaHub.recentDuels')}
            </h3>
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
            >
              {t('arenaHub.last10')}
            </span>
          </div>
          {recent.length === 0 && (
            <div style={{ color: 'var(--ink-2)', fontSize: 12, padding: '12px 0', textAlign: 'center' }}>
              {t('arenaHub.noRecentDuels')}
            </div>
          )}
          {recent.map((r, i) => {
            const youWon = r.winnerId === user?.id
            const oppName = r.player1Id === user?.id ? r.player2Username : r.player1Username
            const difficultyLabel = r.taskDifficulty === 3 ? 'hard' : r.taskDifficulty === 2 ? 'medium' : 'easy'
            return (
              <div
                key={r.id}
                onClick={() => navigate(`/duel/replay/${r.id}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 130px 80px',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 4px',
                  borderBottom: i < recent.length - 1 ? '1px dashed var(--ink-3)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--parch-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span
                  className="rpg-badge"
                  style={{
                    background: youWon ? 'var(--moss-1)' : 'var(--rpg-danger, #a23a2a)',
                    color: 'var(--parch-0)',
                    borderColor: 'var(--ink-0)',
                    justifyContent: 'center',
                  }}
                >
                  {youWon ? t('arenaHub.victory') : t('arenaHub.defeat')}
                </span>
                <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14 }}>
                  {t('arenaHub.vsOpponent', { name: oppName })}
                </div>
                <span
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                >
                  {t(`arena.diff.${difficultyLabel}`)} · {r.taskTopic}
                </span>
                <span
                  className="font-silkscreen uppercase"
                  style={{
                    fontSize: 10,
                    color: 'var(--ink-2)',
                    letterSpacing: '0.08em',
                    textAlign: 'right',
                  }}
                >
                  {relTime(r.completedAt)}
                </span>
              </div>
            )
          })}
        </Panel>

        <Panel variant="wood">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 10,
            }}
          >
            <h3 className="font-display" style={{ fontSize: 17, color: 'var(--parch-0)' }}>
              {t('arenaHub.guildRivalry')}
            </h3>
            <span
              className="font-silkscreen uppercase"
              style={{ color: 'var(--ember-3)', fontSize: 10, letterSpacing: '0.08em' }}
            >
              {t('arenaHub.live')}
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 50px 1fr',
              alignItems: 'center',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <Banner scale={2} color="#3d6149" crest="✦" />
              <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14, color: 'var(--parch-0)' }}>
                {t('arenaHub.guild.mossveil')}
              </div>
              <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 28, color: 'var(--ember-3)' }}>
                14
              </div>
            </div>
            <div
              style={{
                fontFamily: 'Pixelify Sans, monospace',
                fontSize: 22,
                textAlign: 'center',
                color: 'var(--parch-0)',
              }}
            >
              vs
            </div>
            <div style={{ textAlign: 'center' }}>
              <Banner scale={2} color="#a23a2a" crest="◆" />
              <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14, color: 'var(--parch-0)' }}>
                {t('arenaHub.guild.redRavens')}
              </div>
              <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 28, color: 'var(--ember-3)' }}>
                11
              </div>
            </div>
          </div>
          <div
            className="font-silkscreen uppercase"
            style={{
              color: 'var(--parch-2)',
              opacity: 0.7,
              fontSize: 10,
              letterSpacing: '0.08em',
              marginBottom: 8,
            }}
          >
            {t('arenaHub.battleBanner')}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Badge variant="ember">{t('arenaHub.reward.seasonalRelic')}</Badge>
            <Badge>{t('arenaHub.reward.hallBanner')}</Badge>
            <Badge>{t('arenaHub.reward.guildGold')}</Badge>
          </div>
        </Panel>
      </div>

      {/* Team mode */}
      <Panel style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <div>
            <h3 className="font-display" style={{ fontSize: 17 }}>{t('arenaHub.team.title')}</h3>
            <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>
              {t('arenaHub.team.subtitle')}
            </div>
          </div>
          <Badge variant="ember">{t('arenaHub.team.beta')}</Badge>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 14, alignItems: 'center', marginBottom: 18 }}>
          {/* Our team */}
          <div style={{ background: 'var(--parch-2)', border: '3px solid var(--ink-0)', padding: 14 }}>
            <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 10 }}>
              {t('arenaHub.team.yourTeam')}
            </div>
            {teamSlots.map((m) => (
              <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, background: 'var(--ink-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Hero scale={1} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                    {m.name}
                    {m.you && <Badge variant="ember" style={{ fontSize: 8 }}>{t('arenaHub.you')}</Badge>}
                    {m.friend && <Badge variant="dark" style={{ fontSize: 8 }}>{t('arenaHub.friend')}</Badge>}
                  </div>
                  <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.06em' }}>
                    {m.tier} · {m.elo}
                  </div>
                </div>
              </div>
            ))}
            {/* Team queue with a single invite slot; backend team-slot API
                 is not yet shipped — the second slot is always a placeholder. */}
          </div>

          <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 22, textAlign: 'center', color: 'var(--ink-2)' }}>vs</div>

          {/* Enemy team (TBD) */}
          <div style={{ background: 'var(--parch-2)', border: '3px dashed var(--ink-3)', padding: 14 }}>
            <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', marginBottom: 10 }}>
              {t('arenaHub.team.opponents')}
            </div>
            {[0, 1].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, background: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 16, color: 'var(--parch-2)' }}>?</span>
                </div>
                <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                  {t('arenaHub.searching')}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <RpgButton
            variant="primary"
            onClick={startTeamQueue}
            disabled={teamMatchmaking}
          >
            {teamMatchmaking ? t('arenaHub.team.queuing') : t('arenaHub.team.startQueue')}
          </RpgButton>
          <RpgButton size="sm" variant="ghost" onClick={() => navigate('/inbox?tab=friends')}>
            {t('arenaHub.team.inviteFromFriends')}
          </RpgButton>
          <span className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em', marginLeft: 'auto' }}>
            {t('arenaHub.team.avgElo', { elo: Math.round(
              teamSlots.filter(m => (m.elo ?? 0) > 0).reduce((s, m) => s + (m.elo ?? 0), 0) /
              Math.max(1, teamSlots.filter(m => (m.elo ?? 0) > 0).length)
            ) })}
          </span>
        </div>

        {teamMatchmaking && (
          <div style={{ marginTop: 14, padding: 14, background: 'var(--parch-2)', border: '2px solid var(--ember-1)', borderLeft: '6px solid var(--ember-1)' }}>
            <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 8 }}>
              {t('arenaHub.team.findingOpponents')}
            </div>
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}
      </Panel>
    </>
  )
}
