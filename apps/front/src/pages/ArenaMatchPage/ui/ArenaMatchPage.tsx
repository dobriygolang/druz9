import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Flame, Send, Flag, X, Check } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { apiClient } from '@/shared/api/base'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Avatar } from '@/shared/ui/Avatar'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import type * as Monaco from 'monaco-editor'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function ArenaMatchPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const [match, setMatch] = useState<any>(null)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)

  useEffect(() => {
    if (!matchId) return
    apiClient.get(`/api/v1/arena/matches/${matchId}`).then(r => {
      const m = (r.data as any).match
      setMatch(m)
      if (m.starter_code) setCode(m.starter_code)
      if (m.duration_seconds) setTimeLeft(m.duration_seconds)
    }).catch(() => navigate('/practice/arena'))
  }, [matchId])

  useEffect(() => {
    if (timeLeft <= 0) return
    const t = setInterval(() => setTimeLeft(prev => {
      if (prev <= 1) { clearInterval(t); return 0 }
      return prev - 1
    }), 1000)
    return () => clearInterval(t)
  }, [timeLeft > 0])

  const handleSubmit = async () => {
    if (!matchId) return
    setSubmitting(true)
    try {
      const r = await apiClient.post(`/api/v1/arena/matches/${matchId}/submit`, { code })
      setResult(r.data)
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
    monaco.editor.setTheme('lunaris-dark')
  }, [])

  const myPlayer = match?.players?.find((p: any) => !p.is_creator) ?? match?.players?.[0]
  const oppPlayer = match?.players?.find((p: any) => p.user_id !== myPlayer?.user_id) ?? null

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      {/* Dark top bar */}
      <header className="h-[52px] bg-[#0f172a] flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Flame className="w-5 h-5 text-[#f59e0b]" />
          <span className="text-sm font-bold text-[#f8fafc]">Arena Duel</span>
          {match && (
            <div className="px-2.5 py-1 bg-[#1e293b] rounded-lg text-xs text-[#94a3b8] font-medium">
              {match.task_title ?? 'LRU Cache'} · {match.difficulty === 2 ? 'Medium' : match.difficulty === 1 ? 'Easy' : 'Hard'}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {timeLeft > 0 && (
            <div className="px-3 py-1 bg-[#fef3c7] rounded-full text-xs font-bold text-[#92400e] font-mono">
              {formatDuration(timeLeft)}
            </div>
          )}
          {result && (
            <Badge variant={result.is_correct ? 'success' : 'danger'} dot>
              {result.is_correct ? 'Принято' : 'Неверно'}
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
        <div className="flex-1 flex flex-col border-r border-[#e2e8f0] min-w-0">
          <div className="h-10 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center px-4 gap-3">
            <Avatar name={myPlayer?.display_name ?? 'Вы'} size="xs" />
            <span className="text-xs font-medium text-[#0f172a]">{myPlayer?.display_name ?? 'Вы'}</span>
            <span className="ml-auto text-xs text-[#94a3b8] px-2 py-0.5 bg-[#f1f5f9] rounded-full">Python 3</span>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language="python"
              value={code}
              onChange={v => setCode(v ?? '')}
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
          <div className="h-9 bg-white border-t border-[#e2e8f0] flex items-center px-4">
            {result ? (
              <span className={`flex items-center gap-1.5 text-xs font-medium ${result.is_correct ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {result.is_correct ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                {result.is_correct ? 'Все тесты пройдены' : `${result.passed_count ?? 0}/${result.total_count ?? 0} тестов`}
              </span>
            ) : <span className="text-xs text-[#94a3b8]">Ожидание отправки...</span>}
          </div>
        </div>

        {/* Opponent panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-10 bg-[#0f172a] border-b border-[#1e293b] flex items-center px-4 gap-3">
            <Avatar name={oppPlayer?.display_name ?? 'Соперник'} size="xs" className="bg-[#6366f1]" />
            <span className="text-xs font-medium text-[#e2e8f0]">{oppPlayer?.display_name ?? 'Соперник'}</span>
            {!oppPlayer && <Badge variant="warning" className="ml-auto">Ожидание...</Badge>}
          </div>
          <div className="flex-1 bg-[#0f172a] flex items-center justify-center">
            <div className="text-center text-[#475569]">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#1e293b] flex items-center justify-center">
                <Flame className="w-6 h-6 text-[#f59e0b]" />
              </div>
              <p className="text-sm">Код соперника скрыт</p>
              <p className="text-xs mt-1">Решение откроется после матча</p>
            </div>
          </div>
          <div className="h-9 bg-[#1e293b] border-t border-[#0f172a] flex items-center px-4">
            <span className="text-xs text-[#f59e0b]">⚡ Соперник активно печатает...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
