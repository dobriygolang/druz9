import { useEffect, useState, useCallback } from 'react'
import { Crown, Clock, Star, ChevronRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/shared/api/base'
import { Card } from '@/shared/ui/Card'
import { Avatar } from '@/shared/ui/Avatar'
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
  if (diff <= 0) return 'Ended'
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
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

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
    <div className="flex flex-col gap-4">
      <PageMeta title={t('weeklyBoss.meta.title', 'Weekly Boss')} description={t('weeklyBoss.meta.desc', 'Weekly hard challenge with community leaderboard')} canonicalPath="/practice/weekly-boss" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#111111] dark:text-[#f8fafc]">
            <Crown className="mr-2 inline h-5 w-5 text-[#f59e0b]" />
            {t('weeklyBoss.title', 'Weekly Boss')}
          </h1>
          <p className="mt-1 text-xs text-[#667085] dark:text-[#7e93b0]">
            {t('weeklyBoss.subtitle', 'One Hard challenge per week. Compete on the leaderboard by AI score and speed.')}
          </p>
        </div>
        {data?.endsAt && (
          <div className="flex items-center gap-1.5 rounded-full border border-[#f59e0b]/20 bg-[#fffbeb] px-3 py-1.5 text-xs font-semibold text-[#92400e] dark:border-[#f59e0b]/15 dark:bg-[#2a200a] dark:text-[#fbbf24]">
            <Clock className="h-3.5 w-3.5" />
            {timeRemaining(data.endsAt)}
          </div>
        )}
      </div>

      {/* My status */}
      {myEntry ? (
        <Card padding="md" className="border-[#6366F1]/20 bg-[#eef2ff] dark:border-[#6366F1]/15 dark:bg-[#1a1a3e]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#6366F1]">{t('weeklyBoss.yourBest', 'Your Best')}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-[#6366F1]">{myEntry.aiScore}/10</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#667085] dark:text-[#7e93b0]">{t('weeklyBoss.solveTime', 'Solve time')}</p>
              <p className="mt-1 font-mono text-lg font-bold text-[#475569] dark:text-[#94a3b8]">{formatTime(myEntry.solveTimeMs)}</p>
            </div>
          </div>
        </Card>
      ) : weeklyTask ? (
        <button
          onClick={handleStartChallenge}
          disabled={starting}
          className="flex w-full items-center justify-between rounded-xl border border-[#f59e0b]/30 bg-[#fffbeb] px-4 py-3 text-left transition-colors hover:border-[#f59e0b] disabled:opacity-60 dark:border-[#f59e0b]/15 dark:bg-[#2a200a] dark:hover:border-[#f59e0b]/40"
        >
          <div className="flex items-center gap-3">
            {starting ? (
              <Loader2 className="h-6 w-6 animate-spin text-[#f59e0b]" />
            ) : (
              <Crown className="h-6 w-6 text-[#f59e0b]" />
            )}
            <div>
              <p className="text-sm font-semibold text-[#111111] dark:text-[#f8fafc]">
                {weeklyTask.taskTitle}
              </p>
              <p className="text-xs text-[#667085] dark:text-[#7e93b0]">
                {t('weeklyBoss.startDesc')}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-[#f59e0b]" />
        </button>
      ) : (
        <Card padding="md" className="text-center text-sm text-[#667085] dark:text-[#7e93b0]">
          {t('weeklyBoss.noTask')}
        </Card>
      )}

      {/* Leaderboard */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-[#111111] dark:text-[#f8fafc]">
          {t('weeklyBoss.leaderboard', 'Leaderboard')}
        </h2>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-[#F2F3F0] dark:bg-[#1a2236]" />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <Card padding="lg" className="text-center">
            <Crown className="mx-auto mb-2 h-8 w-8 text-[#CBCCC9] dark:text-[#334155]" />
            <p className="text-sm text-[#667085] dark:text-[#7e93b0]">
              {t('weeklyBoss.noEntries', 'No one has attempted the Weekly Boss yet. Be the first!')}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-1.5">
            {leaderboard.map((entry, i) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                  i === 0
                    ? 'border-[#f59e0b]/30 bg-[#fffbeb] dark:border-[#f59e0b]/15 dark:bg-[#2a200a]'
                    : 'border-[#CBCCC9] bg-white dark:border-[#1e3158] dark:bg-[#161c2d]'
                }`}
              >
                <span className={`w-6 text-center font-mono text-sm font-bold ${
                  i === 0 ? 'text-[#f59e0b]' : i < 3 ? 'text-[#6366F1]' : 'text-[#667085] dark:text-[#7e93b0]'
                }`}>
                  {i + 1}
                </span>
                <Avatar name={entry.displayName} src={entry.avatarUrl || undefined} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#111111] dark:text-[#f8fafc]">
                    {entry.displayName}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-[#f59e0b]" />
                    <span className="font-mono text-sm font-bold text-[#111111] dark:text-[#f8fafc]">{entry.aiScore}</span>
                  </div>
                  <span className="font-mono text-xs text-[#667085] dark:text-[#7e93b0]">
                    {formatTime(entry.solveTimeMs)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rewards info */}
      <Card padding="md">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-[#7e93b0]">
          {t('weeklyBoss.rewards', 'Weekly Rewards')}
        </h3>
        <div className="flex flex-col gap-1 text-xs text-[#475569] dark:text-[#94a3b8]">
          <p>🥇 1st — +100 XP</p>
          <p>🥈 2nd — +50 XP</p>
          <p>🥉 3rd — +25 XP</p>
          <p>7+ score — +25 XP ({t('weeklyBoss.missionReward', 'mission reward')})</p>
        </div>
      </Card>
    </div>
  )
}
