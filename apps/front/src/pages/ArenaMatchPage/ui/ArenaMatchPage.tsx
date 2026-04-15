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
import { useAntiCheat } from '@/features/CodeRoom/hooks/useAntiCheat'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import type * as Monaco from 'monaco-editor'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function ArenaMatchPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [localCode, setLocalCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ isCorrect: boolean; output: string; error: string; passedCount: number; totalCount: number } | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [antiCheatWarning, setAntiCheatWarning] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<'me' | 'opponent'>('me')
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)

  // Anti-cheat monitoring
  const { handleEditorPaste } = useAntiCheat({
    matchId,
    enabled: !!matchId,
  })

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
    displayName: user?.firstName ?? 'Player',
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

  // Sync timer from WS match state
  useEffect(() => {
    if (ws.matchState?.durationSeconds && !timeLeft) {
      setTimeLeft(ws.matchState.durationSeconds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.matchState?.durationSeconds, timeLeft])

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

  const handleCodeChange = useCallback((value: string | undefined) => {
    const v = value ?? ''
    setLocalCode(v)
    ws.sendCodeUpdate(v)
  }, [ws.sendCodeUpdate])

  const handleSubmit = async () => {
    if (!matchId) return
    setSubmitting(true)
    try {
      const r = await apiClient.post<{ isCorrect?: boolean; output?: string; error?: string; passedCount?: number; totalCount?: number }>(`/api/v1/arena/matches/${matchId}/submit`, { code: localCode })
      setResult({ isCorrect: r.data.isCorrect ?? false, output: r.data.output ?? '', error: r.data.error ?? '', passedCount: r.data.passedCount ?? 0, totalCount: r.data.totalCount ?? 0 })
    } catch {} finally { setSubmitting(false) }
  }

  const handleForfeit = async () => {
    if (!matchId) return
    try { await apiClient.post(`/api/v1/arena/matches/${matchId}/leave`, {}) } catch {}
    navigate('/practice/arena')
  }

  const handleEditorMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor
    registerDarkTheme(monaco)
    monaco.editor.setTheme('druzya-dark')
  }, [])

  // Find my player and opponent from WS state
  const myPlayer = ws.players.find(p => p.userId === user?.id) ?? ws.players[0]
  const oppPlayer = ws.players.find(p => p.userId !== user?.id) ?? null
  const matchFinished = ws.matchState?.status === 'MATCH_STATUS_FINISHED'
  const difficultyLabel = ws.matchState?.difficulty === 2 ? 'Medium' : ws.matchState?.difficulty === 1 ? 'Easy' : 'Hard'

  // Attach paste handler to editor
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const dom = editor.getDomNode()
    if (!dom) return
    const handler = (e: Event) => handleEditorPaste(e as ClipboardEvent)
    dom.addEventListener('paste', handler)
    return () => dom.removeEventListener('paste', handler)
  }, [handleEditorPaste])

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F2F3F0]">
        {antiCheatWarning && (
          <div className="flex h-9 flex-shrink-0 items-center justify-center gap-2 border-b border-[#fecaca] bg-[#fef2f2] px-3">
            <ShieldAlert className="w-3.5 h-3.5 text-[#dc2626]" />
            <span className="text-center text-[11px] font-medium text-[#dc2626]">
              Внимание: обнаружена подозрительная активность
            </span>
          </div>
        )}

        <header className="bg-[#0f172a] px-4 pt-4 pb-5 shadow-[0_10px_26px_rgba(15,23,42,0.26)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10">
                  <Flame className="w-4.5 h-4.5 text-[#f59e0b]" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">Arena Duel</p>
                  <p className="mt-0.5 truncate text-xs text-[#94a3b8]">
                    {ws.matchState?.taskTitle ?? 'Задача'} · {difficultyLabel}
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
                    {result.isCorrect ? 'Принято' : 'Неверно'}
                  </Badge>
                )}
                {ws.matchState?.winnerId && (
                  <Badge variant={ws.matchState.winnerId === user?.id ? 'success' : 'danger'}>
                    {ws.matchState.winnerId === user?.id ? 'Победа' : 'Поражение'}
                  </Badge>
                )}
                <Badge variant="danger" dot className="bg-[#fef2f2]">LIVE</Badge>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${ws.connected ? 'bg-[#052e16] text-[#86efac]' : 'bg-[#450a0a] text-[#fca5a5]'}`}>
              {ws.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {ws.connected ? 'Live' : 'Offline'}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="dark" size="sm" onClick={handleForfeit} className="justify-center rounded-2xl">
              <Flag className="w-3.5 h-3.5 text-[#94a3b8]" /> Сдаться
            </Button>
            <Button variant="orange" size="sm" onClick={handleSubmit} loading={submitting} className="justify-center rounded-2xl">
              <Send className="w-3.5 h-3.5" /> Отправить
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-24">
          <div className="rounded-[28px] border border-[#d8d9d6] bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Avatar name={myPlayer?.displayName ?? 'Вы'} size="xs" />
                <span className="text-xs font-medium text-[#0f172a]">{myPlayer?.displayName ?? 'Вы'}</span>
              </div>
              <span className="text-[#CBCCC9]">vs</span>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={oppPlayer?.displayName ?? 'Соперник'} size="xs" className="bg-[#6366f1]" />
                <span className="truncate text-xs font-medium text-[#475569]">{oppPlayer?.displayName ?? 'Соперник'}</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-[20px] bg-[#f8fafc] p-1">
              <button
                onClick={() => setMobilePanel('me')}
                className={`rounded-2xl px-3 py-2 text-sm font-medium transition-colors ${mobilePanel === 'me' ? 'bg-[#111111] text-white shadow-sm' : 'text-[#667085]'}`}
              >
                Мой код
              </button>
              <button
                onClick={() => setMobilePanel('opponent')}
                className={`rounded-2xl px-3 py-2 text-sm font-medium transition-colors ${mobilePanel === 'opponent' ? 'bg-[#111111] text-white shadow-sm' : 'text-[#667085]'}`}
              >
                Соперник
              </button>
            </div>
          </div>

          {mobilePanel === 'me' ? (
            <div className="overflow-hidden rounded-[30px] border border-[#d8d9d6] bg-white shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-3 border-b border-[#e2e8f0] px-4 py-3">
                <Avatar name={myPlayer?.displayName ?? 'Вы'} size="xs" />
                <span className="text-sm font-semibold text-[#111111]">{myPlayer?.displayName ?? 'Вы'}</span>
                <span className="ml-auto rounded-full bg-[#F2F3F0] px-2 py-0.5 text-[11px] text-[#667085]">Python 3</span>
              </div>
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
                  }}
                />
              </div>
              <div className="border-t border-[#e2e8f0] bg-white px-4 py-3">
                {result ? (
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${result.isCorrect ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                    {result.isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    {result.isCorrect ? 'Все тесты пройдены' : `${result.passedCount ?? 0}/${result.totalCount ?? 0} тестов`}
                  </span>
                ) : (
                  <span className="text-xs text-[#94a3b8]">Ожидание отправки...</span>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[30px] border border-[#1e293b] bg-[#0f172a] shadow-[0_16px_32px_rgba(15,23,42,0.2)]">
              <div className="flex items-center gap-3 border-b border-[#1e293b] px-4 py-3">
                <Avatar name={oppPlayer?.displayName ?? 'Соперник'} size="xs" className="bg-[#6366f1]" />
                <span className="text-sm font-semibold text-[#e2e8f0]">{oppPlayer?.displayName ?? 'Соперник'}</span>
                {!oppPlayer && <Badge variant="warning" className="ml-auto">Ожидание...</Badge>}
                {oppPlayer && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-[#94a3b8]">
                    {ws.opponentHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {ws.opponentHidden ? 'Скрыт' : 'Открыт'}
                  </span>
                )}
              </div>
              <div className="h-[52vh] min-h-[320px] bg-[#0f172a]">
                {matchFinished && oppPlayer && !oppPlayer.obfuscated ? (
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
                    <div className="text-center text-[#475569]">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1e293b]">
                        <Flame className="w-6 h-6 text-[#f59e0b]" />
                      </div>
                      <p className="text-sm text-[#cbd5e1]">Код соперника скрыт</p>
                      <p className="mt-1 text-xs text-[#64748b]">Решение откроется после матча</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-[#1e293b] bg-[#111827] px-4 py-3">
                {oppPlayer?.submittedAt ? (
                  <span className={`text-xs ${oppPlayer.isCorrect ? 'text-[#22c55e]' : 'text-[#f59e0b]'}`}>
                    {oppPlayer.isCorrect ? '✓ Соперник решил задачу' : '⚡ Соперник отправил решение'}
                  </span>
                ) : oppPlayer ? (
                  <span className="text-xs text-[#f59e0b]">⚡ Соперник активно печатает...</span>
                ) : (
                  <span className="text-xs text-[#64748b]">Ожидание соперника...</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#F2F3F0] overflow-hidden">
      {/* Anti-cheat warning banner */}
      {antiCheatWarning && (
        <div className="h-8 bg-[#fef2f2] border-b border-[#fecaca] flex items-center justify-center gap-2 flex-shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 text-[#dc2626]" />
          <span className="text-xs font-medium text-[#dc2626]">
            Внимание: обнаружена подозрительная активность
          </span>
        </div>
      )}

      {/* Dark top bar */}
      <header className="h-[52px] bg-[#0f172a] flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Flame className="w-5 h-5 text-[#f59e0b]" />
          <span className="text-sm font-bold text-[#F2F3F0]">Arena Duel</span>
          {ws.matchState && (
            <div className="px-2.5 py-1 bg-[#1e293b] rounded-lg text-xs text-[#94a3b8] font-medium">
              {ws.matchState.taskTitle ?? 'Задача'} · {ws.matchState.difficulty === 2 ? 'Medium' : ws.matchState.difficulty === 1 ? 'Easy' : 'Hard'}
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
              {result.isCorrect ? 'Принято' : 'Неверно'}
            </Badge>
          )}
          {ws.matchState?.winnerId && (
            <Badge variant={ws.matchState.winnerId === user?.id ? 'success' : 'danger'}>
              {ws.matchState.winnerId === user?.id ? 'Победа!' : 'Поражение'}
            </Badge>
          )}
          <Badge variant="danger" dot className="bg-[#fef2f2]">LIVE</Badge>
          <Button variant="dark" size="sm" onClick={handleForfeit}>
            <Flag className="w-3.5 h-3.5 text-[#94a3b8]" /> Сдаться
          </Button>
          <Button variant="orange" size="sm" onClick={handleSubmit} loading={submitting}>
            <Send className="w-3.5 h-3.5" /> Отправить решение
          </Button>
        </div>
      </header>

      {/* Split editors */}
      <div className="flex flex-1 min-h-0">
        {/* My panel */}
        <div className="flex-1 flex flex-col border-r border-[#CBCCC9] min-w-0">
          <div className="h-10 bg-[#F2F3F0] border-b border-[#CBCCC9] flex items-center px-4 gap-3">
            <Avatar name={myPlayer?.displayName ?? 'Вы'} size="xs" />
            <span className="text-xs font-medium text-[#0f172a]">{myPlayer?.displayName ?? 'Вы'}</span>
            <span className="ml-auto text-xs text-[#94a3b8] px-2 py-0.5 bg-[#F2F3F0] rounded-full">Python 3</span>
          </div>
          <div className="flex-1">
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
              }}
            />
          </div>
          <div className="h-9 bg-white border-t border-[#CBCCC9] flex items-center px-4">
            {result ? (
              <span className={`flex items-center gap-1.5 text-xs font-medium ${result.isCorrect ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {result.isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                {result.isCorrect ? 'Все тесты пройдены' : `${result.passedCount ?? 0}/${result.totalCount ?? 0} тестов`}
              </span>
            ) : <span className="text-xs text-[#94a3b8]">Ожидание отправки...</span>}
          </div>
        </div>

        {/* Opponent panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-10 bg-[#0f172a] border-b border-[#1e293b] flex items-center px-4 gap-3">
            <Avatar name={oppPlayer?.displayName ?? 'Соперник'} size="xs" className="bg-[#6366f1]" />
            <span className="text-xs font-medium text-[#CBCCC9]">{oppPlayer?.displayName ?? 'Соперник'}</span>
            {!oppPlayer && <Badge variant="warning" className="ml-auto">Ожидание...</Badge>}
            {oppPlayer && (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-[#94a3b8]">
                {ws.opponentHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {ws.opponentHidden ? 'Скрыт' : 'Открыт'}
              </span>
            )}
          </div>
          <div className="flex-1 bg-[#0f172a]">
            {matchFinished && oppPlayer && !oppPlayer.obfuscated ? (
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
                <div className="text-center text-[#475569]">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#1e293b] flex items-center justify-center">
                    <Flame className="w-6 h-6 text-[#f59e0b]" />
                  </div>
                  <p className="text-sm">Код соперника скрыт</p>
                  <p className="text-xs mt-1">Решение откроется после матча</p>
                </div>
              </div>
            )}
          </div>
          <div className="h-9 bg-[#1e293b] border-t border-[#0f172a] flex items-center px-4">
            {oppPlayer?.submittedAt ? (
              <span className={`text-xs ${oppPlayer.isCorrect ? 'text-[#22c55e]' : 'text-[#f59e0b]'}`}>
                {oppPlayer.isCorrect ? '✓ Соперник решил задачу' : '⚡ Соперник отправил решение'}
              </span>
            ) : oppPlayer ? (
              <span className="text-xs text-[#f59e0b]">⚡ Соперник активно печатает...</span>
            ) : (
              <span className="text-xs text-[#475569]">Ожидание соперника...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
