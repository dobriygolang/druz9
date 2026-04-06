import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Play, Check, X, ChevronDown, Wifi, WifiOff, Sparkles, Share2, Bot, Pencil, Bell, BellOff, Sun, Moon, EyeOff, Eye } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi'
import { useCodeRoomWs } from '@/features/CodeRoom/hooks/useCodeRoomWs'
import { useAuth } from '@/app/providers/AuthProvider'
import { useTheme } from '@/app/providers/ThemeProvider'
import type { Room } from '@/entities/CodeRoom/model/types'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Avatar } from '@/shared/ui/Avatar'
import { getMonacoLanguage, getLanguageLabel } from '@/shared/lib/codeEditorLanguage'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import { apiClient } from '@/shared/api/base'
import type * as Monaco from 'monaco-editor'

/* ─── Solo draft storage (LRU, max 10 tasks) ─── */
const SOLO_DRAFT_MAX = 10
const SOLO_DRAFT_INDEX_KEY = 'solo:drafts:index'

function getSoloDraft(taskId: string): string | null {
  return localStorage.getItem(`solo:code:${taskId}`)
}

function setSoloDraft(taskId: string, code: string) {
  localStorage.setItem(`solo:code:${taskId}`, code)
  const prev: string[] = JSON.parse(localStorage.getItem(SOLO_DRAFT_INDEX_KEY) ?? '[]')
  const next = [taskId, ...prev.filter(id => id !== taskId)].slice(0, SOLO_DRAFT_MAX)
  prev.filter(id => !next.includes(id)).forEach(id => localStorage.removeItem(`solo:code:${id}`))
  localStorage.setItem(SOLO_DRAFT_INDEX_KEY, JSON.stringify(next))
}

/* ─── Remote cursor helpers ─── */
const CURSOR_COLORS = ['#f97316', '#06b6d4', '#8b5cf6', '#10b981', '#f43f5e', '#eab308']

function getCursorColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
}

/* WS status (lowercase) → Room status (protobuf-style) */
const WS_STATUS_MAP: Record<string, string> = {
  waiting: 'ROOM_STATUS_WAITING',
  active: 'ROOM_STATUS_ACTIVE',
  finished: 'ROOM_STATUS_FINISHED',
}

const injectedCursorStyles = new Set<string>()
function injectCursorCSS(safeId: string, hex: string) {
  if (injectedCursorStyles.has(safeId)) return
  injectedCursorStyles.add(safeId)
  const [r, g, b] = [hex.slice(1,3), hex.slice(3,5), hex.slice(5,7)].map(h => parseInt(h, 16))
  const style = document.createElement('style')
  style.textContent = [
    // Selection highlight only (no full-line background)
    `.remote-sel-${safeId}{background:rgba(${r},${g},${b},0.25);}`,
  ].join('')
  document.head.appendChild(style)
}

/** OT-style cursor offset transform: shifts cursor when text changes before it */
function transformCursorOffset(offset: number, oldCode: string, newCode: string): number {
  if (oldCode === newCode) return offset
  let start = 0
  const minLen = Math.min(oldCode.length, newCode.length)
  while (start < minLen && oldCode[start] === newCode[start]) start++
  if (offset <= start) return offset
  let oldTail = oldCode.length
  let newTail = newCode.length
  while (oldTail > start && newTail > start && oldCode[oldTail - 1] === newCode[newTail - 1]) { oldTail--; newTail-- }
  const deleted = oldTail - start
  const inserted = newTail - start
  if (offset < start + deleted) return start + inserted
  return offset - deleted + inserted
}

/** posRef is mutable — update it and call layoutContentWidget instead of re-adding */
function buildCursorWidget(
  userId: string,
  displayName: string,
  color: string,
  posRef: { line: number; col: number },
  monaco: typeof Monaco,
): Monaco.editor.IContentWidget {
  const domNode = document.createElement('div')
  domNode.style.cssText = 'position:relative;width:0;height:0;overflow:visible;pointer-events:none;'

  const bar = document.createElement('div')
  bar.style.cssText = `position:absolute;top:0;left:-1px;width:2px;height:18px;background:${color};pointer-events:none;z-index:20;`

  const chip = document.createElement('div')
  chip.textContent = displayName
  // top:-16px: chip height = line-height(14) + padding-v(2) = 16px → bottom edge sits exactly on the bar's top
  chip.style.cssText = `position:absolute;top:-16px;left:-1px;background:${color};color:#fff;font-size:10px;line-height:14px;padding:1px 5px;border-radius:3px 3px 3px 0;font-weight:600;white-space:nowrap;font-family:sans-serif;pointer-events:none;z-index:21;`

  domNode.appendChild(chip)
  domNode.appendChild(bar)

  return {
    getId: () => `remote-cursor-${userId}`,
    getDomNode: () => domNode,
    getPosition: () => ({
      position: { lineNumber: posRef.line, column: posRef.col },
      preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
    }),
  }
}

const LANGUAGES = [
  { value: 'python', label: 'Python 3' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
]

const AI_HINTS = [
  'Подумайте о граничных случаях',
  'Рассмотрите временную сложность вашего решения',
  'Попробуйте разбить задачу на подзадачи',
]

const STATUS_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  ROOM_STATUS_WAITING: { label: 'Ожидание', variant: 'warning' },
  ROOM_STATUS_ACTIVE: { label: 'Активна', variant: 'success' },
  ROOM_STATUS_FINISHED: { label: 'Завершена', variant: 'default' },
}

function GuestNamePrompt({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('')
  return (
    <div className="flex items-center justify-center h-screen bg-[#F2F3F0]">
      <div className="bg-white rounded-2xl border border-[#CBCCC9] p-8 w-full max-w-sm flex flex-col gap-4">
        <h2 className="text-lg font-bold text-[#111111]">Введите ваше имя</h2>
        <p className="text-sm text-[#666666]">Чтобы присоединиться к комнате, укажите как вас зовут.</p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ваше имя"
          className="w-full px-4 py-2.5 bg-[#F2F3F0] border border-[#CBCCC9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSubmit(name.trim()) }}
          autoFocus
        />
        <button
          onClick={() => name.trim() && onSubmit(name.trim())}
          disabled={!name.trim()}
          className="w-full py-2.5 bg-[#6366F1] hover:bg-[#4F46E5] text-[#0f172a] font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          Войти в комнату
        </button>
      </div>
    </div>
  )
}

export function CodeRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [room, setRoom] = useState<Room | null>(null)
  const [localCode, setLocalCode] = useState('')
  const [running, setRunning] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ isCorrect: boolean; output: string; error: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'problem' | 'tests'>('problem')
  const [aiTab, setAiTab] = useState<'hints' | 'result' | 'review'>('hints')
  const [hints, setHints] = useState<string[]>([])
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiReview, setAiReview] = useState<string | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewPrompt, setReviewPrompt] = useState('')
  const [copied, setCopied] = useState(false)
  const [needsGuestName, setNeedsGuestName] = useState(false)
  const [taskStatement, setTaskStatement] = useState('')
  const [showTaskEditor, setShowTaskEditor] = useState(false)
  const [editTaskTitle, setEditTaskTitle] = useState('')
  const [editTaskStatement, setEditTaskStatement] = useState('')
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string }>>([])
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [showLangDropdown, setShowLangDropdown] = useState(false)
  const [togglingPrivacy, setTogglingPrivacy] = useState(false)
  const [leftWidth, setLeftWidth] = useState(300)
  const isResizingLeft = useRef(false)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)
  const decorationsRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null)
  const widgetsRef = useRef<Map<string, Monaco.editor.IContentWidget>>(new Map())
  const prevParticipantIdsRef = useRef<Set<string>>(new Set())
  const guestNameRef = useRef(typeof window !== 'undefined' ? localStorage.getItem('guestCodeRoomName') ?? undefined : undefined)
  const skipNextWsUpdate = useRef(false)
  const isApplyingRemoteCode = useRef(false)
  const lastCursorRef = useRef({ line: 1, col: 1 })
  const isCreatorRef = useRef(false)
  const taskState = (location.state as { starterCode?: string; taskId?: string } | null)
  const soloDraftTaskId = taskState?.taskId ?? null
  const soloDraft = soloDraftTaskId ? getSoloDraft(soloDraftTaskId) : null
  const starterCodeRef = useRef(soloDraft ?? taskState?.starterCode ?? '')
  const sentStarterCode = useRef(false)
  const saveDraftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Mutable cursor positions for remote users — updated in-place, no widget re-add needed
  const cursorPositionsRef = useRef<Map<string, { line: number; col: number }>>(new Map())
  // Tracks the last-known local code value so handleCodeChange can compute an OT delta
  const prevLocalCodeRef = useRef('')

  // Left panel resize
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizingLeft.current) return
      setLeftWidth(w => Math.max(200, Math.min(600, w + e.movementX)))
    }
    const onUp = () => { isResizingLeft.current = false; document.body.style.cursor = '' }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // Check if guest name is needed
  useEffect(() => {
    if (!user && !guestNameRef.current) {
      setNeedsGuestName(true)
    }
  }, [user])

  const handleGuestNameSubmit = (name: string) => {
    localStorage.setItem('guestCodeRoomName', name)
    guestNameRef.current = name
    setNeedsGuestName(false)
  }

  const copyInviteLink = () => {
    const url = `${window.location.origin}/code-rooms/${roomId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleTogglePrivacy = async () => {
    if (!roomId || !room || togglingPrivacy) return
    const newValue = !room.isPrivate
    setTogglingPrivacy(true)
    try {
      await codeRoomApi.updateRoomPrivacy(roomId, newValue)
      setRoom(prev => prev ? { ...prev, isPrivate: newValue } : prev)
    } catch {} finally { setTogglingPrivacy(false) }
  }

  const addNotification = useCallback((text: string) => {
    if (!notificationsEnabled) return
    const id = Math.random().toString(36).slice(2)
    setNotifications(prev => [...prev.slice(-4), { id, text }])
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000)
  }, [notificationsEnabled])

  // WebSocket realtime
  const ws = useCodeRoomWs({
    roomId,
    userId: user?.id,
    displayName: user?.firstName ?? guestNameRef.current ?? 'Guest',
    guestName: guestNameRef.current,
    enabled: !!roomId && !needsGuestName,
    initialLanguage: getMonacoLanguage((location.state as { language?: string } | null)?.language ?? ''),
    onLeave: useCallback((_userId: string, displayName: string) => {
      addNotification(`${displayName} покинул(-а) комнату`)
    }, [addNotification]),
    onBehaviorEvent: useCallback((_userId: string, displayName: string, event: import('@/features/CodeRoom/hooks/useCodeRoomWs').BehaviorEventType) => {
      if (!isCreatorRef.current) return
      if (event === 'tab_hidden') addNotification(`⚠️ ${displayName} скрыл(-а) вкладку`)
      else if (event === 'tab_visible') addNotification(`${displayName} вернулся(-ась)`)
      else if (event === 'pasted') addNotification(`⚠️ ${displayName} вставил(-а) код`)
    }, [addNotification]),
    onCursorUpdate: useCallback((userId: string, line: number, col: number) => {
      // Runs synchronously in the WS message handler — no RAF, no React render cycle
      const posRef = cursorPositionsRef.current.get(userId)
      if (posRef && widgetsRef.current.has(userId)) {
        posRef.line = line
        posRef.col = col
        editorRef.current?.layoutContentWidget(widgetsRef.current.get(userId)!)
      }
    }, []),
  })

  // Fetch initial room data via REST
  useEffect(() => {
    if (!roomId || needsGuestName) return
    const state = location.state as { title?: string; statement?: string; starterCode?: string; language?: string; taskId?: string } | null
    codeRoomApi.getRoom(roomId, guestNameRef.current)
      .then(r => {
        if (state?.title && !r.task) r = { ...r, task: state.title }
        setRoom(r)
        if (state?.statement) setTaskStatement(state.statement)
        // Prefer saved draft > starter code from state > server code
        const draft = state?.taskId ? getSoloDraft(state.taskId) : null
        const initCode = draft ?? state?.starterCode ?? r.code ?? ''
        if (initCode) { setLocalCode(initCode); prevLocalCodeRef.current = initCode }
      })
      .catch(() => navigate('/practice/code-rooms'))
  }, [roomId, needsGuestName])

  // Sync WebSocket code -> local (remote changes), preserve local cursor position
  useEffect(() => {
    if (!ws.code || skipNextWsUpdate.current) {
      skipNextWsUpdate.current = false
      return
    }
    skipNextWsUpdate.current = false
    if (starterCodeRef.current && !sentStarterCode.current) return
    const editor = editorRef.current
    const model = editor?.getModel()
    if (model && model.getValue() !== ws.code) {
      const oldCode = model.getValue()
      const pos = editor!.getPosition()
      const sel = editor!.getSelection()
      const localCursorOffset = pos ? model.getOffsetAt(pos) : null
      const localSelStart = sel ? model.getOffsetAt({ lineNumber: sel.startLineNumber, column: sel.startColumn }) : null
      const localSelEnd = sel ? model.getOffsetAt({ lineNumber: sel.endLineNumber, column: sel.endColumn }) : null

      isApplyingRemoteCode.current = true
      model.setValue(ws.code)
      isApplyingRemoteCode.current = false

      if (localCursorOffset !== null) {
        const newOffset = transformCursorOffset(localCursorOffset, oldCode, ws.code)
        editor!.setPosition(model.getPositionAt(Math.min(newOffset, ws.code.length)))
      }
      if (localSelStart !== null && localSelEnd !== null) {
        const newStart = transformCursorOffset(localSelStart, oldCode, ws.code)
        const newEnd = transformCursorOffset(localSelEnd, oldCode, ws.code)
        const s = model.getPositionAt(Math.min(newStart, ws.code.length))
        const e = model.getPositionAt(Math.min(newEnd, ws.code.length))
        editor!.setSelection({ startLineNumber: s.lineNumber, startColumn: s.column, endLineNumber: e.lineNumber, endColumn: e.column })
      }
      // Remote cursors are driven exclusively by awareness messages — no OT transform here
    }
    setLocalCode(ws.code)
    prevLocalCodeRef.current = ws.code
  }, [ws.code])

  // Push starter code once snapshot arrives, overriding whatever the server has
  useEffect(() => {
    if (!ws.gotSnapshot || sentStarterCode.current || !starterCodeRef.current) return
    sentStarterCode.current = true
    if (ws.code === starterCodeRef.current) return // already correct, no resend needed
    const model = editorRef.current?.getModel()
    if (model) model.setValue(starterCodeRef.current)
    setLocalCode(starterCodeRef.current)
    ws.sendUpdate(starterCodeRef.current) // always push — model readiness is irrelevant
  }, [ws.gotSnapshot, ws.sendUpdate])

  // Update room from room_update WS message (fired on join/leave/status change)
  useEffect(() => {
    if (!ws.lastRoomUpdate) return
    const update = ws.lastRoomUpdate as {
      status?: string
      participants?: Array<{ id: string; displayName: string; userId?: string; isGuest?: boolean; isReady?: boolean; joinedAt?: string }>
    }

    // Detect new participants and notify
    if (update.participants) {
      const myId = user?.id ?? guestNameRef.current ?? ''
      update.participants.forEach(p => {
        const pid = p.id || p.userId || ''
        if (!prevParticipantIdsRef.current.has(pid) && prevParticipantIdsRef.current.size > 0 && pid !== myId) {
          addNotification(`${p.displayName} присоединился(-ась) к комнате`)
        }
      })
      prevParticipantIdsRef.current = new Set(update.participants.map(p => p.id || p.userId || ''))
    }

    setRoom(prev => {
      if (!prev) return prev
      const mappedStatus = update.status ? (WS_STATUS_MAP[update.status] ?? update.status) : undefined
      const mappedParticipants = update.participants?.map(p => ({
        userId: p.userId ?? '',
        name: p.displayName ?? '',
        isGuest: p.isGuest ?? false,
        isReady: p.isReady ?? false,
        isWinner: false,
        joinedAt: p.joinedAt ?? '',
        isCreator: p.userId === prev.creatorId,
      }))
      return {
        ...prev,
        ...(mappedStatus ? { status: mappedStatus as Room['status'] } : {}),
        ...(mappedParticipants ? { participants: mappedParticipants } : {}),
      }
    })
  }, [ws.lastRoomUpdate])

  // Keep isCreatorRef in sync for use inside callbacks
  const isCreator = !!user && !!room && (user.id === room.creatorId || room.participants.some(p => p.userId === user.id && p.isCreator))
  useEffect(() => { isCreatorRef.current = isCreator }, [isCreator])

  // Auto-start room: creator's connection triggers waiting→active transition
  const startedRoomRef = useRef(false)
  useEffect(() => {
    if (!ws.connected || !isCreator || startedRoomRef.current) return
    if (room?.status === 'ROOM_STATUS_ACTIVE' || room?.status === 'ROOM_STATUS_FINISHED') return
    startedRoomRef.current = true
    codeRoomApi.startRoom(roomId!).catch((err) => { startedRoomRef.current = false; console.error('Failed to start room:', err) })
  }, [ws.connected, isCreator, room?.status, roomId])

  // Tab visibility anti-cheat tracking
  useEffect(() => {
    if (!ws.connected) return
    const handler = () => {
      ws.sendAwareness(
        lastCursorRef.current.line,
        lastCursorRef.current.col,
        undefined,
        { tabHidden: document.hidden },
      )
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [ws.connected, ws.sendAwareness])

  // Remote cursor widgets — update mutable posRef in-place (no remove/re-add = no flicker)
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return

    // Remove widgets for users who left
    const presentIds = new Set(ws.awareness.keys())
    widgetsRef.current.forEach((widget, userId) => {
      if (!presentIds.has(userId)) {
        editor.removeContentWidget(widget)
        widgetsRef.current.delete(userId)
        cursorPositionsRef.current.delete(userId)
      }
    })

    const newDecorations: Monaco.editor.IModelDeltaDecoration[] = []

    ws.awareness.forEach((state) => {
      if (!state.cursorLine) return
      const color = getCursorColor(state.userId)
      const safeId = state.userId.replace(/[^a-z0-9]/gi, '_')
      injectCursorCSS(safeId, color)
      const col = state.cursorColumn ?? 1

      const existingPos = cursorPositionsRef.current.get(state.userId)
      if (existingPos && widgetsRef.current.has(state.userId)) {
        // Mutate posRef so getPosition() returns new coords, then re-layout without re-adding
        existingPos.line = state.cursorLine
        existingPos.col = col
        editor.layoutContentWidget(widgetsRef.current.get(state.userId)!)
      } else {
        const posRef = { line: state.cursorLine, col }
        cursorPositionsRef.current.set(state.userId, posRef)
        const widget = buildCursorWidget(state.userId, state.displayName, color, posRef, monaco)
        editor.addContentWidget(widget)
        widgetsRef.current.set(state.userId, widget)
      }

      newDecorations.push({
        range: new monaco.Range(state.cursorLine, col, state.cursorLine, col),
        options: { overviewRuler: { color, position: monaco.editor.OverviewRulerLane.Right } },
      })
      if (
        state.selStartLine && state.selEndLine &&
        !(state.selStartLine === state.selEndLine && (state.selStartCol ?? 1) === (state.selEndCol ?? 1))
      ) {
        newDecorations.push({
          range: new monaco.Range(state.selStartLine, state.selStartCol ?? 1, state.selEndLine, state.selEndCol ?? 1),
          options: { className: `remote-sel-${safeId}`, isWholeLine: false },
        })
      }
    })

    if (decorationsRef.current) {
      decorationsRef.current.set(newDecorations)
    } else {
      decorationsRef.current = editor.createDecorationsCollection(newDecorations)
    }
    // No cleanup on re-run — managed by cursorPositionsRef; only unmount cleans up
  }, [ws.awareness])

  // Unmount cleanup for remote cursor widgets
  useEffect(() => () => {
    const editor = editorRef.current
    widgetsRef.current.forEach(w => editor?.removeContentWidget(w))
    widgetsRef.current.clear()
    cursorPositionsRef.current.clear()
  }, [])

  // Sync WebSocket submission results
  useEffect(() => {
    if (ws.lastSubmission) {
      setSubmitResult(ws.lastSubmission)
      setAiTab('result')
      setShowAiPanel(true)
    }
  }, [ws.lastSubmission])

  const handleCodeChange = useCallback((value: string | undefined) => {
    if (isApplyingRemoteCode.current) return
    const oldCode = prevLocalCodeRef.current
    const v = value ?? ''
    prevLocalCodeRef.current = v
    setLocalCode(v)
    skipNextWsUpdate.current = true
    ws.sendUpdate(v)

    // OT-transform remote cursor positions so they follow local typing smoothly.
    // The main source of jumping was onDidChangeCursorSelection firing during model.setValue
    // (which sent bogus (1,1) awareness). That's now suppressed. OT here is safe.
    if (cursorPositionsRef.current.size > 0 && oldCode !== v) {
      const editor = editorRef.current
      const model = editor?.getModel()
      if (model) {
        cursorPositionsRef.current.forEach((posRef, userId) => {
          const lines = oldCode.split('\n')
          let offset = 0
          for (let i = 0; i < posRef.line - 1 && i < lines.length; i++) offset += lines[i].length + 1
          offset = Math.min(offset + posRef.col - 1, oldCode.length)
          let start = 0
          const minLen = Math.min(oldCode.length, v.length)
          while (start < minLen && oldCode[start] === v[start]) start++
          if (offset > start) {
            let oldTail = oldCode.length; let newTail = v.length
            while (oldTail > start && newTail > start && oldCode[oldTail - 1] === v[newTail - 1]) { oldTail--; newTail-- }
            const deleted = oldTail - start; const inserted = newTail - start
            if (offset >= start + deleted) offset = offset - deleted + inserted
            else offset = start + inserted
          }
          const newPos = model.getPositionAt(Math.min(offset, v.length))
          posRef.line = newPos.lineNumber
          posRef.col = newPos.column
          const widget = widgetsRef.current.get(userId)
          if (widget) editor!.layoutContentWidget(widget)
        })
      }
    }

    if (soloDraftTaskId) {
      if (saveDraftTimer.current) clearTimeout(saveDraftTimer.current)
      saveDraftTimer.current = setTimeout(() => setSoloDraft(soloDraftTaskId, v), 1000)
    }
  }, [ws.sendUpdate, soloDraftTaskId])

  const handleRun = async () => {
    if (!roomId) return
    setRunning(true)
    setSubmitResult(null)
    try {
      const result = await codeRoomApi.submitCode(roomId, localCode, guestNameRef.current)
      setSubmitResult(result)
      setAiTab('result')
      setShowAiPanel(true)
    } catch {} finally { setRunning(false) }
  }

  const handleAiReview = () => {
    if (showAiPanel) {
      setShowAiPanel(false)
      return
    }
    setShowAiPanel(true)
    setAiTab('review')
  }

  const handleRunReview = async (customPrompt?: string) => {
    setReviewLoading(true)
    setAiReview(null)
    try {
      const res = await apiClient.post('/api/v1/code-editor/ai-review', {
        language: lang,
        code: localCode,
        task_title: room?.task ?? '',
        statement: customPrompt || (room?.task ? `Реши задачу: ${room.task}` : ''),
      })
      const data = res.data
      // The response is an object {provider, model, score, summary, strengths, issues, followUpQuestions}
      // Render it properly as a formatted string
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const parts: string[] = []
        if (data.summary) parts.push(`📋 ${data.summary}`)
        if (data.score !== undefined) parts.push(`⭐ Оценка: ${data.score}/10`)
        if (data.strengths?.length) parts.push(`✅ Плюсы:\n${data.strengths.map((s: string) => `• ${s}`).join('\n')}`)
        if (data.issues?.length) parts.push(`⚠️ Замечания:\n${data.issues.map((i: string) => `• ${i}`).join('\n')}`)
        if (data.followUpQuestions?.length) parts.push(`❓ Вопросы:\n${data.followUpQuestions.map((q: string) => `• ${q}`).join('\n')}`)
        setAiReview(parts.join('\n\n') || JSON.stringify(data, null, 2))
      } else {
        setAiReview(String(data?.review ?? data?.feedback ?? data ?? 'Нет данных'))
      }
    } catch {
      setAiReview('Не удалось получить ревью. Попробуйте позже.')
    } finally {
      setReviewLoading(false)
    }
  }

  const openTaskEditor = () => {
    setEditTaskTitle(room?.task ?? '')
    setEditTaskStatement(taskStatement)
    setShowTaskEditor(true)
  }

  const saveTask = () => {
    const title = editTaskTitle.trim()
    const stmt = editTaskStatement.trim()
    setRoom(prev => prev ? { ...prev, task: title } : prev)
    setTaskStatement(stmt)
    setShowTaskEditor(false)
    if (roomId) codeRoomApi.updateRoomTask(roomId, title, stmt)
  }

  // Sync Monaco theme when room theme changes
  useEffect(() => {
    const monaco = monacoRef.current
    if (!monaco) return
    monaco.editor.setTheme(theme === 'dark' ? 'druzya-dark' : 'vs')
  }, [theme])

  const handleEditorMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    registerDarkTheme(monaco)
    monaco.editor.setTheme(theme === 'dark' ? 'druzya-dark' : 'vs')

    // Send cursor + selection awareness, track last known position
    // Throttle to ~30ms with trailing edge so the LAST position is always sent
    let cursorThrottleTimer: ReturnType<typeof setTimeout> | null = null
    let pendingCursorUpdate: (() => void) | null = null

    editor.onDidChangeCursorSelection((e) => {
      // Suppress awareness during model.setValue (remote code application):
      // Monaco resets cursor to (1,1) on setValue which would broadcast a bogus
      // position and make remote users see the cursor jump on every keystroke.
      if (isApplyingRemoteCode.current) return
      const sel = e.selection
      lastCursorRef.current = { line: sel.positionLineNumber, col: sel.positionColumn }
      const hasSelection = !(
        sel.startLineNumber === sel.endLineNumber &&
        sel.startColumn === sel.endColumn
      )

      const send = () => {
        ws.sendAwareness(
          sel.positionLineNumber,
          sel.positionColumn,
          hasSelection ? {
            startLine: sel.startLineNumber,
            startCol: sel.startColumn,
            endLine: sel.endLineNumber,
            endCol: sel.endColumn,
          } : undefined,
        )
      }

      // If no throttle active, send immediately and start cooldown
      if (!cursorThrottleTimer) {
        send()
        cursorThrottleTimer = setTimeout(() => {
          // Fire trailing edge if a newer update arrived during cooldown
          if (pendingCursorUpdate) {
            pendingCursorUpdate()
            pendingCursorUpdate = null
          }
          cursorThrottleTimer = null
        }, 30)
      } else {
        // Store the latest update to fire on trailing edge
        pendingCursorUpdate = send
      }
    })

    // Detect paste → anti-cheat signal
    editor.onDidPaste(() => {
      if (!isCreatorRef.current) {
        ws.sendAwareness(lastCursorRef.current.line, lastCursorRef.current.col, undefined, { pastedCode: true })
        // Clear the flag after a short delay so it can fire again
        setTimeout(() => {
          ws.sendAwareness(lastCursorRef.current.line, lastCursorRef.current.col, undefined, { pastedCode: false })
        }, 2000)
      }
    })
  }, [ws.sendAwareness])

  if (needsGuestName) {
    return <GuestNamePrompt onSubmit={handleGuestNameSubmit} />
  }

  const lang = ws.language || 'python'
  const status = room ? (STATUS_LABELS[room.status] ?? { label: room.status, variant: 'default' as const }) : null

  return (
    <div className="flex flex-col h-screen bg-[#F2F3F0] dark:bg-[#0d1117] overflow-hidden">
      {/* Top bar */}
      <header className="h-[52px] bg-white dark:bg-[#161c2d] border-b border-[#CBCCC9] dark:border-[#1e3158] flex items-center justify-between px-5 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/practice/code-rooms')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236] text-[#666666] dark:text-[#94a3b8]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-bold text-[#0f172a] dark:text-[#e2e8f0]">{room?.task || 'Code Room'}</p>
            <div className="flex items-center gap-2">
              {status && <Badge variant={status.variant}>{status.label}</Badge>}
              {ws.connected ? (
                <span className="flex items-center gap-1 text-[10px] text-[#22c55e]">
                  <Wifi className="w-3 h-3" /> Live
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-[#94a3b8]">
                  <WifiOff className="w-3 h-3" /> Offline
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Realtime participants from awareness */}
          {Array.from(ws.awareness.values()).map(a => (
            <div key={a.userId} className="relative" title={a.displayName}>
              <Avatar name={a.displayName} size="xs" />
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                style={{ background: getCursorColor(a.userId) }}
              />
            </div>
          ))}
          {room?.participants
            .filter(p => !ws.awareness.has(p.userId || p.name))
            .map(p => (
              <Avatar key={p.userId || p.name} name={p.name} size="xs" className="opacity-40" />
            ))}

          {/* Theme toggle — available to all */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236] text-[#666666] dark:text-[#94a3b8] transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-[#fbbf24]" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Copy invite link */}
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#666666] dark:text-[#4d6380] hover:text-[#111111] dark:hover:text-[#c8d8ec] hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236] rounded-lg transition-colors"
            title="Скопировать ссылку-приглашение"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Скопировано' : 'Пригласить'}</span>
          </button>

          {isCreator && (
            <button
              onClick={handleTogglePrivacy}
              disabled={togglingPrivacy}
              title={room?.isPrivate ? 'Сделать публичной' : 'Сделать приватной'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-50 ${room?.isPrivate ? 'text-[#6366F1] hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236]' : 'text-[#94a3b8] hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236]'}`}
            >
              {room?.isPrivate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{room?.isPrivate ? 'Приватная' : 'Публичная'}</span>
            </button>
          )}
          {isCreator && (
            <button
              onClick={() => setNotificationsEnabled(v => !v)}
              title={notificationsEnabled ? 'Выключить уведомления' : 'Включить уведомления'}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${notificationsEnabled ? 'text-[#6366F1] hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236]' : 'text-[#94a3b8] hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236]'}`}
            >
              {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={handleAiReview} loading={reviewLoading}>
            <Bot className="w-3.5 h-3.5" /> AI Ревью
          </Button>
          <Button variant="secondary" size="sm" onClick={handleRun} loading={running}>
            <Play className="w-3.5 h-3.5" /> Запустить
          </Button>
        </div>
      </header>

      {/* 3-panel layout */}
      <div className="flex flex-1 min-h-0 bg-[#F2F3F0] dark:bg-[#0d1117]">
        {/* Problem panel — resizable */}
        <div className="flex-shrink-0 bg-white dark:bg-[#161c2d] border-r border-[#CBCCC9] dark:border-[#1e3158] flex flex-col" style={{ width: leftWidth }}>
          <div className="flex items-center justify-between border-b border-[#CBCCC9] dark:border-[#1e3158] px-1">
            <button
              onClick={() => setActiveTab('problem')}
              className={`px-3 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'problem' ? 'border-[#6366F1] text-[#111111] dark:text-[#e2e8f0]' : 'border-transparent text-[#666666] dark:text-[#64748b]'}`}
            >
              Задача
            </button>
            {isCreator && (
              <button
                onClick={openTaskEditor}
                title="Редактировать условие задачи"
                className="mr-2 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236] text-[#94a3b8] hover:text-[#6366F1] transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {room?.task ? (
              <div>
                <h2 className="text-sm font-bold text-[#0f172a] dark:text-[#e2e8f0] mb-3">{room.task}</h2>
                {taskStatement ? (
                  <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed whitespace-pre-wrap">{taskStatement}</p>
                ) : isCreator ? (
                  <button
                    onClick={openTaskEditor}
                    className="text-xs text-[#6366F1] hover:underline"
                  >
                    + Добавить описание
                  </button>
                ) : (
                  <p className="text-xs text-[#94a3b8]">Описание не добавлено</p>
                )}
              </div>
            ) : isCreator ? (
              <button
                onClick={openTaskEditor}
                className="w-full h-full flex flex-col items-center justify-center gap-2 text-center py-8 text-[#94a3b8] hover:text-[#6366F1] transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl border-2 border-dashed border-[#CBCCC9] dark:border-[#1e3158] group-hover:border-[#6366F1] flex items-center justify-center transition-colors">
                  <Pencil className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium dark:text-[#94a3b8]">Добавить условие задачи</span>
              </button>
            ) : (
              <p className="text-sm text-[#94a3b8] text-center py-8">Задача не задана</p>
            )}
          </div>
        </div>

        {/* Drag handle */}
        <div
          className="w-1 flex-shrink-0 cursor-col-resize bg-transparent hover:bg-[#6366F1]/40 transition-colors active:bg-[#6366F1]/60"
          onMouseDown={() => { isResizingLeft.current = true; document.body.style.cursor = 'col-resize' }}
        />

        {/* Editor — flex-1 (takes remaining space ~70%) */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F2F3F0] dark:bg-[#0d1117] p-3">
          <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-[#2d3748] shadow-md">
            <div className="h-9 bg-[#1e293b] flex items-center px-4 gap-3 flex-shrink-0">
              <span className="text-xs text-[#94a3b8] font-mono">
                solution.{lang === 'python' ? 'py' : lang === 'javascript' ? 'js' : lang === 'typescript' ? 'ts' : lang === 'go' ? 'go' : lang === 'rust' ? 'rs' : lang === 'java' ? 'java' : 'py'}
              </span>
              <div className="ml-auto relative">
                <button
                  onClick={() => setShowLangDropdown(v => !v)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-[#94a3b8] rounded hover:bg-[#0f172a] transition-colors"
                >
                  {getLanguageLabel(lang)} <ChevronDown className="w-3 h-3" />
                </button>
                {showLangDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-[#1e293b] border border-[#334155] rounded-lg shadow-xl overflow-hidden min-w-[130px]">
                      {LANGUAGES.map(l => (
                        <button
                          key={l.value}
                          onClick={() => { ws.sendLanguageChange(l.value); setShowLangDropdown(false) }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors ${lang === l.value ? 'text-[#6366F1] bg-[#0f172a]' : 'text-[#94a3b8] hover:bg-[#0f172a] hover:text-white'}`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                language={getMonacoLanguage(lang)}
                value={localCode}
                onChange={handleCodeChange}
                onMount={handleEditorMount}
                options={{
                  fontSize: 13,
                  fontFamily: '"JetBrains Mono", monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  padding: { top: 12 },
                  theme: 'druzya-dark',
                }}
              />
            </div>
          </div>
        </div>

        {/* AI panel — hidden by default, toggle */}
        {showAiPanel && (
          <div className="w-[280px] flex-shrink-0 bg-white dark:bg-[#161c2d] border-l border-[#CBCCC9] dark:border-[#1e3158] flex flex-col">
            <div className="px-4 py-3 border-b border-[#CBCCC9] dark:border-[#1e3158] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#6366F1]" />
              <span className="text-sm font-bold text-[#111111] dark:text-[#e2e8f0]">AI Помощник</span>
            </div>
            <div className="flex border-b border-[#CBCCC9] dark:border-[#1e3158]">
              {(['hints', 'result', 'review'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAiTab(tab)}
                  className={`px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${aiTab === tab ? 'border-[#6366F1] text-[#111111] dark:text-[#e2e8f0]' : 'border-transparent text-[#666666] dark:text-[#64748b]'}`}
                >
                  {tab === 'hints' ? 'Подсказки' : tab === 'result' ? 'Результат' : 'AI Ревью'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {aiTab === 'hints' ? (
                <div className="flex flex-col gap-3">
                  {hints.length === 0 ? (
                    <>
                      <p className="text-sm text-[#666666] dark:text-[#94a3b8] leading-relaxed">
                        Начните решать задачу, и AI поможет если застрянете
                      </p>
                      <Button
                        variant="orange"
                        size="sm"
                        className="w-full"
                        onClick={() => setHints(AI_HINTS)}
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Получить подсказку
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {hints.map((hint, i) => (
                        <div key={i} className="p-3 bg-[#FFF7ED] dark:bg-[#2a1a06] border border-[#FDBA74] dark:border-[#78350f] rounded-lg">
                          <p className="text-xs font-semibold text-[#9a3412] dark:text-[#fbbf24] mb-0.5">Подсказка {i + 1}</p>
                          <p className="text-sm text-[#111111] dark:text-[#e2e8f0]">{hint}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : aiTab === 'result' ? (
                <div className="flex flex-col gap-3">
                  {submitResult ? (
                    <div className={`p-3 rounded-lg ${submitResult.isCorrect ? 'bg-[#e8f9ef] dark:bg-[#0d2a1f] border border-[#86efac] dark:border-[#166534]' : 'bg-[#fef2f2] dark:bg-[#2a0f0f] border border-[#fca5a5] dark:border-[#991b1b]'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {submitResult.isCorrect ? <Check className="w-4 h-4 text-[#22c55e]" /> : <X className="w-4 h-4 text-[#ef4444]" />}
                        <span className="text-sm font-semibold dark:text-[#e2e8f0]">{submitResult.isCorrect ? 'Принято!' : 'Неверно'}</span>
                      </div>
                      {submitResult.output && <pre className="text-xs text-[#475569] dark:text-[#94a3b8] font-mono whitespace-pre-wrap">{submitResult.output}</pre>}
                      {submitResult.error && <pre className="text-xs text-[#ef4444] font-mono whitespace-pre-wrap">{submitResult.error}</pre>}
                    </div>
                  ) : (
                    <p className="text-sm text-[#94a3b8]">Запустите код чтобы увидеть результаты</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {reviewLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-[#CBCCC9] dark:border-[#1e3158] border-t-[#6366F1] rounded-full animate-spin" />
                      <p className="text-sm text-[#666666] dark:text-[#94a3b8]">Анализируем код...</p>
                    </div>
                  ) : aiReview ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-[#111111] dark:text-[#e2e8f0]">Результат ревью</p>
                      <p className="text-xs text-[#666666] dark:text-[#94a3b8] whitespace-pre-wrap leading-relaxed">{aiReview}</p>
                      <button onClick={() => setAiReview(null)} className="text-xs text-[#6366F1] hover:underline mt-1">Запустить заново</button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs text-[#666666] dark:text-[#94a3b8]">Необязательный промпт для AI ревью:</p>
                      <textarea
                        value={reviewPrompt}
                        onChange={e => setReviewPrompt(e.target.value)}
                        placeholder="Например: уточни временную сложность..."
                        rows={3}
                        className="w-full px-3 py-2 text-xs bg-[#F2F3F0] dark:bg-[#0d1117] dark:text-[#e2e8f0] border border-[#CBCCC9] dark:border-[#1e3158] rounded-lg focus:outline-none resize-none"
                      />
                      <Button variant="primary" size="sm" className="w-full" onClick={() => handleRunReview(reviewPrompt)} loading={reviewLoading}>
                        <Bot className="w-3.5 h-3.5" /> Запустить ревью
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Activity notifications */}
      {notifications.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
          {notifications.map(n => (
            <div
              key={n.id}
              className="bg-[#1e293b] text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8] flex-shrink-0" />
              {n.text}
            </div>
          ))}
        </div>
      )}

      {/* Task editor modal — creator only */}
      {showTaskEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-[#161c2d] rounded-2xl shadow-xl border border-[#CBCCC9] dark:border-[#1e3158] w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#CBCCC9] dark:border-[#1e3158]">
              <h2 className="text-sm font-bold text-[#111111] dark:text-[#e2e8f0]">Условие задачи</h2>
              <button onClick={() => setShowTaskEditor(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236] text-[#666666] dark:text-[#94a3b8]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1.5 block">Название задачи</label>
                <input
                  value={editTaskTitle}
                  onChange={e => setEditTaskTitle(e.target.value)}
                  placeholder="Например: Two Sum"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0f1117] text-[#111111] dark:text-[#e2e8f3] border border-[#CBCCC9] dark:border-[#1e3158] rounded-lg focus:outline-none focus:border-[#6366F1] dark:focus:border-[#6366F1] placeholder:text-[#94a3b8] focus:ring-2 focus:ring-[#6366F1]/10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1.5 block">Условие задачи</label>
                <textarea
                  value={editTaskStatement}
                  onChange={e => setEditTaskStatement(e.target.value)}
                  placeholder="Опишите задачу, входные и выходные данные, примеры..."
                  rows={8}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0f1117] text-[#111111] dark:text-[#e2e8f3] border border-[#CBCCC9] dark:border-[#1e3158] rounded-lg focus:outline-none focus:border-[#6366F1] dark:focus:border-[#6366F1] placeholder:text-[#94a3b8] focus:ring-2 focus:ring-[#6366F1]/10 resize-none font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <Button variant="secondary" size="sm" onClick={() => setShowTaskEditor(false)}>Отмена</Button>
              <Button variant="primary" size="sm" onClick={saveTask} disabled={!editTaskTitle.trim()}>Сохранить</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
