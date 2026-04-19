import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Panel, RpgButton, Badge } from '@/shared/ui/pixel'
import { Hero } from '@/shared/ui/sprites'
import { useAuth } from '@/app/providers/AuthProvider'
import { useArenaWs } from '@/features/CodeRoom/hooks/useArenaWs'

// When ?match=<id> is present we bind players, timer and task from the
// realtime WS hook; otherwise the page runs in "demo" mode with the
// hardcoded sample content so the route stays accessible from the nav
// without requiring an active duel.
const SAMPLE_CODE = `# BFS from source, count shortest paths
from collections import defaultdict, deque

def count_paths(n, edges):
    g = defaultdict(list)
    for a, b in edges:
        g[a].append(b)

    dist = [float('inf')] * n
    ways = [0] * n
    dist[0] = 0
    ways[0] = 1
    q = deque([0])

    while q:
        u = q.popleft()
        for v in g[u]:
            if dist[v] > dist[u] + 1:
                dist[v] = dist[u] + 1
                ways[v] = ways[u]
                q.append(v)
            elif dist[v] == dist[u] + 1:
                ways[v] += ways[u]
    return ways[n - 1]

# TODO: mod 10^9+7 for hidden large case_`

const TAUNTS = ['gg', 'close one', '🔥', 'so close']

const BUFFS = [
  { name: 'Moonveil aura', effect: '+5% xp', rarity: 'epic' },
  { name: 'Ember streak', effect: '+10% elo', rarity: 'rare' },
  { name: 'Guild morale', effect: '+3 HP/min', rarity: 'uncommon' },
]

const TESTS = [
  { name: 'sample 1', status: 'passed', color: 'moss' as const },
  { name: 'sample 2', status: 'passed', color: 'moss' as const },
  { name: 'hidden · small', status: 'running...', color: 'ember' as const },
  { name: 'hidden · large', status: 'pending', color: 'mute' as const },
]

export function DuelLivePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const matchId = searchParams.get('match') || undefined

  // Fallback countdown for demo mode (no matchId). Real matches drive
  // the timer from match.startedAt + durationSeconds recomputed every
  // tick so clock drift can't desync us from the backend.
  const [demoTime, setDemoTime] = useState(252)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (matchId) {
      const id = setInterval(() => setNow(Date.now()), 1000)
      return () => clearInterval(id)
    }
    const id = setInterval(() => setDemoTime((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [matchId])

  const ws = useArenaWs({
    matchId,
    userId: user?.id,
    displayName: user?.username || user?.firstName || 'you',
    enabled: !!matchId,
  })

  // Resolve self / opponent from the live players array. When there are
  // <2 players connected we still render what we have; the foe panel
  // falls back to "waiting" text.
  const self = useMemo(() => ws.players.find((p) => p.userId === user?.id) ?? null, [ws.players, user?.id])
  const foe = useMemo(() => ws.players.find((p) => p.userId !== user?.id) ?? null, [ws.players, user?.id])

  // Timer: either driven by backend match state or the demo countdown.
  let remainingSec = demoTime
  if (matchId && ws.matchState?.startedAt && ws.matchState.durationSeconds) {
    const endsAt = new Date(ws.matchState.startedAt).getTime() + ws.matchState.durationSeconds * 1000
    remainingSec = Math.max(0, Math.floor((endsAt - now) / 1000))
  }
  const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0')
  const ss = String(remainingSec % 60).padStart(2, '0')

  const taskTitle = ws.matchState?.taskTitle || 'Dungeon Paths'
  const taskStatement =
    ws.matchState?.taskStatement ||
    'Given a directed graph of N caves where some pairs are connected by tunnels, find the number of distinct shortest paths from cave 0 to cave N−1.'
  const selfName = self?.displayName || (matchId ? ws.connected ? 'you' : 'connecting…' : 'thornmoss')
  const foeName = foe?.displayName || (matchId ? 'waiting…' : 'glowbeacon')
  const selfCode = self?.code || ''

  return (
    <>
      {/* Match banner */}
      <Panel variant="dark" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.4,
            background: 'linear-gradient(180deg, rgba(184,41,42,0.3) 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 200px 1fr',
            alignItems: 'center',
            padding: '14px 20px',
            position: 'relative',
          }}
        >
          {/* You */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Hero scale={3} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span
                  style={{
                    fontFamily: 'Pixelify Sans, Unbounded, monospace',
                    fontSize: 22,
                    color: 'var(--parch-0)',
                  }}
                >
                  {selfName}
                </span>
                <span
                  className="font-silkscreen uppercase"
                  style={{ color: 'var(--ember-3)', fontSize: 10, letterSpacing: '0.08em' }}
                >
                  elo 1847
                </span>
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{
                  color: 'var(--parch-2)',
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                }}
              >
                mossveil · master
              </div>
              <div className="rpg-hp-bar">
                <div className="rpg-hp-bar__fill" style={{ width: '72%' }} />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 4,
                }}
              >
                <span
                  className="font-silkscreen uppercase"
                  style={{ color: 'var(--parch-2)', fontSize: 9, letterSpacing: '0.08em' }}
                >
                  HP 72 · 2/3 tests
                </span>
                <span
                  className="font-silkscreen uppercase"
                  style={{ color: 'var(--ember-3)', fontSize: 9, letterSpacing: '0.08em' }}
                >
                  +2 combo
                </span>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div style={{ textAlign: 'center' }}>
            <div
              className="font-silkscreen uppercase"
              style={{ color: 'var(--parch-2)', fontSize: 9, letterSpacing: '0.08em', opacity: 0.7 }}
            >
              round 2 / 3 · medium
            </div>
            <div
              style={{
                fontFamily: 'Pixelify Sans, Unbounded, monospace',
                fontSize: 52,
                color: remainingSec < 60 ? 'var(--rpg-danger, #a23a2a)' : 'var(--ember-3)',
                lineHeight: 1,
              }}
            >
              {mm}:{ss}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginTop: 4,
                justifyContent: 'center',
              }}
            >
              <Badge variant="ember">graphs</Badge>
              <Badge variant="dark">hard-bonus</Badge>
            </div>
          </div>

          {/* Foe */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexDirection: 'row-reverse',
              textAlign: 'right',
            }}
          >
            <div style={{ transform: 'scaleX(-1)', filter: 'hue-rotate(-60deg) saturate(1.2)' }}>
              <Hero scale={3} />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  justifyContent: 'flex-end',
                }}
              >
                <span
                  className="font-silkscreen uppercase"
                  style={{ color: 'var(--ember-3)', fontSize: 10, letterSpacing: '0.08em' }}
                >
                  elo 1868
                </span>
                <span
                  style={{
                    fontFamily: 'Pixelify Sans, Unbounded, monospace',
                    fontSize: 22,
                    color: 'var(--parch-0)',
                  }}
                >
                  {foeName}
                </span>
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{
                  color: 'var(--parch-2)',
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                }}
              >
                red ravens · master
              </div>
              <div className="rpg-hp-bar">
                <div className="rpg-hp-bar__fill rpg-hp-bar__fill--foe" style={{ width: '58%' }} />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 4,
                }}
              >
                <span
                  className="font-silkscreen uppercase"
                  style={{ color: 'var(--ember-3)', fontSize: 9, letterSpacing: '0.08em' }}
                >
                  compiling...
                </span>
                <span
                  className="font-silkscreen uppercase"
                  style={{ color: 'var(--parch-2)', fontSize: 9, letterSpacing: '0.08em' }}
                >
                  HP 58 · 1/3 tests
                </span>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 280px', gap: 14 }}>
        {/* Problem */}
        <Panel>
          <div
            className="font-silkscreen uppercase"
            style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
          >
            Problem · round 2
          </div>
          <h3 className="font-display" style={{ whiteSpace: 'normal', fontSize: 17, margin: '4px 0 8px' }}>
            {taskTitle}
          </h3>
          <div style={{ color: 'var(--ink-2)', fontSize: 12, marginBottom: 12, whiteSpace: 'pre-wrap' }}>
            {taskStatement}
          </div>
          <Panel variant="recessed" style={{ padding: 10, fontSize: 11, marginBottom: 12 }}>
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 9, color: 'var(--ink-2)', marginBottom: 4, letterSpacing: '0.08em' }}
            >
              example
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              N = 5
              <br />
              edges = [[0,1],[0,2],[1,3],[2,3],[3,4]]
              <br />→ 2
            </div>
          </Panel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <Badge>BFS</Badge>
            <Badge>modular</Badge>
            <Badge variant="ember">+40 elo on 1st solve</Badge>
          </div>
          <div className="rpg-divider" />
          <div
            className="font-silkscreen uppercase"
            style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 6 }}
          >
            Test cases
          </div>
          {TESTS.map((t, i) => (
            <div
              key={t.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                borderBottom: i < TESTS.length - 1 ? '1px dashed var(--ink-3)' : 'none',
              }}
            >
              <span
                className="font-silkscreen uppercase"
                style={{ fontSize: 10, letterSpacing: '0.08em' }}
              >
                {t.name}
              </span>
              <span
                className="font-silkscreen uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  color:
                    t.color === 'moss'
                      ? 'var(--moss-1)'
                      : t.color === 'ember'
                        ? 'var(--ember-1)'
                        : 'var(--ink-2)',
                }}
              >
                {t.status}
              </span>
            </div>
          ))}
        </Panel>

        {/* Code editor (read-only demo chrome) */}
        <div className="rpg-code-panel">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
              color: 'var(--parch-2)',
            }}
          >
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, letterSpacing: '0.08em' }}
            >
              solution.py · python 3.11
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <span
                className="font-silkscreen uppercase"
                style={{ fontSize: 10, color: 'var(--moss-2)', letterSpacing: '0.08em' }}
              >
                ● saved
              </span>
              <span
                className="font-silkscreen uppercase"
                style={{ fontSize: 10, letterSpacing: '0.08em' }}
              >
                ln 24, col 8
              </span>
            </div>
          </div>
          <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>
            {matchId ? (selfCode || '// waiting for your first edit…') : SAMPLE_CODE}
          </pre>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <RpgButton size="sm" variant="primary">
              Submit ⏎
            </RpgButton>
            <RpgButton size="sm">Run sample</RpgButton>
            <div style={{ flex: 1 }} />
            <RpgButton size="sm" variant="ghost" onClick={() => navigate('/arena')}>
              Forfeit
            </RpgButton>
          </div>
        </div>

        {/* Side: chat + buffs + spectators */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Panel variant="tight" style={{ padding: 12 }}>
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 9, color: 'var(--ink-2)', marginBottom: 8, letterSpacing: '0.1em' }}
            >
              Banter · duel chat
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.5 }}>
              <div>
                <span style={{ color: 'var(--ember-1)', fontFamily: 'Silkscreen, Unbounded, monospace' }}>
                  glowbeacon:
                </span>{' '}
                nice edge case
              </div>
              <div>
                <span style={{ color: 'var(--moss-1)', fontFamily: 'Silkscreen, Unbounded, monospace' }}>
                  thornmoss:
                </span>{' '}
                mod coming 🔥
              </div>
              <div>
                <span style={{ color: 'var(--ember-1)', fontFamily: 'Silkscreen, Unbounded, monospace' }}>
                  glowbeacon:
                </span>{' '}
                gl hf
              </div>
              <div
                style={{
                  color: 'var(--ink-2)',
                  fontSize: 10,
                  fontStyle: 'italic',
                  marginTop: 4,
                }}
              >
                — preset taunts only —
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {TAUNTS.map((t) => (
                <RpgButton key={t} size="sm" variant="ghost" style={{ fontSize: 10, padding: '4px 8px' }}>
                  {t}
                </RpgButton>
              ))}
            </div>
          </Panel>

          <Panel variant="tight" style={{ padding: 12 }}>
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 9, color: 'var(--ink-2)', marginBottom: 8, letterSpacing: '0.1em' }}
            >
              Buffs active
            </div>
            {BUFFS.map((b) => (
              <div
                key={b.name}
                style={{
                  padding: 6,
                  border: '2px solid var(--ink-0)',
                  background: 'var(--parch-0)',
                  marginBottom: 4,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                }}
              >
                <span style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 11 }}>{b.name}</span>
                <span
                  className="font-silkscreen uppercase"
                  style={{ color: 'var(--ember-1)', fontSize: 9, letterSpacing: '0.08em' }}
                >
                  {b.effect}
                </span>
              </div>
            ))}
          </Panel>

          <Panel variant="tight" style={{ padding: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <span
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
              >
                Spectators · 47
              </span>
              <span
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, color: 'var(--ember-1)', letterSpacing: '0.08em' }}
              >
                12 mossveil
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Array.from({ length: 18 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 18,
                    height: 18,
                    background: ['var(--moss-1)', 'var(--ember-1)', 'var(--r-epic)', 'var(--r-rare)'][i % 4],
                    border: '2px solid var(--ink-0)',
                  }}
                />
              ))}
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, padding: '2px 4px', letterSpacing: '0.08em' }}
              >
                +29
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
