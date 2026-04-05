import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Send, Check, X, ChevronDown, Wifi, WifiOff, Sparkles, Share2, PanelRightClose, PanelRightOpen } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi'
import { useCodeRoomWs } from '@/features/CodeRoom/hooks/useCodeRoomWs'
import { useAuth } from '@/app/providers/AuthProvider'
import type { Room } from '@/entities/CodeRoom/model/types'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Avatar } from '@/shared/ui/Avatar'
import { getMonacoLanguage, getLanguageLabel } from '@/shared/lib/codeEditorLanguage'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import type * as Monaco from 'monaco-editor'

const AI_HINTS = [
  'Подумайте о граничных случаях',
  'Рассмотрите временную сложность вашего решения',
  'Попробуйте разбить задачу на подзадачи',
]

const STATUS_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  ROOM_STATUS_WAITING: { label: 'Ожидание', variant: 'warning' },
  ROOM_STATUS_ACTIVE: { label: 'Активна', variant: 'success' },
  ROOM_STATUS_FINISHED: { label: 'Завершена', variant: 'default' },
}

function GuestNamePrompt({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('')
  return (
    <div className="flex items-center justify-center h-screen bg-[#F2F3F0]">
      <div className="bg-white rounded-2xl border border-[#CBCCC9] p-8 w-full max-w-sm flex flex-col gap-4">
        <h2 className="text-lg font-bold text-[#111111]">Введите ваше имя</h2>
        <p className="text-sm text-[#666666]">Чтобы присоединиться к комнате, укажите как вас зовут.</p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ваше имя"
          className="w-full px-4 py-2.5 bg-[#F2F3F0] border border-[#CBCCC9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8400]/30"
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSubmit(name.trim()) }}
          autoFocus
        />
        <button
          onClick={() => name.trim() && onSubmit(name.trim())}
          disabled={!name.trim()}
          className="w-full py-2.5 bg-[#FF8400] hover:bg-[#ea7700] text-[#0f172a] font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          Войти в комнату
        </button>
      </div>
    </div>
  )
}

export function CodeRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [room, setRoom] = useState<Room | null>(null)
  const [localCode, setLocalCode] = useState('')
  const [running, setRunning] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ isCorrect: boolean; output: string; error: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'problem' | 'tests'>('problem')
  const [aiTab, setAiTab] = useState<'hints' | 'result'>('hints')
  const [hints, setHints] = useState<string[]>([])
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [copied, setCopied] = useState(false)
  const [needsGuestName, setNeedsGuestName] = useState(false)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const guestNameRef = useRef(typeof window !== 'undefined' ? localStorage.getItem('guestCodeRoomName') ?? undefined : undefined)
  const skipNextWsUpdate = useRef(false)

  // Check if guest name is needed
  useEffect(() => {
    if (!user && !guestNameRef.current) {
      setNeedsGuestName(true)
    }
  }, [user])

  const handleGuestNameSubmit = (name: string) => {
    localStorage.setItem('guestCodeRoomName', name)
    guestNameRef.current = name
    setNeedsGuestName(false)
  }

  const copyInviteLink = () => {
    const url = `${window.location.origin}/code-rooms/${roomId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // WebSocket realtime
  const ws = useCodeRoomWs({
    roomId,
    userId: user?.id,
    displayName: user?.firstName ?? guestNameRef.current ?? 'Guest',
    guestName: guestNameRef.current,
    enabled: !!roomId && !needsGuestName,
  })

  // Fetch initial room data via REST
  useEffect(() => {
    if (!roomId || needsGuestName) return
    codeRoomApi.getRoom(roomId, guestNameRef.current)
      .then(r => { setRoom(r); if (r.code && !ws.code) setLocalCode(r.code) })
      .catch(() => navigate('/practice/code-rooms'))
  }, [roomId, needsGuestName])

  // Sync WebSocket code -> local (remote changes)
  useEffect(() => {
    if (ws.code && !skipNextWsUpdate.current) {
      setLocalCode(ws.code)
    }
    skipNextWsUpdate.current = false
  }, [ws.code])

  // Update room status from WS
  useEffect(() => {
    if (ws.connected && room) {
      const participantCount = ws.awareness.size
      const hasMultiple = participantCount > 1
      if (room.status === 'ROOM_STATUS_WAITING' && hasMultiple) {
        setRoom(prev => prev ? { ...prev, status: 'ROOM_STATUS_ACTIVE' } : prev)
      }
    }
  }, [ws.awareness.size, ws.connected])

  // Sync WebSocket submission results
  useEffect(() => {
    if (ws.lastSubmission) {
      setSubmitResult(ws.lastSubmission)
      setAiTab('result')
      setShowAiPanel(true)
    }
  }, [ws.lastSubmission])

  const handleCodeChange = useCallback((value: string | undefined) => {
    const v = value ?? ''
    setLocalCode(v)
    skipNextWsUpdate.current = true
    ws.sendUpdate(v)
  }, [ws.sendUpdate])

  const handleRun = async () => {
    if (!roomId) return
    setRunning(true)
    setSubmitResult(null)
    try {
      const result = await codeRoomApi.submitCode(roomId, localCode, guestNameRef.current)
      setSubmitResult(result)
      setAiTab('result')
      setShowAiPanel(true)
    } catch {} finally { setRunning(false) }
  }

  const handleEditorMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor
    registerDarkTheme(monaco)
    monaco.editor.setTheme('druzya-dark')

    // Send cursor awareness on position change
    editor.onDidChangeCursorPosition((e) => {
      ws.sendAwareness(e.position.lineNumber, e.position.column)
    })
  }, [ws.sendAwareness])

  if (needsGuestName) {
    return <GuestNamePrompt onSubmit={handleGuestNameSubmit} />
  }

  const lang = ws.language || 'python'
  const status = room ? (STATUS_LABELS[room.status] ?? { label: room.status, variant: 'default' as const }) : null

  return (
    <div className="flex flex-col h-screen bg-[#F2F3F0] overflow-hidden">
      {/* Top bar */}
      <header className="h-[52px] bg-white border-b border-[#CBCCC9] flex items-center justify-between px-5 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/practice/code-rooms')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] text-[#666666]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-bold text-[#0f172a]">{room?.task || 'Code Room'}</p>
            <div className="flex items-center gap-2">
              {status && <Badge variant={status.variant}>{status.label}</Badge>}
              {ws.connected ? (
                <span className="flex items-center gap-1 text-[10px] text-[#22c55e]">
                  <Wifi className="w-3 h-3" /> Live
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-[#94a3b8]">
                  <WifiOff className="w-3 h-3" /> Offline
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Realtime participants from awareness */}
          {Array.from(ws.awareness.values()).map(a => (
            <div key={a.userId} className="relative">
              <Avatar name={a.displayName} size="xs" />
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-[#22c55e]"
              />
            </div>
          ))}
          {room?.participants
            .filter(p => !ws.awareness.has(p.userId || p.name))
            .map(p => (
              <Avatar key={p.userId || p.name} name={p.name} size="xs" className="opacity-40" />
            ))}

          {/* Copy invite link */}
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#666666] hover:text-[#111111] hover:bg-[#F2F3F0] rounded-lg transition-colors"
            title="Скопировать ссылку-приглашение"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Скопировано' : 'Пригласить'}</span>
          </button>

          {/* Toggle AI panel */}
          <button
            onClick={() => setShowAiPanel(prev => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#666666] hover:text-[#111111] hover:bg-[#F2F3F0] rounded-lg transition-colors"
            title={showAiPanel ? 'Скрыть AI панель' : 'Показать AI панель'}
          >
            {showAiPanel ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
          </button>

          <Button variant="secondary" size="sm" onClick={handleRun} loading={running}>
            <Play className="w-3.5 h-3.5" /> Запустить
          </Button>
          <Button variant="primary" size="sm" onClick={handleRun} loading={running}>
            <Send className="w-3.5 h-3.5" /> Отправить
          </Button>
        </div>
      </header>

      {/* 3-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* Problem panel — 25% / 300px */}
        <div className="w-[300px] flex-shrink-0 bg-white border-r border-[#CBCCC9] flex flex-col">
          <div className="flex border-b border-[#CBCCC9]">
            <button
              onClick={() => setActiveTab('problem')}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'problem' ? 'border-[#FF8400] text-[#111111]' : 'border-transparent text-[#666666]'}`}
            >
              Задача
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="prose prose-sm max-w-none">
              <h2 className="text-base font-bold text-[#0f172a] mb-3">{room?.task || 'Условие задачи'}</h2>
              <p className="text-sm text-[#475569] leading-relaxed">
                {room?.task ? `Реши задачу: ${room.task}` : 'Загружается условие задачи...'}
              </p>
            </div>
          </div>
        </div>

        {/* Editor — flex-1 (takes remaining space ~70%) */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-9 bg-[#1e293b] flex items-center px-4 gap-3 flex-shrink-0">
            <span className="text-xs text-[#94a3b8] font-mono">solution.py</span>
            <button className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-[#94a3b8] rounded hover:bg-[#0f172a]">
              {getLanguageLabel(lang)} <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language={getMonacoLanguage(lang)}
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
                theme: 'druzya-dark',
              }}
            />
          </div>
        </div>

        {/* AI panel — hidden by default, toggle */}
        {showAiPanel && (
          <div className="w-[280px] flex-shrink-0 bg-white border-l border-[#CBCCC9] flex flex-col">
            <div className="px-4 py-3 border-b border-[#CBCCC9] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF8400]" />
              <span className="text-sm font-bold text-[#111111]">AI Помощник</span>
            </div>
            <div className="flex border-b border-[#CBCCC9]">
              {(['hints', 'result'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAiTab(tab)}
                  className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${aiTab === tab ? 'border-[#FF8400] text-[#111111]' : 'border-transparent text-[#666666]'}`}
                >
                  {tab === 'hints' ? 'Подсказки' : 'Результат'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {aiTab === 'hints' ? (
                <div className="flex flex-col gap-3">
                  {hints.length === 0 ? (
                    <>
                      <p className="text-sm text-[#666666] leading-relaxed">
                        Начните решать задачу, и AI поможет если застрянете
                      </p>
                      <Button
                        variant="orange"
                        size="sm"
                        className="w-full"
                        onClick={() => setHints(AI_HINTS)}
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Получить подсказку
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {hints.map((hint, i) => (
                        <div key={i} className="p-3 bg-[#FFF7ED] border border-[#FDBA74] rounded-lg">
                          <p className="text-xs font-semibold text-[#9a3412] mb-0.5">Подсказка {i + 1}</p>
                          <p className="text-sm text-[#111111]">{hint}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {submitResult ? (
                    <div className={`p-3 rounded-lg ${submitResult.isCorrect ? 'bg-[#e8f9ef] border border-[#86efac]' : 'bg-[#fef2f2] border border-[#fca5a5]'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {submitResult.isCorrect ? <Check className="w-4 h-4 text-[#22c55e]" /> : <X className="w-4 h-4 text-[#ef4444]" />}
                        <span className="text-sm font-semibold">{submitResult.isCorrect ? 'Принято!' : 'Неверно'}</span>
                      </div>
                      {submitResult.output && <pre className="text-xs text-[#475569] font-mono whitespace-pre-wrap">{submitResult.output}</pre>}
                      {submitResult.error && <pre className="text-xs text-[#ef4444] font-mono whitespace-pre-wrap">{submitResult.error}</pre>}
                    </div>
                  ) : (
                    <p className="text-sm text-[#94a3b8]">Запустите код чтобы увидеть результаты</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
