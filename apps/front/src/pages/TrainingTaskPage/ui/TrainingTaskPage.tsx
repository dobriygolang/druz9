import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import Editor, { type Monaco } from '@monaco-editor/react'
import type * as MonacoTypes from 'monaco-editor'
import { Panel, RpgButton, Badge, PageHeader, usePixelToast } from '@/shared/ui/pixel'
import { setUser, useGameUser } from '@/shared/lib/gameState'
import { reviewApi } from '@/features/SolutionReview/api/reviewApi'
import type { SolutionReview } from '@/features/SolutionReview/api/types'
import { trainingApi, type TrainingTaskData, type TrainingTaskLanguage, type TrainingEvaluationResult } from '@/features/Training/api/trainingApi'

const LANGS: { id: TrainingTaskLanguage; label: string; monaco: string }[] = [
  { id: 'python', label: 'Python', monaco: 'python' },
  { id: 'go', label: 'Go', monaco: 'go' },
]

type TestStatus = 'idle' | 'running' | 'pass' | 'fail'

interface TestRun {
  id: string
  status: TestStatus
  runtimeMs?: number
  actual?: string
  input?: string
  expected?: string
  hidden?: boolean
}

export function TrainingTaskPage() {
  const { t } = useTranslation()
  const { taskId = 'graph-dfs' } = useParams()
  const navigate = useNavigate()
  const user = useGameUser()
  const { toast } = usePixelToast()

  const [task, setTask] = useState<TrainingTaskData | null>(null)
  const [lang, setLang] = useState<TrainingTaskLanguage>('python')
  const [code, setCode] = useState('')
  const [activeTab, setActiveTab] = useState<'statement' | 'hints' | 'submissions'>('statement')
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [runs, setRuns] = useState<Record<string, TestRun>>({})
  const [submitting, setSubmitting] = useState(false)
  const [solved, setSolved] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [review, setReview] = useState<SolutionReview | null>(null)
  const confettiParticles = useRef(
    Array.from({ length: 30 }).map((_, i) => ({
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 1.8 + Math.random() * 1.2,
      c: ['var(--ember-1)', 'var(--moss-1)', 'var(--r-legendary)', 'var(--r-epic)'][i % 4],
      r: Math.random() * 360,
    })),
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setRuns({})
    setSolved(false)
    setSubmissionId(null)
    setReview(null)
    setHintsRevealed(0)

    trainingApi
      .getTask(taskId)
      .then((nextTask) => {
        if (cancelled) return
        setTask(nextTask)
        const nextLanguage = nextTask.starterCode.python ? 'python' : 'go'
        setLang(nextLanguage)
        setCode(nextTask.starterCode[nextLanguage] ?? '')
      })
      .catch(() => {
        if (!cancelled) setError(t('trainingTask.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [taskId])

  useEffect(() => {
    if (!solved) return
    setShowConfetti(true)
    const timer = setTimeout(() => setShowConfetti(false), 3200)
    return () => clearTimeout(timer)
  }, [solved])

  useEffect(() => {
    if (!submissionId) return
    let cancelled = false
    const tick = async () => {
      const nextReview = await reviewApi.getBySubmission(submissionId)
      if (cancelled || !nextReview) return
      setReview(nextReview)
      if (nextReview.status === 'pending') {
        window.setTimeout(tick, 2000)
      }
    }
    void tick()
    return () => {
      cancelled = true
    }
  }, [submissionId])

  const visibleTests = task?.testCases ?? []
  const hiddenCount = useMemo(() => {
    const total = Math.max(
      task?.testCases.length ?? 0,
      ...Object.values(runs).map((run) => (run.hidden ? 0 : 1)),
      0,
    )
    const evaluatedTotal = Object.values(runs).length
    return Math.max(0, evaluatedTotal - visibleTests.length, total - visibleTests.length)
  }, [runs, task?.testCases.length, visibleTests.length])
  const passed = Object.values(runs).filter((run) => run.status === 'pass').length
  const failed = Object.values(runs).filter((run) => run.status === 'fail').length

  const handleLangChange = (nextLang: TrainingTaskLanguage) => {
    if (!task || nextLang === lang) return
    setLang(nextLang)
    setCode(task.starterCode[nextLang] ?? '')
    setRuns({})
  }

  const handleMount = (_editor: MonacoTypes.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    monaco.editor.defineTheme('druz9-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'e9b866' },
        { token: 'string', foreground: 'd48a3c' },
        { token: 'comment', foreground: '6a5a48', fontStyle: 'italic' },
        { token: 'number', foreground: 'd4e2ec' },
        { token: 'type', foreground: '9fb89a' },
      ],
      colors: {
        'editor.background': '#1a140e',
        'editor.foreground': '#f6ead0',
        'editorLineNumber.foreground': '#5a4838',
        'editorLineNumber.activeForeground': '#e9b866',
        'editor.selectionBackground': '#b8692a60',
        'editor.lineHighlightBackground': '#2a2018',
      },
    })
    monaco.editor.setTheme('druz9-dark')
  }

  const applyEvaluation = (result: TrainingEvaluationResult) => {
    const nextRuns: Record<string, TestRun> = {}
    result.testResults.forEach((testResult) => {
      nextRuns[testResult.id] = {
        id: testResult.id,
        status: testResult.status,
        runtimeMs: testResult.runtimeMs,
        actual: testResult.actual,
        input: testResult.input,
        expected: testResult.expected,
        hidden: testResult.hidden,
      }
    })
    setRuns(nextRuns)

    if (result.accepted) {
      setSolved(true)
      setSubmissionId(result.submissionId ?? null)
      const xp = extractRewardValue(result.rewardLabels, '✦')
      const gold = extractRewardValue(result.rewardLabels, 'gold')
      if (xp > 0) {
        toast({ kind: 'xp', message: result.rewardLabels.find((label) => label.includes('✦')) ?? `+${xp} XP` })
      }
      if (gold > 0) {
        toast({ kind: 'gold', message: result.rewardLabels.find((label) => label.includes('gold')) ?? `+${gold} gold` })
      }
      if (xp > 0 || gold > 0) {
        setUser({
          xp: user.xp + xp,
          gold: user.gold + gold,
          xpPct: Math.min(100, Math.round(((user.xp + xp) / user.xpMax) * 100)),
        })
      }
    } else if (result.error) {
      toast({ kind: 'danger', message: result.error })
    } else {
      toast({ kind: 'danger', message: t('trainingTask.someTestsFailed') })
    }
  }

  const handleRun = async () => {
    if (!task) return
    setSubmitting(true)
    try {
      const result = await trainingApi.evaluateTaskSolution(task.moduleId, {
        language: lang,
        code,
        mode: 'run_visible',
      })
      applyEvaluation(result)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (!task) return
    setSubmitting(true)
    try {
      const result = await trainingApi.evaluateTaskSolution(task.moduleId, {
        language: lang,
        code,
        mode: 'submit_all',
      })
      applyEvaluation(result)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Panel>
        <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)' }}>
          Workshop
        </div>
        <div style={{ marginTop: 8, color: 'var(--ink-1)' }}>{t('trainingTask.loading')}</div>
      </Panel>
    )
  }

  if (error || !task) {
    return (
      <Panel>
        <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--danger-1)' }}>
          {t('trainingTask.unavailable')}
        </div>
        <div style={{ marginTop: 8, color: 'var(--ink-1)' }}>{error ?? t('trainingTask.notFound')}</div>
        <RpgButton style={{ marginTop: 12 }} onClick={() => navigate('/training')}>
          {t('trainingTask.backToTree')}
        </RpgButton>
      </Panel>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow={t('trainingTask.eyebrow', { topic: task.topic })}
        title={task.title}
        subtitle={t('trainingTask.subtitle', { difficulty: task.difficulty, moduleId: task.moduleId })}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <RpgButton size="sm" variant="ghost" onClick={() => navigate('/training')}>
              {t('trainingTask.tree')}
            </RpgButton>
            <RpgButton size="sm" onClick={handleRun} disabled={submitting}>
              {t('trainingTask.runTests')}
            </RpgButton>
            <RpgButton size="sm" variant="primary" onClick={handleSubmit} disabled={submitting || solved}>
              {solved ? t('trainingTask.solved') : submitting ? t('trainingTask.submitting') : t('trainingTask.submit')}
            </RpgButton>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Panel>
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { id: 'statement', label: 'Statement' },
              { id: 'hints', label: `Hints (${hintsRevealed}/${task.hints.length})` },
              { id: 'submissions', label: 'Submissions' },
            ]}
          />
          {activeTab === 'statement' && <Statement task={task} />}
          {activeTab === 'hints' && (
            <Hints
              hints={task.hints}
              revealed={hintsRevealed}
              onReveal={() => setHintsRevealed((value) => Math.min(value + 1, task.hints.length))}
            />
          )}
          {activeTab === 'submissions' && <SubmissionsTab review={review} submissionId={submissionId} solved={solved} />}
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <Panel variant="dark" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                gap: 0,
                padding: '10px 14px',
                background: '#1a140e',
                borderBottom: '2px solid var(--ink-0)',
              }}
            >
              {LANGS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleLangChange(item.id)}
                  className="font-silkscreen uppercase"
                  style={{
                    padding: '6px 12px',
                    marginRight: 4,
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    border: '2px solid var(--ink-0)',
                    background: lang === item.id ? 'var(--ember-1)' : 'rgba(246,234,208,0.08)',
                    color: lang === item.id ? 'var(--parch-0)' : 'var(--parch-2)',
                    cursor: 'pointer',
                  }}
                >
                  {item.label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button
                className="font-silkscreen uppercase"
                onClick={() => setAiOpen((value) => !value)}
                style={{
                  padding: '6px 10px',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  border: '2px solid var(--ink-0)',
                  background: aiOpen ? 'var(--r-legendary)' : 'rgba(246,234,208,0.08)',
                  color: 'var(--parch-0)',
                  cursor: 'pointer',
                  marginRight: 8,
                }}
              >
                ✦ AI
              </button>
              <span
                className="font-silkscreen uppercase"
                style={{ fontSize: 10, color: 'var(--parch-2)', letterSpacing: '0.08em' }}
              >
                {code.split('\n').length} lines
              </span>
            </div>

            <div style={{ display: 'flex', height: 440 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Editor
                  language={LANGS.find((item) => item.id === lang)?.monaco ?? 'plaintext'}
                  value={code}
                  onChange={(value) => setCode(value ?? '')}
                  onMount={handleMount}
                  theme="druz9-dark"
                  options={{
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono, monospace',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                  }}
                />
              </div>
              {aiOpen && <AiHintSidebar review={review} />}
            </div>
          </Panel>

          <Panel>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <h3 className="font-display" style={{ fontSize: 17 }}>
                {t('trainingTask.testCases')}
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {passed > 0 && <Badge variant="moss">{t('trainingTask.passCount', { count: passed })}</Badge>}
                {failed > 0 && <Badge variant="ember">{t('trainingTask.failCount', { count: failed })}</Badge>}
                {hiddenCount > 0 && <Badge variant="dark">{t('trainingTask.hiddenCount', { count: hiddenCount })}</Badge>}
              </div>
            </div>

            {visibleTests.map((testCase) => (
              <TestCaseRow key={testCase.id} testCase={testCase} run={runs[testCase.id]} />
            ))}

            {solved && (
              <>
                <div className="rpg-divider" />
                <div
                  style={{
                    padding: 12,
                    background: 'var(--moss-1)',
                    color: 'var(--parch-0)',
                    border: '3px solid var(--ink-0)',
                    boxShadow: 'inset -3px -3px 0 var(--moss-0), inset 3px 3px 0 var(--moss-2)',
                  }}
                >
                  <div className="font-silkscreen uppercase" style={{ fontSize: 10, letterSpacing: '0.1em', marginBottom: 4 }}>
                    {t('trainingTask.accepted')}
                  </div>
                  <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 16 }}>
                    {t('trainingTask.rewards')}: {task.rewards.join(' · ')}
                  </div>
                </div>
                <RpgButton variant="primary" style={{ width: '100%', marginTop: 12 }} onClick={() => navigate('/training')}>
                  {t('trainingTask.backToTree')}
                </RpgButton>
              </>
            )}
          </Panel>
        </div>
      </div>

      {solved && <CodeReviewPanel code={code} review={review} />}

      {showConfetti && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200, overflow: 'hidden' }}>
          {confettiParticles.current.map((particle, index) => (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${particle.x}%`,
                top: -20,
                width: 10,
                height: 14,
                background: particle.c,
                border: '2px solid var(--ink-0)',
                animation: `rpg-confetti-fall ${particle.dur}s ${particle.delay}s linear forwards`,
                transform: `rotate(${particle.r}deg)`,
              }}
            />
          ))}
          <div
            style={{
              position: 'absolute',
              top: '15%',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--moss-1)',
              color: 'var(--parch-0)',
              border: '4px solid var(--ink-0)',
              boxShadow: '4px 4px 0 var(--ink-0)',
              padding: '14px 28px',
              fontFamily: 'Pixelify Sans, monospace',
              fontSize: 22,
              whiteSpace: 'nowrap',
              animation: 'rpg-toast-in 0.25s ease-out',
            }}
          >
            {t('trainingTask.acceptedBanner')}
          </div>
        </div>
      )}
    </>
  )
}

function extractRewardValue(labels: string[], needle: string): number {
  const match = labels.find((label) => label.toLowerCase().includes(needle.toLowerCase()))
  if (!match) return 0
  const digits = match.match(/\d+/)
  return digits ? Number(digits[0]) : 0
}

function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T
  onChange: (value: T) => void
  items: { id: T; label: string }[]
}) {
  return (
    <div className="rpg-tabs">
      {items.map((item) => (
        <div key={item.id} className={`rpg-tab ${value === item.id ? 'rpg-tab--active' : ''}`} onClick={() => onChange(item.id)}>
          {item.label}
        </div>
      ))}
    </div>
  )
}

function Statement({ task }: { task: TrainingTaskData }) {
  const { t } = useTranslation()
  return (
    <>
      <div style={{ whiteSpace: 'pre-wrap', color: 'var(--ink-0)', fontSize: 14, marginBottom: 16 }}>{task.statement}</div>

      {task.examples.length > 0 && (
        <>
          <h4 className="font-silkscreen uppercase" style={{ fontSize: 11, color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 8 }}>
            {t('trainingTask.examples')}
          </h4>
          {task.examples.map((example, index) => (
            <div key={index} className="rpg-panel rpg-panel--recessed" style={{ padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                <div>
                  <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em', marginBottom: 4 }}>
                    {t('trainingTask.input')}
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{example.input}</pre>
                </div>
                <div>
                  <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em', marginBottom: 4 }}>
                    {t('trainingTask.output')}
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{example.output}</pre>
                </div>
              </div>
              {example.note && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-2)' }}>{example.note}</div>}
            </div>
          ))}
        </>
      )}

      {task.constraints.length > 0 && (
        <>
          <h4 className="font-silkscreen uppercase" style={{ fontSize: 11, color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 8 }}>
            {t('trainingTask.constraints')}
          </h4>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {task.constraints.map((constraint, index) => (
              <li key={index} style={{ fontSize: 13, color: 'var(--ink-1)', marginBottom: 2 }}>
                {constraint}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

function Hints({ hints, revealed, onReveal }: { hints: string[]; revealed: number; onReveal: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 14 }}>
        {t('trainingTask.hintsBody')}
      </div>
      {hints.map((hint, index) => (
        <div key={index} className="rpg-quest" style={{ marginBottom: 8, opacity: index < revealed ? 1 : 0.4 }}>
          <div className="rpg-quest__check">{index < revealed ? '✓' : '?'}</div>
          <div style={{ flex: 1 }}>{index < revealed ? hint : t('trainingTask.hiddenHint')}</div>
        </div>
      ))}
      {revealed < hints.length && (
        <RpgButton style={{ marginTop: 10 }} onClick={onReveal}>
          {t('trainingTask.revealNextHint')}
        </RpgButton>
      )}
    </>
  )
}

function TestCaseRow({ testCase, run }: { testCase: TrainingTaskData['testCases'][number]; run?: TestRun }) {
  const { t } = useTranslation()
  const status = run?.status ?? 'idle'
  return (
    <div className="rpg-panel rpg-panel--recessed" style={{ padding: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)' }}>
          {testCase.id}
        </div>
        <Badge variant={status === 'pass' ? 'moss' : status === 'fail' ? 'ember' : 'dark'}>{t(`trainingTask.status.${status}`)}</Badge>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
        <div>
          <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', marginBottom: 4 }}>
            {t('trainingTask.input')}
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{testCase.input}</pre>
        </div>
        <div>
          <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', marginBottom: 4 }}>
            {t('trainingTask.expected')}
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{testCase.expected}</pre>
        </div>
      </div>
      {run?.actual && (
        <div style={{ marginTop: 10 }}>
          <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', marginBottom: 4 }}>
            {t('trainingTask.actual')}
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{run.actual}</pre>
        </div>
      )}
    </div>
  )
}

function SubmissionsTab({ review, submissionId, solved }: { review: SolutionReview | null; submissionId: string | null; solved: boolean }) {
  const { t } = useTranslation()
  if (!submissionId) {
    return <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>{t('trainingTask.noSubmissions')}</div>
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div className="rpg-quest">
        <div className="rpg-quest__check">{solved ? '✓' : '…'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13 }}>{t('trainingTask.submissionId', { id: submissionId })}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t('trainingTask.reviewStatus', { status: review?.status ?? t('trainingTask.status.pending') })}</div>
        </div>
      </div>
    </div>
  )
}

function AiHintSidebar({ review }: { review: SolutionReview | null }) {
  const { t } = useTranslation()
  return (
    <div
      style={{
        width: 280,
        borderLeft: '2px solid var(--ink-0)',
        background: '#18120d',
        padding: 12,
        overflow: 'auto',
      }}
    >
      <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ember-1)', letterSpacing: '0.08em', marginBottom: 10 }}>
        {t('trainingTask.aiReview')}
      </div>
      {!review && <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{t('trainingTask.aiReviewLocked')}</div>}
      {review && (
        <>
          <div style={{ fontSize: 13, marginBottom: 8 }}>{t('trainingTask.reviewStatus', { status: review.status })}</div>
          {review.aiHint && <div style={{ fontSize: 13, color: 'var(--ink-1)', marginBottom: 8 }}>{review.aiHint}</div>}
          {review.aiPattern && <Badge variant="dark">{review.aiPattern}</Badge>}
        </>
      )}
    </div>
  )
}

function CodeReviewPanel({ code, review }: { code: string; review: SolutionReview | null }) {
  const { t } = useTranslation()
  return (
    <Panel nailed style={{ marginTop: 18 }}>
      <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--moss-1)', letterSpacing: '0.1em', marginBottom: 8 }}>
        {t('trainingTask.accepted')}
      </div>
      <h3 className="font-display" style={{ fontSize: 18, margin: '0 0 12px' }}>
        {t('trainingTask.codeReview')}
      </h3>
      {review ? (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {review.aiVerdict && <Badge variant="ember">{review.aiVerdict}</Badge>}
            {review.aiTimeComplexity && <Badge variant="dark">{review.aiTimeComplexity}</Badge>}
            {review.aiSpaceComplexity && <Badge variant="dark">{review.aiSpaceComplexity}</Badge>}
          </div>
          {review.aiStrengths.length > 0 && <ReviewList title={t('trainingTask.strengths')} items={review.aiStrengths} />}
          {review.aiWeaknesses.length > 0 && <ReviewList title={t('trainingTask.weaknesses')} items={review.aiWeaknesses} />}
          {review.aiHint && (
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-1)' }}>
              {t('trainingTask.hint')}: {review.aiHint}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 12 }}>{t('trainingTask.aiReviewPreparing')}</div>
      )}
      <div style={{ marginTop: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, background: '#1a140e', color: '#e2d0b8', padding: 14, border: '2px solid var(--ink-0)', whiteSpace: 'pre', overflow: 'auto', maxHeight: 320 }}>
        {code}
      </div>
    </Panel>
  )
}

function ReviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', marginBottom: 6, letterSpacing: '0.08em' }}>
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((item, index) => (
          <li key={index} style={{ fontSize: 13, color: 'var(--ink-1)', marginBottom: 4 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
