import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Panel, Badge, PageHeader } from '@/shared/ui/pixel'
import { apiClient } from '@/shared/api/base'
import { PageMeta } from '@/shared/ui/PageMeta'
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi'

interface WeeklyEntry {
  userId: string
  displayName: string
  avatarUrl: string
  aiScore: number
  solveTimeMs: number
  submittedAt: string
}

interface WeeklyTask {
  taskId: string
  taskTitle: string
  taskSlug: string
  difficulty: string
}

interface WeeklyData {
  weekKey: string
  endsAt: string
  leaderboard: WeeklyEntry[] | null
  myEntry: WeeklyEntry | null
  weeklyTask: WeeklyTask | null
}

function formatTime(ms: number): string {
  if (ms <= 0) return '--'
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  const rem = sec % 60
  return min > 0 ? `${min}:${String(rem).padStart(2, '0')}` : `${rem}s`
}

function timeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return 'ended'
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  if (days > 0) return `${days}d ${hours}h left`
  return `${hours}h left`
}

export function WeeklyBossPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [data, setData] = useState<WeeklyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: d } = await apiClient.get('/api/v1/challenges/weekly')
      setData(d)
    } catch {
      // swallow — endpoint may not be live yet.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleStartChallenge = useCallback(async () => {
    const task = data?.weeklyTask
    if (!task) {
      navigate('/practice/code-rooms')
      return
    }
    setStarting(true)
    try {
      const { room } = await codeRoomApi.createRoom({ mode: 'ROOM_MODE_ALL', task: task.taskTitle })
      navigate(`/code-rooms/${room.id}`)
    } catch {
      navigate('/practice/code-rooms')
    } finally {
      setStarting(false)
    }
  }, [data, navigate])

  const leaderboard = data?.leaderboard ?? []
  const myEntry = data?.myEntry
  const weeklyTask = data?.weeklyTask

  return (
    <>
      <PageMeta
        title={t('weeklyBoss.meta.title', 'Weekly Boss')}
        description={t('weeklyBoss.meta.desc', 'Weekly hard challenge with community leaderboard')}
        canonicalPath="/practice/weekly-boss"
      />
      <PageHeader
        eyebrow="Arena · weekly boss"
        title={t('weeklyBoss.title', 'Weekly Boss')}
        subtitle={t(
          'weeklyBoss.subtitle',
          'One Hard challenge per week. Compete by AI score and speed.',
        )}
        right={
          data?.endsAt ? (
            <Badge variant="ember" style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace' }}>
              ⏱ {timeRemaining(data.endsAt)}
            </Badge>
          ) : null
        }
      />

      {/* My status / Start CTA */}
      {myEntry ? (
        <Panel style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, color: 'var(--moss-1)', letterSpacing: '0.1em' }}
              >
                {t('weeklyBoss.yourBest', 'Your Best')}
              </div>
              <div
                style={{
                  fontFamily: 'Pixelify Sans, Unbounded, monospace',
                  fontSize: 32,
                  color: 'var(--moss-1)',
                  lineHeight: 1.1,
                }}
              >
                {myEntry.aiScore}/10
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
              >
                {t('weeklyBoss.solveTime', 'Solve time')}
              </div>
              <div
                style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 20, color: 'var(--ink-1)' }}
              >
                {formatTime(myEntry.solveTimeMs)}
              </div>
            </div>
          </div>
        </Panel>
      ) : weeklyTask ? (
        <Panel
          onClick={handleStartChallenge}
          style={{
            marginBottom: 18,
            cursor: starting ? 'default' : 'pointer',
            opacity: starting ? 0.6 : 1,
            borderLeftWidth: 6,
            borderLeftColor: 'var(--ember-1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                background: 'var(--ember-2)',
                border: '3px solid var(--ink-0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              👑
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 15 }}>
                {weeklyTask.taskTitle}
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em', marginTop: 2 }}
              >
                {t('weeklyBoss.startDesc', 'Claim this week’s boss task')}
              </div>
            </div>
            <span style={{ color: 'var(--ember-1)', fontSize: 20 }}>▸</span>
          </div>
        </Panel>
      ) : (
        <Panel style={{ marginBottom: 18 }}>
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-2)', fontSize: 13 }}>
            {t('weeklyBoss.noTask', 'No active boss task this week.')}
          </div>
        </Panel>
      )}

      {/* Leaderboard */}
      <Panel style={{ marginBottom: 18 }}>
        <h2 className="font-display" style={{ fontSize: 17, margin: '0 0 12px' }}>
          {t('weeklyBoss.leaderboard', 'Leaderboard')}
        </h2>

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-2)' }}>{t('common.loading')}</div>
        ) : leaderboard.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👑</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              {t(
                'weeklyBoss.noEntries',
                'No one has attempted the Weekly Boss yet. Be the first!',
              )}
            </div>
          </div>
        ) : (
          leaderboard.map((entry, i) => {
            const rankColor = i === 0 ? 'var(--ember-1)' : i < 3 ? 'var(--r-legendary)' : 'var(--ink-1)'
            return (
              <div
                key={entry.userId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 32px 1fr auto',
                  gap: 10,
                  alignItems: 'center',
                  padding: '8px 4px',
                  borderBottom: i < leaderboard.length - 1 ? '1px dashed var(--ink-3)' : 'none',
                  background: i === 0 ? 'rgba(184,105,42,0.08)' : 'transparent',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Pixelify Sans, Unbounded, monospace',
                    fontSize: 16,
                    color: rankColor,
                    textAlign: 'center',
                  }}
                >
                  #{i + 1}
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    background: 'var(--ink-0)',
                    color: 'var(--parch-0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Pixelify Sans, Unbounded, monospace',
                    fontSize: 13,
                  }}
                >
                  {entry.displayName.slice(0, 2).toUpperCase()}
                </div>
                <span
                  style={{
                    fontFamily: 'Pixelify Sans, Unbounded, monospace',
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {entry.displayName}
                </span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span
                    style={{
                      fontFamily: 'Pixelify Sans, Unbounded, monospace',
                      fontSize: 14,
                      color: 'var(--ember-1)',
                    }}
                  >
                    ★ {entry.aiScore}
                  </span>
                  <span
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.06em' }}
                  >
                    {formatTime(entry.solveTimeMs)}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </Panel>

      {/* Rewards */}
      <Panel variant="recessed">
        <div
          className="font-silkscreen uppercase"
          style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 8 }}
        >
          {t('weeklyBoss.rewards', 'Weekly Rewards')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          <RewardTile emoji="🥇" label="1st place" value="+100 XP" />
          <RewardTile emoji="🥈" label="2nd place" value="+50 XP" />
          <RewardTile emoji="🥉" label="3rd place" value="+25 XP" />
          <RewardTile emoji="★" label="7+ score" value={`+25 XP · ${t('weeklyBoss.missionReward', 'mission')}`} />
        </div>
      </Panel>

      {starting && (
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--ink-2)' }}>Starting room…</div>
      )}
    </>
  )
}

function RewardTile({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div
      style={{
        padding: 10,
        background: 'var(--parch-0)',
        border: '2px solid var(--ink-0)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ fontSize: 20 }}>{emoji}</span>
      <div>
        <div
          className="font-silkscreen uppercase"
          style={{ fontSize: 8, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
        >
          {label}
        </div>
        <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 12 }}>{value}</div>
      </div>
    </div>
  )
}
