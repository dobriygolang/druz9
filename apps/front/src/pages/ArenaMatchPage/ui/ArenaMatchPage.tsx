import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Flame, Send, Flag, X, Check, Wifi, WifiOff, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { apiClient } from '@/shared/api/base'
import { useArenaWs } from '@/features/CodeRoom/hooks/useArenaWs'
import { useAuth } from '@/app/providers/AuthProvider'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Avatar } from '@/shared/ui/Avatar'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import { registerFormatKeybinding } from '@/shared/lib/editorFormat'
import { useAntiCheat } from '@/features/CodeRoom/hooks/useAntiCheat'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { ReviewCard } from '@/features/SolutionReview/ui/ReviewCard'
import { useSolutionReview } from '@/features/SolutionReview/hooks/useSolutionReview'
import { useTranslation } from 'react-i18next'
import type * as Monaco from 'monaco-editor'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function parseFreezeSeconds(freezeUntil?: string) {
  if (!freezeUntil) return 0

  const freezeAt = Date.parse(freezeUntil)
  if (Number.isNaN(freezeAt)) return 0

  return Math.max(0, Math.ceil((freezeAt - Date.now()) / 1000))
}

function difficultyLabel(difficulty?: number | string) {
  if (difficulty === 1 || difficulty === 'ARENA_DIFFICULTY_EASY' || difficulty === 'easy') return 'Easy'
  if (difficulty === 2 || difficulty === 'ARENA_DIFFICULTY_MEDIUM' || difficulty === 'medium') return 'Medium'
  return 'Hard'
}

export function ArenaMatchPage() {
  const { t } = useTranslation()
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [localCode, setLocalCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ isCorrect: boolean; output: string; error: string; passedCount: number; totalCount: number } | null>(null)
  const [lastSubmissionId, setLastSubmissionId] = useState<string | undefined>()
  const { review, loading: reviewLoading } = useSolutionReview({ submissionId: lastSubmissionId })
  const [timeLeft, setTimeLeft] = useState(0)
  const [freezeSeconds, setFreezeSeconds] = useState(0)
  const [antiCheatWarning, setAntiCheatWarning] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<'me' | 'opponent'>('me')
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const timerInitializedRef = useRef(false)

  // Anti-cheat monitoring
  const { handleEditorPaste } = useAntiCheat({
    matchId,
    enabled: !!matchId,
  })
  const handleEditorPasteRef = useRef(handleEditorPaste)
  handleEditorPasteRef.current = handleEditorPaste

  // Show warning banner on anti-cheat events
  useEffect(() => {
    if (!matchId) return
    const handleVisibility = () => {
      if (document.hidden) setAntiCheatWarning(true)
    }
    const handleBlur = () => setAntiCheatWarning(true)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
    }
  }, [matchId])

  // WebSocket realtime
  const ws = useArenaWs({
    matchId,
    userId: user?.id,
    displayName: user?.firstName ?? t('arena.match.player'),
    enabled: !!matchId,
  })

  // Fetch initial match data via REST
  useEffect(() => {
    if (!matchId) return
    let cancelled = false

    const loadMatch = async () => {
      try {
        const initial = await apiClient.get<{ match?: any }>(`/api/v1/arena/matches/${matchId}`)
        let match = initial.data.match
        const players = Array.isArray(match?.players) ? match.players : []
        const alreadyJoined = !!user?.id && players.some((player: any) => player?.userId === user.id)
        const hasOpenSlot = players.length < 2 && match?.status !== 'MATCH_STATUS_FINISHED'

        if (user?.id && !alreadyJoined && hasOpenSlot) {
          const joined = await apiClient.post<{ match?: any }>(`/api/v1/arena/matches/${matchId}/join`, {})
          match = joined.data.match ?? match
        }

        if (cancelled) return
        if (match?.starterCode) setLocalCode(match.starterCode)
        if (match?.durationSeconds) setTimeLeft(match.durationSeconds)
      } catch {
        if (!cancelled) navigate('/practice/arena')
      }
    }

    void loadMatch()
    return () => { cancelled = true }
  }, [matchId, navigate, user?.id])

  // Sync timer from WS match state — only initialize once to avoid resetting after countdown hits zero
  useEffect(() => {
    if (ws.matchState?.durationSeconds && !timerInitializedRef.current) {
      timerInitializedRef.current = true
      setTimeLeft(ws.matchState.durationSeconds)
    }
  }, [ws.matchState?.durationSeconds])

  // Navigate away when match ends with a winner
  useEffect(() => {
    if (ws.matchState?.status === 'MATCH_STATUS_FINISHED') {
      // Match ended - could show results modal instead
    }
  }, [ws.matchState?.status])

  // Countdown timer
  const timerActive = timeLeft > 0
  useEffect(() => {
    if (!timerActive) return
    const t = setInterval(() => setTimeLeft(prev => {
      if (prev <= 1) { clearInterval(t); return 0 }
      return prev - 1
    }), 1000)
    return () => clearInterval(t)
  }, [timerActive])

  const handleForfeit = async () => {
    if (!matchId) return
    try { await apiClient.post(`/api/v1/arena/matches/${matchId}/leave`, {}) } catch {}
    navigate('/practice/arena')
  }

  const handleEditorMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor
    registerDarkTheme(monaco)
    registerFormatKeybinding(editor, monaco)
    monaco.editor.setTheme('druzya-dark')
    const dom = editor.getDomNode()
    if (dom) {
      dom.addEventListener('paste', (e) => handleEditorPasteRef.current(e as ClipboardEvent))
    }
  }, [])

  // Find my player and opponent from WS state
  const myPlayer = ws.players.find(p => p.userId === user?.id) ?? ws.players[0]
  const oppPlayer = ws.players.find(p => p.userId !== user?.id) ?? null
  const isSpectator = !!user?.id && ws.players.length > 0 && !ws.players.some(player => player.userId === user.id)
  const matchFinished = ws.matchState?.status === 'MATCH_STATUS_FINISHED'
  const waitingForOpponent = ws.matchState?.status === 'MATCH_STATUS_WAITING' || (!matchFinished && ws.players.length < 2)
  const taskTitle = ws.matchState?.taskTitle ?? 'Task'
  const taskStatement = ws.matchState?.taskStatement ?? ''
  const levelLabel = difficultyLabel(ws.matchState?.difficulty)
  const editingLocked = freezeSeconds > 0 || waitingForOpponent || matchFinished || isSpectator

  useEffect(() => {
    setFreezeSeconds(parseFreezeSeconds(myPlayer?.freezeUntil))
  }, [myPlayer?.freezeUntil])

  useEffect(() => {
    if (freezeSeconds <= 0) return

    const timer = setInterval(() => {
      setFreezeSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }

        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [freezeSeconds])

  const handleCodeChange = useCallback((value: string | undefined) => {
    if (editingLocked) return
    const v = value ?? ''
    setLocalCode(v)
    ws.sendCodeUpdate(v)
  }, [editingLocked, ws.sendCodeUpdate])

  const handleSubmit = async () => {
    if (!matchId || editingLocked) return
    setSubmitting(true)
    try {
      const r = await apiClient.post<{ isCorrect?: boolean; output?: string; error?: string; passedCount?: number; totalCount?: number; submissionId?: string }>(`/api/v1/arena/matches/${matchId}/submit`, { code: localCode })
      setResult({ isCorrect: r.data.isCorrect ?? false, output: r.data.output ?? '', error: r.data.error ?? '', passedCount: r.data.passedCount ?? 0, totalCount: r.data.totalCount ?? 0 })
      if (r.data.submissionId) setLastSubmissionId(r.data.submissionId)
    } catch {} finally { setSubmitting(false) }
  }

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F0F5F1]">
        {antiCheatWarning && (
          <div className="flex h-9 flex-shrink-0 items-center justify-center gap-2 border-b border-[#fecaca] bg-[#fef2f2] px-3">
            <ShieldAlert className="w-3.5 h-3.5 text-[#dc2626]" />
            <span className="text-center text-[11px] font-medium text-[#dc2626]">
              {t('arena.match.warning')}
            </span>
          </div>
        )}

        <header className="bg-[#0B1210] px-4 pt-4 pb-5 shadow-[0_10px_26px_rgba(15,23,42,0.26)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10">
                  <Flame className="w-4.5 h-4.5 text-[#f59e0b]" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{t('arena.match.title')}</p>
                  <p className="mt-0.5 truncate text-xs text-[#94a3b8]">
                    {taskTitle} · {levelLabel}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {timeLeft > 0 && (
                  <div className={`rounded-full px-3 py-1 text-xs font-bold font-mono ${
                    timeLeft <= 60 ? 'bg-[#fef2f2] text-[#dc2626]' : 'bg-[#fef3c7] text-[#92400e]'
                  }`}>
                    {formatDuration(timeLeft)}
                  </div>
                )}
                {result && (
                  <Badge variant={result.isCorrect ? 'success' : 'danger'} dot>
                    {result.isCorrect ? t('arena.match.accepted') : t('arena.match.wrong')}
                  </Badge>
                )}
                {ws.matchState?.winnerId && (
                  <Badge variant={ws.matchState.winnerId === user?.id ? 'success' : 'danger'}>
                    {ws.matchState.winnerId === user?.id ? t('arena.match.victory') : t('arena.match.defeat')}
                  </Badge>
                )}
                <Badge variant="danger" dot className="bg-[#fef2f2]">{t('arena.match.live')}</Badge>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${ws.connected ? 'bg-[#052e16] text-[#86efac]' : 'bg-[#450a0a] text-[#fca5a5]'}`}>
              {ws.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {ws.connected ? t('arena.match.live') : t('users.status.offline')}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="dark" size="sm" onClick={handleForfeit} className="justify-center rounded-2xl">
              <Flag className="w-3.5 h-3.5 text-[#94a3b8]" /> {t('arena.match.forfeit')}
            </Button>
            <Button variant="orange" size="sm" onClick={handleSubmit} loading={submitting} disabled={editingLocked || submitting} className="justify-center rounded-2xl">
              <Send className="w-3.5 h-3.5" /> {t('arena.match.submit')}
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-24">
          {waitingForOpponent && (
            <div className="rounded-[26px] border border-[#C1D9CA] bg-[#eff6ff] px-4 py-3 text-sm text-[#1d4ed8] shadow-[0_10px_24px_rgba(59,130,246,0.12)]">
              {t('arena.match.waitingBanner')}
            </div>
          )}
          {freezeSeconds > 0 && (
            <div className="rounded-[26px] border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-sm text-[#c2410c] shadow-[0_10px_24px_rgba(249,115,22,0.1)]">
              {t('arena.match.freeze', { seconds: freezeSeconds })}
            </div>
          )}
          <div className="rounded-[28px] border border-[#d8d9d6] bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Avatar name={myPlayer?.displayName ?? t('arena.match.you')} size="xs" />
                <span className="text-xs font-medium text-[#0B1210]">{myPlayer?.displayName ?? t('arena.match.you')}</span>
              </div>
              <span className="text-[#C1CFC4]">{t('arena.match.vs')}</span>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={oppPlayer?.displayName ?? t('arena.match.opponent')} size="xs" className="bg-[#059669]" />
                <span className="truncate text-xs font-medium text-[#4B6B52]">{oppPlayer?.displayName ?? t('arena.match.opponent')}</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-[20px] bg-[#E2F0E8] p-1">
              <button
                onClick={() => setMobilePanel('me')}
                className={`rounded-2xl px-3 py-2 text-sm font-medium transition-colors ${mobilePanel === 'me' ? 'bg-[#111111] text-white shadow-sm' : 'text-[#7A9982]'}`}
              >
                {t('arena.match.myCode')}
              </button>
              <button
                onClick={() => setMobilePanel('opponent')}
                className={`rounded-2xl px-3 py-2 text-sm font-medium transition-colors ${mobilePanel === 'opponent' ? 'bg-[#111111] text-white shadow-sm' : 'text-[#7A9982]'}`}
              >
                {t('arena.match.opponent')}
              </button>
            </div>
          </div>

          {mobilePanel === 'me' ? (
            <div className="overflow-hidden rounded-[30px] border border-[#d8d9d6] bg-white shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-3 border-b border-[#e2e8f0] px-4 py-3">
                <Avatar name={myPlayer?.displayName ?? t('arena.match.you')} size="xs" />
                <span className="text-sm font-semibold text-[#111111]">{myPlayer?.displayName ?? t('arena.match.you')}</span>
                <span className="ml-auto rounded-full bg-[#F0F5F1] px-2 py-0.5 text-[11px] text-[#7A9982]">Python 3</span>
              </div>
              {waitingForOpponent ? (
                <div className="flex min-h-[320px] items-center justify-center px-6 py-10 text-center text-[#4B6B52]">
                  <div>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#ecfdf5]">
                      <Wifi className="h-5 w-5 text-[#047857]" />
                    </div>
                    <p className="text-sm font-semibold text-[#0B1210]">{t('arena.match.waitingStart')}</p>
                    <p className="mt-1 text-xs text-[#7A9982]">{t('arena.match.waitingEditor')}</p>
                  </div>
                </div>
              ) : (
                <>
                  {taskStatement && (
                    <div className="border-b border-[#e2e8f0] bg-[#E2F0E8] px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A9982]">{t('arena.match.task')}</p>
                      <p className="mt-2 line-clamp-4 text-sm leading-6 text-[#0B1210]">{taskStatement}</p>
                    </div>
                  )}
                  <div className="h-[52vh] min-h-[320px]">
                    <Editor
                      height="100%"
                      language="python"
                      value={localCode}
                      onChange={handleCodeChange}
                      onMount={handleEditorMount}
                      options={{
                        fontSize: 13,
                        fontFamily: '"JetBrains Mono", monospace',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: 'on',
                        padding: { top: 12 },
                        readOnly: editingLocked,
                      }}
                    />
                  </div>
                </>
              )}
              <div className="border-t border-[#e2e8f0] bg-white px-4 py-3 space-y-2">
                {isSpectator ? (
                  <span className="text-xs text-[#059669]">{t('arena.match.spectatorLocked')}</span>
                ) : result ? (
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${result.isCorrect ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                    {result.isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    {result.isCorrect ? t('arena.match.allTestsPassed') : t('arena.match.tests', { passed: result.passedCount ?? 0, total: result.totalCount ?? 0 })}
                  </span>
                ) : (
                  <span className="text-xs text-[#94a3b8]">{t('arena.match.waitingSubmission')}</span>
                )}
                {lastSubmissionId && <ReviewCard review={review} loading={reviewLoading} showComparison />}
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[30px] border border-[#1e293b] bg-[#0B1210] shadow-[0_16px_32px_rgba(15,23,42,0.2)]">
              <div className="flex items-center gap-3 border-b border-[#1e293b] px-4 py-3">
                <Avatar name={oppPlayer?.displayName ?? t('arena.match.opponent')} size="xs" className="bg-[#059669]" />
                <span className="text-sm font-semibold text-[#e2e8f0]">{isSpectator ? t('arena.match.playerTwo') : (oppPlayer?.displayName ?? t('arena.match.opponent'))}</span>
                {!isSpectator && !oppPlayer && <Badge variant="warning" className="ml-auto">{t('arena.match.waiting')}</Badge>}
                {!isSpectator && oppPlayer && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-[#94a3b8]">
                    {ws.opponentHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {ws.opponentHidden ? t('arena.match.hidden') : t('arena.match.visible')}
                  </span>
                )}
              </div>
              <div className="h-[52vh] min-h-[320px] bg-[#0B1210]">
                {isSpectator && ws.players.length >= 2 ? (
                  <Editor
                    height="100%"
                    language="python"
                    value={ws.players[1]?.code ?? ''}
                    options={{
                      fontSize: 13,
                      fontFamily: '"JetBrains Mono", monospace',
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      readOnly: true,
                      lineNumbers: 'on',
                      padding: { top: 12 },
                    }}
                  />
                ) : matchFinished && oppPlayer && !oppPlayer.obfuscated ? (
                  <Editor
                    height="100%"
                    language="python"
                    value={oppPlayer.code}
                    options={{
                      fontSize: 13,
                      fontFamily: '"JetBrains Mono", monospace',
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      readOnly: true,
                      lineNumbers: 'on',
                      padding: { top: 12 },
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6">
                    <div className="text-center text-[#4B6B52]">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1e293b]">
                        <Flame className="w-6 h-6 text-[#f59e0b]" />
                      </div>
                      <p className="text-sm text-[#C1D9CA]">{t('arena.match.opponentHidden')}</p>
                      <p className="mt-1 text-xs text-[#7A9982]">{t('arena.match.revealAfter')}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-[#1e293b] bg-[#111827] px-4 py-3">
                {isSpectator ? (
                  <span className="text-xs text-[#C1D9CA]">{t('arena.match.spectatorReadonly')}</span>
                ) : oppPlayer?.submittedAt ? (
                  <span className={`text-xs ${oppPlayer.isCorrect ? 'text-[#22c55e]' : 'text-[#f59e0b]'}`}>
                    {oppPlayer.isCorrect ? t('arena.match.opponentSolved') : t('arena.match.opponentSubmitted')}
                  </span>
                ) : oppPlayer ? (
                  <span className="text-xs text-[#f59e0b]">{t('arena.match.opponentTyping')}</span>
                ) : (
                  <span className="text-xs text-[#7A9982]">{t('arena.match.waitingOpponent')}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#F0F5F1] overflow-hidden">
      {/* Anti-cheat warning banner */}
      {antiCheatWarning && (
        <div className="h-8 bg-[#fef2f2] border-b border-[#fecaca] flex items-center justify-center gap-2 flex-shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 text-[#dc2626]" />
          <span className="text-xs font-medium text-[#dc2626]">
            {t('arena.match.warning')}
          </span>
        </div>
      )}

      {/* Dark top bar */}
      <header className="h-[52px] bg-[#0B1210] flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Flame className="w-5 h-5 text-[#f59e0b]" />
          <span className="text-sm font-bold text-[#F2F3F0]">{t('arena.match.title')}</span>
          {ws.matchState && (
            <div className="px-2.5 py-1 bg-[#1e293b] rounded-lg text-xs text-[#94a3b8] font-medium">
              {taskTitle} · {levelLabel}
            </div>
          )}
          {ws.connected ? (
            <span className="flex items-center gap-1 text-[10px] text-[#22c55e]">
              <Wifi className="w-3 h-3" />
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-[#ef4444]">
              <WifiOff className="w-3 h-3" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {timeLeft > 0 && (
            <div className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
              timeLeft <= 60 ? 'bg-[#fef2f2] text-[#dc2626] animate-pulse' : 'bg-[#fef3c7] text-[#92400e]'
            }`}>
              {formatDuration(timeLeft)}
            </div>
          )}
          {result && (
            <Badge variant={result.isCorrect ? 'success' : 'danger'} dot>
              {result.isCorrect ? t('arena.match.accepted') : t('arena.match.wrong')}
            </Badge>
          )}
          {ws.matchState?.winnerId && (
            <Badge variant={ws.matchState.winnerId === user?.id ? 'success' : 'danger'}>
              {ws.matchState.winnerId === user?.id ? t('arena.match.victoryBang') : t('arena.match.defeat')}
            </Badge>
          )}
          <Badge variant="danger" dot className="bg-[#fef2f2]">{t('arena.match.live')}</Badge>
          <Button variant="dark" size="sm" onClick={handleForfeit}>
            <Flag className="w-3.5 h-3.5 text-[#94a3b8]" /> {t('arena.match.forfeit')}
          </Button>
          <Button variant="orange" size="sm" onClick={handleSubmit} loading={submitting} disabled={editingLocked || submitting}>
            <Send className="w-3.5 h-3.5" /> {t('arena.match.submitSolution')}
          </Button>
        </div>
      </header>

      {(waitingForOpponent || freezeSeconds > 0 || isSpectator) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-[#d8d9d6] bg-white px-5 py-3 text-sm">
          {waitingForOpponent && (
            <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-[#1d4ed8]">
              {t('arena.match.waitingUnlock')}
            </span>
          )}
          {freezeSeconds > 0 && (
            <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-[#c2410c]">
              {t('arena.match.retryIn', { seconds: freezeSeconds })}
            </span>
          )}
          {isSpectator && (
            <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-[#047857]">
              {t('arena.match.spectatorReadonly')}
            </span>
          )}
        </div>
      )}

      {/* Split editors */}
      <div className="flex flex-1 min-h-0">
        {/* My panel */}
        <div className="flex-1 flex flex-col border-r border-[#C1CFC4] min-w-0">
          <div className="h-10 bg-[#F0F5F1] border-b border-[#C1CFC4] flex items-center px-4 gap-3">
            <Avatar name={myPlayer?.displayName ?? t('arena.match.you')} size="xs" />
            <span className="text-xs font-medium text-[#0B1210]">{myPlayer?.displayName ?? t('arena.match.you')}</span>
            <span className="ml-auto text-xs text-[#94a3b8] px-2 py-0.5 bg-[#F0F5F1] rounded-full">Python 3</span>
          </div>
          <div className="flex-1">
            {waitingForOpponent ? (
              <div className="flex h-full items-center justify-center bg-white px-8">
                <div className="max-w-md text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#ecfdf5]">
                    <Wifi className="h-6 w-6 text-[#047857]" />
                  </div>
                  <p className="text-base font-semibold text-[#0B1210]">{t('arena.match.waitingStart')}</p>
                  <p className="mt-2 text-sm leading-6 text-[#7A9982]">{t('arena.match.waitingUnlockEditor')}</p>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                {taskStatement && (
                  <div className="border-b border-[#e2e8f0] bg-[#E2F0E8] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7A9982]">{t('arena.match.task')}</p>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#0B1210]">{taskStatement}</p>
                  </div>
                )}
                <div className="min-h-0 flex-1">
                  <Editor
                    height="100%"
                    language="python"
                    value={localCode}
                    onChange={handleCodeChange}
                    onMount={handleEditorMount}
                    options={{
                      fontSize: 13,
                      fontFamily: '"JetBrains Mono", monospace',
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      lineNumbers: 'on',
                      padding: { top: 12 },
                      readOnly: editingLocked,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="bg-white border-t border-[#C1CFC4] px-4 py-2 space-y-2">
            <div className="flex items-center h-5">
              {isSpectator ? (
                <span className="text-xs text-[#059669]">{t('arena.match.spectatorSubmitDisabled')}</span>
              ) : result ? (
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${result.isCorrect ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {result.isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  {result.isCorrect ? t('arena.match.allTestsPassed') : t('arena.match.tests', { passed: result.passedCount ?? 0, total: result.totalCount ?? 0 })}
                </span>
              ) : <span className="text-xs text-[#94a3b8]">{t('arena.match.waitingSubmission')}</span>}
            </div>
            {lastSubmissionId && <ReviewCard review={review} loading={reviewLoading} showComparison />}
          </div>
        </div>

        {/* Opponent panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-10 bg-[#0B1210] border-b border-[#1e293b] flex items-center px-4 gap-3">
            <Avatar name={isSpectator ? (ws.players[1]?.displayName ?? t('arena.match.playerTwo')) : (oppPlayer?.displayName ?? t('arena.match.opponent'))} size="xs" className="bg-[#059669]" />
            <span className="text-xs font-medium text-[#C1CFC4]">{isSpectator ? (ws.players[1]?.displayName ?? t('arena.match.playerTwo')) : (oppPlayer?.displayName ?? t('arena.match.opponent'))}</span>
            {!isSpectator && !oppPlayer && <Badge variant="warning" className="ml-auto">{t('arena.match.waiting')}</Badge>}
            {!isSpectator && oppPlayer && (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-[#94a3b8]">
                {ws.opponentHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {ws.opponentHidden ? t('arena.match.hidden') : t('arena.match.visible')}
              </span>
            )}
          </div>
          <div className="flex-1 bg-[#0B1210]">
            {isSpectator && ws.players.length >= 2 ? (
              <Editor
                height="100%"
                language="python"
                value={ws.players[1]?.code ?? ''}
                options={{
                  fontSize: 13,
                  fontFamily: '"JetBrains Mono", monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  readOnly: true,
                  lineNumbers: 'on',
                  padding: { top: 12 },
                  theme: 'druzya-dark',
                }}
              />
            ) : matchFinished && oppPlayer && !oppPlayer.obfuscated ? (
              // Show opponent's code after match ends
              <Editor
                height="100%"
                language="python"
                value={oppPlayer.code}
                options={{
                  fontSize: 13,
                  fontFamily: '"JetBrains Mono", monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  readOnly: true,
                  lineNumbers: 'on',
                  padding: { top: 12 },
                  theme: 'druzya-dark',
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-[#4B6B52]">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#1e293b] flex items-center justify-center">
                    <Flame className="w-6 h-6 text-[#f59e0b]" />
                  </div>
                  <p className="text-sm">{t('arena.match.opponentHidden')}</p>
                  <p className="text-xs mt-1">{t('arena.match.revealAfter')}</p>
                </div>
              </div>
            )}
          </div>
          <div className="h-9 bg-[#1e293b] border-t border-[#0B1210] flex items-center px-4">
            {isSpectator ? (
              <span className="text-xs text-[#C1D9CA]">{t('arena.match.playerTwoRight')}</span>
            ) : oppPlayer?.submittedAt ? (
              <span className={`text-xs ${oppPlayer.isCorrect ? 'text-[#22c55e]' : 'text-[#f59e0b]'}`}>
                {oppPlayer.isCorrect ? t('arena.match.opponentSolved') : t('arena.match.opponentSubmitted')}
              </span>
            ) : oppPlayer ? (
              <span className="text-xs text-[#f59e0b]">{t('arena.match.opponentTypingActive')}</span>
            ) : (
              <span className="text-xs text-[#4B6B52]">{t('arena.match.waitingOpponent')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
