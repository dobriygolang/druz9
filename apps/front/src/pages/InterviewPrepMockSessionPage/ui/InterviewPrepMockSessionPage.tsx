import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Send, Sparkles, CheckCircle, AlertTriangle, Zap, Target, MessageCircle, Code2 } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { useTranslation } from 'react-i18next'
import { interviewPrepApi } from '@/features/InterviewPrep/api/interviewPrepApi'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Spinner } from '@/shared/ui/Spinner'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { getLanguageLabel, getMonacoLanguage } from '@/shared/lib/codeEditorLanguage'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import { formatEditorCode, registerFormatKeybinding } from '@/shared/lib/editorFormat'
import { PageMeta } from '@/shared/ui/PageMeta'
import type * as Monaco from 'monaco-editor'

// Map proto enum names → friendly keys
const STAGE_KIND_ENUM_MAP: Record<string, string> = {
  MOCK_STAGE_KIND_SLICES:       'algorithm',
  MOCK_STAGE_KIND_CONCURRENCY:  'coding',
  MOCK_STAGE_KIND_SQL:          'sql',
  MOCK_STAGE_KIND_ARCHITECTURE: 'behavioral',
  MOCK_STAGE_KIND_SYSTEM_DESIGN:'system_design',
}

const ROUND_TYPE_KIND_MAP: Record<string, string> = {
  coding_algorithmic: 'algorithm',
  coding_practical: 'coding',
  sql: 'sql',
  system_design: 'system_design',
  behavioral: 'behavioral',
  code_review: 'theoretical',
}

function normalizeKind(raw: string | undefined, stage?: any): string {
  const roundType = stage?.roundType ?? ''
  if (roundType && ROUND_TYPE_KIND_MAP[roundType]) return ROUND_TYPE_KIND_MAP[roundType]
  const prepType = stage?.task?.prepType ?? ''
  if (raw === 'MOCK_STAGE_KIND_ARCHITECTURE' || raw === 'architecture') {
    if (prepType === 'code_review') return 'theoretical'
    if (prepType === 'behavioral') return 'behavioral'
  }
  if (!raw) return 'coding'
  return STAGE_KIND_ENUM_MAP[raw] ?? raw
}

const STAGE_KIND_LABELS: Record<string, string> = {
  algorithm:    'Algorithms',
  coding:       'Coding',
  sql:          'SQL',
  system_design:'System Design',
  behavioral:   'Behavioral',
  theoretical:  'Theoretical',
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
  const { t } = useTranslation()
  const [session, setSession] = useState<any>(null)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [aborting, setAborting] = useState(false)
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
    const dur = stage?.durationSeconds ?? stage?.task?.durationSeconds
    if (dur) setTimeLeft(dur)
    else setTimeLeft(0)
  }, [])

  useEffect(() => {
    if (!sessionId) return
    interviewPrepApi.getMockSession(sessionId).then((s: any) => {
      setSession(s)
      resetStageState(s)
    }).catch(() => navigate('/prepare/interview-prep'))
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
  const currentStageIndex = currentStage?.stageIndex ?? session?.currentStageIndex ?? 0
  const isFinished = session?.status === 'MOCK_SESSION_STATUS_FINISHED' || session?.status === 'finished'
  const supportedLanguages = resolveSupportedLanguages(currentStage?.task, currentStage?.solveLanguage ?? currentStage?.task?.language ?? 'python')
  const stageTitle = currentStage?.title || STAGE_KIND_LABELS[stageKind] || t('mock.stageDefault')
  const isCodeReview = stageKind === 'theoretical' && (
    currentStage?.task?.prepType === 'code_review' ||
    currentStage?.roundType === 'code_review'
  )
  const codeReviewCode = isCodeReview ? (currentStage?.task?.starterCode ?? '') : ''
  const codeReviewLanguage = isCodeReview
    ? getMonacoLanguage(currentStage?.task?.language ?? 'go')
    : 'go'

  const handleSubmit = async () => {
    if (!sessionId) return
    setSubmitting(true)
    setReviewLoading(true)
    setTestResult(null)
    setReview(null)
    try {
      let result: any

      if (isInQuestionsPhase) {
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
        result = await interviewPrepApi.submitMockSession(sessionId, code, editorLang, undefined, currentStage?.kind)
        if (result?.result) setTestResult(result.result)
        if (result?.result?.review) setReview(result.result.review)
        else if (result?.review) setReview(result.review)
      } else {
        result = await interviewPrepApi.answerMockQuestion(sessionId, textAnswer)
        if (result?.review) setReview(result.review)
      }

      const updated = result?.session
        ?? result?.result?.session
        ?? await interviewPrepApi.getMockSession(sessionId) as any
      setSession(updated)

      const updatedIdx = updated?.currentStage?.stageIndex ?? updated?.currentStageIndex ?? 0
      const updatedFinished = updated?.status === 'MOCK_SESSION_STATUS_FINISHED' || updated?.status === 'finished'
      if (!updatedFinished && updatedIdx !== currentStageIndex) {
        resetStageState(updated)
      } else {
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

  const monacoRef = useRef<typeof Monaco | null>(null)
  const handleEditorMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    registerDarkTheme(monaco)
    registerFormatKeybinding(editor, monaco)
    monaco.editor.setTheme('druzya-dark')
  }, [])

  const submitLabel = isInQuestionsPhase ? t('mock.submitAnswer') : t('mock.completeStage')

  /* ── Shared sub-components ─── */

  const StageProgress = ({ compact }: { compact?: boolean }) => (
    <div className={`flex items-center gap-1.5 ${compact ? '' : 'flex-wrap'}`}>
      {stages.map((s: any, i: number) => {
        const isCurrent = i === currentStageIndex
        const isDone = s.status === 'MOCK_STAGE_STATUS_COMPLETED' || s.status === 'finished' || s.completed === true
        const kind = normalizeKind(s.kind, s)
        return (
          <div key={s.id ?? i} className="flex items-center gap-1.5">
            <div className={`flex items-center justify-center rounded-full text-xs font-bold transition-colors ${compact ? 'w-7 h-7' : 'h-8 w-8'} ${
              isDone ? 'bg-[#22c55e] text-white' : isCurrent ? 'bg-[#818cf8] text-white' : 'bg-[#334155] text-[#94a3b8]'
            }`}>
              {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
            </div>
            {!compact && (
              <span className={`whitespace-nowrap text-[11px] font-medium ${isCurrent ? 'text-[#f8fafc]' : 'text-[#64748b]'}`}>
                {s.title || STAGE_KIND_LABELS[kind] || kind}
              </span>
            )}
            {compact && i < stages.length - 1 && (
              <div className={`w-5 h-0.5 ${isDone ? 'bg-[#22c55e]' : 'bg-[#334155]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )

  const InstructionsBanner = () => {
    if (!stageTitle) return null
    return (
      <div className="mb-4 rounded-xl border border-[#334155] bg-[#1e293b] px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">{stageTitle}</span>
          <span className="rounded-full bg-[#334155] px-2 py-0.5 text-[10px] font-semibold text-[#cbd5e1]">
            {t('mock.stageOf', { current: currentStageIndex + 1, total: stages.length })}
          </span>
        </div>
      </div>
    )
  }

  const IntroBanner = () => {
    if (currentStageIndex !== 0 || isFinished) return null
    const label = blueprintTitle || companyTag || t('mock.defaultCompany')
    return (
      <div className="mb-4 rounded-xl border border-[#334155] bg-[#1e293b] px-3 py-2.5 text-xs leading-5 text-[#cbd5e1]">
        {t('mock.introLabel', { company: label })}
      </div>
    )
  }

  const TaskContent = () => {
    if (isFinished) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#22c55e]">
            <CheckCircle className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg font-bold text-[#f8fafc]">{t('mock.finishedTitle')}</h2>
          <p className="text-sm text-[#94a3b8]">{t('mock.finishedBody')}</p>
          <Button variant="secondary" size="sm" onClick={() => isFinished ? navigate('/prepare/interview-prep') : setShowLeaveConfirm(true)}>
            {t('mock.back')}
          </Button>
        </div>
      )
    }
    if (isInQuestionsPhase && currentQuestion) {
      return (
        <>
          <IntroBanner />
          <InstructionsBanner />
          <div className="mb-3 flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-[#fbbf24]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#fbbf24]">{t('mock.interviewerQuestion')}</span>
          </div>
          <p className="text-sm font-medium leading-relaxed text-[#f8fafc]">{currentQuestion.prompt}</p>
          <p className="mt-3 text-xs leading-relaxed text-[#64748b]">
            {t('mock.answerHint', { position: isMobile ? t('mock.positionBelow') : t('mock.positionRight') })}
          </p>
        </>
      )
    }
    return (
      <>
        <IntroBanner />
        <InstructionsBanner />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8] mb-2">
          {stageTitle}
        </p>
        <h2 className="text-base font-bold text-[#f8fafc] mb-3">
          {currentStage?.task?.title ?? t('mock.taskTitleFallback')}
        </h2>
        <p className="text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-wrap">
          {currentStage?.task?.statement ?? currentStage?.statement ?? t('mock.loading')}
        </p>
      </>
    )
  }

  const AIFeedbackContent = () => {
    if (reviewLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <Spinner size="md" />
          <p className="text-sm text-[#94a3b8]">{t('mock.analyzing')}</p>
        </div>
      )
    }
    if (review) return <ReviewPanel review={review} stageKind={stageKind} />
    if (testResult) return <TestResultPanel testResult={testResult} />
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
        <div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-[#475569]" />
        </div>
        <p className="text-sm text-[#64748b] leading-relaxed">
          {isInQuestionsPhase
            ? t('mock.answerForReview')
            : t('mock.completeForReview')}
        </p>
      </div>
    )
  }

  const EditorBar = () => (
    <div className="h-9 bg-[#1e293b] flex items-center px-4 gap-3 flex-shrink-0 border-b border-[#334155]">
      <span className="text-xs text-[#94a3b8] font-mono">
        {editorLang === 'go' ? 'solution.go' : editorLang === 'sql' ? 'solution.sql' : 'solution.py'}
      </span>
      <button
        onClick={() => { if (editorRef.current && monacoRef.current) formatEditorCode(editorRef.current, monacoRef.current) }}
        className="rounded px-2 py-0.5 text-[10px] font-medium text-[#94a3b8] transition-colors hover:bg-[#0f172a] hover:text-white"
        title="Format (Shift+Alt+F)"
      >
        Format
      </button>
      {supportedLanguages.length > 1 ? (
        <select
          value={selectedLanguage}
          onChange={e => setSelectedLanguage(e.target.value)}
          className="ml-auto h-7 rounded-md border border-[#334155] bg-[#0f172a] px-2 text-xs text-[#cbd5e1] outline-none"
        >
          {supportedLanguages.map(language => (
            <option key={language} value={language}>{getLanguageLabel(language)}</option>
          ))}
        </select>
      ) : (
        <span className="ml-auto text-[10px] text-[#64748b] uppercase tracking-wider">{getLanguageLabel(editorLang)}</span>
      )}
    </div>
  )

  const TextAnswerArea = ({ placeholder }: { placeholder: string }) => (
    <div className="flex-1 flex flex-col p-4 bg-[#0f172a]">
      <label className="text-xs font-semibold text-[#94a3b8] mb-2 block">{t('mock.yourAnswer')}</label>
      <textarea
        value={textAnswer}
        onChange={e => setTextAnswer(e.target.value)}
        placeholder={placeholder}
        className="flex-1 w-full px-4 py-3 text-sm bg-[#1e293b] border border-[#334155] rounded-xl text-[#f8fafc] placeholder-[#475569] resize-none focus:outline-none focus:border-[#818cf8] leading-relaxed"
      />
    </div>
  )

  const SystemDesignForm = () => (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#0f172a]">
      {[
        { label: t('mock.design.architecture'), key: 'notes', value: designNotes, set: setDesignNotes, rows: 6, placeholder: t('mock.design.architecturePlaceholder') },
        { label: t('mock.design.components'), key: 'components', value: designComponents, set: setDesignComponents, rows: 4, placeholder: t('mock.design.componentsPlaceholder') },
        { label: 'API', key: 'apis', value: designApis, set: setDesignApis, rows: 3, placeholder: t('mock.design.apiPlaceholder') },
        { label: t('mock.design.schema'), key: 'schema', value: designSchema, set: setDesignSchema, rows: 3, placeholder: t('mock.design.schemaPlaceholder') },
      ].map(({ label, key, value, set, rows, placeholder }) => (
        <div key={key}>
          <label className="text-xs font-semibold text-[#94a3b8] mb-1.5 block">{label}</label>
          <textarea
            value={value}
            onChange={e => set(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full px-3 py-2.5 text-sm bg-[#1e293b] border border-[#334155] rounded-xl text-[#f8fafc] placeholder-[#475569] resize-none focus:outline-none focus:border-[#818cf8]"
          />
        </div>
      ))}
    </div>
  )

  /* ── Mobile layout ─── */

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0f172a]">
        <PageMeta title={t('mock.meta.title')} description={t('mock.meta.description')} />
        <header className="border-b border-[#1e293b] bg-[#0f172a] px-4 pt-3 pb-4">
          <div className="flex items-start gap-3">
            <button onClick={() => isFinished ? navigate('/prepare/interview-prep') : setShowLeaveConfirm(true)} className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-[#1e293b] text-[#94a3b8]">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#f8fafc]">Mock · {blueprintTitle || companyTag || t('mock.general')}</p>
              <p className="mt-1 text-xs text-[#64748b]">
                {isFinished
                  ? t('mock.finishedTitle')
                  : t('mock.stageProgress', { current: currentStageIndex + 1, total: stages.length, title: stageTitle })}
              </p>
            </div>
            {isFinished ? (
              <span className="rounded-full bg-[#1e293b] px-2 py-1 text-[11px] font-medium text-[#64748b]">{t('mock.statusCompleted')}</span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-[#14532d] px-2 py-1 text-[11px] font-medium text-[#4ade80]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                {t('mock.statusActive')}
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            {timeLeft > 0 && !isFinished ? (
              <div className="flex items-center gap-1.5 rounded-full bg-[#422006] px-3 py-1 text-xs font-bold text-[#fbbf24]">
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
          <div className="rounded-[24px] border border-[#1e293b] bg-[#0f172a] p-4">
            <StageProgress />
          </div>

          <div className="rounded-[24px] border border-[#1e293b] bg-[#1e293b] p-4">
            <TaskContent />
          </div>

          {isFinished ? (
            <div className="rounded-[24px] border border-dashed border-[#334155] bg-[#0f172a] px-4 py-6 text-center text-sm text-[#64748b]">
              {t('mock.finishedPanel')}
            </div>
          ) : isInQuestionsPhase ? (
            <div className="rounded-[24px] border border-[#1e293b] bg-[#1e293b] p-4">
              <label className="mb-2 block text-xs font-semibold text-[#94a3b8]">{t('mock.yourAnswer')}</label>
              <textarea
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                placeholder={t('mock.answerQuestionPlaceholder')}
                className="h-[220px] w-full resize-none rounded-xl border border-[#334155] bg-[#0f172a] px-4 py-3 text-sm text-[#f8fafc] placeholder-[#475569] leading-relaxed focus:outline-none focus:border-[#818cf8]"
              />
            </div>
          ) : CODE_KINDS.has(stageKind) ? (
            <div className="overflow-hidden rounded-[24px] border border-[#334155]">
              <EditorBar />
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
            <div className="rounded-[24px] border border-[#1e293b] bg-[#1e293b] p-4">
              <div className="flex flex-col gap-4">
                {[
                  { label: t('mock.design.architecture'), key: 'notes', value: designNotes, set: setDesignNotes, rows: 6, placeholder: t('mock.design.architecturePlaceholder') },
                  { label: t('mock.design.components'), key: 'components', value: designComponents, set: setDesignComponents, rows: 4, placeholder: t('mock.design.componentsPlaceholder') },
                  { label: 'API', key: 'apis', value: designApis, set: setDesignApis, rows: 3, placeholder: t('mock.design.apiPlaceholder') },
                  { label: t('mock.design.schema'), key: 'schema', value: designSchema, set: setDesignSchema, rows: 3, placeholder: t('mock.design.schemaPlaceholder') },
                ].map(({ label, key, value, set, rows, placeholder }) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-xs font-semibold text-[#94a3b8]">{label}</label>
                    <textarea
                      value={value}
                      onChange={e => set(e.target.value)}
                      placeholder={placeholder}
                      rows={rows}
                      className="w-full resize-none rounded-xl border border-[#334155] bg-[#0f172a] px-3 py-3 text-sm text-[#f8fafc] placeholder-[#475569] focus:outline-none focus:border-[#818cf8]"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : isCodeReview && codeReviewCode ? (
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-[24px] border border-[#334155]">
                <div className="h-8 bg-[#0f172a] border-b border-[#334155] flex items-center px-4 gap-2">
                  <Code2 className="w-3.5 h-3.5 text-[#94a3b8]" />
                  <span className="text-xs text-[#94a3b8] font-mono">{t('mock.reviewCodeReadonly')}</span>
                </div>
                <Editor
                  height="240px"
                  language={codeReviewLanguage}
                  value={codeReviewCode}
                  options={{ readOnly: true, fontSize: 12, fontFamily: '"JetBrains Mono", monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on', padding: { top: 8 } }}
                />
              </div>
              <div className="rounded-[24px] border border-[#1e293b] bg-[#1e293b] p-4">
                <label className="mb-2 block text-xs font-semibold text-[#94a3b8]">{t('mock.yourCodeReview')}</label>
                <textarea
                  value={textAnswer}
                  onChange={e => setTextAnswer(e.target.value)}
                  placeholder={t('mock.codeReviewPlaceholder')}
                  className="h-[180px] w-full resize-none rounded-xl border border-[#334155] bg-[#0f172a] px-4 py-3 text-sm text-[#f8fafc] placeholder-[#475569] leading-relaxed focus:outline-none focus:border-[#818cf8]"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-[#1e293b] bg-[#1e293b] p-4">
              <label className="mb-2 block text-xs font-semibold text-[#94a3b8]">{t('mock.yourAnswer')}</label>
              <textarea
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                placeholder={t('mock.answerPlaceholder')}
                className="h-[220px] w-full resize-none rounded-xl border border-[#334155] bg-[#0f172a] px-4 py-3 text-sm text-[#f8fafc] placeholder-[#475569] leading-relaxed focus:outline-none focus:border-[#818cf8]"
              />
            </div>
          )}

          <div className="rounded-[24px] border border-[#1e293b] bg-[#1e293b] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#fbbf24]" />
              <span className="text-sm font-bold text-[#f8fafc]">{t('mock.aiFeedback')}</span>
            </div>
            <AIFeedbackContent />
          </div>
        </div>
      </div>
    )
  }

  /* ── Desktop layout ─── */

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] overflow-hidden">
      <PageMeta title={t('mock.meta.title')} description={t('mock.meta.description')} />
      <header className="h-[52px] bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => isFinished ? navigate('/prepare/interview-prep') : setShowLeaveConfirm(true)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1e293b] text-[#94a3b8] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-bold text-[#f8fafc]">Mock Interview · {blueprintTitle || companyTag || t('mock.general')}</p>
            <p className="text-xs text-[#64748b]">
              {isFinished
                ? t('mock.finishedTitle')
                : t('mock.stageProgress', { current: currentStageIndex + 1, total: stages.length, title: stageTitle })}
            </p>
          </div>
          {!isFinished && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#14532d] text-[#4ade80] text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              {t('mock.statusActive')}
            </span>
          )}
          {isFinished && (
            <span className="px-2 py-0.5 rounded-full bg-[#1e293b] text-[#64748b] text-[11px] font-medium">{t('mock.statusCompleted')}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {timeLeft > 0 && !isFinished && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#422006] rounded-full text-xs font-bold text-[#fbbf24]">
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

      {/* Disclaimer */}
      <div className="flex items-center justify-center gap-1.5 bg-[#0a0f1c] border-b border-[#1e293b] px-5 py-1.5">
        <span className="text-[10px] text-[#475569] leading-tight text-center">
          {t('mock.disclaimer')}
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: Stage progress + problem/question */}
        <div className="w-[340px] flex-shrink-0 bg-[#1e293b] border-r border-[#334155] flex flex-col">
          <div className="px-4 py-3 border-b border-[#334155]">
            <StageProgress compact />
            {currentStage && !isFinished && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <p className="text-[10px] text-[#64748b] font-medium uppercase tracking-wide">
                  {stageTitle}
                </p>
                {isInQuestionsPhase && (
                  <span className="flex items-center gap-1 text-[10px] text-[#fbbf24] font-medium">
                    <MessageCircle className="w-2.5 h-2.5" /> {t('mock.question')}
                  </span>
                )}
                {!isInQuestionsPhase && CODE_KINDS.has(stageKind) && (
                  <span className="flex items-center gap-1 text-[10px] text-[#64748b] font-medium">
                    <Code2 className="w-2.5 h-2.5" /> {t('mock.coding')}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <TaskContent />
          </div>
        </div>

        {/* Center: editor or answer area */}
        <div className="flex-1 flex flex-col min-w-0">
          {isFinished ? (
            <div className="flex-1 flex items-center justify-center bg-[#0f172a]">
              <p className="text-sm text-[#475569]">{t('mock.allStagesCompleted')}</p>
            </div>
          ) : isInQuestionsPhase ? (
            <TextAnswerArea placeholder={t('mock.answerQuestionPlaceholder')} />
          ) : CODE_KINDS.has(stageKind) ? (
            <>
              <EditorBar />
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
            <SystemDesignForm />
          ) : isCodeReview && codeReviewCode ? (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Read-only code to review */}
              <div className="flex-1 min-h-0 border-b border-[#334155]">
                <div className="h-8 bg-[#0f172a] border-b border-[#334155] flex items-center px-4 gap-2">
                  <Code2 className="w-3.5 h-3.5 text-[#94a3b8]" />
                  <span className="text-xs text-[#94a3b8] font-mono">{t('mock.reviewCodeReadonly')}</span>
                </div>
                <Editor
                  height="calc(50% - 16px)"
                  language={codeReviewLanguage}
                  value={codeReviewCode}
                  options={{ readOnly: true, fontSize: 13, fontFamily: '"JetBrains Mono", monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on', padding: { top: 12 } }}
                />
              </div>
              {/* User's review textarea */}
              <TextAnswerArea placeholder={t('mock.codeReviewLongPlaceholder')} />
            </div>
          ) : (
            <TextAnswerArea placeholder={t('mock.answerPlaceholder')} />
          )}
        </div>

        {/* Right: AI feedback */}
        <div className="w-[300px] flex-shrink-0 bg-[#1e293b] border-l border-[#334155] flex flex-col">
          <div className="px-4 py-3 border-b border-[#334155] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#fbbf24]" />
            <span className="text-sm font-bold text-[#f8fafc]">{t('mock.aiFeedback')}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <AIFeedbackContent />
          </div>
        </div>
      </div>

      {/* Leave session confirm modal */}
      <Modal
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        title={t('mock.leaveTitle')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowLeaveConfirm(false)}>{t('mock.continue')}</Button>
            <Button variant="orange" size="sm" loading={aborting} onClick={async () => {
              if (!sessionId) return
              setAborting(true)
              try {
                await interviewPrepApi.abortMockSession(sessionId)
              } catch { /* ignore — best effort */ }
              setAborting(false)
              setShowLeaveConfirm(false)
              navigate('/prepare/interview-prep')
            }}>{t('mock.finish')}</Button>
          </>
        }
      >
        <p className="text-sm text-[#475569] dark:text-[#94a3b8]">
          {t('mock.leaveBody')}
        </p>
        <p className="mt-2 text-xs text-[#94a3b8] dark:text-[#4d6380]">
          {t('mock.leaveNoStats', 'Incomplete stages will not count towards your stats.')}
        </p>
      </Modal>
    </div>
  )
}

/* ── Sub-components ─── */

function TestResultPanel({ testResult }: { testResult: any }) {
  const { t } = useTranslation()
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
          <p className="text-sm font-bold text-[#f8fafc]">{passed ? t('mock.testsPassed') : t('mock.testsFailed')}</p>
          {totalCount > 0 && (
            <p className="text-xs text-[#64748b]">{t('mock.testsCount', { passed: passedCount, total: totalCount })}</p>
          )}
        </div>
      </div>

      {lastError && (
        <div className="bg-[#450a0a] border border-[#7f1d1d] rounded-lg p-3">
          <p className="text-xs font-semibold text-[#fca5a5] mb-1">{t('mock.error')}</p>
          <p className="text-xs text-[#fecaca] font-mono leading-relaxed break-all">{lastError}</p>
        </div>
      )}

      {passed && (
        <p className="text-sm text-[#94a3b8] leading-relaxed">
          {t('mock.testsPassedHint')}
        </p>
      )}
    </div>
  )
}

function ReviewPanel({ review, stageKind }: { review: any; stageKind: string }) {
  const { t } = useTranslation()
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
            score >= 7 ? 'bg-[#22c55e]' : score >= 4 ? 'bg-[#818cf8]' : 'bg-[#ef4444]'
          }`}>
            {score}
          </div>
          <div>
            <p className="text-sm font-bold text-[#f8fafc]">
              {score >= 7 ? t('mock.scoreStrong') : score >= 4 ? t('mock.scoreMedium') : t('mock.scoreWeak')}
            </p>
            <p className="text-xs text-[#64748b]">{t('mock.outOfTen')}</p>
          </div>
        </div>
      )}

      {summary && (
        <div>
          <p className="text-xs font-semibold text-[#94a3b8] mb-1.5">{t('mock.summary')}</p>
          <p className="text-sm text-[#cbd5e1] leading-relaxed">{summary}</p>
        </div>
      )}

      {strengths.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap className="w-3.5 h-3.5 text-[#4ade80]" />
            <p className="text-xs font-semibold text-[#4ade80]">{t('mock.strengths')}</p>
          </div>
          <ul className="flex flex-col gap-1">
            {strengths.map((s: string, i: number) => (
              <li key={i} className="text-sm text-[#cbd5e1] flex items-start gap-1.5">
                <span className="text-[#4ade80] mt-0.5">+</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {gaps.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#fbbf24]" />
            <p className="text-xs font-semibold text-[#fbbf24]">{t('mock.gaps')}</p>
          </div>
          <ul className="flex flex-col gap-1">
            {gaps.map((g: string, i: number) => (
              <li key={i} className="text-sm text-[#cbd5e1] flex items-start gap-1.5">
                <span className="text-[#fbbf24] mt-0.5">−</span> {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {stageKind === 'system_design' && missingTopics.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target className="w-3.5 h-3.5 text-[#f87171]" />
            <p className="text-xs font-semibold text-[#f87171]">{t('mock.missed')}</p>
          </div>
          <ul className="flex flex-col gap-1">
            {missingTopics.map((t: string, i: number) => (
              <li key={i} className="text-sm text-[#cbd5e1] flex items-start gap-1.5">
                <span className="text-[#f87171] mt-0.5">!</span> {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {followUpQuestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#94a3b8] mb-1.5">{t('mock.followUps')}</p>
          <ul className="flex flex-col gap-1">
            {followUpQuestions.map((q: string, i: number) => (
              <li key={i} className="text-sm text-[#cbd5e1]">→ {q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
