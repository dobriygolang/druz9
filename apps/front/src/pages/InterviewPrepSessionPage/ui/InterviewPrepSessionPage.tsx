import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Clock, MessageSquare } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { interviewPrepApi } from '@/features/InterviewPrep/api/interviewPrepApi'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import type * as Monaco from 'monaco-editor'

export function InterviewPrepSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [code, setCode] = useState('')
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [review, setReview] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'problem' | 'question' | 'result'>('problem')
  const [timeLeft, setTimeLeft] = useState(0)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)

  useEffect(() => {
    if (!sessionId) return
    interviewPrepApi.getSession(sessionId).then((s: any) => {
      setSession(s)
      if (s?.task?.starterCode) setCode(s.task.starterCode)
      if (s?.task?.durationSeconds) setTimeLeft(s.task.durationSeconds)
      if (s?.currentQuestion) setActiveTab('question')
    }).catch(() => navigate('/growth/interview-prep'))
  }, [sessionId, navigate])

  const timerActive = timeLeft > 0
  useEffect(() => {
    if (!timerActive) return
    const t = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000)
    return () => clearInterval(t)
  }, [timerActive])

  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  const handleSubmitCode = async () => {
    if (!sessionId) return
    setSubmitting(true)
    try {
      const r = await interviewPrepApi.submitSession(sessionId, code, 'python3') as any
      setReview(r)
      setActiveTab('result')
    } catch {} finally { setSubmitting(false) }
  }

  const handleAnswerQuestion = async () => {
    if (!sessionId || !session?.currentQuestion?.id) return
    setSubmitting(true)
    try {
      const r = await interviewPrepApi.answerQuestion(sessionId, session.currentQuestion.id, answer, 'answered') as any
      setSession(r.session)
      setReview(r.review)
      setAnswer('')
      if (r.session?.currentQuestion) setActiveTab('question')
      else setActiveTab('result')
    } catch {} finally { setSubmitting(false) }
  }

  const task = session?.task
  const question = session?.currentQuestion
  const isCodeTask = task?.isExecutable

  const handleEditorMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor
    registerDarkTheme(monaco)
    monaco.editor.setTheme('druzya-dark')
  }, [])

  return (
    <div className="flex flex-col h-screen bg-[#F2F3F0] overflow-hidden">
      {/* Top bar */}
      <header className="h-[52px] bg-white border-b border-[#CBCCC9] flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/growth/interview-prep')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] text-[#666666]">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-bold text-[#0f172a]">{task?.title ?? 'Interview Session'}</p>
            <p className="text-xs text-[#666666]">{task?.companyTag ?? 'General'} · {task?.prepType ?? ''}</p>
          </div>
          <Badge variant="success" dot>Идёт интервью</Badge>
        </div>
        <div className="flex items-center gap-2">
          {timeLeft > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#fef3c7] rounded-full text-xs font-bold text-[#92400e]">
              <Clock className="w-3 h-3" /> {formatTime(timeLeft)}
            </div>
          )}
          <Button variant="secondary" size="sm" onClick={() => navigate('/growth/interview-prep')}>
            Завершить
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left: problem/question */}
        <div className="w-[380px] flex-shrink-0 bg-white border-r border-[#CBCCC9] flex flex-col">
          <div className="flex border-b border-[#CBCCC9]">
            <button onClick={() => setActiveTab('problem')} className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${activeTab === 'problem' ? 'border-[#6366F1] text-[#111111]' : 'border-transparent text-[#666666]'}`}>
              Задача
            </button>
            {question && <button onClick={() => setActiveTab('question')} className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${activeTab === 'question' ? 'border-[#6366F1] text-[#111111]' : 'border-transparent text-[#666666]'}`}>
              Вопрос
            </button>}
            {review && <button onClick={() => setActiveTab('result')} className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${activeTab === 'result' ? 'border-[#6366F1] text-[#111111]' : 'border-transparent text-[#666666]'}`}>
              Оценка
            </button>}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'problem' && (
              <div>
                <h2 className="text-base font-bold text-[#0f172a] mb-3">{task?.title}</h2>
                <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">{task?.statement}</p>
              </div>
            )}
            {activeTab === 'question' && question && (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-lg">
                  <p className="text-sm font-medium text-[#1e3a5f]">{question.prompt}</p>
                </div>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Ваш ответ..."
                  rows={6}
                  className="w-full px-3 py-2 text-sm bg-[#F2F3F0] border border-[#CBCCC9] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20"
                />
                <Button variant="primary" size="sm" onClick={handleAnswerQuestion} loading={submitting} className="w-full justify-center">
                  <Send className="w-3.5 h-3.5" /> Ответить
                </Button>
              </div>
            )}
            {activeTab === 'result' && review && (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-[#F2F3F0] rounded-lg border border-[#CBCCC9]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#475569] uppercase">Оценка</span>
                    <span className="font-mono text-lg font-bold text-[#6366f1]">{review.score ?? '--'}/10</span>
                  </div>
                  {review.summary && <p className="text-sm text-[#475569]">{review.summary}</p>}
                </div>
                {review.gaps?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#475569] mb-2">Пробелы:</p>
                    {review.gaps.map((g: string, i: number) => (
                      <p key={i} className="text-xs text-[#666666] flex gap-2"><span className="text-[#ef4444]">•</span>{g}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Code editor */}
        {isCodeTask && (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="h-9 bg-[#1e293b] flex items-center px-4 gap-3 flex-shrink-0">
              <span className="text-xs text-[#94a3b8] font-mono">solution.py</span>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="orange" size="sm" onClick={handleSubmitCode} loading={submitting}>
                  <Send className="w-3.5 h-3.5" /> Отправить
                </Button>
              </div>
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
        )}

        {!isCodeTask && (
          <div className="flex-1 flex items-center justify-center bg-[#F2F3F0]">
            <div className="text-center text-[#94a3b8]">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Отвечайте на вопросы в левой панели</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
