import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Send, Sparkles, CheckCircle, AlertTriangle, Zap, Target } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { interviewPrepApi } from '@/features/InterviewPrep/api/interviewPrepApi'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import type * as Monaco from 'monaco-editor'

type StageKind = 'coding' | 'system_design' | 'behavioral' | 'theoretical'

const STAGE_KIND_LABELS: Record<StageKind, string> = {
  coding: 'Кодирование',
  system_design: 'System Design',
  behavioral: 'Поведенческий',
  theoretical: 'Теоретический',
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
  const [reviewLoading, setReviewLoading] = useState(false)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)

  useEffect(() => {
    if (!sessionId) return
    interviewPrepApi.getMockSession(sessionId).then((s: any) => {
      setSession(s)
      resetStageState(s)
    }).catch(() => navigate('/growth/interview-prep'))
  }, [sessionId, navigate])

  const resetStageState = (s: any) => {
    const stage = s?.current_stage
    setCode(stage?.task?.starter_code ?? '')
    setTextAnswer('')
    setDesignNotes('')
    setDesignComponents('')
    setDesignApis('')
    setDesignSchema('')
    setReview(null)
    if (stage?.task?.duration_seconds) setTimeLeft(stage.task.duration_seconds)
    else setTimeLeft(0)
  }

  const timerActive = timeLeft > 0
  useEffect(() => {
    if (!timerActive) return
    const t = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000)
    return () => clearInterval(t)
  }, [timerActive])

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const currentStage = session?.current_stage
  const stageKind: StageKind = currentStage?.kind ?? 'coding'
  const stages: any[] = session?.stages ?? []
  const companyTag = session?.company_tag ?? ''
  const currentStageIndex = session?.current_stage_index ?? 0
  const isFinished = session?.status === 'finished'

  const handleSubmit = async () => {
    if (!sessionId) return
    setSubmitting(true)
    setReviewLoading(true)
    try {
      let result: any
      if (stageKind === 'coding') {
        result = await interviewPrepApi.submitMockSession(sessionId, code, 'python3')
      } else if (stageKind === 'system_design') {
        result = await interviewPrepApi.submitMockSystemDesignReview(sessionId, {
          notes: designNotes,
          components: designComponents,
          apis: designApis,
          databaseSchema: designSchema,
        })
      } else {
        // behavioral or theoretical
        result = await interviewPrepApi.answerMockQuestion(sessionId, textAnswer)
      }
      if (result?.review) setReview(result.review)

      // Refresh session to get updated stage info
      const updated = await interviewPrepApi.getMockSession(sessionId) as any
      setSession(updated)

      if (updated.status === 'finished') {
        // Stay on page and show completion
      } else if (updated.current_stage_index !== currentStageIndex) {
        // Auto-advanced to next stage, reset state
        resetStageState(updated)
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
              {isFinished ? 'Интервью завершено' : `Этап ${currentStageIndex + 1} из ${stages.length} · ${STAGE_KIND_LABELS[stageKind] ?? stageKind}`}
            </p>
          </div>
          {!isFinished && <Badge variant="success" dot>Идёт интервью</Badge>}
          {isFinished && <Badge variant="default">Завершено</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {timeLeft > 0 && !isFinished && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#fef3c7] rounded-full text-xs font-bold text-[#92400e]">
              <Clock className="w-3 h-3" /> {formatTime(timeLeft)}
            </div>
          )}
          {!isFinished && (
            <Button variant="orange" size="sm" onClick={handleSubmit} loading={submitting}>
              <Send className="w-3.5 h-3.5" /> Завершить этап
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left: Stage progress + problem/question */}
        <div className="w-[350px] flex-shrink-0 bg-white border-r border-[#CBCCC9] flex flex-col">
          {/* Stage progress bar */}
          <div className="px-4 py-3 border-b border-[#CBCCC9]">
            <div className="flex items-center gap-1.5">
              {stages.map((s: any, i: number) => {
                const isCurrent = i === currentStageIndex
                const isDone = s.status === 'finished'
                return (
                  <div key={s.id ?? i} className="flex items-center gap-1.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        isDone
                          ? 'bg-[#22c55e] text-white'
                          : isCurrent
                            ? 'bg-[#6366F1] text-white'
                            : 'bg-[#E7E8E5] text-[#666666]'
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
              <p className="text-[10px] text-[#666666] mt-1.5">{STAGE_KIND_LABELS[stageKind] ?? stageKind}</p>
            )}
          </div>

          {/* Problem / question content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isFinished ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-[#22c55e] flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-lg font-bold text-[#0f172a]">Интервью завершено</h2>
                <p className="text-sm text-[#666666]">Все этапы пройдены. Посмотрите результаты справа.</p>
                <Button variant="secondary" size="sm" onClick={() => navigate('/growth/interview-prep')}>
                  Вернуться
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-base font-bold text-[#0f172a] mb-3">{currentStage?.task?.title ?? 'Задача'}</h2>
                <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">
                  {currentStage?.task?.statement ?? 'Загружается...'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Center: Code editor OR answer area */}
        <div className="flex-1 flex flex-col min-w-0">
          {isFinished ? (
            <div className="flex-1 flex items-center justify-center bg-[#F2F3F0]">
              <p className="text-sm text-[#666666]">Интервью завершено</p>
            </div>
          ) : stageKind === 'coding' ? (
            <>
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
            </>
          ) : stageKind === 'system_design' ? (
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-[#F2F3F0]">
              <div>
                <label className="text-xs font-semibold text-[#475569] mb-1.5 block">Заметки и описание архитектуры</label>
                <textarea
                  value={designNotes}
                  onChange={e => setDesignNotes(e.target.value)}
                  placeholder="Опишите общую архитектуру решения..."
                  rows={6}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-[#CBCCC9] rounded-lg resize-none focus:outline-none focus:border-[#6366F1]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#475569] mb-1.5 block">Компоненты системы</label>
                <textarea
                  value={designComponents}
                  onChange={e => setDesignComponents(e.target.value)}
                  placeholder="Перечислите основные компоненты (сервисы, базы данных, кеши...)"
                  rows={4}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-[#CBCCC9] rounded-lg resize-none focus:outline-none focus:border-[#6366F1]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#475569] mb-1.5 block">API</label>
                <textarea
                  value={designApis}
                  onChange={e => setDesignApis(e.target.value)}
                  placeholder="Опишите ключевые API endpoints..."
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-[#CBCCC9] rounded-lg resize-none focus:outline-none focus:border-[#6366F1]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#475569] mb-1.5 block">Схема базы данных</label>
                <textarea
                  value={designSchema}
                  onChange={e => setDesignSchema(e.target.value)}
                  placeholder="Опишите схему данных..."
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-[#CBCCC9] rounded-lg resize-none focus:outline-none focus:border-[#6366F1]"
                />
              </div>
            </div>
          ) : (
            /* behavioral / theoretical */
            <div className="flex-1 flex flex-col p-5 bg-[#F2F3F0]">
              <label className="text-xs font-semibold text-[#475569] mb-2 block">Ваш ответ</label>
              <textarea
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                placeholder="Напишите ваш ответ здесь..."
                className="flex-1 w-full px-4 py-3 text-sm bg-white border border-[#CBCCC9] rounded-lg resize-none focus:outline-none focus:border-[#6366F1] leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Right: AI Feedback panel */}
        <div className="w-[300px] flex-shrink-0 bg-white border-l border-[#CBCCC9] flex flex-col">
          <div className="px-4 py-3 border-b border-[#CBCCC9] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#6366F1]" />
            <span className="text-sm font-bold text-[#111111]">AI Обратная связь</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {reviewLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Spinner size="md" />
                <p className="text-sm text-[#666666]">AI анализирует ваш ответ...</p>
              </div>
            ) : review ? (
              <ReviewPanel review={review} stageKind={stageKind} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-10 h-10 rounded-full bg-[#F2F3F0] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#CBCCC9]" />
                </div>
                <p className="text-sm text-[#666666] leading-relaxed">
                  Завершите этап, чтобы получить оценку AI
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewPanel({ review, stageKind }: { review: any; stageKind: StageKind }) {
  const score = review?.score ?? review?.overall_score ?? null
  const summary = review?.summary ?? review?.feedback ?? ''
  const gaps = review?.gaps ?? review?.weaknesses ?? []
  const strengths = review?.strengths ?? []
  const missingTopics = review?.missing_topics ?? []
  const followUpQuestions = review?.follow_up_questions ?? []

  return (
    <div className="flex flex-col gap-4">
      {/* Score badge */}
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

      {/* Summary */}
      {summary && (
        <div>
          <p className="text-xs font-semibold text-[#475569] mb-1.5">Резюме</p>
          <p className="text-sm text-[#111111] leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Strengths */}
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

      {/* Gaps */}
      {gaps.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#6366F1]" />
            <p className="text-xs font-semibold text-[#6366F1]">Пробелы</p>
          </div>
          <ul className="flex flex-col gap-1">
            {gaps.map((g: string, i: number) => (
              <li key={i} className="text-sm text-[#111111] flex items-start gap-1.5">
                <span className="text-[#6366F1] mt-0.5">-</span> {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* System design: missing topics */}
      {stageKind === 'system_design' && missingTopics.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target className="w-3.5 h-3.5 text-[#ef4444]" />
            <p className="text-xs font-semibold text-[#ef4444]">Упущенные темы</p>
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

      {/* System design: follow-up questions */}
      {stageKind === 'system_design' && followUpQuestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#475569] mb-1.5">Дополнительные вопросы</p>
          <ul className="flex flex-col gap-1.5">
            {followUpQuestions.map((q: string, i: number) => (
              <li key={i} className="text-sm text-[#111111] leading-relaxed">
                {i + 1}. {q}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
