import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Send, Check, X, ChevronDown } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi'
import type { Room } from '@/entities/CodeRoom/model/types'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Avatar } from '@/shared/ui/Avatar'
import { getMonacoLanguage, getLanguageLabel } from '@/shared/lib/codeEditorLanguage'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import type * as Monaco from 'monaco-editor'

const STATUS_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  ROOM_STATUS_WAITING: { label: 'Ожидание', variant: 'warning' },
  ROOM_STATUS_ACTIVE: { label: 'Активна', variant: 'success' },
  ROOM_STATUS_FINISHED: { label: 'Завершена', variant: 'default' },
}

export function CodeRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [room, setRoom] = useState<Room | null>(null)
  const [code, setCode] = useState('')
  const [running, setRunning] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ isCorrect: boolean; output: string; error: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'problem' | 'tests'>('problem')
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const guestName = typeof window !== 'undefined' ? localStorage.getItem('guestCodeRoomName') ?? undefined : undefined

  useEffect(() => {
    if (!roomId) return
    codeRoomApi.getRoom(roomId, guestName)
      .then(r => { setRoom(r); if (r.code) setCode(r.code) })
      .catch(() => navigate('/practice/code-rooms'))
  }, [roomId])

  const handleRun = async () => {
    if (!roomId) return
    setRunning(true)
    setSubmitResult(null)
    try {
      const result = await codeRoomApi.submitCode(roomId, code, guestName)
      setSubmitResult(result)
      setActiveTab('tests')
    } catch {} finally { setRunning(false) }
  }

  const handleEditorMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor
    registerDarkTheme(monaco)
    monaco.editor.setTheme('lunaris-dark')
  }, [])

  const lang = 'python'
  const status = room ? STATUS_LABELS[room.status] : null

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      {/* Top bar */}
      <header className="h-[52px] bg-white border-b border-[#e2e8f0] flex items-center justify-between px-5 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/practice/code-rooms')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f1f5f9] text-[#64748b]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-bold text-[#0f172a]">{room?.task || 'Code Room'}</p>
            {status && <Badge variant={status.variant}>{status.label}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {room?.participants.map(p => (
            <Avatar key={p.userId || p.name} name={p.name} size="xs" />
          ))}
          <Button variant="secondary" size="sm" onClick={handleRun} loading={running}>
            <Play className="w-3.5 h-3.5" /> Запустить
          </Button>
          <Button variant="primary" size="sm" onClick={handleRun} loading={running}>
            <Send className="w-3.5 h-3.5" /> Отправить
          </Button>
        </div>
      </header>

      {/* 2-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* Problem panel */}
        <div className="w-[380px] flex-shrink-0 bg-white border-r border-[#e2e8f0] flex flex-col">
          <div className="flex border-b border-[#e2e8f0]">
            {(['problem', 'tests'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${activeTab === tab ? 'border-[#FF8400] text-[#18181b]' : 'border-transparent text-[#64748b]'}`}
              >
                {tab === 'problem' ? 'Задача' : 'Тесты'}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'problem' ? (
              <div className="prose prose-sm max-w-none">
                <h2 className="text-base font-bold text-[#0f172a] mb-3">{room?.task || 'Условие задачи'}</h2>
                <p className="text-sm text-[#475569] leading-relaxed">
                  {room?.task ? `Реши задачу: ${room.task}` : 'Загружается условие задачи...'}
                </p>
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

        {/* Editor */}
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
                theme: 'lunaris-dark',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
