import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Clock, MessageSquare } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { interviewPrepApi } from '@/features/InterviewPrep/api/interviewPrepApi'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useToast } from '@/shared/ui/Toast'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import { PREP_TYPE_LABELS } from '@/shared/lib/taskLabels'
import { getLanguageLabel, getMonacoLanguage } from '@/shared/lib/codeEditorLanguage'
import type * as Monaco from 'monaco-editor'

function resolveSupportedLanguages(task: any): string[] {
  const raw = Array.isArray(task?.supportedLanguages) && task.supportedLanguages.length > 0
    ? task.supportedLanguages
    : [task?.language].filter(Boolean)
  const normalized = raw
    .map((value: string) => getMonacoLanguage(value))
    .filter((value: string) => value !== 'plaintext')
  return Array.from(new Set(normalized))
}

export function InterviewPrepSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { toast } = useToast()
  const [session, setSession] = useState<any>(null)
  const [code, setCode] = useState('')
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [review, setReview] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'problem' | 'question' | 'result'>('problem')
  const [timeLeft, setTimeLeft] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState('python')
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)

  useEffect(() => {
    if (!sessionId) return
    interviewPrepApi.getSession(sessionId).then((s: any) => {
      setSession(s)
      if (s?.code || s?.task?.starterCode) setCode(s.code || s.task?.starterCode)
      const nextLanguage = getMonacoLanguage(s?.solveLanguage ?? s?.task?.language ?? 'python')
      setSelectedLanguage(nextLanguage === 'plaintext' ? 'python' : nextLanguage)
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
      const r = await interviewPrepApi.submitSession(sessionId, code, selectedLanguage) as any
      setReview(r)
      setActiveTab('result')
    } catch {
      toast('Не удалось отправить решение', 'error')
    } finally { setSubmitting(false) }
  }

  const handleAnswerQuestion = async () => {
    if (!sessionId || !session?.currentQuestion?.id) return
    setSubmitting(true)
    try {
      const r = await interviewPrepApi.answerQuestion(sessionId, session.currentQuestion.id, answer, 'answered') as any
      setSession(r.session)
      if (r.review) setReview(r.review)
      setAnswer('')
      if (r.review) setActiveTab('result')
      else if (r.session?.currentQuestion) setActiveTab('question')
      else setActiveTab('result')
    } catch {
      toast('Не удалось отправить ответ', 'error')
    } finally { setSubmitting(false) }
  }

  const task = session?.task
  const question = session?.currentQuestion
  const isCodeTask = task?.isExecutable
  const supportedLanguages = resolveSupportedLanguages(task)

  const handleEditorMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor
    registerDarkTheme(monaco)
    monaco.editor.setTheme('druzya-dark')
  }, [])

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F2F3F0]">
        <header className="border-b border-[#d8d9d6] bg-white px-4 pt-3 pb-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/growth/interview-prep')} className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#666666]">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#0f172a]">{task?.title ?? 'Interview Session'}</p>
              <p className="mt-1 truncate text-xs text-[#666666]">{task?.companyTag ?? 'General'} · {PREP_TYPE_LABELS[task?.prepType] ?? task?.prepType ?? ''}</p>
            </div>
            <Badge variant="success" dot>Live</Badge>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            {timeLeft > 0 ? (
              <div className="flex items-center gap-1.5 rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-bold text-[#92400e]">
                <Clock className="w-3 h-3" /> {formatTime(timeLeft)}
              </div>
            ) : <div />}
            <Button variant="secondary" size="sm" onClick={() => navigate('/growth/interview-prep')} className="rounded-2xl">
              Завершить
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-24">
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button onClick={() => setActiveTab('problem')} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'problem' ? 'bg-[#111111] text-white' : 'bg-white text-[#667085] border border-[#d8d9d6]'}`}>
              Задача
            </button>
            {question && (
              <button onClick={() => setActiveTab('question')} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'question' ? 'bg-[#111111] text-white' : 'bg-white text-[#667085] border border-[#d8d9d6]'}`}>
                Вопрос
              </button>
            )}
            {review && (
              <button onClick={() => setActiveTab('result')} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'result' ? 'bg-[#111111] text-white' : 'bg-white text-[#667085] border border-[#d8d9d6]'}`}>
                Оценка
              </button>
            )}
          </div>

          <div className="rounded-[30px] border border-[#d8d9d6] bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
            {activeTab === 'problem' && (
              <div>
                <h2 className="text-base font-bold text-[#0f172a]">{task?.title}</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#475569]">{task?.statement}</p>
              </div>
            )}
            {activeTab === 'question' && question && (
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] p-3">
                  <p className="text-sm font-medium text-[#1e3a5f]">{question.prompt}</p>
                </div>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Ваш ответ..."
                  rows={6}
                  className="w-full resize-none rounded-2xl border border-[#CBCCC9] bg-[#F2F3F0] px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20"
                />
                <Button variant="primary" size="sm" onClick={handleAnswerQuestion} loading={submitting} className="w-full justify-center rounded-2xl">
                  <Send className="w-3.5 h-3.5" /> Ответить
                </Button>
              </div>
            )}
            {activeTab === 'result' && review && (
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-[#CBCCC9] bg-[#F8FAFC] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-[#475569]">Оценка</span>
                    <span className="font-mono text-lg font-bold text-[#6366f1]">{review.score ?? '--'}/10</span>
                  </div>
                  {review.summary && <p className="text-sm text-[#475569]">{review.summary}</p>}
                </div>
                {review.gaps?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-[#475569]">Пробелы:</p>
                    {review.gaps.map((g: string, i: number) => (
                      <p key={i} className="flex gap-2 text-xs text-[#666666]"><span className="text-[#ef4444]">•</span>{g}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {isCodeTask && (
            <div className="overflow-hidden rounded-[30px] border border-[#1e293b] bg-white shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-3 bg-[#1e293b] px-4 py-3">
                <span className="text-xs font-mono text-[#94a3b8]">solution.{selectedLanguage === 'go' ? 'go' : selectedLanguage === 'sql' ? 'sql' : 'py'}</span>
                <div className="ml-auto flex items-center gap-2">
                  {supportedLanguages.length > 1 && (
                    <select
                      value={selectedLanguage}
                      onChange={e => setSelectedLanguage(e.target.value)}
                      className="h-8 rounded-md border border-[#334155] bg-[#0f172a] px-2 text-xs text-[#cbd5e1] outline-none"
                    >
                      {supportedLanguages.map(language => (
                        <option key={language} value={language}>{getLanguageLabel(language)}</option>
                      ))}
                    </select>
                  )}
                  <Button variant="orange" size="sm" onClick={handleSubmitCode} loading={submitting} className="rounded-2xl">
                    <Send className="w-3.5 h-3.5" /> Отправить
                  </Button>
                </div>
              </div>
              <div className="h-[48vh] min-h-[320px]">
                <Editor
                  height="100%"
                  language={getMonacoLanguage(selectedLanguage)}
                  value={code}
                  onChange={v => setCode(v ?? '')}
                  onMount={handleEditorMount}
                  options={{ fontSize: 13, fontFamily: '"JetBrains Mono", monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on', padding: { top: 12 } }}
                />
              </div>
            </div>
          )}

          {!isCodeTask && activeTab === 'problem' && (
            <div className="rounded-[28px] border border-dashed border-[#d8d9d6] bg-white/70 px-4 py-6 text-center text-sm text-[#94a3b8]">
              Используйте карточки выше, чтобы пройти интервью по шагам.
            </div>
          )}
        </div>
      </div>
    )
  }

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
            <p className="text-xs text-[#666666]">{task?.companyTag ?? 'General'} · {PREP_TYPE_LABELS[task?.prepType] ?? task?.prepType ?? ''}</p>
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
              <span className="text-xs text-[#94a3b8] font-mono">solution.{selectedLanguage === 'go' ? 'go' : selectedLanguage === 'sql' ? 'sql' : 'py'}</span>
              <div className="ml-auto flex items-center gap-2">
                {supportedLanguages.length > 1 && (
                  <select
                    value={selectedLanguage}
                    onChange={e => setSelectedLanguage(e.target.value)}
                    className="h-8 rounded-md border border-[#334155] bg-[#0f172a] px-2 text-xs text-[#cbd5e1] outline-none"
                  >
                    {supportedLanguages.map(language => (
                      <option key={language} value={language}>{getLanguageLabel(language)}</option>
                    ))}
                  </select>
                )}
                <Button variant="orange" size="sm" onClick={handleSubmitCode} loading={submitting}>
                  <Send className="w-3.5 h-3.5" /> Отправить
                </Button>
              </div>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                language={getMonacoLanguage(selectedLanguage)}
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
