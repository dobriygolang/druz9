import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, RpgButton, Badge, PageHeader } from '@/shared/ui/pixel'
import { Hero, Trophy } from '@/shared/ui/sprites'
import { interviewPrepApi, type MockBlueprint } from '@/features/InterviewPrep/api/interviewPrepApi'
import { authApi } from '@/features/Auth/api/authApi'
import { useAuth } from '@/app/providers/AuthProvider'
import type { FeedItem } from '@/entities/User/model/types'
import { addToast } from '@/shared/lib/toasts'

const READINESS = 78

const READINESS_BREAKDOWN: Array<[string, number]> = [
  ['algorithms', 82],
  ['systemDesign', 64],
  ['communication', 88],
  ['behavioral', 74],
]

// Companies we support for mock-style prep. Order matches the order we
// want on the landing bar. Clicking pushes the key into the live-session
// deep link so the backend can pre-select the right question pool.
const COMPANIES: Array<{ key: string; label: string; accent: string }> = [
  { key: 'yandex',  label: 'Yandex',  accent: '#fc3f1d' },
  { key: 'ozon',    label: 'Ozon',    accent: '#005bff' },
  { key: 'avito',   label: 'Avito',   accent: '#00a046' },
  { key: 'tinkoff', label: 'Tinkoff', accent: '#ffdd2d' },
  { key: 'vk',      label: 'VK',      accent: '#0077ff' },
  { key: 'google',  label: 'Google',  accent: '#4285f4' },
  { key: 'amazon',  label: 'Amazon',  accent: '#ff9900' },
  { key: 'meta',    label: 'Meta',    accent: '#1877f2' },
]

const SUGGESTIONS = [
  ['consistencyModels', '+120 ✦'],
  ['graphDfs', '+320 ✦'],
  ['behavioralStar', '+80 ✦'],
] as const

// Level → medal mapping for blueprint cards. Lets us keep the pixel
// trophy sprite while the backend owns the source of truth for level.
function medalForLevel(level: string): 'gold' | 'silver' | 'bronze' {
  const l = (level || '').toLowerCase()
  if (l.includes('senior') || l.includes('staff') || l.includes('lead')) return 'gold'
  if (l.includes('mid')) return 'silver'
  return 'bronze'
}

// Scores 0–100 → medal tier.
function medalForScore(score: number): 'gold' | 'silver' | 'bronze' {
  if (score >= 85) return 'gold'
  if (score >= 70) return 'silver'
  return 'bronze'
}

const ACCENT_COLORS = ['#b8692a', '#3d6149', '#7a3d12', '#3b6a8f', '#7a4a8f', '#4a3b8f']
const POSES: Array<'trophy' | 'idle' | 'wave'> = ['trophy', 'idle', 'wave']

export function InterviewHubPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [mentors, setMentors] = useState<MockBlueprint[]>([])
  const [past, setPast] = useState<FeedItem[]>([])
  const [weakest, setWeakest] = useState<Array<{ key: string; label: string; score: number }>>([])
  const [loading, setLoading] = useState(true)
  // Which company chip is currently kicking off a mock session (null = none).
  // Prevents double-click from spawning two sessions.
  const [startingCompany, setStartingCompany] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    // Mentors + past sessions + weakest-skills load in parallel; each
    // swallows its own error so a dead endpoint doesn't wipe the others.
    Promise.all([
      interviewPrepApi.listMockBlueprints().catch(() => []),
      user?.id
        ? authApi.getProfileFeed(user.id, 20).catch(() => []).then((items) =>
            items.filter((it) => it.type === 'mock_stage'),
          )
        : Promise.resolve([] as FeedItem[]),
      user?.id
        ? authApi.getProfileProgress(user.id).then((p) =>
            (p.weakest ?? []).slice(0, 3).map((c) => ({
              key: c.key,
              label: c.label ?? c.key,
              score: c.score ?? 0,
            })),
          ).catch(() => [])
        : Promise.resolve([] as Array<{ key: string; label: string; score: number }>),
    ]).then(([blueprints, feed, weak]) => {
      if (!alive) return
      setMentors(blueprints)
      setPast(feed)
      setWeakest(weak)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [user?.id])

  const pastCount = useMemo(() => past.length, [past])

  return (
    <>
      <PageHeader
        eyebrow={t('interviewHub.eyebrow')}
        title={t('interviewHub.title')}
        subtitle={t('interviewHub.subtitle')}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <RpgButton size="sm" onClick={() => navigate('/interview/peer')}>
              Peer mocks
            </RpgButton>
            <RpgButton size="sm" variant="primary" onClick={() => navigate('/interview/live/new')}>
              {t('interviewHub.startSession')}
            </RpgButton>
          </div>
        }
      />

      {/* Company picker — kicks off a real mock-session bound to the
          chosen company's question pool (StartMockSession RPC). The
          previous version just deep-linked to /interview/live/new which
          is an AI chat, not a mock-interview flow. */}
      <Panel data-hub-section="companies" style={{ marginBottom: 18 }}>
        <div
          className="font-silkscreen uppercase"
          style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 10 }}
        >
          {t('interviewHub.pickCompany', { defaultValue: 'Pick a company to prep for' })}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {COMPANIES.map((c) => (
            <button
              key={c.key}
              className="rpg-btn"
              disabled={startingCompany !== null}
              onClick={async () => {
                if (startingCompany) return
                setStartingCompany(c.key)
                try {
                  const session = await interviewPrepApi.startMockSession({ companyTag: c.key })
                  if (session?.id) {
                    navigate(`/interview/mock/${session.id}`)
                    return
                  }
                  // No blueprint for this company yet — surface a toast
                  // pointing the admin at the content editor, and the
                  // non-admin at peer mocks which always work.
                  addToast({
                    kind: 'QUEST',
                    title: `No ${c.label} pool yet`,
                    body: 'Try peer mocks while we add this company\'s question pool.',
                    icon: '!',
                    color: 'var(--ember-1)',
                  })
                  setStartingCompany(null)
                } catch (e: any) {
                  // Backend can return 400 BAD_REQUEST "mock interview
                  // task pool is incomplete for selected company" when
                  // the admin hasn't filled a blueprint yet. Show that
                  // reason plainly instead of a red 500 toast.
                  const msg = e?.response?.data?.message ?? 'Could not start session'
                  addToast({
                    kind: 'QUEST',
                    title: `${c.label} · mock unavailable`,
                    body: msg,
                    icon: '!',
                    color: 'var(--rpg-danger)',
                  })
                  setStartingCompany(null)
                }
              }}
              style={{
                padding: '10px 14px',
                borderLeft: `6px solid ${c.accent}`,
                fontFamily: 'Pixelify Sans, monospace',
                fontSize: 13,
              }}
            >
              {startingCompany === c.key ? 'Starting…' : c.label}
            </button>
          ))}
        </div>
      </Panel>

      {/* Readiness + mentors */}
      <div
        className="rpg-grid-3col rpg-interview-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 18,
          marginBottom: 18,
        }}
      >
        {/* Readiness */}
        <Panel variant="dark">
          <h3 className="font-display" style={{ fontSize: 17, color: 'var(--parch-0)' }}>
            {t('interviewHub.readiness')}
          </h3>
          <div
            className="font-silkscreen uppercase"
            style={{
              color: 'var(--parch-2)',
              fontSize: 10,
              letterSpacing: '0.08em',
              opacity: 0.7,
              marginBottom: 12,
            }}
          >
            {t('interviewHub.avgSessions')}
          </div>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <svg viewBox="0 0 120 120" style={{ width: 180, height: 180 }}>
              <circle cx="60" cy="60" r="50" fill="none" stroke="#3a3028" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#e9b866"
                strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - READINESS / 100)}`}
                transform="rotate(-90 60 60)"
                strokeLinecap="butt"
              />
              <text
                x="60"
                y="62"
                textAnchor="middle"
                fontFamily="Pixelify Sans, monospace"
                fontSize="28"
                fill="#f6ead0"
              >
                {READINESS}%
              </text>
              <text
                x="60"
                y="78"
                textAnchor="middle"
                fontFamily="Silkscreen, monospace"
                fontSize="8"
                fill="#dcc690"
              >
                {t('interviewHub.ready')}
              </text>
            </svg>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {READINESS_BREAKDOWN.map(([k, v]) => (
              <div
                key={k}
                style={{
                  padding: 8,
                  background: 'rgba(246,234,208,0.06)',
                  border: '2px solid rgba(246,234,208,0.15)',
                }}
              >
                <div
                  className="font-silkscreen uppercase"
                  style={{
                    color: 'var(--parch-2)',
                    opacity: 0.7,
                    fontSize: 9,
                    letterSpacing: '0.08em',
                  }}
                >
                  {t(`interviewHub.breakdown.${k}`)}
                </div>
                <div
                  style={{
                    fontFamily: 'Pixelify Sans, monospace',
                    fontSize: 20,
                    color: 'var(--ember-3)',
                  }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Mentors — one card per mock blueprint */}
        <Panel style={{ gridColumn: 'span 2' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <h3 className="font-display" style={{ fontSize: 17 }}>
              {t('interviewHub.chooseMentor')}
            </h3>
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
            >
              {t('interviewHub.specializations')}
            </span>
          </div>
          {loading ? (
            <div style={{ color: 'var(--ink-2)', fontSize: 12 }}>{t('common.loading')}</div>
          ) : mentors.length === 0 ? (
            <div style={{ color: 'var(--ink-2)', fontSize: 12 }}>{t('interviewHub.mentorsEmpty')}</div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
              }}
            >
              {mentors.slice(0, 6).map((m, i) => {
                const medal = medalForLevel(m.level)
                const elite = medal === 'gold'
                const color = ACCENT_COLORS[i % ACCENT_COLORS.length]
                const pose = POSES[i % POSES.length]
                return (
                  <div
                    key={m.id || m.slug}
                    style={{
                      padding: 12,
                      border: '3px solid var(--ink-0)',
                      background: 'var(--parch-0)',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      boxShadow: elite ? '3px 3px 0 var(--ember-1)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        height: 60,
                        background: color,
                        border: '2px solid var(--ink-0)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <Hero scale={2} pose={pose} />
                    </div>
                    <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14 }}>
                      {m.title || m.primaryAliasName || m.slug}
                    </div>
                    <div
                      className="font-silkscreen uppercase"
                      style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                    >
                      {m.level} · {Math.max(1, Math.round(m.totalDurationSeconds / 60))}m · {m.rounds.length} {t('interviewHub.rounds')}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Trophy scale={2} tier={medal} />
                      <RpgButton
                        size="sm"
                        onClick={() => {
                          const alias = m.primaryAliasSlug || m.publicAliasSlugs[0] || m.slug
                          navigate(`/interview/live/${alias}`)
                        }}
                      >
                        {t('interviewHub.begin')}
                      </RpgButton>
                    </div>
                    {elite && (
                      <Badge
                        variant="ember"
                        style={{ position: 'absolute', top: 6, right: 6, fontSize: 9 }}
                      >
                        {t('interviewHub.elite')}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Past + mentor suggests */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18 }}>
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
              {t('interviewHub.pastSessions')}
            </h3>
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
            >
              {t('interviewHub.totalCount', { count: pastCount })}
            </span>
          </div>
          {loading ? (
            <div style={{ color: 'var(--ink-2)', fontSize: 12 }}>{t('common.loading')}</div>
          ) : past.length === 0 ? (
            <div style={{ color: 'var(--ink-2)', fontSize: 12, padding: '18px 0' }}>
              {t('interviewHub.pastEmpty')}
            </div>
          ) : (
            past.slice(0, 6).map((s, i) => {
              const score = typeof s.score === 'number' ? s.score : 0
              const medal = medalForScore(score)
              const when = formatRelative(s.timestamp)
              return (
                <div
                  key={`${s.timestamp}-${i}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 60px 80px',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom: i < Math.min(past.length, 6) - 1 ? '1px dashed var(--ink-3)' : 'none',
                  }}
                >
                  <Trophy scale={2} tier={medal} />
                  <div>
                    <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14 }}>
                      {s.title}
                    </div>
                    <div
                      className="font-silkscreen uppercase"
                      style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                    >
                      {when}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>
                      {s.description}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: 'right',
                      fontFamily: 'Pixelify Sans, monospace',
                      fontSize: 22,
                      color: 'var(--ember-1)',
                    }}
                  >
                    {score || '—'}
                  </div>
                  <RpgButton size="sm" onClick={() => navigate('/interview/live/new')}>
                    {t('interviewHub.replay')}
                  </RpgButton>
                </div>
              )
            })
          )}
        </Panel>

        <Panel variant="wood">
          <h3 className="font-display" style={{ fontSize: 17, color: 'var(--parch-0)' }}>
            {t('interviewHub.mentorSuggests')}
          </h3>
          <div
            className="font-silkscreen uppercase"
            style={{
              color: 'var(--parch-2)',
              fontSize: 10,
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}
          >
            {t('interviewHub.basedOnGaps')}
          </div>
          {(weakest.length > 0
            ? weakest.map((w) => ({
                key: w.key,
                title: t('interviewHub.suggestion.weaknessTitle', { label: w.label, defaultValue: `Drill ${w.label}` }),
                reason: t('interviewHub.suggestion.weaknessReason', { score: w.score, defaultValue: `Current score ${w.score} — biggest gap vs your target` }),
                reward: '+xp',
              }))
            : SUGGESTIONS.map(([key, rw]) => ({
                key,
                title: t(`interviewHub.suggestion.${key}.title`),
                reason: t(`interviewHub.suggestion.${key}.reason`),
                reward: rw,
              }))
          ).map((s, i) => (
            <div
              key={i}
              style={{
                padding: 10,
                marginBottom: 8,
                background: 'var(--parch-0)',
                border: '2px solid var(--ink-0)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/interview/live/new?focus=${s.key}`)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 13 }}>{s.title}</div>
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                >
                  {s.reason}
                </div>
              </div>
              <span
                className="font-silkscreen uppercase"
                style={{
                  color: 'var(--ember-1)',
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.reward}
              </span>
            </div>
          ))}
          <RpgButton
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => navigate('/interview/peer')}
          >
            {t('interviewHub.scheduleMock')}
          </RpgButton>
        </Panel>
      </div>
    </>
  )
}

// Tiny relative-time formatter that avoids pulling dayjs just for this
// page. Good enough for "2 дня назад" style on the session card.
function formatRelative(iso: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ''
  const diff = Date.now() - t
  const day = 86_400_000
  const hour = 3_600_000
  if (diff < hour) return 'только что'
  if (diff < day) return `${Math.floor(diff / hour)} ч назад`
  if (diff < 7 * day) return `${Math.floor(diff / day)} д назад`
  return new Date(iso).toLocaleDateString()
}
