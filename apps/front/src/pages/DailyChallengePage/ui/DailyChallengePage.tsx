import { useCallback, useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import { useTranslation } from 'react-i18next'

import { Panel, RpgButton, Badge, PageHeader } from '@/shared/ui/pixel'
import { apiClient } from '@/shared/api/base'
import { useTheme } from '@/app/providers/ThemeProvider'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import { registerFormatKeybinding } from '@/shared/lib/editorFormat'
import { DIFF_LABELS } from '@/shared/lib/taskLabels'
import { formatDateRu } from '@/shared/lib/dateFormat'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { PageMeta } from '@/shared/ui/PageMeta'

interface DailyTask {
  task: {
    id: string
    title: string
    slug: string
    statement: string
    difficulty: string
    language: string
    starterCode: string
    topics: string[]
  }
  date: string
  expiresAt: string
}

// Raw API shape uses snake_case in some environments + numeric lang codes; the
// normalizer shields the rest of the component from that.
const LANG_MAP: Record<string | number, string> = {
  1: 'python', 2: 'javascript', 3: 'typescript', 4: 'go', 5: 'rust', 6: 'java',
  python: 'python', go: 'go', javascript: 'javascript', typescript: 'typescript',
}

function normalizeTask(raw: any): DailyTask {
  const t = raw?.task ?? {}
  return {
    date: raw?.date ?? raw?.Date ?? '',
    expiresAt: raw?.expiresAt ?? '',
    task: {
      id: t.id ?? t.ID ?? '',
      title: t.title ?? t.Title ?? '',
      slug: t.slug ?? t.Slug ?? '',
      statement: t.statement ?? t.Statement ?? '',
      difficulty: String(t.difficulty ?? t.Difficulty ?? ''),
      language: LANG_MAP[t.language ?? t.Language ?? ''] ?? 'go',
      starterCode: t.starterCode ?? t.StarterCode ?? '',
      topics: t.topics ?? t.Topics ?? [],
    },
  }
}

export function DailyChallengePage() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isMobile = useIsMobile()
  const [task, setTask] = useState<DailyTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [code, setCode] = useState('')
  const [timeLeft, setTimeLeft] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [review, setReview] = useState<any>(null)
  const saveDraftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (saveDraftTimer.current) clearTimeout(saveDraftTimer.current)
  }, [])

  useEffect(() => {
    apiClient.get('/api/v1/code-editor/daily')
      .then((res) => {
        const normalized = normalizeTask(res.data)
        setTask(normalized)
        const id = normalized.task.id
        if (id) {
          const codeKey = `daily:code:${id}`
          const reviewKey = `daily:review:${id}`
          setCode(localStorage.getItem(codeKey) ?? normalized.task.starterCode ?? '')
          const savedReview = localStorage.getItem(reviewKey)
          if (savedReview) {
            try { setReview(JSON.parse(savedReview)) } catch { /* corrupt cache */ }
          }
          // Purge stale drafts from previous days.
          Object.keys(localStorage)
            .filter(k => (k.startsWith('daily:code:') && k !== codeKey) || (k.startsWith('daily:review:') && k !== reviewKey))
            .forEach(k => localStorage.removeItem(k))
        } else {
          setCode(normalized.task.starterCode ?? '')
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  // Midnight countdown — daily task rotates at 00:00 UTC.
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setUTCHours(24, 0, 0, 0)
      const diff = midnight.getTime() - now.getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      )
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async () => {
    if (!task) return
    setReviewing(true)
    try {
      const res = await apiClient.post('/api/v1/code-editor/ai-review', {
        language: task.task.language,
        code,
        taskTitle: task.task.title,
        statement: task.task.statement,
      })
      const reviewData = res.data?.review ?? res.data
      setReview(reviewData)
      if (task.task.id) {
        try { localStorage.setItem(`daily:review:${task.task.id}`, JSON.stringify(reviewData)) } catch { /* quota */ }
      }
    } catch {
      setReview(null)
    } finally {
      setReviewing(false)
    }
  }

  const handleEditorMount = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
      registerDarkTheme(monaco)
      registerFormatKeybinding(editor, monaco)
      monaco.editor.setTheme(theme === 'dark' ? 'druzya-dark' : 'vs')
    },
    [theme],
  )

  const today = formatDateRu(task?.date ?? new Date().toISOString())
  const langExt = task?.task.language === 'python'      ? 'py'
                : task?.task.language === 'javascript'  ? 'js'
                : task?.task.language === 'typescript'  ? 'ts'
                : (task?.task.language ?? 'go')

  return (
    <>
      <PageMeta title={t('daily.meta.title')} description={t('daily.meta.description')} canonicalPath="/daily-challenge" />
      <PageHeader
        eyebrow={`Town Board · ${today}`}
        title={t('daily.title', 'Daily Challenge')}
        subtitle="One curated task per day. Solve it before midnight to claim the scroll."
        right={
          <Badge variant="ember" style={{ fontFamily: 'Pixelify Sans, monospace' }}>
            ⏱ {timeLeft}
          </Badge>
        }
      />

      {loading && (
        <Panel>
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-2)' }}>Loading today's scroll…</div>
        </Panel>
      )}

      {!loading && error && (
        <Panel>
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-2)' }}>
            {t('daily.comingSoon', 'No daily task available yet. Come back tomorrow.')}
          </div>
        </Panel>
      )}

      {!loading && !error && task && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 360px',
            gap: 18,
          }}
        >
          {/* Left column: statement + editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Panel>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <h2 className="font-display" style={{ fontSize: 20, margin: 0 }}>{task.task.title}</h2>
                {task.task.difficulty && task.task.difficulty !== 'TASK_DIFFICULTY_UNSPECIFIED' && (
                  <Badge variant={task.task.difficulty.toLowerCase().includes('hard') ? 'ember' : 'dark'}>
                    {DIFF_LABELS[task.task.difficulty] ?? task.task.difficulty}
                  </Badge>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {task.task.statement}
              </div>
              {task.task.topics.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                  {task.task.topics.map((topic) => (
                    <span key={topic} className="rpg-tweak-chip rpg-tweak-chip--on">{topic}</span>
                  ))}
                </div>
              )}
            </Panel>

            <Panel style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{
                  padding: '6px 12px',
                  background: 'var(--parch-2)',
                  borderBottom: '2px solid var(--ink-0)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
                >
                  solution.{langExt}
                </span>
              </div>
              <Editor
                height={isMobile ? '340px' : '440px'}
                language={task.task.language}
                value={code}
                onChange={(v) => {
                  const next = v ?? ''
                  setCode(next)
                  if (task.task.id) {
                    if (saveDraftTimer.current) clearTimeout(saveDraftTimer.current)
                    saveDraftTimer.current = setTimeout(() => {
                      localStorage.setItem(`daily:code:${task.task.id}`, next)
                    }, 1000)
                  }
                }}
                onMount={handleEditorMount}
                theme={theme === 'dark' ? 'druzya-dark' : 'vs'}
                options={{
                  fontSize: 13,
                  fontFamily: '"JetBrains Mono", monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  padding: { top: 12 },
                }}
              />
            </Panel>

            <RpgButton
              variant="primary"
              onClick={() => void handleSubmit()}
              disabled={reviewing || !code.trim()}
              style={{ width: '100%' }}
            >
              {reviewing ? 'Reviewing…' : t('daily.submit', 'Submit for AI review')}
            </RpgButton>
          </div>

          {/* Right column: AI review */}
          <Panel>
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 8 }}
            >
              mentor ai · review
            </div>
            {review ? (
              <div style={{ fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.6 }}>
                {typeof review === 'string' ? review : (
                  <>
                    {review.summary && <p style={{ marginTop: 0 }}>{review.summary}</p>}
                    {Array.isArray(review.issues) && review.issues.length > 0 && (
                      <>
                        <div
                          className="font-silkscreen uppercase"
                          style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em', marginTop: 12, marginBottom: 4 }}
                        >
                          issues
                        </div>
                        <ul style={{ paddingLeft: 18, margin: 0 }}>
                          {review.issues.map((i: string, idx: number) => <li key={idx}>{i}</li>)}
                        </ul>
                      </>
                    )}
                    {Array.isArray(review.suggestions) && review.suggestions.length > 0 && (
                      <>
                        <div
                          className="font-silkscreen uppercase"
                          style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em', marginTop: 12, marginBottom: 4 }}
                        >
                          suggestions
                        </div>
                        <ul style={{ paddingLeft: 18, margin: 0 }}>
                          {review.suggestions.map((s: string, idx: number) => <li key={idx}>{s}</li>)}
                        </ul>
                      </>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                Submit your solution to receive mentor feedback.
              </div>
            )}
          </Panel>
        </div>
      )}
    </>
  )
}
