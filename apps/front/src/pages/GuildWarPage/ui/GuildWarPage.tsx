import { useNavigate } from 'react-router-dom'
import { Panel, RpgButton, Badge, PageHeader } from '@/shared/ui/pixel'
import { Banner } from '@/shared/ui/sprites'

interface Front {
  n: string
  us: number
  them: number
  dur: string
  status: string
  hot?: boolean
  danger?: boolean
}

const FRONTS: Front[] = [
  { n: 'Graphs Bastion', us: 4, them: 3, dur: '14m left', status: 'contested', hot: true },
  { n: 'Systems Tower', us: 3, them: 1, dur: '32m left', status: 'mossveil-leading' },
  { n: 'DP Canyon', us: 1, them: 4, dur: '9m left', status: 'ravens-leading', danger: true },
  { n: 'String Bridge', us: 2, them: 2, dur: '1h left', status: 'contested' },
  { n: 'Algo Plaza', us: 2, them: 0, dur: 'next round', status: 'mossveil-leading' },
]

const MVPS: Array<[string, string, number, number, 'moss' | 'danger']> = [
  ['thornmoss', 'mossveil', 4, 0, 'moss'],
  ['kyrie.dev', 'ravens', 3, 1, 'danger'],
  ['lunarfox', 'mossveil', 3, 0, 'moss'],
  ['petrogryph', 'ravens', 2, 1, 'danger'],
]

const FEED: Array<[string, string]> = [
  ['2m ago', 'thornmoss captured Graphs Bastion round 3'],
  ['8m ago', 'ravens took DP Canyon +2'],
  ['14m ago', 'Mossveil reinforced Systems Tower'],
  ['20m ago', 'glowbeacon duel won +60 ELO'],
  ['27m ago', 'Algo Plaza established'],
]

export function GuildWarPage() {
  const navigate = useNavigate()
  return (
    <>
      <PageHeader
        eyebrow="Guild War · live"
        title="Mossveil vs Red Ravens"
        subtitle="Second day of a long guild war. Fronts colour in when one side wins a round."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <RpgButton size="sm" onClick={() => navigate('/guild')}>
              Back to guild hall
            </RpgButton>
            <RpgButton size="sm" variant="primary">
              Deploy to front
            </RpgButton>
          </div>
        }
      />

      {/* Score banner */}
      <Panel variant="dark" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            padding: '20px 28px',
            gap: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Banner scale={4} color="var(--moss-1)" crest="✦" />
            <div>
              <div
                style={{
                  fontFamily: 'Pixelify Sans, monospace',
                  fontSize: 26,
                  color: 'var(--parch-0)',
                }}
              >
                Mossveil
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{ color: 'var(--moss-2)', fontSize: 10, letterSpacing: '0.08em' }}
              >
                24 members · 18 deployed
              </div>
              <div
                style={{
                  fontFamily: 'Pixelify Sans, monospace',
                  fontSize: 56,
                  color: 'var(--moss-2)',
                  lineHeight: 1,
                }}
              >
                12
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              className="font-silkscreen uppercase"
              style={{ color: 'var(--parch-2)', opacity: 0.6, fontSize: 9, letterSpacing: '0.1em' }}
            >
              day 2 / 3
            </div>
            <div
              style={{
                fontFamily: 'Pixelify Sans, monospace',
                fontSize: 40,
                color: 'var(--ember-3)',
              }}
            >
              vs
            </div>
            <div
              className="font-silkscreen uppercase"
              style={{
                color: 'var(--parch-2)',
                opacity: 0.8,
                fontSize: 10,
                letterSpacing: '0.08em',
              }}
            >
              ends in 08h 42m
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexDirection: 'row-reverse',
              textAlign: 'right',
            }}
          >
            <Banner scale={4} color="var(--rpg-danger, #a23a2a)" crest="▲" />
            <div>
              <div
                style={{
                  fontFamily: 'Pixelify Sans, monospace',
                  fontSize: 26,
                  color: 'var(--parch-0)',
                }}
              >
                Red Ravens
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{
                  color: 'var(--rpg-danger, #a23a2a)',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                }}
              >
                31 members · 24 deployed
              </div>
              <div
                style={{
                  fontFamily: 'Pixelify Sans, monospace',
                  fontSize: 56,
                  color: 'var(--rpg-danger, #a23a2a)',
                  lineHeight: 1,
                }}
              >
                9
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        {/* Fronts */}
        <Panel>
          <h3 className="font-display" style={{ fontSize: 17, marginBottom: 12 }}>
            Active fronts · 5
          </h3>
          {FRONTS.map((f) => (
            <div
              key={f.n}
              style={{
                padding: 12,
                marginBottom: 8,
                border: '3px solid var(--ink-0)',
                background: f.danger
                  ? 'rgba(184,41,42,0.08)'
                  : f.hot
                    ? 'rgba(233,184,102,0.15)'
                    : 'var(--parch-0)',
                boxShadow: '3px 3px 0 var(--ink-0)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 16 }}>{f.n}</div>
                  <div
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                  >
                    {f.dur}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {f.hot && <Badge variant="ember">hot</Badge>}
                  {f.danger && (
                    <span
                      className="rpg-badge"
                      style={{
                        background: 'var(--rpg-danger, #a23a2a)',
                        color: 'var(--parch-0)',
                      }}
                    >
                      losing
                    </span>
                  )}
                  <RpgButton size="sm">Join</RpgButton>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  className="font-silkscreen uppercase"
                  style={{
                    fontSize: 11,
                    color: 'var(--moss-1)',
                    width: 40,
                    letterSpacing: '0.08em',
                  }}
                >
                  {f.us}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 16,
                    background: 'var(--parch-3)',
                    border: '2px solid var(--ink-0)',
                    display: 'flex',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ flex: f.us, background: 'var(--moss-1)' }} />
                  <div style={{ flex: f.them, background: 'var(--rpg-danger, #a23a2a)' }} />
                </div>
                <span
                  className="font-silkscreen uppercase"
                  style={{
                    fontSize: 11,
                    color: 'var(--rpg-danger, #a23a2a)',
                    width: 40,
                    textAlign: 'right',
                    letterSpacing: '0.08em',
                  }}
                >
                  {f.them}
                </span>
              </div>
            </div>
          ))}
        </Panel>

        {/* Right side */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Panel variant="tight">
            <h3 className="font-display" style={{ fontSize: 17, marginBottom: 8 }}>
              MVPs today
            </h3>
            {MVPS.map(([n, g, w, l, c], i) => (
              <div
                key={String(n)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: i < MVPS.length - 1 ? '1px dashed var(--ink-3)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 13 }}>{n}</div>
                  <div
                    className="font-silkscreen uppercase"
                    style={{
                      fontSize: 9,
                      color: c === 'moss' ? 'var(--moss-1)' : 'var(--rpg-danger, #a23a2a)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {g}
                  </div>
                </div>
                <span
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 11, color: 'var(--ember-1)', letterSpacing: '0.08em' }}
                >
                  {w}w · {l}l
                </span>
              </div>
            ))}
          </Panel>

          <Panel variant="wood">
            <h3 className="font-display" style={{ fontSize: 17, color: 'var(--parch-0)' }}>
              War feed
            </h3>
            <div style={{ fontSize: 11, lineHeight: 1.6, color: 'var(--parch-2)', marginTop: 6 }}>
              {FEED.map(([t, msg]) => (
                <div key={t}>
                  <span
                    className="font-silkscreen uppercase"
                    style={{ color: 'var(--ember-1)', letterSpacing: '0.08em' }}
                  >
                    {t} ·
                  </span>{' '}
                  {msg}
                </div>
              ))}
            </div>
          </Panel>

          <Panel variant="recessed">
            <div
              className="font-silkscreen uppercase"
              style={{
                fontSize: 9,
                color: 'var(--ink-2)',
                marginBottom: 8,
                letterSpacing: '0.1em',
              }}
            >
              war reward · on victory
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge variant="ember">+1200 xp each</Badge>
              <Badge variant="ember">3 relic drops</Badge>
              <Badge variant="ember">+2 rank</Badge>
              <Badge variant="dark">legendary banner</Badge>
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
