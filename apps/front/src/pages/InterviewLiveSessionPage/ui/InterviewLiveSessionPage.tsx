import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Editor, { type Monaco } from '@monaco-editor/react'
import type * as MonacoTypes from 'monaco-editor'
import { useTranslation } from 'react-i18next'
import { Panel, RpgButton, Badge, Modal, usePixelToast } from '@/shared/ui/pixel'
import { Hero, Fireflies } from '@/shared/ui/sprites'
import { PageMeta } from '@/shared/ui/PageMeta'
import { i18n } from '@/shared/i18n'
import { chatWithMentor, type LiveChatMessage } from '@/features/InterviewPrep/api/interviewLiveApi'

type Speaker = 'mentor' | 'you'

interface ChatMessage {
  id: number
  speaker: Speaker
  text: string
  timeAt: string
}

interface ScenarioBriefing {
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  topic: string
  duration: string
  intro: string
  starterQuestion: string
  starterCode: string
  followUps: string[]
  evaluation: string[]
}

const MENTOR_NAME_BY_ID: Record<string, string> = {
  'senior-algorithms': 'Alden the Archivist',
  'system-design': 'Velna of the Towers',
  frontend: 'Oakley the Weaver',
  backend: 'Perrin of the Vaults',
  behavioral: 'Saga the Gentle',
  'mock-on-site': 'The Elder Council',
  new: 'Alden the Archivist',
}

const SCENARIOS: Record<string, ScenarioBriefing> = {
  default: {
    title: 'Connected caverns',
    difficulty: 'medium',
    topic: 'Graphs · BFS',
    duration: '45 min',
    intro:
      "Let's warm up with a graph question. I'll give you the prompt, you walk me through your thinking before you code.",
    starterQuestion:
      'Given an undirected graph of N caverns and an edge list, count how many connected cave groups there are.',
    starterCode: `def count_components(n: int, edges: list[list[int]]) -> int:
    # talk through your approach first,
    # then code once we agree on the plan.
    return 0
`,
    followUps: [
      'What if the graph were directed? Would your approach change?',
      'Can you give me the time complexity in terms of N and E?',
      'How would you parallelise this across workers for N = 10⁸?',
    ],
    evaluation: [
      'Clarifying questions',
      'Correct algorithm choice',
      'Edge cases covered',
      'Complexity analysis',
      'Communication & pacing',
    ],
  },
}

export function InterviewLiveSessionPage() {
  const { sessionId = 'new' } = useParams()
  const navigate = useNavigate()
  // Solo-practice entry: /interview/live/new?mode=solo&focus=algorithms.
  // We honour `focus` for the scenario topic; `mode` itself is purely a
  // UI marker today (no separate backend session yet — see ADR-001).
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const soloFocus = searchParams?.get('focus') ?? null
  const soloMode = searchParams?.get('mode') === 'solo'
  const { toast } = usePixelToast()
  const { t } = useTranslation()

  const mentor = MENTOR_NAME_BY_ID[sessionId] ?? MENTOR_NAME_BY_ID.new
  const focusLabel = soloFocus ? soloFocus.charAt(0).toUpperCase() + soloFocus.slice(1) : null
  const scenario = {
    ...SCENARIOS.default,
    title: soloMode && focusLabel ? `Solo · ${focusLabel}` : t('interviewLive.scenario.title'),
    topic: soloMode && focusLabel ? focusLabel : t('interviewLive.scenario.topic'),
    duration: t('interviewLive.scenario.duration'),
    intro: t('interviewLive.scenario.intro'),
    starterQuestion: t('interviewLive.scenario.question'),
    evaluation: [
      t('interviewLive.rubric.clarifying'),
      t('interviewLive.rubric.algorithm'),
      t('interviewLive.rubric.edgeCases'),
      t('interviewLive.rubric.complexity'),
      t('interviewLive.rubric.communication'),
    ],
    followUps: [
      t('interviewLive.followUps.directedGraph'),
      t('interviewLive.followUps.complexity'),
      t('interviewLive.followUps.parallel'),
    ],
  }

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 1,
      speaker: 'mentor',
      text: t('interviewLive.chat.welcome', { mentor, title: scenario.title, topic: scenario.topic }),
      timeAt: '00:00',
    },
    { id: 2, speaker: 'mentor', text: scenario.intro, timeAt: '00:05' },
    { id: 3, speaker: 'mentor', text: scenario.starterQuestion, timeAt: '00:08' },
  ])
  const [draft, setDraft] = useState('')
  const [code, setCode] = useState(scenario.starterCode)
  const [seconds, setSeconds] = useState(0)
  const [ended, setEnded] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [nudgeCount, setNudgeCount] = useState(0)
  const [mentorTyping, setMentorTyping] = useState(false)
  const nextId = useRef(4)

  useEffect(() => {
    if (ended || paused) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [ended, paused])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  const buildSystemPrompt = (currentCode: string) => {
    const codeBlock = currentCode.trim()
      ? `\n\nCandidate's current code:\n\`\`\`python\n${currentCode.slice(0, 2000)}\n\`\`\``
      : ''
    return `You are ${mentor}, an expert technical interviewer conducting a live coding interview.

Topic: ${scenario.topic}
Problem: ${scenario.title}
Statement: ${scenario.starterQuestion}${codeBlock}

Guidelines:
- Keep responses concise (2–4 sentences)
- Ask probing follow-up questions to test understanding
- Do NOT solve the problem for the candidate
- If the candidate asks for a hint, give a nudge toward the right approach without revealing the solution
- Stay in character as ${mentor}
- Match the language of the candidate's messages (Russian or English)`
  }

  const callMentor = async (currentMessages: ChatMessage[], userText: string, currentCode: string, hintMode = false) => {
    const systemContent = hintMode
      ? buildSystemPrompt(currentCode) + '\n\nThe candidate is explicitly asking for a hint. Give a helpful nudge without revealing the complete solution.'
      : buildSystemPrompt(currentCode)

    const apiMessages: LiveChatMessage[] = [
      { role: 'system', content: systemContent },
      ...currentMessages.map((m) => ({
        role: (m.speaker === 'mentor' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.text,
      })),
      { role: 'user', content: userText },
    ]

    const { reply } = await chatWithMentor(apiMessages)
    return reply
  }

  const send = async () => {
    const text = draft.trim()
    if (!text || mentorTyping) return
    const time = `${mm}:${ss}`

    setMessages((m) => [...m, { id: nextId.current++, speaker: 'you', text, timeAt: time }])
    setDraft('')
    setMentorTyping(true)

    const snapshot = [...messages]
    const currentCode = code
    try {
      const reply = await callMentor(snapshot, text, currentCode)
      setMessages((m) => [...m, { id: nextId.current++, speaker: 'mentor', text: reply, timeAt: `${mm}:${ss}` }])
    } catch (err) {
      // Stay on the page on any failure — previously a 401/5xx triggered the
      // global redirect and silently lost the user's draft. Now we surface
      // the issue inline as a mentor message so the candidate can retry.
      const reason = (err as { response?: { status?: number } })?.response?.status === 401
        ? '⚠️ Сессия истекла. Обнови страницу и войди заново — твой код останется в редакторе.'
        : null
      const used = snapshot.filter((x) => x.speaker === 'mentor').length - 3
      const fallback = reason
        ?? scenario.followUps[used % scenario.followUps.length]
        ?? t('interviewLive.followUps.constraints')
      setMessages((m) => [...m, { id: nextId.current++, speaker: 'mentor', text: fallback, timeAt: `${mm}:${ss}` }])
    } finally {
      setMentorTyping(false)
    }
  }

  const handleMount = (_e: MonacoTypes.editor.IStandaloneCodeEditor, monaco: Monaco) => {
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

  const endSession = () => {
    setShowEndModal(false)
    setEnded(true)
    toast({ kind: 'success', message: t('interviewLive.toast.ended') })
  }

  const requestNudge = async () => {
    if (mentorTyping) return
    const time = `${mm}:${ss}`
    const hintText = t('interviewLive.hint.request')
    const idx = nudgeCount % 3
    setNudgeCount((n) => n + 1)

    setMessages((m) => [...m, { id: nextId.current++, speaker: 'you', text: hintText, timeAt: time }])
    setMentorTyping(true)

    const snapshot = [...messages]
    try {
      const reply = await callMentor(snapshot, hintText, code, true)
      setMessages((m) => [...m, { id: nextId.current++, speaker: 'mentor', text: reply, timeAt: time }])
    } catch {
      setMessages((m) => [
        ...m,
        { id: nextId.current++, speaker: 'mentor', text: t(`interviewLive.hint.response${idx}`), timeAt: time },
      ])
    } finally {
      setMentorTyping(false)
    }
  }

  return (
    <div>
      <PageMeta title={t('interviewLive.meta.title')} description={t('interviewLive.meta.description')} />
      {/* Session header — mentor + timer */}
      <Panel variant="dark" style={{ padding: 0, overflow: 'hidden', marginBottom: 14, position: 'relative' }}>
        <Fireflies count={6} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 180px 1fr',
            alignItems: 'center',
            padding: '14px 20px',
            position: 'relative',
            gap: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 64,
                height: 64,
                background: 'var(--moss-1)',
                border: '3px solid var(--ink-0)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <Hero scale={2} pose="idle" />
            </div>
            <div>
              <div
                className="font-silkscreen uppercase"
                style={{
                  color: 'var(--parch-2)',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  opacity: 0.7,
                }}
              >
                {t('interviewLive.header.mentor')}
              </div>
              <div
                style={{
                  fontFamily: 'Pixelify Sans, monospace',
                  fontSize: 22,
                  color: 'var(--parch-0)',
                  lineHeight: 1.1,
                }}
              >
                {mentor}
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{
                  color: 'var(--ember-3)',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  marginTop: 2,
                }}
              >
                {scenario.topic} · {scenario.difficulty}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              className="font-silkscreen uppercase"
              style={{
                color: 'var(--parch-2)',
                fontSize: 9,
                letterSpacing: '0.08em',
                opacity: 0.7,
              }}
            >
                {t('interviewLive.header.elapsed')}
            </div>
            <div
              style={{
                fontFamily: 'Pixelify Sans, monospace',
                fontSize: 46,
                color: 'var(--ember-3)',
                lineHeight: 1,
              }}
            >
              {mm}:{ss}
            </div>
            <div
              className="font-silkscreen uppercase"
              style={{
                color: 'var(--parch-2)',
                fontSize: 9,
                letterSpacing: '0.08em',
                opacity: 0.7,
                marginTop: 4,
              }}
            >
                {t('interviewLive.header.target', { duration: scenario.duration })}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {paused
                ? <Badge variant="dark">{t('interviewLive.badge.paused')}</Badge>
                : <Badge variant="ember">{t('interviewLive.badge.live')}</Badge>
              }
              <Badge variant="moss">{t('interviewLive.badge.recording')}</Badge>
              <Badge variant="dark">{t('interviewLive.badge.aiPacing')}</Badge>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <RpgButton size="sm" variant="ghost" disabled={ended} onClick={() => setPaused((p) => !p)}>
                {paused ? t('interviewLive.action.resume') : t('interviewLive.action.pause')}
              </RpgButton>
              <RpgButton size="sm" variant="primary" onClick={() => setShowEndModal(true)} disabled={ended}>
                {t('interviewLive.action.finish')}
              </RpgButton>
            </div>
          </div>
        </div>
      </Panel>

      {/* Chat + editor */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr 220px',
          gap: 14,
        }}
      >
        {/* Chat */}
        <Panel style={{ display: 'flex', flexDirection: 'column', height: 560, padding: 14 }}>
          <div
            className="font-silkscreen uppercase"
            style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 8 }}
          >
            {t('interviewLive.panel.dialogue')}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
            {messages.map((m) => (
              <Bubble key={m.id} msg={m} mentorName={mentor} />
            ))}
            {mentorTyping && (
              <div style={{ marginBottom: 10 }}>
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 9, color: 'var(--ember-1)', letterSpacing: '0.08em', marginBottom: 3 }}
                >
                  {mentor}
                </div>
                <div
                  style={{
                    padding: '8px 10px',
                    background: 'var(--parch-0)',
                    border: '2px solid var(--ink-0)',
                    borderLeft: '6px solid var(--ember-1)',
                    fontSize: 18,
                    color: 'var(--ember-2)',
                    letterSpacing: '0.2em',
                  }}
                >
                  •••
                </div>
              </div>
            )}
            {ended && (
              <div
                className="rpg-panel rpg-panel--recessed"
                style={{ padding: 12, marginTop: 12 }}
              >
                <div
                  className="font-silkscreen uppercase"
                  style={{
                    fontSize: 10,
                    color: 'var(--ember-1)',
                    letterSpacing: '0.08em',
                    marginBottom: 4,
                  }}
                >
                  {t('interviewLive.summary.ended')}
                </div>
                <div style={{ fontSize: 13 }}>
                  {t('interviewLive.summary.body')} <strong>{t('interviewLive.summary.scorePending')}</strong>.
                </div>
                <RpgButton
                  size="sm"
                  style={{ marginTop: 10 }}
                  onClick={() => navigate('/interview')}
                >
                  {t('interviewLive.summary.back')}
                </RpgButton>
              </div>
            )}
          </div>
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              gap: 6,
              alignItems: 'flex-end',
            }}
          >
            <textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder={ended ? t('interviewLive.input.ended') : t('interviewLive.input.placeholder')}
              disabled={ended}
              style={{
                flex: 1,
                fontFamily: 'IBM Plex Sans, system-ui',
                fontSize: 13,
                padding: 10,
                background: 'var(--parch-2)',
                border: '3px solid var(--ink-0)',
                boxShadow: 'inset 2px 2px 0 var(--parch-3), inset -2px -2px 0 var(--parch-0)',
                resize: 'none',
                outline: 'none',
                color: 'var(--ink-0)',
              }}
            />
            <RpgButton variant="primary" onClick={send} disabled={ended || !draft.trim() || mentorTyping}>
              {t('interviewLive.action.send')}
            </RpgButton>
          </div>
        </Panel>

        {/* Editor */}
        <Panel variant="dark" style={{ padding: 0, overflow: 'hidden', height: 560 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: '#1a140e',
              borderBottom: '2px solid var(--ink-0)',
            }}
          >
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--parch-2)', letterSpacing: '0.08em' }}
            >
              {t('interviewLive.editor.file')}
            </span>
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--moss-2)', letterSpacing: '0.08em' }}
            >
              {t('interviewLive.editor.live')}
            </span>
          </div>
          <div style={{ height: 516 }}>
            <Editor
              language="python"
              value={code}
              onChange={(v) => setCode(v ?? '')}
              onMount={handleMount}
              theme="druz9-dark"
              options={{
                fontSize: 13,
                fontFamily: 'JetBrains Mono, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
                readOnly: ended,
              }}
            />
          </div>
        </Panel>

        {/* Session rubric */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Panel variant="tight">
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 8 }}
            >
              {t('interviewLive.panel.rubric')}
            </div>
            {scenario.evaluation.map((label) => (
              <div key={label} className="rpg-quest" style={{ marginBottom: 6 }}>
                <div className="rpg-quest__check" />
                <div style={{ flex: 1, fontSize: 12 }}>{label}</div>
              </div>
            ))}
          </Panel>

          <Panel variant="tight">
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 8 }}
            >
              {t('interviewLive.panel.hints')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 8 }}>
              {t('interviewLive.panel.hintsBody')}
            </div>
            <RpgButton size="sm" variant="ghost" disabled={ended || mentorTyping} onClick={requestNudge}>
              {t('interviewLive.action.nudge')}
            </RpgButton>
          </Panel>

          <Panel variant="tight">
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 8 }}
            >
              {t('interviewLive.panel.shortcuts')}
            </div>
            <KeyRow k="Enter" label={t('interviewLive.shortcut.send')} />
            <KeyRow k="Shift + ⏎" label={t('interviewLive.shortcut.newline')} />
            <KeyRow k="Ctrl + /" label={t('interviewLive.shortcut.comment')} />
            <KeyRow k="Ctrl + S" label={t('interviewLive.shortcut.save')} />
          </Panel>
        </div>
      </div>

      <Modal open={showEndModal} onClose={() => setShowEndModal(false)}>
        <div style={{ padding: 24, minWidth: 300 }}>
          <div
            className="font-silkscreen uppercase"
            style={{ fontSize: 12, color: 'var(--ember-1)', letterSpacing: '0.08em', marginBottom: 12 }}
          >
            {t('interviewLive.modal.finish.title')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-1)', marginBottom: 20, lineHeight: 1.5 }}>
            {t('interviewLive.modal.finish.body')}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <RpgButton size="sm" variant="ghost" onClick={() => setShowEndModal(false)}>
              {t('interviewLive.modal.finish.cancel')}
            </RpgButton>
            <RpgButton size="sm" variant="primary" onClick={endSession}>
              {t('interviewLive.modal.finish.confirm')}
            </RpgButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Bubble({ msg, mentorName }: { msg: ChatMessage; mentorName: string }) {
  const isMentor = msg.speaker === 'mentor'
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        className="font-silkscreen uppercase"
        style={{
          fontSize: 9,
          color: isMentor ? 'var(--ember-1)' : 'var(--moss-1)',
          letterSpacing: '0.08em',
          marginBottom: 3,
        }}
      >
        {isMentor ? mentorName : i18n.t('interviewLive.chat.you')} · {msg.timeAt}
      </div>
      <div
        style={{
          padding: '8px 10px',
          background: isMentor ? 'var(--parch-0)' : 'var(--parch-2)',
          border: '2px solid var(--ink-0)',
          borderLeft: `6px solid ${isMentor ? 'var(--ember-1)' : 'var(--moss-1)'}`,
          fontSize: 13,
          lineHeight: 1.4,
          whiteSpace: 'pre-wrap',
        }}
      >
        {msg.text}
      </div>
    </div>
  )
}

function KeyRow({ k, label }: { k: string; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 0',
        borderBottom: '1px dashed var(--ink-3)',
      }}
    >
      <span
        className="font-silkscreen uppercase"
        style={{
          fontSize: 9,
          color: 'var(--ink-0)',
          border: '2px solid var(--ink-0)',
          padding: '2px 6px',
          letterSpacing: '0.08em',
          background: 'var(--parch-2)',
        }}
      >
        {k}
      </span>
      <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{label}</span>
    </div>
  )
}
