import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Send, Sparkles, CheckCircle, AlertTriangle, Zap, Target, MessageCircle, Code2 } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { interviewPrepApi } from '@/features/InterviewPrep/api/interviewPrepApi'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { getLanguageLabel, getMonacoLanguage } from '@/shared/lib/codeEditorLanguage'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import type * as Monaco from 'monaco-editor'

// Map proto enum names → friendly keys
const STAGE_KIND_ENUM_MAP: Record<string, string> = {
  MOCK_STAGE_KIND_SLICES:       'algorithm',
  MOCK_STAGE_KIND_CONCURRENCY:  'coding',
  MOCK_STAGE_KIND_SQL:          'sql',
  MOCK_STAGE_KIND_ARCHITECTURE: 'coding',
  MOCK_STAGE_KIND_SYSTEM_DESIGN:'system_design',
}

function normalizeKind(raw: string | undefined): string {
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
    const stage = s?.currentStage ?? s?.current_stage
    setCode(stage?.code ?? stage?.task?.starterCode ?? stage?.task?.starter_code ?? '')
    const nextLanguage = getMonacoLanguage(stage?.solveLanguage ?? stage?.solve_language ?? stage?.task?.language ?? 'python')
    setSelectedLanguage(nextLanguage === 'plaintext' ? 'python' : nextLanguage)
    setTextAnswer('')
    setDesignNotes('')
    setDesignComponents('')
    setDesignApis('')
    setDesignSchema('')
    setReview(null)
    setTestResult(null)
    const dur = stage?.task?.durationSeconds ?? stage?.task?.duration_seconds
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

  const currentStage = session?.currentStage ?? session?.current_stage
  const stageStatus = normalizeStageStatus(currentStage?.status)
  const isInQuestionsPhase = stageStatus === 'questions'
  const currentQuestion = currentStage?.currentQuestion ?? currentStage?.current_question
  const stageKind = normalizeKind(currentStage?.kind)
  const editorLang = selectedLanguage
  const stages: any[] = session?.stages ?? []
  const companyTag = session?.companyTag ?? session?.company_tag ?? ''
  const currentStageIndex = session?.currentStageIndex ?? session?.current_stage_index ?? 0
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

      const updatedIdx = updated?.currentStageIndex ?? updated?.current_stage_index ?? 0
      const updatedFinished = updated?.status === 'MOCK_SESSION_STATUS_FINISHED' || updated?.status === 'finished'
      if (!updatedFinished && updatedIdx !== currentStageIndex) {
        // Stage advanced — reset for next stage
        resetStageState(updated)
      } else {
        // Same stage — check if moved to questions phase (clear text answer for next question)
        const updatedStage = updated?.currentStage ?? updated?.current_stage
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

  return (
    <div className="flex flex-col h-screen bg-[#F2F3F0] overflow-hidden">
      <header className="h-[52px] bg-white border-b border-[#CBCCC9] flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/growth/interview-prep')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] text-[#666666]">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-bold text-[#0f172a]">Mock Interview · {companyTag || 'General'}</p>
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
  const score = review?.score ?? review?.overall_score ?? null
  const summary = review?.summary ?? review?.feedback ?? ''
  const gaps = review?.gaps ?? review?.weaknesses ?? review?.issues ?? []
  const strengths = review?.strengths ?? []
  const missingTopics = review?.missing_topics ?? []
  const followUpQuestions = review?.follow_up_questions ?? []

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
