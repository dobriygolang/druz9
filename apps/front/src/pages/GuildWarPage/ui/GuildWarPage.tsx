import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Panel, RpgButton, Badge, PageHeader } from '@/shared/ui/pixel'
import { Banner } from '@/shared/ui/sprites'
import { guildApi, type GuildWar } from '@/features/Guild/api/guildApi'

function relTime(iso: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Math.max(0, Date.now() - t)
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function endsInLabel(iso: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = t - Date.now()
  if (diff <= 0) return 'ended'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return `ends in ${h}h ${m}m`
}

export function GuildWarPage() {
  const navigate = useNavigate()
  const [war, setWar] = useState<GuildWar | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    guildApi
      .getGuildWar()
      .then((w) => { if (!cancelled) setWar(w) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  if (loaded && !war) {
    return (
      <>
        <PageHeader
          eyebrow="Guild War"
          title="No active war"
          subtitle="Your guild isn't in a war right now. Join one or wait for the next cycle — the Herald will announce it."
          right={
            <RpgButton size="sm" onClick={() => navigate('/guild')}>
              Back to guild hall
            </RpgButton>
          }
        />
      </>
    )
  }

  if (!war) {
    return (
      <Panel>
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-2)' }}>
          Loading war…
        </div>
      </Panel>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Guild War · live"
        title={`${war.ourGuildName} vs ${war.theirGuildName}`}
        subtitle={`Day ${war.dayNumber} of ${war.totalDays}. Fronts colour in when one side wins a round.`}
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
              <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 26, color: 'var(--parch-0)' }}>
                {war.ourGuildName}
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{ color: 'var(--moss-2)', fontSize: 10, letterSpacing: '0.08em' }}
              >
                {war.ourRoster} members · {war.ourDeployed} deployed
              </div>
              <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 56, color: 'var(--moss-2)', lineHeight: 1 }}>
                {war.ourScore}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              className="font-silkscreen uppercase"
              style={{ color: 'var(--parch-2)', opacity: 0.6, fontSize: 9, letterSpacing: '0.1em' }}
            >
              day {war.dayNumber} / {war.totalDays}
            </div>
            <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 40, color: 'var(--ember-3)' }}>
              vs
            </div>
            <div
              className="font-silkscreen uppercase"
              style={{ color: 'var(--parch-2)', opacity: 0.8, fontSize: 10, letterSpacing: '0.08em' }}
            >
              {endsInLabel(war.endsAt)}
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
              <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 26, color: 'var(--parch-0)' }}>
                {war.theirGuildName}
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{ color: 'var(--rpg-danger, #a23a2a)', fontSize: 10, letterSpacing: '0.08em' }}
              >
                opponent guild
              </div>
              <div
                style={{
                  fontFamily: 'Pixelify Sans, monospace',
                  fontSize: 56,
                  color: 'var(--rpg-danger, #a23a2a)',
                  lineHeight: 1,
                }}
              >
                {war.theirScore}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        {/* Fronts */}
        <Panel>
          <h3 className="font-display" style={{ fontSize: 17, marginBottom: 12 }}>
            Active fronts · {war.front.length}
          </h3>
          {war.front.map((f) => (
            <div
              key={f.name}
              style={{
                padding: 12,
                marginBottom: 8,
                border: '3px solid var(--ink-0)',
                background: f.isDanger
                  ? 'rgba(184,41,42,0.08)'
                  : f.isHot
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
                  <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 16 }}>{f.name}</div>
                  <div
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                  >
                    {f.durationLabel}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {f.isHot && <Badge variant="ember">hot</Badge>}
                  {f.isDanger && (
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
                  style={{ fontSize: 11, color: 'var(--moss-1)', width: 40, letterSpacing: '0.08em' }}
                >
                  {f.ourRounds}
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
                  <div style={{ flex: Math.max(f.ourRounds, 0.0001), background: 'var(--moss-1)' }} />
                  <div style={{ flex: Math.max(f.theirRounds, 0.0001), background: 'var(--rpg-danger, #a23a2a)' }} />
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
                  {f.theirRounds}
                </span>
              </div>
            </div>
          ))}
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Panel variant="tight">
            <h3 className="font-display" style={{ fontSize: 17, marginBottom: 8 }}>
              MVPs today
            </h3>
            {war.mvps.map((m, i) => (
              <div
                key={`${m.username}-${i}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: i < war.mvps.length - 1 ? '1px dashed var(--ink-3)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 13 }}>{m.username}</div>
                  <div
                    className="font-silkscreen uppercase"
                    style={{
                      fontSize: 9,
                      color: m.side === 'ours' ? 'var(--moss-1)' : 'var(--rpg-danger, #a23a2a)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {m.guildName}
                  </div>
                </div>
                <span
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 11, color: 'var(--ember-1)', letterSpacing: '0.08em' }}
                >
                  {m.wins}w · {m.losses}l
                </span>
              </div>
            ))}
          </Panel>

          <Panel variant="wood">
            <h3 className="font-display" style={{ fontSize: 17, color: 'var(--parch-0)' }}>
              War feed
            </h3>
            <div style={{ fontSize: 11, lineHeight: 1.6, color: 'var(--parch-2)', marginTop: 6 }}>
              {war.feed.map((entry, i) => (
                <div key={i}>
                  <span
                    className="font-silkscreen uppercase"
                    style={{ color: 'var(--ember-1)', letterSpacing: '0.08em' }}
                  >
                    {relTime(entry.at)} ·
                  </span>{' '}
                  {entry.text}
                </div>
              ))}
            </div>
          </Panel>

          <Panel variant="recessed">
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 9, color: 'var(--ink-2)', marginBottom: 8, letterSpacing: '0.1em' }}
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
