import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Clock, BookOpen } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { interviewPrepApi } from '@/features/InterviewPrep/api/interviewPrepApi'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useToast } from '@/shared/ui/Toast'
import { useTranslation } from 'react-i18next'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import { registerFormatKeybinding } from '@/shared/lib/editorFormat'
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
  const { t } = useTranslation()
  const [session, setSession] = useState<any>(null)
  const [code, setCode] = useState('')
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [review, setReview] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'problem' | 'question' | 'result'>('problem')
  const [timeLeft, setTimeLeft] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState('python')
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)

  const backUrl = '/prepare/interview-prep'

  useEffect(() => {
    if (!sessionId) return
    interviewPrepApi.getSession(sessionId).then((s: any) => {
      setSession(s)
      if (s?.code || s?.task?.starterCode) setCode(s.code || s.task?.starterCode)
      const nextLanguage = getMonacoLanguage(s?.solveLanguage ?? s?.task?.language ?? 'python')
      setSelectedLanguage(nextLanguage === 'plaintext' ? 'python' : nextLanguage)
      if (s?.task?.durationSeconds) setTimeLeft(s.task.durationSeconds)
      if (s?.currentQuestion) setActiveTab('question')
    }).catch(() => navigate(backUrl))
  }, [sessionId, navigate, backUrl])

  const timerActive = timeLeft > 0
  useEffect(() => {
    if (!timerActive) return
    const interval = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000)
    return () => clearInterval(interval)
  }, [timerActive])

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const handleSubmitCode = async () => {
    if (!sessionId) return
    setSubmitting(true)
    try {
      const r = await interviewPrepApi.submitSession(sessionId, code, selectedLanguage) as any
      setReview(r)
      setActiveTab('result')
    } catch {
      toast(t('interviewPrep.session.submitFailed'), 'error')
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
      toast(t('interviewPrep.session.answerFailed'), 'error')
    } finally { setSubmitting(false) }
  }

  const task = session?.task
  const question = session?.currentQuestion
  const isCodeTask = task?.isExecutable
  const supportedLanguages = resolveSupportedLanguages(task)
  const prepTypeLabel = task?.prepType ? t(`interviewPrep.prepType.${task.prepType}`, { defaultValue: task.prepType }) : ''

  const handleEditorMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor
    registerDarkTheme(monaco)
    registerFormatKeybinding(editor, monaco)
    monaco.editor.setTheme('druzya-dark')
  }, [])

  /* ── Shared: top bar ──────────────────────────────────────────────── */
  const topBar = (
    <header className="h-[52px] bg-white border-b border-[#C1CFC4] flex items-center justify-between px-5 flex-shrink-0 dark:bg-[#132420] dark:border-[#163028]">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(backUrl)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F0F5F1] text-[#4B6B52] dark:hover:bg-[#163028]">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-sm font-bold text-[#0B1210] dark:text-[#E2F0E8]">{task?.title ?? t('interviewPrep.session.titleFallback')}</p>
          <p className="text-xs text-[#4B6B52] dark:text-[#7BA88A]">{task?.companyTag ?? t('interviewPrep.session.companyFallback')} · {prepTypeLabel}</p>
        </div>
        <Badge variant="success" dot>{t('interviewPrep.session.inProgress')}</Badge>
      </div>
      <div className="flex items-center gap-2">
        {timeLeft > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#fef3c7] rounded-full text-xs font-bold text-[#92400e]">
            <Clock className="w-3 h-3" /> {formatTime(timeLeft)}
          </div>
        )}
        <Button variant="secondary" size="sm" onClick={() => navigate(backUrl)}>
          {t('interviewPrep.session.finish')}
        </Button>
      </div>
    </header>
  )

  /* ── Shared: tabs ─────────────────────────────────────────────────── */
  const tabs = (variant: 'bar' | 'pill') => {
    const items = [
      { key: 'problem' as const, label: t('interviewPrep.session.tabs.task'), show: true },
      { key: 'question' as const, label: t('interviewPrep.session.tabs.question'), show: !!question },
      { key: 'result' as const, label: t('interviewPrep.session.tabs.review'), show: !!review },
    ].filter(i => i.show)

    if (variant === 'pill') {
      return (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {items.map(i => (
            <button key={i.key} onClick={() => setActiveTab(i.key)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === i.key ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111]' : 'bg-white text-[#7A9982] border border-[#d8d9d6] dark:bg-[#132420] dark:border-[#163028] dark:text-[#7BA88A]'}`}>
              {i.label}
            </button>
          ))}
        </div>
      )
    }
    return (
      <div className="flex border-b border-[#C1CFC4] dark:border-[#163028]">
        {items.map(i => (
          <button key={i.key} onClick={() => setActiveTab(i.key)} className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${activeTab === i.key ? 'border-[#059669] text-[#111111] dark:text-[#E2F0E8]' : 'border-transparent text-[#4B6B52] dark:text-[#7BA88A]'}`}>
            {i.label}
          </button>
        ))}
      </div>
    )
  }

  /* ── Shared: tab content ──────────────────────────────────────────── */
  const tabContent = (size: 'compact' | 'full') => (
    <div className="flex-1 overflow-y-auto p-4">
      {activeTab === 'problem' && (
        <div>
          <h2 className={`font-bold text-[#0B1210] dark:text-[#E2F0E8] ${size === 'full' ? 'text-lg mb-4' : 'text-base mb-3'}`}>{task?.title}</h2>
          <p className={`text-[#4B6B52] dark:text-[#94a3b8] leading-relaxed whitespace-pre-wrap ${size === 'full' ? 'text-base' : 'text-sm'}`}>{task?.statement}</p>
        </div>
      )}
      {activeTab === 'question' && question && (
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl dark:bg-[#0d2a1f] dark:border-[#1e3a5f]">
            <p className={`font-medium text-[#1e3a5f] dark:text-[#93c5fd] ${size === 'full' ? 'text-base' : 'text-sm'}`}>{question.prompt}</p>
          </div>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder={t('interviewPrep.session.answerPlaceholder')}
            rows={size === 'full' ? 12 : 6}
            className="w-full px-4 py-3 text-sm bg-[#F0F5F1] border border-[#C1CFC4] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#059669]/20 dark:bg-[#0B1210] dark:border-[#163028] dark:text-[#E2F0E8]"
          />
          <Button variant="primary" size="md" onClick={handleAnswerQuestion} loading={submitting} className="w-full justify-center rounded-xl">
            <Send className="w-4 h-4" /> {t('interviewPrep.session.answer')}
          </Button>
        </div>
      )}
      {activeTab === 'result' && review && (
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-[#F0F5F1] rounded-xl border border-[#C1CFC4] dark:bg-[#163028] dark:border-[#1E4035]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#4B6B52] uppercase dark:text-[#7BA88A]">{t('interviewPrep.session.review')}</span>
              <span className="font-mono text-xl font-bold text-[#059669]">{review.score ?? '--'}/10</span>
            </div>
            {review.summary && <p className="text-sm text-[#4B6B52] dark:text-[#94a3b8]">{review.summary}</p>}
          </div>
          {review.gaps?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#4B6B52] dark:text-[#7BA88A] mb-2">{t('interviewPrep.session.gaps')}</p>
              {review.gaps.map((g: string, i: number) => (
                <p key={i} className="text-sm text-[#4B6B52] dark:text-[#94a3b8] flex gap-2 mb-1"><span className="text-[#ef4444]">•</span>{g}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  /* ── Shared: code editor panel ────────────────────────────────────── */
  const codeEditor = (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="h-9 bg-[#1e293b] flex items-center px-4 gap-3 flex-shrink-0">
        <span className="text-xs text-[#94a3b8] font-mono">solution.{selectedLanguage === 'go' ? 'go' : selectedLanguage === 'sql' ? 'sql' : 'py'}</span>
        <div className="ml-auto flex items-center gap-2">
          {supportedLanguages.length > 1 && (
            <select
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value)}
              className="h-8 rounded-md border border-[#1E4035] bg-[#0B1210] px-2 text-xs text-[#C1D9CA] outline-none"
            >
              {supportedLanguages.map(language => (
                <option key={language} value={language}>{getLanguageLabel(language)}</option>
              ))}
            </select>
          )}
          <Button variant="orange" size="sm" onClick={handleSubmitCode} loading={submitting}>
            <Send className="w-3.5 h-3.5" /> {t('interviewPrep.session.submit')}
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
  )

  /* ── Mobile layout ────────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F0F5F1] dark:bg-[#0B1210]">
        <header className="border-b border-[#d8d9d6] bg-white px-4 pt-3 pb-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:bg-[#132420] dark:border-[#163028]">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate(backUrl)} className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#4B6B52] dark:bg-[#163028]">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#0B1210] dark:text-[#E2F0E8]">{task?.title ?? t('interviewPrep.session.titleFallback')}</p>
              <p className="mt-1 truncate text-xs text-[#4B6B52] dark:text-[#7BA88A]">{task?.companyTag ?? t('interviewPrep.session.companyFallback')} · {prepTypeLabel}</p>
            </div>
            <Badge variant="success" dot>{t('interviewPrep.session.live')}</Badge>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            {timeLeft > 0 ? (
              <div className="flex items-center gap-1.5 rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-bold text-[#92400e]">
                <Clock className="w-3 h-3" /> {formatTime(timeLeft)}
              </div>
            ) : <div />}
            <Button variant="secondary" size="sm" onClick={() => navigate(backUrl)} className="rounded-2xl">
              {t('interviewPrep.session.finish')}
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-24">
          {tabs('pill')}
          <div className="rounded-[24px] border border-[#d8d9d6] bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)] dark:bg-[#132420] dark:border-[#163028]">
            {tabContent('compact')}
          </div>
          {isCodeTask && (
            <div className="overflow-hidden rounded-[24px] border border-[#1e293b] bg-white shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-3 bg-[#1e293b] px-4 py-3">
                <span className="text-xs font-mono text-[#94a3b8]">solution.{selectedLanguage === 'go' ? 'go' : selectedLanguage === 'sql' ? 'sql' : 'py'}</span>
                <div className="ml-auto flex items-center gap-2">
                  {supportedLanguages.length > 1 && (
                    <select value={selectedLanguage} onChange={e => setSelectedLanguage(e.target.value)} className="h-8 rounded-md border border-[#1E4035] bg-[#0B1210] px-2 text-xs text-[#C1D9CA] outline-none">
                      {supportedLanguages.map(language => <option key={language} value={language}>{getLanguageLabel(language)}</option>)}
                    </select>
                  )}
                  <Button variant="orange" size="sm" onClick={handleSubmitCode} loading={submitting} className="rounded-2xl">
                    <Send className="w-3.5 h-3.5" /> {t('interviewPrep.session.submit')}
                  </Button>
                </div>
              </div>
              <div className="h-[48vh] min-h-[320px]">
                <Editor height="100%" language={getMonacoLanguage(selectedLanguage)} value={code} onChange={v => setCode(v ?? '')} onMount={handleEditorMount} options={{ fontSize: 13, fontFamily: '"JetBrains Mono", monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on', padding: { top: 12 } }} />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── Desktop: code tasks → split panel ────────────────────────────── */
  if (isCodeTask) {
    return (
      <div className="flex flex-col h-screen bg-[#F0F5F1] dark:bg-[#0B1210] overflow-hidden">
        {topBar}
        <div className="flex flex-1 min-h-0">
          <div className="w-[380px] flex-shrink-0 bg-white border-r border-[#C1CFC4] flex flex-col dark:bg-[#132420] dark:border-[#163028]">
            {tabs('bar')}
            {tabContent('compact')}
          </div>
          {codeEditor}
        </div>
      </div>
    )
  }

  /* ── Desktop: non-code tasks → full-width focused layout ──────────── */
  return (
    <div className="flex flex-col h-screen bg-[#F0F5F1] dark:bg-[#0B1210] overflow-hidden">
      {topBar}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* Task statement */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ecfdf5] dark:bg-[#0d2a1f]">
                <BookOpen className="h-4 w-4 text-[#059669]" />
              </div>
              <h2 className="text-xl font-bold text-[#0B1210] dark:text-[#E2F0E8]">{task?.title}</h2>
            </div>
            <div className="rounded-2xl border border-[#C1CFC4] bg-white p-6 dark:bg-[#132420] dark:border-[#163028]">
              <p className="text-base text-[#4B6B52] dark:text-[#94a3b8] leading-relaxed whitespace-pre-wrap">{task?.statement}</p>
            </div>
          </div>

          {/* Question + answer area */}
          {question && (
            <div className="mb-6">
              <div className="rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] p-5 dark:bg-[#0d2a1f] dark:border-[#1e3a5f]">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#059669] dark:text-[#34D399] mb-2">
                  {t('interviewPrep.session.tabs.question')}
                </p>
                <p className="text-base font-medium text-[#1e3a5f] dark:text-[#93c5fd]">{question.prompt}</p>
              </div>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder={t('interviewPrep.session.answerPlaceholder')}
                rows={10}
                className="mt-4 w-full px-5 py-4 text-base bg-white border border-[#C1CFC4] rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-[#059669]/20 dark:bg-[#132420] dark:border-[#163028] dark:text-[#E2F0E8]"
              />
              <Button variant="primary" size="md" onClick={handleAnswerQuestion} loading={submitting} className="mt-3 w-full justify-center rounded-xl">
                <Send className="w-4 h-4" /> {t('interviewPrep.session.answer')}
              </Button>
            </div>
          )}

          {/* Review */}
          {review && (
            <div className="mb-6">
              <div className="rounded-2xl border border-[#C1CFC4] bg-white p-6 dark:bg-[#132420] dark:border-[#163028]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#4B6B52] dark:text-[#7BA88A] uppercase">{t('interviewPrep.session.review')}</span>
                  <span className="font-mono text-2xl font-bold text-[#059669]">{review.score ?? '--'}/10</span>
                </div>
                {review.summary && <p className="text-base text-[#4B6B52] dark:text-[#94a3b8] leading-relaxed">{review.summary}</p>}
              </div>
              {review.gaps?.length > 0 && (
                <div className="mt-4 rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-5 dark:bg-[#2a0f0f] dark:border-[#7f1d1d]">
                  <p className="text-xs font-semibold text-[#dc2626] dark:text-[#f87171] mb-3 uppercase">{t('interviewPrep.session.gaps')}</p>
                  {review.gaps.map((g: string, i: number) => (
                    <p key={i} className="text-sm text-[#4B6B52] dark:text-[#f87171] flex gap-2 mb-1.5"><span className="text-[#ef4444]">•</span>{g}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* If no question yet and no review, show gentle prompt */}
          {!question && !review && (
            <div className="rounded-2xl border border-dashed border-[#C1CFC4] bg-white/50 px-6 py-8 text-center dark:bg-[#132420]/50 dark:border-[#163028]">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-[#C1CFC4] dark:text-[#4A7058]" />
              <p className="text-sm text-[#94a3b8]">{t('interviewPrep.session.readAndWait')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
