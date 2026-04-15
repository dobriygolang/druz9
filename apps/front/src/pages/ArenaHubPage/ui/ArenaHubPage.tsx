import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Trophy, Swords, Zap, Users, Copy, Check, Link2, HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/providers/AuthProvider'
import { apiClient } from '@/shared/api/base'
import { arenaApi } from '@/features/Arena/api/arenaApi'
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { Avatar } from '@/shared/ui/Avatar'
import { Select } from '@/shared/ui/Select'
import { ErrorState } from '@/shared/ui/ErrorState'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useToast } from '@/shared/ui/Toast'
import { DIFF_LABELS, DIFF_VARIANTS, LANG_LABELS } from '@/shared/lib/taskLabels'
import { PageMeta } from '@/shared/ui/PageMeta'
import { ArenaInfoModal } from '@/shared/ui/ArenaInfoModal'

import { LEAGUE_TEXT_COLORS as LEAGUE_COLORS, LEAGUE_BG_COLORS, LEAGUE_LABELS } from '@/shared/lib/league'

export function ArenaHubPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { user: authUser } = useAuth()
  const { toast } = useToast()
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [seasonInfo, setSeasonInfo] = useState<{ seasonNumber: number; endsAt: string } | null>(null)
  const [myStats, setMyStats] = useState<any>(null)
  const [openMatches, setOpenMatches] = useState<any[]>([])
  const [queueStatus, setQueueStatus] = useState<any>(null)
  const [inQueue, setInQueue] = useState(false)
  const [joining, setJoining] = useState(false)
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('DIFFICULTY_MEDIUM')
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [showInfo, setShowInfo] = useState(false)

  // Friendly duel state
  const [creatingDuel, setCreatingDuel] = useState(false)
  const [duelRoom, setDuelRoom] = useState<{ id: string; inviteCode: string } | null>(null)
  const [copiedDuel, setCopiedDuel] = useState(false)
  const getLeagueLabel = (league?: string) => {
    const raw = LEAGUE_LABELS[league ?? '']
    return raw ? t(`arena.leagueLabel.${raw.toLowerCase()}`) : ''
  }

  const refreshQueueStatus = useCallback(() => {
    apiClient.get('/api/v1/arena/queue/status').then(r => {
      const d = r.data as any
      setQueueStatus(d)
      setInQueue(d.status === 'ARENA_QUEUE_STATUS_QUEUED' || d.status === 'ARENA_QUEUE_STATUS_MATCHED')
      if (d.match?.id) navigate(`/arena/${d.match.id}`)
    }).catch((err) => { console.error('ArenaHubPage queue status fetch error:', err) })
  }, [navigate])

  const fetchData = useCallback(() => {
    setError(null)
    const promises: Promise<any>[] = [
      apiClient.get('/api/v1/arena/leaderboard?limit=10').then(r => {
        const d = r.data as any
        setLeaderboard(d.entries ?? [])
        if (d.season) setSeasonInfo(d.season)
      }),
      apiClient.get('/api/v1/arena/open-matches?limit=5').then(r => setOpenMatches((r.data as any).matches ?? [])),
      apiClient.get('/api/v1/arena/queue/status').then(r => {
        const d = r.data as any
        setQueueStatus(d)
        setInQueue(d.status === 'ARENA_QUEUE_STATUS_QUEUED' || d.status === 'ARENA_QUEUE_STATUS_MATCHED')
        if (d.match?.id) navigate(`/arena/${d.match.id}`)
      }),
    ]
    if (authUser?.id) {
      promises.push(
        arenaApi.getPlayerStats(authUser.id).then(s => { if (s) setMyStats(s) })
      )
    }
    Promise.all(promises).catch(() => setError(t('common.loadFailed')))
  }, [navigate, t, authUser?.id])

  useEffect(() => { fetchData() }, [fetchData])

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
      toast(t('arena.toast.queueJoined'), 'success')
      if (d.match?.id) navigate(`/arena/${d.match.id}`)
      else refreshQueueStatus()
    } catch {
      toast(t('arena.toast.queueJoinFailed'), 'error')
    } finally { setJoining(false) }
  }

  const handleLeaveQueue = async () => {
    try {
      await apiClient.post('/api/v1/arena/queue/leave', {})
      toast(t('arena.toast.queueLeft'), 'info')
    } catch {
      toast(t('arena.toast.queueLeaveFailed'), 'error')
    }
    setInQueue(false)
  }

  const handleCreateFriendlyDuel = async () => {
    setCreatingDuel(true)
    try {
      const { room, inviteCode } = await codeRoomApi.createRoom({ mode: 'ROOM_MODE_DUEL', isPrivate: true })
      setDuelRoom({ id: room.id, inviteCode: inviteCode || room.inviteCode })
    } catch {
      toast(t('arena.toast.duelCreateFailed'), 'error')
    } finally {
      setCreatingDuel(false)
    }
  }

  const duelShareUrl = duelRoom
    ? `${window.location.origin}/code-rooms/join/${duelRoom.inviteCode}`
    : ''

  const copyDuelLink = () => {
    if (!duelShareUrl) return
    navigator.clipboard.writeText(duelShareUrl).then(() => {
      setCopiedDuel(true)
      setTimeout(() => setCopiedDuel(false), 2000)
    })
  }

  const seasonDaysLeft = seasonInfo?.endsAt
    ? Math.max(0, Math.ceil((new Date(seasonInfo.endsAt).getTime() - Date.now()) / 86_400_000))
    : null

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchData() }} />

  return (
    <div className={isMobile ? 'px-4 pt-4 pb-24 flex flex-col gap-4' : 'px-4 md:px-6 pt-4 pb-4 md:pb-6 flex flex-col gap-4 lg:flex-row'}>
      <PageMeta title={t('arena.meta.title')} description={t('arena.meta.description')} canonicalPath="/practice/arena" />
      {isMobile && (
        <div className="section-enter overflow-hidden rounded-[30px] border border-[#d8d9d6] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(254,243,199,0.94)_48%,_rgba(238,242,255,0.92))] p-5 shadow-[0_18px_34px_rgba(15,23,42,0.08)] dark:border-[#1e3158] dark:bg-[linear-gradient(135deg,_rgba(11,13,22,0.96),_rgba(46,26,38,0.88)_48%,_rgba(29,36,63,0.92))]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#92400e] dark:text-[#fbbf24]">{t('arena.hero.eyebrow')}</p>
              <h1 className="mt-3 text-[28px] font-bold leading-none text-[#111111] dark:text-[#f8fafc]">{t('arena.hero.title')}</h1>
              <p className="mt-3 text-sm leading-6 text-[#475569] dark:text-[#94a3b8]">{t('arena.hero.subtitle')}</p>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/78 px-4 py-3 text-right shadow-sm backdrop-blur dark:border-[#334155] dark:bg-[#1e293b]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#667085] dark:text-[#64748b]">{t('arena.hero.matches')}</p>
              <p className="mt-2 font-mono text-xl font-bold text-[#111111] dark:text-[#f8fafc]">{openMatches.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Left column */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Ranked Queue */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-[#f59e0b]" />
            <h3 className="text-sm font-bold text-[#111111] dark:text-[#f8fafc]">{t('arena.queue.title')}</h3>
            {inQueue && <span className="px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] text-[11px] font-medium dark:bg-[#422006] dark:text-[#fbbf24]">{t('arena.queue.status')}</span>}
            <span className="ml-auto text-[10px] text-[#94a3b8] dark:text-[#64748b]">ELO ±</span>
          </div>

          {inQueue ? (
            <div className={`gap-4 ${isMobile ? 'flex flex-col items-start' : 'flex items-center justify-between'}`}>
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 flex-shrink-0">
                  <span className="absolute inset-0 rounded-full bg-[#f59e0b]/20 animate-ping" />
                  <span className="absolute inset-1 rounded-full bg-[#f59e0b]/30 animate-ping [animation-delay:0.3s]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Swords className="w-4 h-4 text-[#f59e0b]" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-[#111111] dark:text-[#f8fafc]">
                    {t('arena.queue.searching')}
                    <span className="flex gap-0.5 ml-1">
                      <span className="w-1 h-1 rounded-full bg-[#f59e0b] animate-bounce [animation-delay:0ms]" />
                      <span className="w-1 h-1 rounded-full bg-[#f59e0b] animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-1 rounded-full bg-[#f59e0b] animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    {t('arena.queue.inQueue', {
                      count: (() => {
                        const n = queueStatus?.queueSize
                        return (typeof n === 'number' && n > 0) ? n : '...'
                      })(),
                    })}
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={handleLeaveQueue} className={isMobile ? 'w-full justify-center' : ''}>
                {t('arena.queue.leave')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <Select
                  options={[
                    { value: '', label: t('arena.topic.any') },
                    { value: 'arrays', label: t('arena.topic.arrays') },
                    { value: 'graphs', label: t('arena.topic.graphs') },
                    { value: 'dp', label: t('arena.topic.dp') },
                  ]}
                  value={topic}
                  onChange={setTopic}
                />
                <Select
                  options={[
                    { value: 'DIFFICULTY_EASY', label: t('arena.diff.easy') },
                    { value: 'DIFFICULTY_MEDIUM', label: t('arena.diff.medium') },
                    { value: 'DIFFICULTY_HARD', label: t('arena.diff.hard') },
                  ]}
                  value={difficulty}
                  onChange={setDifficulty}
                />
              </div>
              <Button variant="orange" size="md" onClick={handleJoinQueue} loading={joining} className="w-full justify-center">
                <Zap className="w-4 h-4" /> {t('arena.queue.find')}
              </Button>
            </div>
          )}
        </Card>

        {/* Friendly Duel */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-[#6366F1]" />
            <h3 className="text-sm font-bold text-[#111111] dark:text-[#f8fafc]">{t('arena.duel.title')}</h3>
            <span className="ml-auto rounded-full bg-[#F2F3F0] px-2 py-0.5 text-[10px] font-medium text-[#94a3b8] dark:bg-[#1e293b] dark:text-[#64748b]">{t('arena.duel.private')}</span>
          </div>
          <p className="text-xs text-[#666666] dark:text-[#94a3b8] mb-3">{t('arena.duel.linkOnly')}</p>

          {duelRoom ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-[#CBCCC9] bg-[#F2F3F0] p-2.5 dark:border-[#334155] dark:bg-[#1e293b]">
                <Link2 className="w-3.5 h-3.5 text-[#94a3b8] flex-shrink-0" />
                <code className="flex-1 text-xs text-[#111111] dark:text-[#cbd5e1] font-mono truncate">{duelShareUrl}</code>
                <button
                  onClick={copyDuelLink}
                  className="flex-shrink-0 p-1.5 rounded-md hover:bg-[#E7E8E5] dark:hover:bg-[#334155] transition-colors"
                >
                  {copiedDuel ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5 text-[#666666] dark:text-[#94a3b8]" />}
                </button>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setDuelRoom(null); setCopiedDuel(false) }} className="flex-1 justify-center">
                  {t('arena.duel.new')}
                </Button>
                <Button variant="orange" size="sm" onClick={() => navigate(`/code-rooms/${duelRoom.id}`)} className="flex-1 justify-center">
                  {t('arena.duel.openRoom')}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" size="md" onClick={handleCreateFriendlyDuel} loading={creatingDuel} className="w-full justify-center">
              <Swords className="w-4 h-4" /> {t('arena.duel.create')}
            </Button>
          )}
        </Card>

        {/* Open matches */}
        <Card padding="none">
          <div className="px-4 py-3 border-b border-[#CBCCC9] dark:border-[#1e3158] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111111] dark:text-[#f8fafc]">{t('arena.openMatches.title')}</h3>
            <span className="text-xs text-[#94a3b8]">{openMatches.length}</span>
          </div>
          <div className="divide-y divide-[#F2F3F0] dark:divide-[#1e3158]">
            {openMatches.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-[#94a3b8]">{t('arena.openMatches.empty')}</div>
            ) : openMatches.map((m: any, i: number) => (
              <div key={m.id ?? i} className={`gap-3 px-4 py-3 ${isMobile ? 'flex flex-col items-start' : 'flex items-center'}`}>
                <Swords className="w-4 h-4 text-[#666666] dark:text-[#94a3b8] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111111] dark:text-[#f8fafc] truncate">{m.taskTitle ?? t('arena.openMatches.taskFallback')}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {m.topic && <span className="text-xs text-[#666666] dark:text-[#94a3b8]">{m.topic}</span>}
                    {m.difficulty && (
                      <Badge variant={DIFF_VARIANTS[m.difficulty] ?? 'default'}>
                        {DIFF_LABELS[m.difficulty] ?? m.difficulty}
                      </Badge>
                    )}
                    {m.language && (
                      <span className="rounded-full bg-[#F2F3F0] px-2 py-0.5 text-[10px] font-medium text-[#475569] dark:bg-[#1e293b] dark:text-[#94a3b8]">
                        {LANG_LABELS[m.language] ?? m.language}
                      </span>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="secondary" className={isMobile ? 'w-full justify-center' : ''} onClick={() => navigate(`/arena/${m.id}`)}>
                  {t('arena.openMatches.join')}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Right column */}
      <div className="w-full flex flex-col gap-4 lg:w-[320px] lg:flex-shrink-0">
        {/* Season timer */}
        {seasonInfo && (
          <div className="flex items-center justify-between rounded-2xl bg-[#0f172a] px-4 py-3 dark:bg-[#1e293b]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">
                {t('arena.season.label', { number: seasonInfo.seasonNumber })}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-bold text-white">
                {seasonDaysLeft != null ? t('arena.season.daysLeft', { days: seasonDaysLeft }) : ''}
              </p>
            </div>
          </div>
        )}

        {/* Your league position */}
        {myStats && (
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-[#f59e0b]" />
              <h3 className="text-sm font-bold text-[#111111] dark:text-[#f8fafc]">
                {getLeagueLabel(myStats.league)}
              </h3>
              <span className={`ml-auto inline-block h-2 w-2 rounded-full ${LEAGUE_BG_COLORS[myStats.league] ?? 'bg-[#94a3b8]'}`} />
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-2xl font-bold text-[#111111] dark:text-[#f8fafc]">{myStats.rating}</span>
                {myStats.leagueRank > 0 && myStats.leagueTotal > 0 && (
                  <span className="text-xs text-[#94a3b8]">
                    #{myStats.leagueRank} / {myStats.leagueTotal}
                  </span>
                )}
              </div>
              {myStats.nextLeagueAt > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] text-[#94a3b8]">
                    <span>{myStats.rating}</span>
                    <span>{myStats.nextLeagueAt}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-[#F2F3F0] dark:bg-[#1e293b]">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-700 ${LEAGUE_BG_COLORS[myStats.league] ?? 'bg-[#6366F1]'}`}
                      style={{ width: `${Math.max(5, Math.min(100, ((myStats.rating - (myStats.nextLeagueAt - 450)) / 450) * 100))}%` }}
                    />
                  </div>
                </div>
              )}
              {myStats.peakRating > myStats.rating && (
                <p className="text-[10px] text-[#94a3b8]">Peak: {myStats.peakRating}</p>
              )}
              {myStats.currentWinStreak > 1 && (
                <p className="text-[10px] text-[#f59e0b]">{myStats.currentWinStreak} {t('arena.stats.winStreak')}</p>
              )}
            </div>
          </Card>
        )}

        {/* Leaderboard */}
        <Card padding="none">
          <div className="px-4 py-3 border-b border-[#CBCCC9] dark:border-[#1e3158] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111111] dark:text-[#f8fafc]">{t('arena.leaderboard.title')}</h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowInfo(true)}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-[#94a3b8] transition-colors hover:bg-[#F2F3F0] hover:text-[#475569] dark:hover:bg-[#1e293b] dark:hover:text-[#e2e8f3]"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              <Trophy className="w-4 h-4 text-[#f59e0b]" />
            </div>
          </div>
          <div className="divide-y divide-[#F2F3F0] dark:divide-[#1e3158]">
            {leaderboard.length === 0
              ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
                  <div className="w-5 h-5 rounded bg-[#E7E8E5] dark:bg-[#1e3158]" />
                  <div className="w-7 h-7 rounded-full bg-[#E7E8E5] dark:bg-[#1e3158]" />
                  <div className="flex-1 h-3 bg-[#E7E8E5] dark:bg-[#1e3158] rounded" />
                </div>
              ))
              : leaderboard.slice(0, 10).map((e: any, i: number) => (
                <div key={e.userId ?? i} className="flex items-center gap-3 px-4 py-2">
                  <span className="w-5 text-xs font-mono text-[#94a3b8] text-right">{i + 1}</span>
                  <div className="relative">
                    <Avatar name={e.displayName ?? '?'} size="xs" />
                    <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white dark:border-[#161c2d] ${LEAGUE_BG_COLORS[e.league] ?? 'bg-[#94a3b8]'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#111111] dark:text-[#f8fafc] truncate">{e.displayName}</p>
                    <p className={`text-[10px] ${LEAGUE_COLORS[e.league] ?? 'text-[#94a3b8]'}`}>{getLeagueLabel(e.league)}</p>
                  </div>
                  <span className="text-xs font-mono text-[#666666] dark:text-[#94a3b8]">{e.rating ?? 0}</span>
                </div>
              ))
            }
          </div>
        </Card>
      </div>
      <ArenaInfoModal open={showInfo} onClose={() => setShowInfo(false)} />
    </div>
  )
}
