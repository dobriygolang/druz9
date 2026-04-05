import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Send } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { interviewPrepApi } from '@/features/InterviewPrep/api/interviewPrepApi'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import type * as Monaco from 'monaco-editor'

export function InterviewPrepMockSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [code, setCode] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)

  useEffect(() => {
    if (!sessionId) return
    interviewPrepApi.getMockSession(sessionId).then((s: any) => {
      setSession(s)
      const stage = s?.current_stage
      if (stage?.task?.starter_code) setCode(stage.task.starter_code)
      if (stage?.task?.duration_seconds) setTimeLeft(stage.task.duration_seconds)
    }).catch(() => navigate('/growth/interview-prep'))
  }, [sessionId, navigate])

  const timerActive = timeLeft > 0
  useEffect(() => {
    if (!timerActive) return
    const t = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000)
    return () => clearInterval(t)
  }, [timerActive])

  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  const handleSubmit = async () => {
    if (!sessionId) return
    setSubmitting(true)
    try {
      await interviewPrepApi.submitSession(sessionId, code, 'python3')
      const updated = await interviewPrepApi.getMockSession(sessionId) as any
      setSession(updated)
      if (updated.status === 'finished') navigate('/growth/interview-prep')
    } catch {} finally { setSubmitting(false) }
  }

  const handleEditorMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor
    registerDarkTheme(monaco)
    monaco.editor.setTheme('druzya-dark')
  }, [])

  const currentStage = session?.current_stage
  const stages = session?.stages ?? []
  const companyTag = session?.company_tag ?? ''

  return (
    <div className="flex flex-col h-screen bg-[#F2F3F0] overflow-hidden">
      <header className="h-[52px] bg-white border-b border-[#CBCCC9] flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/growth/interview-prep')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] text-[#666666]">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-bold text-[#0f172a]">Mock Interview · {companyTag || 'General'}</p>
            <p className="text-xs text-[#666666]">Stage {(session?.current_stage_index ?? 0) + 1} of {stages.length}</p>
          </div>
          <Badge variant="success" dot>Идёт интервью</Badge>
        </div>
        <div className="flex items-center gap-2">
          {timeLeft > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#fef3c7] rounded-full text-xs font-bold text-[#92400e]">
              <Clock className="w-3 h-3" /> {formatTime(timeLeft)}
            </div>
          )}
          <Button variant="orange" size="sm" onClick={handleSubmit} loading={submitting}>
            <Send className="w-3.5 h-3.5" /> Завершить этап
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Stage progress + problem */}
        <div className="w-[380px] flex-shrink-0 bg-white border-r border-[#CBCCC9] flex flex-col">
          {/* Stage progress */}
          <div className="px-4 py-3 border-b border-[#CBCCC9]">
            <div className="flex items-center gap-2">
              {stages.map((s: any, i: number) => {
                const isCurrent = i === session?.current_stage_index
                const isDone = s.status === 'finished'
                return (
                  <div key={s.id ?? i} className="flex items-center gap-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDone ? 'bg-[#22c55e] text-white' : isCurrent ? 'bg-[#FF8400] text-white' : 'bg-[#E7E8E5] text-[#666666]'}`}>
                      {isDone ? '✓' : i + 1}
                    </div>
                    {i < stages.length - 1 && <div className="w-4 h-0.5 bg-[#CBCCC9]" />}
                  </div>
                )
              })}
            </div>
          </div>
          {/* Problem */}
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-base font-bold text-[#0f172a] mb-3">{currentStage?.task?.title ?? 'Задача'}</h2>
            <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">{currentStage?.task?.statement ?? 'Загружается...'}</p>
            {currentStage?.kind === 'system_design' && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-[#475569] mb-2">Заметки</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Опишите архитектуру решения..."
                  rows={8}
                  className="w-full px-3 py-2 text-sm bg-[#F2F3F0] border border-[#CBCCC9] rounded-lg resize-none focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Code editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-9 bg-[#1e293b] flex items-center px-4 flex-shrink-0">
            <span className="text-xs text-[#94a3b8] font-mono">solution.py</span>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language="python"
              value={code}
              onChange={v => setCode(v ?? '')}
              onMount={handleEditorMount}
              options={{ fontSize: 13, fontFamily: '"JetBrains Mono", monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on', padding: { top: 12 } }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
