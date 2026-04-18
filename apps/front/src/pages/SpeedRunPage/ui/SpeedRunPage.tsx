import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Panel, Badge, PageHeader } from '@/shared/ui/pixel'
import { apiClient } from '@/shared/api/base'
import { PageMeta } from '@/shared/ui/PageMeta'

interface TaskRecord {
  taskId: string
  taskTitle: string
  bestTimeMs: number
  bestAiScore: number
  attempts: number
  lastAt: string
}

function formatTime(ms: number): string {
  if (ms <= 0) return '--'
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  const rem = sec % 60
  return min > 0 ? `${min}:${String(rem).padStart(2, '0')}` : `${rem}s`
}

export function SpeedRunPage() {
  const { t } = useTranslation()
  const [records, setRecords] = useState<TaskRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get('/api/v1/challenges/speed-run/records')
      setRecords(data.records ?? [])
    } catch {
      // swallow — endpoint may be 404 until challenge service is wired.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchRecords()
  }, [fetchRecords])

  return (
    <>
      <PageMeta
        title={t('speedRun.meta.title', 'Speed Run')}
        description={t('speedRun.meta.desc', 'Beat your personal bests')}
        canonicalPath="/practice/speed-run"
      />
      <PageHeader
        eyebrow="Workshop · speed run"
        title={t('speedRun.title', 'Speed Run')}
        subtitle={t(
          'speedRun.subtitle',
          'Solve tasks against the clock. Beat your bests for bonus XP.',
        )}
      />

      {/* How it works */}
      <Panel variant="dark" style={{ marginBottom: 18 }}>
        <div
          className="font-silkscreen uppercase"
          style={{ fontSize: 10, color: 'var(--ember-3)', letterSpacing: '0.1em', marginBottom: 6 }}
        >
          ⚡ {t('speedRun.howItWorks', 'How it works')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--parch-2)', lineHeight: 1.55 }}>
          {t(
            'speedRun.howItWorksDesc',
            'Solve any practice task in a code room. Your solve time is automatically tracked. Come back and beat your record to earn +20 XP.',
          )}
        </div>
      </Panel>

      {/* Start CTA */}
      <Link to="/practice/code-rooms" style={{ textDecoration: 'none', color: 'inherit' }}>
        <Panel style={{ marginBottom: 18, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                background: 'var(--moss-2)',
                border: '3px solid var(--ink-0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              ⚡
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 15 }}>
                {t('speedRun.startNew', 'Start a Speed Run')}
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{
                  fontSize: 9,
                  color: 'var(--ink-2)',
                  letterSpacing: '0.08em',
                  marginTop: 2,
                }}
              >
                {t('speedRun.startNewDesc', 'Pick a task and solve it as fast as you can')}
              </div>
            </div>
            <span style={{ color: 'var(--ember-1)', fontSize: 18 }}>▸</span>
          </div>
        </Panel>
      </Link>

      {/* Personal Bests */}
      <Panel>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <h2 className="font-display" style={{ fontSize: 17, margin: 0 }}>
            {t('speedRun.personalBests', 'Personal Bests')}
          </h2>
          {records.length > 0 && <Badge variant="moss">{records.length} tracked</Badge>}
        </div>

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-2)' }}>
            Loading records…
          </div>
        ) : records.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              {t(
                'speedRun.noRecords',
                'No records yet. Solve a task to set your first personal best!',
              )}
            </div>
          </div>
        ) : (
          records.map((rec, i) => (
            <div
              key={rec.taskId}
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr auto',
                gap: 12,
                alignItems: 'center',
                padding: '10px 4px',
                borderBottom: i < records.length - 1 ? '1px dashed var(--ink-3)' : 'none',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  background: 'var(--parch-2)',
                  border: '2px solid var(--ink-0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                ⏱
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'Pixelify Sans, monospace',
                    fontSize: 14,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {rec.taskTitle}
                </div>
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.06em', marginTop: 2 }}
                >
                  {rec.attempts} {t('speedRun.attempts', 'attempts')}
                  {rec.bestAiScore > 0 && <span> · AI: {rec.bestAiScore}/10</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontFamily: 'Pixelify Sans, monospace',
                    fontSize: 18,
                    color: 'var(--moss-1)',
                    lineHeight: 1,
                  }}
                >
                  {formatTime(rec.bestTimeMs)}
                </div>
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 8, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                >
                  {t('speedRun.best', 'best')}
                </div>
              </div>
            </div>
          ))
        )}
      </Panel>
    </>
  )
}
