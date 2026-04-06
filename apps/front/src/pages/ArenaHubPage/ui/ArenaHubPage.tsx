import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Trophy, Swords, Zap } from 'lucide-react'
import { apiClient } from '@/shared/api/base'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Avatar } from '@/shared/ui/Avatar'
import { Select } from '@/shared/ui/Select'
import { ErrorState } from '@/shared/ui/ErrorState'
import { useToast } from '@/shared/ui/Toast'

const LEAGUE_COLORS: Record<string, string> = {
  ARENA_LEAGUE_BRONZE: 'text-[#cd7f32]',
  ARENA_LEAGUE_SILVER: 'text-[#94a3b8]',
  ARENA_LEAGUE_GOLD: 'text-[#f59e0b]',
  ARENA_LEAGUE_PLATINUM: 'text-[#22c55e]',
  ARENA_LEAGUE_DIAMOND: 'text-[#6366f1]',
  ARENA_LEAGUE_MASTER: 'text-[#8b5cf6]',
  ARENA_LEAGUE_LEGEND: 'text-[#6366F1]',
}
const LEAGUE_LABELS: Record<string, string> = {
  ARENA_LEAGUE_BRONZE: 'Bronze', ARENA_LEAGUE_SILVER: 'Silver',
  ARENA_LEAGUE_GOLD: 'Gold', ARENA_LEAGUE_PLATINUM: 'Platinum',
  ARENA_LEAGUE_DIAMOND: 'Diamond', ARENA_LEAGUE_MASTER: 'Master', ARENA_LEAGUE_LEGEND: 'Legend',
}

export function ArenaHubPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [openMatches, setOpenMatches] = useState<any[]>([])
  const [queueStatus, setQueueStatus] = useState<any>(null)
  const [inQueue, setInQueue] = useState(false)
  const [joining, setJoining] = useState(false)
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('DIFFICULTY_MEDIUM')
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshQueueStatus = useCallback(() => {
    apiClient.get('/api/v1/arena/queue/status').then(r => {
      const d = r.data as any
      setQueueStatus(d)
      setInQueue(d.status === 'ARENA_QUEUE_STATUS_QUEUED' || d.status === 'ARENA_QUEUE_STATUS_MATCHED')
      if (d.match?.id) navigate(`/arena/${d.match.id}`)
    }).catch(() => {})
  }, [navigate])

  const fetchData = useCallback(() => {
    setError(null)
    Promise.all([
      apiClient.get('/api/v1/arena/leaderboard?limit=10').then(r => setLeaderboard((r.data as any).entries ?? [])),
      apiClient.get('/api/v1/arena/open-matches?limit=5').then(r => setOpenMatches((r.data as any).matches ?? [])),
      apiClient.get('/api/v1/arena/queue/status').then(r => {
        const d = r.data as any
        setQueueStatus(d)
        setInQueue(d.status === 'ARENA_QUEUE_STATUS_QUEUED' || d.status === 'ARENA_QUEUE_STATUS_MATCHED')
        if (d.match?.id) navigate(`/arena/${d.match.id}`)
      }),
    ]).catch(() => setError('Не удалось загрузить данные'))
  }, [navigate])

  useEffect(() => { fetchData() }, [fetchData])

  // Poll queue status every 3s while in queue
  useEffect(() => {
    if (inQueue) {
      pollRef.current = setInterval(refreshQueueStatus, 3000)
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [inQueue, refreshQueueStatus])

  const handleJoinQueue = async () => {
    setJoining(true)
    try {
      const r = await apiClient.post('/api/v1/arena/queue/join', { topic, difficulty })
      const d = r.data as any
      setInQueue(true)
      toast('Вы в очереди', 'success')
      if (d.match?.id) navigate(`/arena/${d.match.id}`)
      else refreshQueueStatus()
    } catch {
      toast('Не удалось встать в очередь', 'error')
    } finally { setJoining(false) }
  }

  const handleLeaveQueue = async () => {
    try {
      await apiClient.post('/api/v1/arena/queue/leave', {})
      toast('Вы вышли из очереди', 'info')
    } catch {
      toast('Ошибка выхода из очереди', 'error')
    }
    setInQueue(false)
  }

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchData() }} />

  return (
    <div className="px-4 md:px-6 pt-4 pb-4 md:pb-6 flex flex-col lg:flex-row gap-4">
      {/* Left column */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Queue card */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-[#f59e0b]" />
            <h3 className="text-sm font-bold text-[#111111]">Arena Queue</h3>
            {inQueue && <span className="px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] text-[11px] font-medium">В очереди</span>}
          </div>

          {inQueue ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Animated radar rings */}
                <div className="relative w-10 h-10 flex-shrink-0">
                  <span className="absolute inset-0 rounded-full bg-[#f59e0b]/20 animate-ping" />
                  <span className="absolute inset-1 rounded-full bg-[#f59e0b]/30 animate-ping [animation-delay:0.3s]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Swords className="w-4 h-4 text-[#f59e0b]" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-[#111111]">
                    Ищем соперника
                    <span className="flex gap-0.5 ml-1">
                      <span className="w-1 h-1 rounded-full bg-[#f59e0b] animate-bounce [animation-delay:0ms]" />
                      <span className="w-1 h-1 rounded-full bg-[#f59e0b] animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-1 rounded-full bg-[#f59e0b] animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    В очереди: {(() => {
                      const n = queueStatus?.queueSize ?? queueStatus?.queue_size
                      return (typeof n === 'number' && n > 0) ? `${n} чел.` : '...'
                    })()}
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={handleLeaveQueue}>
                Выйти
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Select
                  options={[{ value: '', label: 'Любая тема' }, { value: 'arrays', label: 'Arrays' }, { value: 'graphs', label: 'Graphs' }, { value: 'dp', label: 'Dynamic Prog.' }]}
                  value={topic}
                  onChange={setTopic}
                />
                <Select
                  options={[{ value: 'DIFFICULTY_EASY', label: 'Easy' }, { value: 'DIFFICULTY_MEDIUM', label: 'Medium' }, { value: 'DIFFICULTY_HARD', label: 'Hard' }]}
                  value={difficulty}
                  onChange={setDifficulty}
                />
              </div>
              <Button variant="orange" size="md" onClick={handleJoinQueue} loading={joining} className="w-full justify-center">
                <Zap className="w-4 h-4" /> Найти соперника
              </Button>
            </div>
          )}
        </Card>

        {/* Open matches */}
        <Card padding="none">
          <div className="px-4 py-3 border-b border-[#CBCCC9] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111111]">Открытые матчи</h3>
            <span className="text-xs text-[#94a3b8]">{openMatches.length}</span>
          </div>
          <div className="divide-y divide-[#CBCCC9]">
            {openMatches.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-[#94a3b8]">Нет открытых матчей</div>
            ) : openMatches.map((m: any, i: number) => (
              <div key={m.id ?? i} className="flex items-center gap-3 px-4 py-2.5">
                <Swords className="w-4 h-4 text-[#666666] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111111] truncate">{m.task_title ?? 'Задача'}</p>
                  <p className="text-xs text-[#666666]">{m.topic ?? ''} · {m.difficulty ?? ''}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => navigate(`/arena/${m.id}`)}>
                  Войти
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Right column */}
      <div className="w-full lg:w-[300px] lg:flex-shrink-0 flex flex-col gap-4">
        {/* League card */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-[#6366F1]" />
            <h3 className="text-sm font-semibold text-[#111111]">Лига</h3>
          </div>
          <div className="text-center py-2">
            <p className="font-mono text-3xl font-bold text-[#6366F1]">Arena</p>
            <p className="text-xs text-[#666666] mt-1">Станьте первым в рейтинге</p>
          </div>
        </Card>

        {/* Leaderboard */}
        <Card padding="none">
          <div className="px-4 py-3 border-b border-[#CBCCC9] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111111]">Лидерборд</h3>
            <Trophy className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <div className="divide-y divide-[#CBCCC9]">
            {leaderboard.length === 0
              ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
                  <div className="w-5 h-5 rounded bg-[#E7E8E5]" />
                  <div className="w-7 h-7 rounded-full bg-[#E7E8E5]" />
                  <div className="flex-1 h-3 bg-[#E7E8E5] rounded" />
                </div>
              ))
              : leaderboard.slice(0, 8).map((e: any, i: number) => (
                <div key={e.user_id ?? i} className="flex items-center gap-3 px-4 py-2">
                  <span className="w-5 text-xs font-mono text-[#94a3b8] text-right">{i + 1}</span>
                  <Avatar name={e.display_name ?? '?'} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#111111] truncate">{e.display_name}</p>
                    <p className={`text-[10px] ${LEAGUE_COLORS[e.league] ?? 'text-[#94a3b8]'}`}>{LEAGUE_LABELS[e.league] ?? ''}</p>
                  </div>
                  <span className="text-xs font-mono text-[#666666]">{e.rating ?? e.wins ?? 0}</span>
                </div>
              ))
            }
          </div>
        </Card>
      </div>
    </div>
  )
}
