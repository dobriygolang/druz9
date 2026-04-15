import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Send, Sparkles, CheckCircle, AlertTriangle, Zap, Target, MessageCircle, Code2 } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { interviewPrepApi } from '@/features/InterviewPrep/api/interviewPrepApi'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { getLanguageLabel, getMonacoLanguage } from '@/shared/lib/codeEditorLanguage'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import type * as Monaco from 'monaco-editor'

// Map proto enum names → friendly keys
const STAGE_KIND_ENUM_MAP: Record<string, string> = {
  MOCK_STAGE_KIND_SLICES:       'algorithm',
  MOCK_STAGE_KIND_CONCURRENCY:  'coding',
  MOCK_STAGE_KIND_SQL:          'sql',
  MOCK_STAGE_KIND_ARCHITECTURE: 'behavioral',
  MOCK_STAGE_KIND_SYSTEM_DESIGN:'system_design',
}

function normalizeKind(raw: string | undefined, stage?: any): string {
  const prepType = stage?.task?.prepType ?? ''
  if (raw === 'MOCK_STAGE_KIND_ARCHITECTURE' || raw === 'architecture') {
    if (prepType === 'code_review') return 'theoretical'
    if (prepType === 'behavioral') return 'behavioral'
  }
  if (!raw) return 'coding'
  return STAGE_KIND_ENUM_MAP[raw] ?? raw
}

const STAGE_KIND_LABELS: Record<string, string> = {
  algorithm:    'Алгоритмы',
  coding:       'Кодинг',
  sql:          'SQL',
  system_design:'System Design',
  behavioral:   'Поведенческий',
  theoretical:  'Теоретический',
}

// Which kinds use the code editor
const CODE_KINDS = new Set(['algorithm', 'coding', 'sql'])

function resolveSupportedLanguages(task: any, fallbackLanguage: string): string[] {
  const raw = Array.isArray(task?.supportedLanguages) && task.supportedLanguages.length > 0
    ? task.supportedLanguages
    : [task?.language, fallbackLanguage].filter(Boolean)
  const normalized = raw
    .map((value: string) => getMonacoLanguage(value))
    .filter((value: string) => value !== 'plaintext')
  return Array.from(new Set(normalized))
}

function normalizeStageStatus(raw: string | undefined): string {
  if (!raw) return ''
  const map: Record<string, string> = {
    MOCK_STAGE_STATUS_PENDING:   'pending',
    MOCK_STAGE_STATUS_SOLVING:   'solving',
    MOCK_STAGE_STATUS_QUESTIONS: 'questions',
    MOCK_STAGE_STATUS_COMPLETED: 'completed',
  }
  return map[raw] ?? raw
}

export function InterviewPrepMockSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [session, setSession] = useState<any>(null)
  const [code, setCode] = useState('')
  const [textAnswer, setTextAnswer] = useState('')
  const [designNotes, setDesignNotes] = useState('')
  const [designComponents, setDesignComponents] = useState('')
  const [designApis, setDesignApis] = useState('')
  const [designSchema, setDesignSchema] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [review, setReview] = useState<any>(null)
  const [testResult, setTestResult] = useState<any>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('python')
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)

  const resetStageState = useCallback((s: any) => {
    const stage = s?.currentStage
    setCode(stage?.code ?? stage?.task?.starterCode ?? '')
    const nextLanguage = getMonacoLanguage(stage?.solveLanguage ?? stage?.task?.language ?? 'python')
    setSelectedLanguage(nextLanguage === 'plaintext' ? 'python' : nextLanguage)
    setTextAnswer('')
    setDesignNotes('')
    setDesignComponents('')
    setDesignApis('')
    setDesignSchema('')
    setReview(null)
    setTestResult(null)
    const dur = stage?.task?.durationSeconds
    if (dur) setTimeLeft(dur)
    else setTimeLeft(0)
  }, [])

  useEffect(() => {
    if (!sessionId) return
    interviewPrepApi.getMockSession(sessionId).then((s: any) => {
      setSession(s)
      resetStageState(s)
    }).catch(() => navigate('/growth/interview-prep'))
  }, [sessionId, navigate, resetStageState])

  const timerActive = timeLeft > 0
  useEffect(() => {
    if (!timerActive) return
    const t = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000)
    return () => clearInterval(t)
  }, [timerActive])

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const currentStage = session?.currentStage
  const stageStatus = normalizeStageStatus(currentStage?.status)
  const isInQuestionsPhase = stageStatus === 'questions'
  const currentQuestion = currentStage?.currentQuestion
  const stageKind = normalizeKind(currentStage?.kind, currentStage)
  const editorLang = selectedLanguage
  const stages: any[] = session?.stages ?? []
  const companyTag = session?.companyTag ?? ''
  const blueprintTitle = session?.blueprintTitle ?? ''
  const currentStageIndex = session?.currentStageIndex ?? 0
  const isFinished = session?.status === 'MOCK_SESSION_STATUS_FINISHED' || session?.status === 'finished'
  const supportedLanguages = resolveSupportedLanguages(currentStage?.task, currentStage?.solveLanguage ?? currentStage?.task?.language ?? 'python')

  const handleSubmit = async () => {
    if (!sessionId) return
    setSubmitting(true)
    setReviewLoading(true)
    setTestResult(null)
    setReview(null)
    try {
      let result: any

      if (isInQuestionsPhase) {
        // Question answering phase — send text answer, get AI review
        result = await interviewPrepApi.answerMockQuestion(sessionId, textAnswer)
        if (result?.review) setReview(result.review)
      } else if (stageKind === 'system_design') {
        result = await interviewPrepApi.submitMockSystemDesignReview(sessionId, {
          notes: designNotes,
          components: designComponents,
          apis: designApis,
          databaseSchema: designSchema,
        })
        if (result?.review) setReview(result.review)
      } else if (CODE_KINDS.has(stageKind)) {
        result = await interviewPrepApi.submitMockSession(sessionId, code, editorLang)
        // Store test execution result for display even when review is absent
        if (result?.result) setTestResult(result.result)
        if (result?.review) setReview(result.review)
      } else {
        result = await interviewPrepApi.answerMockQuestion(sessionId, textAnswer)
        if (result?.review) setReview(result.review)
      }

      const updated = await interviewPrepApi.getMockSession(sessionId) as any
      setSession(updated)

      const updatedIdx = updated?.currentStageIndex ?? 0
      const updatedFinished = updated?.status === 'MOCK_SESSION_STATUS_FINISHED' || updated?.status === 'finished'
      if (!updatedFinished && updatedIdx !== currentStageIndex) {
        // Stage advanced — reset for next stage
        resetStageState(updated)
      } else {
        // Same stage — check if moved to questions phase (clear text answer for next question)
        const updatedStage = updated?.currentStage
        const updatedStatus = normalizeStageStatus(updatedStage?.status)
        if (updatedStatus === 'questions') {
          setTextAnswer('')
        }
      }
    } catch {
      // silently handle
    } finally {
      setSubmitting(false)
      setReviewLoading(false)
    }
  }

  const handleEditorMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor
    registerDarkTheme(monaco)
    monaco.editor.setTheme('druzya-dark')
  }, [])

  // Determine what the submit button does and its label
  const submitLabel = isInQuestionsPhase ? 'Ответить' : 'Завершить этап'

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F2F3F0]">
        <header className="border-b border-[#d8d9d6] bg-white px-4 pt-3 pb-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/growth/interview-prep')} className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#666666]">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#0f172a]">Mock Interview · {blueprintTitle || companyTag || 'General'}</p>
              <p className="mt-1 text-xs text-[#666666]">
                {isFinished
                  ? 'Интервью завершено'
                  : `Этап ${currentStageIndex + 1} из ${stages.length} · ${STAGE_KIND_LABELS[stageKind] ?? stageKind}`}
              </p>
            </div>
            {isFinished ? (
              <span className="rounded-full bg-[#F2F3F0] px-2 py-1 text-[11px] font-medium text-[#666666]">Завершено</span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-[#dcfce7] px-2 py-1 text-[11px] font-medium text-[#16a34a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                Идёт
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            {timeLeft > 0 && !isFinished ? (
              <div className="flex items-center gap-1.5 rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-bold text-[#92400e]">
                <Clock className="w-3 h-3" /> {formatTime(timeLeft)}
              </div>
            ) : <div />}
            {!isFinished && (
              <Button variant="orange" size="sm" onClick={handleSubmit} loading={submitting} className="rounded-2xl">
                <Send className="w-3.5 h-3.5" /> {submitLabel}
              </Button>
            )}
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-24">
          <div className="rounded-[28px] border border-[#d8d9d6] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
            <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {stages.map((s: any, i: number) => {
                const isCurrent = i === currentStageIndex
                const isDone = s.status === 'MOCK_STAGE_STATUS_COMPLETED' || s.status === 'finished' || s.completed === true
                const kind = normalizeKind(s.kind, s)
                return (
                  <div key={s.id ?? i} className="flex items-center gap-1.5">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${isDone ? 'bg-[#22c55e] text-white' : isCurrent ? 'bg-[#6366F1] text-white' : 'bg-[#E7E8E5] text-[#666666]'}`}>
                      {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span className={`whitespace-nowrap text-[11px] font-medium ${isCurrent ? 'text-[#111111]' : 'text-[#94a3b8]'}`}>
                      {STAGE_KIND_LABELS[kind] ?? kind}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-[30px] border border-[#d8d9d6] bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
            {isFinished ? (
              <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#22c55e]">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-lg font-bold text-[#0f172a]">Интервью завершено</h2>
                <p className="text-sm text-[#666666]">Все этапы пройдены.</p>
                <Button variant="secondary" size="sm" onClick={() => navigate('/growth/interview-prep')} className="rounded-2xl">
                  Вернуться
                </Button>
              </div>
            ) : isInQuestionsPhase && currentQuestion ? (
              <div>
                <div className="mb-3 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-[#6366F1]" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#6366F1]">Вопрос от интервьюера</span>
                </div>
                <p className="text-sm font-medium leading-relaxed text-[#111111]">{currentQuestion.prompt}</p>
                <p className="mt-3 text-xs leading-relaxed text-[#94a3b8]">
                  Ответьте в блоке ниже. После ответа AI оценит вашу реакцию и качество аргументации.
                </p>
              </div>
            ) : (
              <div>
                <h2 className="text-base font-bold text-[#111111]">
                  {currentStage?.task?.title ?? currentStage?.title ?? 'Задача'}
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#475569]">
                  {currentStage?.task?.statement ?? currentStage?.statement ?? 'Загружается...'}
                </p>
              </div>
            )}
          </div>

          {isFinished ? (
            <div className="rounded-[28px] border border-dashed border-[#d8d9d6] bg-white/70 px-4 py-6 text-center text-sm text-[#94a3b8]">
              Сессия завершена. Можно открыть AI-фидбек ниже и вернуться к списку.
            </div>
          ) : isInQuestionsPhase ? (
            <div className="rounded-[30px] border border-[#d8d9d6] bg-white p-4 shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
              <label className="mb-2 block text-xs font-semibold text-[#475569]">Ваш ответ</label>
              <textarea
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                placeholder="Напишите ваш ответ на вопрос..."
                className="h-[220px] w-full resize-none rounded-2xl border border-[#CBCCC9] bg-[#F8FAFC] px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-[#6366F1]"
              />
            </div>
          ) : CODE_KINDS.has(stageKind) ? (
            <div className="overflow-hidden rounded-[30px] border border-[#1e293b] bg-white shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-3 bg-[#1e293b] px-4 py-3">
                <span className="text-xs font-mono text-[#94a3b8]">
                  {editorLang === 'go' ? 'solution.go' : editorLang === 'sql' ? 'solution.sql' : 'solution.py'}
                </span>
                {supportedLanguages.length > 1 ? (
                  <select
                    value={selectedLanguage}
                    onChange={e => setSelectedLanguage(e.target.value)}
                    className="ml-auto h-8 rounded-md border border-[#334155] bg-[#0f172a] px-2 text-xs text-[#cbd5e1] outline-none"
                  >
                    {supportedLanguages.map(language => (
                      <option key={language} value={language}>{getLanguageLabel(language)}</option>
                    ))}
                  </select>
                ) : (
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-[#475569]">{getLanguageLabel(editorLang)}</span>
                )}
              </div>
              <div className="h-[48vh] min-h-[320px]">
                <Editor
                  height="100%"
                  language={getMonacoLanguage(editorLang)}
                  value={code}
                  onChange={v => setCode(v ?? '')}
                  onMount={handleEditorMount}
                  options={{ fontSize: 13, fontFamily: '"JetBrains Mono", monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on', padding: { top: 12 } }}
                />
              </div>
            </div>
          ) : stageKind === 'system_design' ? (
            <div className="rounded-[30px] border border-[#d8d9d6] bg-white p-4 shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4">
                {[
                  { label: 'Общая архитектура', key: 'notes', value: designNotes, set: setDesignNotes, rows: 6, placeholder: 'Опишите общую архитектуру решения...' },
                  { label: 'Компоненты', key: 'components', value: designComponents, set: setDesignComponents, rows: 4, placeholder: 'Сервисы, базы данных, кеши...' },
                  { label: 'API', key: 'apis', value: designApis, set: setDesignApis, rows: 3, placeholder: 'Ключевые endpoints...' },
                  { label: 'Схема БД', key: 'schema', value: designSchema, set: setDesignSchema, rows: 3, placeholder: 'Структура таблиц / коллекций...' },
                ].map(({ label, key, value, set, rows, placeholder }) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-xs font-semibold text-[#475569]">{label}</label>
                    <textarea
                      value={value}
                      onChange={e => set(e.target.value)}
                      placeholder={placeholder}
                      rows={rows}
                      className="w-full resize-none rounded-2xl border border-[#CBCCC9] bg-[#F8FAFC] px-3 py-3 text-sm focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[30px] border border-[#d8d9d6] bg-white p-4 shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
              <label className="mb-2 block text-xs font-semibold text-[#475569]">Ваш ответ</label>
              <textarea
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                placeholder="Напишите ваш ответ..."
                className="h-[220px] w-full resize-none rounded-2xl border border-[#CBCCC9] bg-[#F8FAFC] px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-[#6366F1]"
              />
            </div>
          )}

          <div className="rounded-[30px] border border-[#d8d9d6] bg-white p-4 shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#6366F1]" />
              <span className="text-sm font-bold text-[#111111]">AI Обратная связь</span>
            </div>
            {reviewLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-6">
                <Spinner size="md" />
                <p className="text-sm text-[#666666]">Анализирую ответ...</p>
              </div>
            ) : review ? (
              <ReviewPanel review={review} stageKind={stageKind} />
            ) : testResult ? (
              <TestResultPanel testResult={testResult} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F2F3F0]">
                  <Sparkles className="w-5 h-5 text-[#CBCCC9]" />
                </div>
                <p className="text-sm leading-relaxed text-[#666666]">
                  {isInQuestionsPhase
                    ? 'Ответьте на вопрос, чтобы получить оценку AI'
                    : 'Завершите этап, чтобы получить оценку AI'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#F2F3F0] overflow-hidden">
      <header className="h-[52px] bg-white border-b border-[#CBCCC9] flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/growth/interview-prep')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] text-[#666666]">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-bold text-[#0f172a]">Mock Interview · {blueprintTitle || companyTag || 'General'}</p>
            <p className="text-xs text-[#666666]">
              {isFinished
                ? 'Интервью завершено'
                : `Этап ${currentStageIndex + 1} из ${stages.length} · ${STAGE_KIND_LABELS[stageKind] ?? stageKind}`}
            </p>
          </div>
          {!isFinished && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#16a34a] text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              Идёт
            </span>
          )}
          {isFinished && (
            <span className="px-2 py-0.5 rounded-full bg-[#F2F3F0] text-[#666666] text-[11px] font-medium">Завершено</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {timeLeft > 0 && !isFinished && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#fef3c7] rounded-full text-xs font-bold text-[#92400e]">
              <Clock className="w-3 h-3" /> {formatTime(timeLeft)}
            </div>
          )}
          {!isFinished && (
            <Button variant="orange" size="sm" onClick={handleSubmit} loading={submitting}>
              <Send className="w-3.5 h-3.5" /> {submitLabel}
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left: Stage progress + problem/question */}
        <div className="w-[340px] flex-shrink-0 bg-white border-r border-[#CBCCC9] flex flex-col">
          {/* Stage progress */}
          <div className="px-4 py-3 border-b border-[#CBCCC9]">
            <div className="flex items-center gap-1.5 flex-wrap">
              {stages.map((s: any, i: number) => {
                const isCurrent = i === currentStageIndex
                const isDone = s.status === 'MOCK_STAGE_STATUS_COMPLETED' || s.status === 'finished' || s.completed === true
                const kind = normalizeKind(s.kind)
                return (
                  <div key={s.id ?? i} className="flex items-center gap-1.5">
                    <div
                      title={STAGE_KIND_LABELS[kind] ?? kind}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        isDone ? 'bg-[#22c55e] text-white' : isCurrent ? 'bg-[#6366F1] text-white' : 'bg-[#E7E8E5] text-[#666666]'
                      }`}
                    >
                      {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    {i < stages.length - 1 && (
                      <div className={`w-5 h-0.5 ${isDone ? 'bg-[#22c55e]' : 'bg-[#CBCCC9]'}`} />
                    )}
                  </div>
                )
              })}
            </div>
            {currentStage && !isFinished && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <p className="text-[10px] text-[#94a3b8] font-medium uppercase tracking-wide">
                  {STAGE_KIND_LABELS[stageKind] ?? stageKind}
                </p>
                {isInQuestionsPhase && (
                  <span className="flex items-center gap-1 text-[10px] text-[#6366F1] font-medium">
                    <MessageCircle className="w-2.5 h-2.5" /> Вопрос
                  </span>
                )}
                {!isInQuestionsPhase && CODE_KINDS.has(stageKind) && (
                  <span className="flex items-center gap-1 text-[10px] text-[#94a3b8] font-medium">
                    <Code2 className="w-2.5 h-2.5" /> Кодинг
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Content: task statement OR current question */}
          <div className="flex-1 overflow-y-auto p-4">
            {isFinished ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-[#22c55e] flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-lg font-bold text-[#0f172a]">Интервью завершено</h2>
                <p className="text-sm text-[#666666]">Все этапы пройдены.</p>
                <Button variant="secondary" size="sm" onClick={() => navigate('/growth/interview-prep')}>
                  Вернуться
                </Button>
              </div>
            ) : isInQuestionsPhase && currentQuestion ? (
              <>
                <div className="flex items-center gap-1.5 mb-3">
                  <MessageCircle className="w-3.5 h-3.5 text-[#6366F1]" />
                  <span className="text-xs font-semibold text-[#6366F1] uppercase tracking-wide">Вопрос от интервьюера</span>
                </div>
                <p className="text-sm text-[#111111] leading-relaxed font-medium">
                  {currentQuestion.prompt}
                </p>
                <p className="text-xs text-[#94a3b8] mt-3 leading-relaxed">
                  Ответьте на вопрос в поле справа. После ответа AI оценит вашу реакцию.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-base font-bold text-[#111111] mb-3">
                  {currentStage?.task?.title ?? currentStage?.title ?? 'Задача'}
                </h2>
                <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">
                  {currentStage?.task?.statement ?? currentStage?.statement ?? 'Загружается...'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Center: editor or answer area */}
        <div className="flex-1 flex flex-col min-w-0">
          {isFinished ? (
            <div className="flex-1 flex items-center justify-center bg-[#F2F3F0]">
              <p className="text-sm text-[#94a3b8]">Все этапы завершены</p>
            </div>
          ) : isInQuestionsPhase ? (
            // Questions phase: always show text area regardless of stage kind
            <div className="flex-1 flex flex-col p-5 bg-[#F2F3F0]">
              <label className="text-xs font-semibold text-[#475569] mb-2 block">Ваш ответ</label>
              <textarea
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                placeholder="Напишите ваш ответ на вопрос..."
                className="flex-1 w-full px-4 py-3 text-sm bg-white border border-[#CBCCC9] rounded-lg resize-none focus:outline-none focus:border-[#6366F1] leading-relaxed"
              />
            </div>
          ) : CODE_KINDS.has(stageKind) ? (
            <>
              <div className="h-9 bg-[#1e293b] flex items-center px-4 gap-3 flex-shrink-0">
                <span className="text-xs text-[#94a3b8] font-mono">
                  {editorLang === 'go' ? 'solution.go' : editorLang === 'sql' ? 'solution.sql' : 'solution.py'}
                </span>
                {supportedLanguages.length > 1 ? (
                  <select
                    value={selectedLanguage}
                    onChange={e => setSelectedLanguage(e.target.value)}
                    className="ml-auto h-8 rounded-md border border-[#334155] bg-[#0f172a] px-2 text-xs text-[#cbd5e1] outline-none"
                  >
                    {supportedLanguages.map(language => (
                      <option key={language} value={language}>{getLanguageLabel(language)}</option>
                    ))}
                  </select>
                ) : (
                  <span className="ml-auto text-[10px] text-[#475569] uppercase tracking-wider">{getLanguageLabel(editorLang)}</span>
                )}
              </div>
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={getMonacoLanguage(editorLang)}
                  value={code}
                  onChange={v => setCode(v ?? '')}
                  onMount={handleEditorMount}
                  options={{ fontSize: 13, fontFamily: '"JetBrains Mono", monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on', padding: { top: 12 } }}
                />
              </div>
            </>
          ) : stageKind === 'system_design' ? (
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-[#F2F3F0]">
              {[
                { label: 'Общая архитектура', key: 'notes', value: designNotes, set: setDesignNotes, rows: 6, placeholder: 'Опишите общую архитектуру решения...' },
                { label: 'Компоненты', key: 'components', value: designComponents, set: setDesignComponents, rows: 4, placeholder: 'Сервисы, базы данных, кеши...' },
                { label: 'API', key: 'apis', value: designApis, set: setDesignApis, rows: 3, placeholder: 'Ключевые endpoints...' },
                { label: 'Схема БД', key: 'schema', value: designSchema, set: setDesignSchema, rows: 3, placeholder: 'Структура таблиц / коллекций...' },
              ].map(({ label, key, value, set, rows, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-[#475569] mb-1.5 block">{label}</label>
                  <textarea
                    value={value}
                    onChange={e => set(e.target.value)}
                    placeholder={placeholder}
                    rows={rows}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-[#CBCCC9] rounded-lg resize-none focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-5 bg-[#F2F3F0]">
              <label className="text-xs font-semibold text-[#475569] mb-2 block">Ваш ответ</label>
              <textarea
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                placeholder="Напишите ваш ответ..."
                className="flex-1 w-full px-4 py-3 text-sm bg-white border border-[#CBCCC9] rounded-lg resize-none focus:outline-none focus:border-[#6366F1] leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Right: AI feedback */}
        <div className="w-[300px] flex-shrink-0 bg-white border-l border-[#CBCCC9] flex flex-col">
          <div className="px-4 py-3 border-b border-[#CBCCC9] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#6366F1]" />
            <span className="text-sm font-bold text-[#111111]">AI Обратная связь</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {reviewLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Spinner size="md" />
                <p className="text-sm text-[#666666]">Анализирую ответ...</p>
              </div>
            ) : review ? (
              <ReviewPanel review={review} stageKind={stageKind} />
            ) : testResult ? (
              <TestResultPanel testResult={testResult} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-10 h-10 rounded-full bg-[#F2F3F0] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#CBCCC9]" />
                </div>
                <p className="text-sm text-[#666666] leading-relaxed">
                  {isInQuestionsPhase
                    ? 'Ответьте на вопрос, чтобы получить оценку AI'
                    : 'Завершите этап, чтобы получить оценку AI'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TestResultPanel({ testResult }: { testResult: any }) {
  const passed: boolean = testResult?.passed ?? false
  const passedCount: number = testResult?.passedCount ?? 0
  const totalCount: number = testResult?.totalCount ?? 0
  const lastError: string = testResult?.lastError ?? ''

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${passed ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}>
          {passed
            ? <CheckCircle className="w-6 h-6 text-white" />
            : <AlertTriangle className="w-6 h-6 text-white" />}
        </div>
        <div>
          <p className="text-sm font-bold text-[#111111]">{passed ? 'Тесты прошли' : 'Тесты не прошли'}</p>
          {totalCount > 0 && (
            <p className="text-xs text-[#666666]">{passedCount} из {totalCount} тестов</p>
          )}
        </div>
      </div>

      {lastError && (
        <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg p-3">
          <p className="text-xs font-semibold text-[#ef4444] mb-1">Ошибка</p>
          <p className="text-xs text-[#7f1d1d] font-mono leading-relaxed break-all">{lastError}</p>
        </div>
      )}

      {passed && (
        <p className="text-sm text-[#475569] leading-relaxed">
          Отлично! Теперь ответь на вопрос интервьюера в левой панели.
        </p>
      )}
    </div>
  )
}

function ReviewPanel({ review, stageKind }: { review: any; stageKind: string }) {
  const score = review?.score ?? null
  const summary = review?.summary ?? ''
  const gaps = review?.gaps ?? []
  const strengths = review?.strengths ?? []
  const missingTopics = review?.missingTopics ?? []
  const followUpQuestions = review?.followUpQuestions ?? []

  return (
    <div className="flex flex-col gap-4">
      {score !== null && (
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white ${
            score >= 7 ? 'bg-[#22c55e]' : score >= 4 ? 'bg-[#6366F1]' : 'bg-[#ef4444]'
          }`}>
            {score}
          </div>
          <div>
            <p className="text-sm font-bold text-[#111111]">
              {score >= 7 ? 'Отлично' : score >= 4 ? 'Нормально' : 'Слабо'}
            </p>
            <p className="text-xs text-[#666666]">из 10</p>
          </div>
        </div>
      )}

      {summary && (
        <div>
          <p className="text-xs font-semibold text-[#475569] mb-1.5">Резюме</p>
          <p className="text-sm text-[#111111] leading-relaxed">{summary}</p>
        </div>
      )}

      {strengths.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap className="w-3.5 h-3.5 text-[#22c55e]" />
            <p className="text-xs font-semibold text-[#22c55e]">Сильные стороны</p>
          </div>
          <ul className="flex flex-col gap-1">
            {strengths.map((s: string, i: number) => (
              <li key={i} className="text-sm text-[#111111] flex items-start gap-1.5">
                <span className="text-[#22c55e] mt-0.5">+</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {gaps.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#6366F1]" />
            <p className="text-xs font-semibold text-[#6366F1]">Пробелы</p>
          </div>
          <ul className="flex flex-col gap-1">
            {gaps.map((g: string, i: number) => (
              <li key={i} className="text-sm text-[#111111] flex items-start gap-1.5">
                <span className="text-[#6366F1] mt-0.5">−</span> {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {stageKind === 'system_design' && missingTopics.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target className="w-3.5 h-3.5 text-[#ef4444]" />
            <p className="text-xs font-semibold text-[#ef4444]">Упущено</p>
          </div>
          <ul className="flex flex-col gap-1">
            {missingTopics.map((t: string, i: number) => (
              <li key={i} className="text-sm text-[#111111] flex items-start gap-1.5">
                <span className="text-[#ef4444] mt-0.5">!</span> {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {followUpQuestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#475569] mb-1.5">Вопросы на уточнение</p>
          <ul className="flex flex-col gap-1.5">
            {followUpQuestions.map((q: string, i: number) => (
              <li key={i} className="text-sm text-[#111111] leading-relaxed">{i + 1}. {q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
