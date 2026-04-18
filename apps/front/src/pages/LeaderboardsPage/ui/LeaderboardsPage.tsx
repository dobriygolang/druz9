import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, Badge, RpgButton, PageHeader } from '@/shared/ui/pixel'
import { useAuth } from '@/app/providers/AuthProvider'
import {
  arenaApi,
  type ArenaLeaderboardEntry,
  type GuildLeaderboardEntry,
  type SeasonXPEntry,
} from '@/features/Arena/api/arenaApi'

type Tab = 'arena' | 'guilds' | 'season'
type Scope = 'global' | 'friends'

// Client-side taxonomy — not data, just filter options.
const TOPICS  = ['all', 'arrays', 'strings', 'trees', 'graphs', 'dp', 'systems']
const CLASSES = ['all', 'algo', 'backend', 'frontend', 'fullstack']

// Tier derivation from rating (used when backend doesn't return a league).
function tierFromRating(r: number): string {
  if (r >= 2200) return 'mythic'
  if (r >= 2000) return 'grandmaster'
  if (r >= 1800) return 'master'
  if (r >= 1600) return 'diamond'
  if (r >= 1400) return 'platinum'
  if (r >= 1200) return 'gold'
  return 'silver'
}

const RANK_COLOR = (i: number) =>
  i === 0 ? 'var(--ember-1)' : i === 1 ? 'var(--ink-2)' : i === 2 ? 'var(--r-legendary)' : 'var(--ink-1)'

function rowBg(i: number, isYou: boolean) {
  if (i < 3) return `linear-gradient(90deg, rgba(233,184,102,${0.18 - i * 0.05}) 0%, transparent 40%)`
  if (isYou) return 'rgba(184,105,42,0.1)'
  return 'transparent'
}

export function LeaderboardsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [tab, setTab]     = useState<Tab>('arena')
  const [scope, setScope] = useState<Scope>('global')
  const [topic, setTopic] = useState('all')
  const [klass, setKlass] = useState('all')
  const [arenaEntries, setArenaEntries] = useState<ArenaLeaderboardEntry[]>([])
  const [guildEntries, setGuildEntries] = useState<GuildLeaderboardEntry[]>([])
  const [seasonEntries, setSeasonEntries] = useState<SeasonXPEntry[]>([])
  const [seasonNumber, setSeasonNumber] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // Fetch all three boards in parallel so switching tabs is instant.
    Promise.all([
      arenaApi.getLeaderboard(100),
      arenaApi.getGuildsLeaderboard(20),
      arenaApi.getSeasonXPLeaderboard(50),
    ])
      .then(([arena, guilds, season]) => {
        if (cancelled) return
        setArenaEntries(arena)
        setGuildEntries(guilds)
        setSeasonEntries(season.entries)
        setSeasonNumber(season.seasonNumber)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Topic/class filtering on arena is server-side-TBD; for now we only
  // support friends-scope + client-side search on the array we already have.
  // When an endpoint accepts filters, swap this to a debounced re-fetch.
  const arenaRows = useMemo(() => {
    // `friend` relationship isn't exposed by the leaderboard endpoint yet;
    // in friends-scope we'd hit a separate endpoint. For now treat as
    // unfiltered and document the gap.
    return arenaEntries
  }, [arenaEntries])

  const youGlobalIdx = arenaEntries.findIndex(r => r.userId === user?.id)
  const youArena = youGlobalIdx >= 0 ? arenaEntries[youGlobalIdx] : null
  // With a 100-entry fetch the user is virtually always in-view; we still
  // keep the pinned-row slot here so once pagination lands we can show it.
  const youInView = youGlobalIdx >= 0 && youGlobalIdx < 20
  const youGlobal = youGlobalIdx + 1

  return (
    <>
      <PageHeader
        eyebrow={t('leaderboards.eyebrow')}
        title={t('leaderboards.title')}
        subtitle={t('leaderboards.subtitle')}
        right={
          <span className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}>
            {t('leaderboards.seasonInfo')}
          </span>
        }
      />

      {/* Tabs + scope toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
        <div className="rpg-tabs" style={{ marginBottom: 0 }}>
          {([['arena', t('leaderboards.tab.arena')], ['guilds', t('leaderboards.tab.guilds')], ['season', t('leaderboards.tab.season')]] as const).map(([id, label]) => (
            <div key={id} className={`rpg-tab ${tab === id ? 'rpg-tab--active' : ''}`} onClick={() => setTab(id as Tab)}>{label}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <RpgButton size="sm" variant={scope === 'global'  ? 'primary' : 'default'} onClick={() => setScope('global')}>{t('leaderboards.scope.global')}</RpgButton>
          <RpgButton size="sm" variant={scope === 'friends' ? 'primary' : 'default'} onClick={() => setScope('friends')}>{t('leaderboards.scope.friends')}</RpgButton>
        </div>
      </div>

      {/* Filters — only for arena */}
      {tab === 'arena' && (
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '10px 0', borderBottom: '2px dashed var(--ink-3)', marginBottom: 0, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>{t('leaderboards.filter.topic')}</span>
            {TOPICS.map(t => (
              <span key={t} className={`rpg-tweak-chip ${topic === t ? 'rpg-tweak-chip--on' : ''}`} onClick={() => setTopic(t)}>{t}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>{t('leaderboards.filter.class')}</span>
            {CLASSES.map(c => (
              <span key={c} className={`rpg-tweak-chip ${klass === c ? 'rpg-tweak-chip--on' : ''}`} onClick={() => setKlass(c)}>{c}</span>
            ))}
          </div>
        </div>
      )}

      <Panel style={{ padding: 0, overflow: 'hidden' }}>
        {/* Column headers */}
        {tab === 'arena' && (
          <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 140px 90px 90px', gap: 10, padding: '8px 12px', borderBottom: '2px solid var(--ink-0)', background: 'var(--parch-2)' }}>
            {[t('leaderboards.col.rank'), t('leaderboards.col.player'), t('leaderboards.col.tier'), 'ELO', t('leaderboards.col.deltaToday')].map(h => (
              <span key={h} className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>{h}</span>
            ))}
          </div>
        )}
        {tab === 'guilds' && (
          <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 90px 100px 120px', gap: 10, padding: '8px 12px', borderBottom: '2px solid var(--ink-0)', background: 'var(--parch-2)' }}>
            {[t('leaderboards.col.rank'), t('leaderboards.col.guild'), t('leaderboards.col.members'), t('leaderboards.col.points'), t('leaderboards.col.deltaToday')].map(h => (
              <span key={h} className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>{h}</span>
            ))}
          </div>
        )}
        {tab === 'season' && (
          <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px 120px', gap: 10, padding: '8px 12px', borderBottom: '2px solid var(--ink-0)', background: 'var(--parch-2)' }}>
            {[t('leaderboards.col.rank'), t('leaderboards.col.player'), t('leaderboards.col.seasonXp'), t('leaderboards.col.trophies')].map(h => (
              <span key={h} className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>{h}</span>
            ))}
          </div>
        )}

        {/* Rows */}
        {tab === 'arena' && loading && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-2)' }}>{t('leaderboards.loading')}</div>
        )}
        {tab === 'arena' && !loading && arenaRows.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-2)' }}>{t('leaderboards.empty')}</div>
        )}
        {tab === 'arena' && arenaRows.map((r, i) => {
          const isYou = r.userId === user?.id
          return (
            <div
              key={r.userId}
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr 140px 90px',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: rowBg(i, isYou),
                borderBottom: '1px dashed var(--ink-3)',
                borderLeft: isYou ? '4px solid var(--ember-1)' : 'none',
              }}
            >
              <span style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 20, color: RANK_COLOR(i) }}>#{i + 1}</span>
              <div>
                <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {r.displayName}
                  {isYou && <Badge variant="ember" style={{ fontSize: 8 }}>{t('leaderboards.you')}</Badge>}
                </div>
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                >
                  {t('leaderboards.record', { wins: r.wins, losses: r.matches - r.wins, winRate: Math.round(r.winRate * 100) })}
                </div>
              </div>
              <span className="font-silkscreen uppercase" style={{ fontSize: 10, letterSpacing: '0.06em' }}>
                {r.league || tierFromRating(r.rating)}
              </span>
              <span style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 18, color: 'var(--ember-1)' }}>
                {r.rating}
              </span>
            </div>
          )
        })}

        {/* Guild leaderboard */}
        {tab === 'guilds' && !loading && guildEntries.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-2)' }}>{t('leaderboards.noGuilds')}</div>
        )}
        {tab === 'guilds' && guildEntries.map((g, i) => (
          <div
            key={g.guildId}
            style={{
              display: 'grid',
              gridTemplateColumns: '48px 1fr 90px 100px 90px',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              background: rowBg(i, false),
              borderBottom: '1px dashed var(--ink-3)',
            }}
          >
            <span style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 20, color: RANK_COLOR(i) }}>#{i + 1}</span>
            <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14 }}>{g.name}</div>
            <span className="font-silkscreen uppercase" style={{ fontSize: 11 }}>{t('leaderboards.membersCount', { count: g.memberCount })}</span>
            <span className="font-silkscreen uppercase" style={{ fontSize: 11 }}>{t('leaderboards.pointsCount', { count: g.aggregatePoints })}</span>
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 11, color: g.deltaWeek >= 0 ? 'var(--moss-1)' : 'var(--rpg-danger)' }}
            >
              {g.deltaWeek >= 0 ? `+${g.deltaWeek}` : g.deltaWeek}
            </span>
          </div>
        ))}

        {/* Season XP leaderboard */}
        {tab === 'season' && !loading && seasonEntries.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-2)' }}>
            {t('leaderboards.noSeasonProgress')}
          </div>
        )}
        {tab === 'season' && seasonEntries.map((s, i) => {
          const isYou = s.userId === user?.id
          return (
            <div
              key={s.userId}
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr 100px 80px 90px',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: rowBg(i, isYou),
                borderBottom: '1px dashed var(--ink-3)',
                borderLeft: isYou ? '4px solid var(--ember-1)' : 'none',
              }}
            >
              <span style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 20, color: RANK_COLOR(i) }}>
                #{i + 1}
              </span>
              <div>
                <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
                  {s.displayName || s.username}
                  {isYou && <Badge variant="ember" style={{ fontSize: 8 }}>{t('leaderboards.you')}</Badge>}
                </div>
                {s.guildName && (
                  <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>
                    {s.guildName}
                  </div>
                )}
              </div>
              <span style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 16 }}>{s.xp.toLocaleString()}</span>
              <span className="font-silkscreen uppercase" style={{ fontSize: 10 }}>{t('leaderboards.tierValue', { tier: s.currentTier })}</span>
              <span className="font-silkscreen uppercase" style={{ fontSize: 10 }}>{s.trophies} 🏆</span>
            </div>
          )
        })}

        {tab === 'season' && seasonNumber > 0 && (
          <div style={{ padding: '6px 12px', fontSize: 9, color: 'var(--ink-3)', textAlign: 'center' }}>
            {t('leaderboards.seasonNumber', { number: seasonNumber })}
          </div>
        )}

        {/* Pinned "your rank" — only when you're out of the loaded page */}
        {tab === 'arena' && !youInView && youArena && (
          <>
            <div style={{ padding: '6px 12px', background: 'var(--ink-3)', textAlign: 'center' }}>
              <span className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--parch-2)', letterSpacing: '0.1em' }}>{t('leaderboards.yourPosition')}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 140px 90px', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(184,105,42,0.15)', borderTop: '2px solid var(--ember-1)', borderLeft: '4px solid var(--ember-1)' }}>
              <span style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 20, color: 'var(--ink-1)' }}>#{youGlobal}</span>
              <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
                {youArena.displayName}<Badge variant="ember" style={{ fontSize: 8 }}>{t('leaderboards.you')}</Badge>
              </div>
              <span className="font-silkscreen uppercase" style={{ fontSize: 10 }}>{youArena.league || tierFromRating(youArena.rating)}</span>
              <span style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 18, color: 'var(--ember-1)' }}>{youArena.rating}</span>
            </div>
          </>
        )}
      </Panel>
    </>
  )
}
