import { useEffect, useState, useCallback } from 'react'
import { Zap, Clock, Trophy, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/shared/api/base'
import { Card } from '@/shared/ui/Card'
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
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  return (
    <div className="flex flex-col gap-4">
      <PageMeta title={t('speedRun.meta.title', 'Speed Run')} description={t('speedRun.meta.desc', 'Beat your personal bests')} canonicalPath="/practice/speed-run" />

      <div>
        <h1 className="text-lg font-bold text-[#111111] dark:text-[#f8fafc]">
          {t('speedRun.title', 'Speed Run')}
        </h1>
        <p className="mt-1 text-xs text-[#667085] dark:text-[#7e93b0]">
          {t('speedRun.subtitle', 'Solve tasks against the clock. Beat your personal bests for bonus XP.')}
        </p>
      </div>

      {/* How it works */}
      <Card padding="md" className="border-[#6366F1]/20 bg-[#eef2ff] dark:border-[#6366F1]/15 dark:bg-[#1a1a3e]">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#6366F1]" />
          <div>
            <p className="text-sm font-medium text-[#111111] dark:text-[#f8fafc]">
              {t('speedRun.howItWorks', 'How it works')}
            </p>
            <p className="mt-1 text-xs text-[#475569] dark:text-[#94a3b8]">
              {t('speedRun.howItWorksDesc', 'Solve any practice task in a code room. Your solve time is automatically tracked. Come back and beat your record to earn +20 XP.')}
            </p>
          </div>
        </div>
      </Card>

      {/* Start CTA */}
      <Link
        to="/practice/code-rooms"
        className="flex items-center justify-between rounded-xl border border-[#CBCCC9] bg-white px-4 py-3 transition-colors hover:border-[#6366F1] dark:border-[#1e3158] dark:bg-[#161c2d] dark:hover:border-[#6366F1]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] dark:bg-[#1a1a3e]">
            <Zap className="h-5 w-5 text-[#6366F1]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#111111] dark:text-[#f8fafc]">
              {t('speedRun.startNew', 'Start a Speed Run')}
            </p>
            <p className="text-xs text-[#667085] dark:text-[#7e93b0]">
              {t('speedRun.startNewDesc', 'Pick a task and solve it as fast as you can')}
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-[#667085] dark:text-[#7e93b0]" />
      </Link>

      {/* Personal Bests */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-[#111111] dark:text-[#f8fafc]">
          {t('speedRun.personalBests', 'Personal Bests')}
        </h2>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-[#F2F3F0] dark:bg-[#1a2236]" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <Card padding="lg" className="text-center">
            <Trophy className="mx-auto mb-2 h-8 w-8 text-[#CBCCC9] dark:text-[#334155]" />
            <p className="text-sm text-[#667085] dark:text-[#7e93b0]">
              {t('speedRun.noRecords', 'No records yet. Solve a task to set your first personal best!')}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {records.map((rec) => (
              <Card key={rec.taskId} padding="md" className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#F2F3F0] dark:bg-[#1a2236]">
                  <Clock className="h-4 w-4 text-[#667085] dark:text-[#7e93b0]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#111111] dark:text-[#f8fafc]">
                    {rec.taskTitle}
                  </p>
                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-[#667085] dark:text-[#7e93b0]">
                    <span>{rec.attempts} {t('speedRun.attempts', 'attempts')}</span>
                    {rec.bestAiScore > 0 && <span>AI: {rec.bestAiScore}/10</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-[#6366F1]">
                    {formatTime(rec.bestTimeMs)}
                  </p>
                  <p className="text-[10px] text-[#667085] dark:text-[#7e93b0]">
                    {t('speedRun.best', 'best')}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
