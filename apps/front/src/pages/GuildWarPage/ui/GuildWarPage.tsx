import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Panel, RpgButton, Badge, PageHeader } from '@/shared/ui/pixel'
import { Tour } from '@/features/Tour/ui/Tour'
import { Banner } from '@/shared/ui/sprites'
import { guildApi, type GuildWar, type WarChallenge } from '@/features/Guild/api/guildApi'

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

function EnergyBar({ used, limit }: { used: number; limit: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>
        энергия
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: limit }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              border: '2px solid var(--ink-0)',
              background: i < used ? 'var(--ink-3)' : 'var(--ember-1)',
            }}
          />
        ))}
      </div>
      <span className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.06em' }}>
        {limit - used} / {limit} осталось
      </span>
    </div>
  )
}

export function GuildWarPage() {
  const navigate = useNavigate()
  const [war, setWar] = useState<GuildWar | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [quota, setQuota] = useState({ used: 0, limit: 3 })
  const [toast, setToast] = useState<string | null>(null)
  const [challenges, setChallenges] = useState<WarChallenge[]>([])
  const [inQueue, setInQueue] = useState(false)
  const [challengeGuildId, setChallengeGuildId] = useState('')
  const [declLoading, setDeclLoading] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      guildApi.getGuildWar(),
      guildApi.getWarQuota(),
      guildApi.listIncomingChallenges(),
      guildApi.getMatchmakingStatus(),
    ])
      .then(([w, q, ch, mm]) => {
        if (cancelled) return
        setWar(w)
        setQuota(q)
        setChallenges(ch)
        setInQueue(mm.inQueue)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  const energyExhausted = quota.used >= quota.limit

  const deployToFront = (frontId: string, topic: string) => {
    if (energyExhausted) {
      setToast('Энергия на сегодня исчерпана. Возвращайся завтра.')
      setTimeout(() => setToast(null), 4000)
      return
    }
    navigate(`/interview/live/new?mode=solo&focus=${topic}&frontId=${frontId}`)
  }

  const sendChallenge = async () => {
    if (!challengeGuildId.trim()) return
    setDeclLoading(true)
    try {
      await guildApi.sendChallenge(challengeGuildId.trim())
      showToast('Вызов отправлен! Ждём ответа 24 часа.')
      setChallengeGuildId('')
    } catch (e: any) {
      const code = e?.response?.data?.code
      if (code === 'ALREADY_AT_WAR') showToast('Одна из гильдий уже в войне.')
      else if (code === 'SAME_GUILD') showToast('Нельзя вызвать собственную гильдию.')
      else showToast('Не удалось отправить вызов.')
    } finally {
      setDeclLoading(false)
    }
  }

  const acceptChallenge = async (id: string) => {
    setDeclLoading(true)
    try {
      await guildApi.acceptChallenge(id)
      showToast('Вызов принят — война началась!')
      const w = await guildApi.getGuildWar()
      setWar(w)
    } catch {
      showToast('Не удалось принять вызов.')
    } finally {
      setDeclLoading(false)
    }
  }

  const declineChallenge = async (id: string) => {
    setDeclLoading(true)
    try {
      await guildApi.declineChallenge(id)
      setChallenges(prev => prev.filter(c => c.id !== id))
    } catch {
      showToast('Не удалось отклонить вызов.')
    } finally {
      setDeclLoading(false)
    }
  }

  const toggleMatchmaking = async () => {
    setDeclLoading(true)
    try {
      if (inQueue) {
        await guildApi.leaveMatchmaking()
        setInQueue(false)
        showToast('Вышли из очереди.')
      } else {
        const result = await guildApi.joinMatchmaking()
        if (result.status === 'matched') {
          showToast('Противник найден — война началась!')
          const w = await guildApi.getGuildWar()
          setWar(w)
        } else {
          setInQueue(true)
          showToast('В очереди. Ищем противника…')
        }
      }
    } catch {
      showToast('Ошибка очереди.')
    } finally {
      setDeclLoading(false)
    }
  }

  if (loaded && !war) {
    return (
      <>
        {toast && (
          <div style={{
            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
            padding: '8px 16px', background: 'var(--ink-0)', color: 'var(--parch-0)',
            zIndex: 2000, fontSize: 12,
          }}>{toast}</div>
        )}
        <PageHeader
          eyebrow="Guild War"
          title="Войны нет"
          subtitle="Вашей гильдии пока не назначена война. Бросьте вызов или встаньте в очередь на автоматический подбор."
          right={
            <RpgButton size="sm" onClick={() => navigate('/guild')}>
              Guild Hall
            </RpgButton>
          }
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 8 }}>
          {/* Incoming challenges */}
          <Panel>
            <h3 className="font-display" style={{ fontSize: 17, marginBottom: 12 }}>
              Входящие вызовы · {challenges.length}
            </h3>
            {challenges.length === 0 ? (
              <div style={{ color: 'var(--ink-2)', fontSize: 12 }}>Нет входящих вызовов</div>
            ) : challenges.map((c) => (
              <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px dashed var(--ink-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 15 }}>{c.fromName}</div>
                  <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>
                    истекает {new Date(c.expiresAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <RpgButton size="sm" variant="primary" disabled={declLoading} onClick={() => acceptChallenge(c.id)}>
                    Принять
                  </RpgButton>
                  <RpgButton size="sm" disabled={declLoading} onClick={() => declineChallenge(c.id)}>
                    Отклонить
                  </RpgButton>
                </div>
              </div>
            ))}
          </Panel>

          {/* Send challenge + matchmaking */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Panel>
              <h3 className="font-display" style={{ fontSize: 17, marginBottom: 10 }}>
                Бросить вызов
              </h3>
              <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em', marginBottom: 8 }}>
                ID гильдии-противника
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={challengeGuildId}
                  onChange={e => setChallengeGuildId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  style={{
                    flex: 1, padding: '6px 8px', border: '2px solid var(--ink-0)',
                    background: 'var(--parch-0)', fontFamily: 'monospace', fontSize: 11,
                    outline: 'none',
                  }}
                />
                <RpgButton size="sm" variant="primary" disabled={declLoading || !challengeGuildId.trim()} onClick={sendChallenge}>
                  Вызвать
                </RpgButton>
              </div>
              <div style={{ marginTop: 8 }}>
                <RpgButton size="sm" onClick={() => navigate('/guilds')}>
                  Найти гильдию в списке
                </RpgButton>
              </div>
            </Panel>

            <Panel variant={inQueue ? 'dark' : 'recessed'}>
              <h3 className="font-display" style={{ fontSize: 17, marginBottom: 6, color: inQueue ? 'var(--parch-0)' : undefined }}>
                Авто-подбор
              </h3>
              <div style={{ fontSize: 11, color: inQueue ? 'var(--parch-2)' : 'var(--ink-2)', marginBottom: 10 }}>
                {inQueue
                  ? 'В очереди. Когда найдётся противник — война начнётся автоматически.'
                  : 'Встаньте в очередь и система сама найдёт вам противника похожего размера.'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {inQueue && <Badge variant="ember">в очереди</Badge>}
                <RpgButton size="sm" variant={inQueue ? undefined : 'primary'} disabled={declLoading} onClick={toggleMatchmaking}>
                  {inQueue ? 'Выйти из очереди' : 'Встать в очередь'}
                </RpgButton>
              </div>
            </Panel>
          </div>
        </div>
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
      <Tour
        tourId="war_intro"
        steps={[
          { selector: '[data-tour=war-fronts]', title: 'Фронты войны', body: 'Каждый фронт — это тема: алгоритмы, SQL, системный дизайн. Нажми «Участвовать» — тебя отправят на задачу по этой теме. Пройди сессию — фронт получит раунд.' },
          { selector: '[data-tour=war-energy]', title: 'Энергия', body: 'В день можно участвовать не более 3 раз. Клетки восстанавливаются в полночь по UTC.' },
        ]}
      />
      <PageHeader
        eyebrow="Guild War · live"
        title={`${war.ourGuildName} vs ${war.theirGuildName}`}
        subtitle={`Day ${war.dayNumber} of ${war.totalDays}. Solve tasks to push your guild's fronts forward.`}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <RpgButton size="sm" onClick={() => navigate('/guild')}>
              Back to guild hall
            </RpgButton>
          </div>
        }
      />

      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 16px', background: 'var(--ink-0)', color: 'var(--parch-0)',
          zIndex: 2000, fontSize: 12,
        }}>{toast}</div>
      )}

      {/* Energy bar */}
      <Panel variant="tight" style={{ marginBottom: 14 }} data-tour="war-energy">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <EnergyBar used={quota.used} limit={quota.limit} />
          {energyExhausted && (
            <span className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--rpg-danger, #a23a2a)', letterSpacing: '0.08em' }}>
              восстановится в полночь
            </span>
          )}
        </div>
      </Panel>

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
              <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 26, color: 'var(--parch-0)' }}>
                {war.ourGuildName}
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{ color: 'var(--moss-2)', fontSize: 10, letterSpacing: '0.08em' }}
              >
                {war.ourRoster} members · {war.ourDeployed} deployed
              </div>
              <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 56, color: 'var(--moss-2)', lineHeight: 1 }}>
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
            <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 40, color: 'var(--ember-3)' }}>
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
              <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 26, color: 'var(--parch-0)' }}>
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
                  fontFamily: 'Pixelify Sans, Unbounded, monospace',
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
        <Panel data-tour="war-fronts">
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
                  <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 16 }}>{f.name}</div>
                  <div
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                  >
                    {f.topic} · {f.durationLabel}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {f.isHot && <Badge variant="ember">hot</Badge>}
                  {f.isDanger && (
                    <span
                      className="rpg-badge"
                      style={{ background: 'var(--rpg-danger, #a23a2a)', color: 'var(--parch-0)' }}
                    >
                      losing
                    </span>
                  )}
                  {f.status === 'won' || f.status === 'lost' ? (
                    <Badge variant={f.status === 'won' ? 'moss' : 'dark'}>
                      {f.status === 'won' ? '✓ захвачен' : '✗ потерян'}
                    </Badge>
                  ) : f.id ? (
                    <RpgButton
                      size="sm"
                      variant="primary"
                      disabled={energyExhausted}
                      onClick={() => deployToFront(f.id!, f.topic)}
                    >
                      {energyExhausted ? 'нет энергии' : 'участвовать'}
                    </RpgButton>
                  ) : (
                    <RpgButton size="sm" disabled>demo</RpgButton>
                  )}
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
                  <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 13 }}>{m.username}</div>
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
