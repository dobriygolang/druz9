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
import { Modal } from '@/shared/ui/Modal'
import { Avatar } from '@/shared/ui/Avatar'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { getMonacoLanguage, getLanguageLabel } from '@/shared/lib/codeEditorLanguage'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import { formatEditorCode, registerFormatKeybinding } from '@/shared/lib/editorFormat'
import { apiClient } from '@/shared/api/base'
import { ReviewCard } from '@/features/SolutionReview/ui/ReviewCard'
import { useSolutionReview } from '@/features/SolutionReview/hooks/useSolutionReview'
import { useTranslation } from 'react-i18next'
import type * as Monaco from 'monaco-editor'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import { MonacoBinding } from '@/shared/lib/monacoTextBinding'

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
  // O(n) eviction via Set lookup instead of O(n²) with Array.includes
  const kept = new Set(next)
  for (const id of prev) {
    if (!kept.has(id)) localStorage.removeItem(`solo:code:${id}`)
  }
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

function encodeBinaryToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function decodeBase64ToBinary(payload: string): Uint8Array {
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function encodeRelativePositionToBase64(position: Y.RelativePosition): string {
  return encodeBinaryToBase64(Y.encodeRelativePosition(position))
}

function decodeRelativePositionFromBase64(payload: string): Y.RelativePosition | null {
  try {
    return Y.decodeRelativePosition(decodeBase64ToBinary(payload))
  } catch {
    return null
  }
}

function shouldHideDuelTask(room: Room | null): boolean {
  return room?.mode === 'ROOM_MODE_DUEL' && (room.participants.length ?? 0) < 2
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
  { value: 'go', label: 'Go' },
  { value: 'sql', label: 'SQL' },
]

function getAvailableRoomLanguages(mode: Room['mode'] | undefined, currentLanguage: string) {
  if (currentLanguage === 'sql') {
    return LANGUAGES.filter(item => item.value === 'sql')
  }
  if (mode === 'ROOM_MODE_DUEL') {
    return LANGUAGES.filter(item => item.value === 'python' || item.value === 'go')
  }
  return LANGUAGES.filter(item => item.value === 'python' || item.value === 'go')
}

function GuestNamePrompt({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('')
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center h-screen bg-[#F2F3F0]">
      <div className="bg-white rounded-2xl border border-[#CBCCC9] p-8 w-full max-w-sm flex flex-col gap-4">
        <h2 className="text-lg font-bold text-[#111111]">{t('codeRoom.guest.title')}</h2>
        <p className="text-sm text-[#666666]">{t('codeRoom.guest.subtitle')}</p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('codeRoom.guest.placeholder')}
          className="w-full px-4 py-2.5 bg-[#F2F3F0] border border-[#CBCCC9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSubmit(name.trim()) }}
          autoFocus
        />
        <button
          onClick={() => name.trim() && onSubmit(name.trim())}
          disabled={!name.trim()}
          className="w-full py-2.5 bg-[#6366F1] hover:bg-[#4F46E5] text-[#0f172a] font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {t('codeRoom.guest.submit')}
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
  const isMobile = useIsMobile()
  const { t } = useTranslation()
  const [room, setRoom] = useState<Room | null>(null)
  const [running, setRunning] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ isCorrect: boolean; output: string; error: string; submissionId?: string } | null>(null)
  // Duel-mode: timestamp until which the editor is locked (wrong-answer penalty)
  const [editorLockedUntil, setEditorLockedUntil] = useState(0)
  const [lockCountdown, setLockCountdown] = useState(0)
  const { review: solveReview, loading: solveReviewLoading } = useSolutionReview({ submissionId: submitResult?.submissionId })
  const [activeTab, setActiveTab] = useState<'problem' | 'tests'>('problem')
  const [aiTab, setAiTab] = useState<'hints' | 'result' | 'review'>('hints')
  const [hints, setHints] = useState<string[]>([])
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiReview, setAiReview] = useState<string | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewPrompt, setReviewPrompt] = useState('')
  const [copied, setCopied] = useState(false)
  const [needsGuestName, setNeedsGuestName] = useState(
    !user && (typeof window === 'undefined' || !localStorage.getItem('guestCodeRoomName'))
  )
  const [taskStatement, setTaskStatement] = useState('')
  const [showTaskEditor, setShowTaskEditor] = useState(false)
  const [editTaskTitle, setEditTaskTitle] = useState('')
  const [editTaskStatement, setEditTaskStatement] = useState('')
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string }>>([])
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [showLangDropdown, setShowLangDropdown] = useState(false)
  const [togglingPrivacy, setTogglingPrivacy] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leftWidth, setLeftWidth] = useState(300)
  const [mobilePanel, setMobilePanel] = useState<'problem' | 'editor' | 'ai'>('editor')
  const isResizingLeft = useRef(false)
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)
  const bindingRef = useRef<MonacoBinding | null>(null)
  const yDocRef = useRef<Y.Doc | null>(null)
  const yTextRef = useRef<Y.Text | null>(null)
  const decorationsRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null)
  const selectionDecorationsSignatureRef = useRef('')
  const widgetsRef = useRef<Map<string, Monaco.editor.IContentWidget>>(new Map())
  const prevParticipantIdsRef = useRef<Set<string>>(new Set())
  const guestNameRef = useRef(typeof window !== 'undefined' ? localStorage.getItem('guestCodeRoomName') ?? undefined : undefined)
  const queuedDocMessagesRef = useRef<string[]>([])
  const sendDocSyncRef = useRef<(data: string) => void>(() => {})
  const onDocSyncAppliedRef = useRef<(() => void) | null>(null)
  const currentCodeRef = useRef('')
  const initialCodeRef = useRef('')
  const lastCursorRef = useRef({ line: 1, col: 1 })
  const isApplyingRemoteDocRef = useRef(false)
  const isCreatorRef = useRef(false)
  const taskState = (location.state as { starterCode?: string; taskId?: string } | null)
  const soloDraftTaskId = taskState?.taskId ?? null
  const soloDraft = soloDraftTaskId ? getSoloDraft(soloDraftTaskId) : null
  const starterCodeRef = useRef(soloDraft ?? taskState?.starterCode ?? '')
  const saveDraftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Mutable cursor positions for remote users — updated in-place, no widget re-add needed
  const cursorPositionsRef = useRef<Map<string, { line: number; col: number }>>(new Map())
  const pendingWidgetLayoutsRef = useRef<Set<string>>(new Set())
  const widgetLayoutRafRef = useRef<number | null>(null)
  const awarenessRef = useRef<Map<string, import('@/features/CodeRoom/hooks/useCodeRoomWs').AwarenessState>>(new Map())

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

  useEffect(() => {
    if (!(isMobile && mobilePanel === 'editor')) return
    const timer = setTimeout(() => editorRef.current?.layout(), 60)
    return () => clearTimeout(timer)
  }, [isMobile, mobilePanel])

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

  const leaveRoomAndNavigate = useCallback(async (shouldClose: boolean) => {
    if (!roomId) {
      navigate('/practice/code-rooms')
      return
    }
    try {
      if (shouldClose) await codeRoomApi.closeRoom(roomId)
      else await codeRoomApi.leaveRoom(roomId)
    } catch {
      /* best effort */
    }
    navigate('/practice/code-rooms')
  }, [navigate, roomId])

  const handleLeaveRoom = useCallback(async (confirmed: boolean) => {
    const participantCount = room?.participants.length ?? 0
    const isLastParticipant = participantCount <= 1
    const actorIsCreator = !!user && !!room && (user.id === room.creatorId || room.participants.some(p => p.userId === user.id && p.isCreator))

    if (!confirmed) {
      if (actorIsCreator && isLastParticipant) {
        setShowLeaveConfirm(true)
        return
      }
      await leaveRoomAndNavigate(false)
      return
    }

    setShowLeaveConfirm(false)
    await leaveRoomAndNavigate(true)
  }, [leaveRoomAndNavigate, room, user])

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

  const handleIncomingDocSync = useCallback((payload: string) => {
    const doc = yDocRef.current
    if (!doc) {
      queuedDocMessagesRef.current.push(payload)
      return
    }

    const decoder = decoding.createDecoder(decodeBase64ToBinary(payload))
    const encoder = encoding.createEncoder()
    syncProtocol.readSyncMessage(decoder, encoder, doc, 'remote')

    const reply = encoding.toUint8Array(encoder)
    if (reply.byteLength > 1) {
      sendDocSyncRef.current(encodeBinaryToBase64(reply))
    }
    onDocSyncAppliedRef.current?.()
  }, [])

  const flushQueuedDocMessages = useCallback(() => {
    if (!yDocRef.current || queuedDocMessagesRef.current.length === 0) return
    const pending = queuedDocMessagesRef.current.splice(0)
    pending.forEach(handleIncomingDocSync)
  }, [handleIncomingDocSync])

  const flushWidgetLayouts = useCallback(() => {
    widgetLayoutRafRef.current = null
    const editor = editorRef.current
    if (!editor || pendingWidgetLayoutsRef.current.size === 0) return

    const userIds = Array.from(pendingWidgetLayoutsRef.current)
    pendingWidgetLayoutsRef.current.clear()
    userIds.forEach(userId => {
      const widget = widgetsRef.current.get(userId)
      if (widget) {
        editor.layoutContentWidget(widget)
      }
    })
  }, [])

  const scheduleWidgetLayout = useCallback((userId: string) => {
    pendingWidgetLayoutsRef.current.add(userId)
    if (widgetLayoutRafRef.current !== null) return
    widgetLayoutRafRef.current = requestAnimationFrame(flushWidgetLayouts)
  }, [flushWidgetLayouts])

  const resolveRemoteCursorPosition = useCallback((
    state: import('@/features/CodeRoom/hooks/useCodeRoomWs').AwarenessState,
  ): { line: number; col: number } | null => {
    const doc = yDocRef.current
    const yText = yTextRef.current
    const model = editorRef.current?.getModel()
    if (doc && yText && model && state.relHead) {
      const relHead = decodeRelativePositionFromBase64(state.relHead)
      if (relHead) {
        const absolute = Y.createAbsolutePositionFromRelativePosition(relHead, doc)
        if (absolute && absolute.type === yText) {
          const position = model.getPositionAt(absolute.index)
          return { line: position.lineNumber, col: position.column }
        }
      }
    }
    return null
  }, [])

  const refreshRemoteCursorPositions = useCallback(() => {
    awarenessRef.current.forEach((state, userId) => {
      const posRef = cursorPositionsRef.current.get(userId)
      const resolved = resolveRemoteCursorPosition(state)
      if (!resolved) {
        if (widgetsRef.current.has(userId)) {
          pendingWidgetLayoutsRef.current.delete(userId)
        }
        return
      }

      if (!posRef || !widgetsRef.current.has(userId)) return
      if (posRef.line !== resolved.line || posRef.col !== resolved.col) {
        posRef.line = resolved.line
        posRef.col = resolved.col
        scheduleWidgetLayout(userId)
      }
    })
  }, [resolveRemoteCursorPosition, scheduleWidgetLayout])

  // WebSocket realtime
  const isDuelRoom = room?.mode === 'ROOM_MODE_DUEL'
  const duelTaskHidden = shouldHideDuelTask(room)
  const ws = useCodeRoomWs({
    roomId,
    userId: user?.id,
    displayName: user?.firstName ?? guestNameRef.current ?? 'Guest',
    guestName: guestNameRef.current,
    mode: room?.mode === 'ROOM_MODE_DUEL' ? 'ROOM_MODE_DUEL' : 'ROOM_MODE_ALL',
    enabled: !!roomId && !needsGuestName && !!room,
    initialLanguage: getMonacoLanguage(room?.language ?? (location.state as { language?: string } | null)?.language ?? ''),
    onDocSync: handleIncomingDocSync,
    onLeave: useCallback((_userId: string, displayName: string) => {
      addNotification(t('codeRoom.notifications.left', { name: displayName }))
    }, [addNotification, t]),
    onBehaviorEvent: useCallback((_userId: string, displayName: string, event: import('@/features/CodeRoom/hooks/useCodeRoomWs').BehaviorEventType) => {
      if (!isCreatorRef.current) return
      if (event === 'tab_hidden') addNotification(t('codeRoom.notifications.tabHidden', { name: displayName }))
      else if (event === 'tab_visible') addNotification(t('codeRoom.notifications.returned', { name: displayName }))
      else if (event === 'pasted') addNotification(t('codeRoom.notifications.pasted', { name: displayName }))
    }, [addNotification, t]),
  })
  sendDocSyncRef.current = ws.sendDocSync
  awarenessRef.current = ws.awareness

  const sendCurrentAwareness = useCallback((meta?: Record<string, unknown>) => {
    if (isDuelRoom) return
    const editor = editorRef.current
    const model = editor?.getModel()
    const selection = editor?.getSelection()
    if (!editor || !model || !selection) return

    lastCursorRef.current = { line: selection.positionLineNumber, col: selection.positionColumn }
    const yText = yTextRef.current
    const startOffset = model.getOffsetAt({ lineNumber: selection.startLineNumber, column: selection.startColumn })
    const endOffset = model.getOffsetAt({ lineNumber: selection.endLineNumber, column: selection.endColumn })
    const relAnchor = yText
      ? encodeRelativePositionToBase64(Y.createRelativePositionFromTypeIndex(yText, startOffset))
      : undefined
    const relHead = yText
      ? encodeRelativePositionToBase64(Y.createRelativePositionFromTypeIndex(yText, endOffset))
      : undefined
    const hasSelection = !(
      selection.startLineNumber === selection.endLineNumber &&
      selection.startColumn === selection.endColumn
    )

    ws.sendAwareness(
      selection.positionLineNumber,
      selection.positionColumn,
      hasSelection ? {
        startLine: selection.startLineNumber,
        startCol: selection.startColumn,
        endLine: selection.endLineNumber,
        endCol: selection.endColumn,
      } : undefined,
      {
        codeLen: model.getValueLength(),
        relAnchor,
        relHead,
        selectionDirection: selection.getDirection(),
        ...meta,
      },
    )
  }, [isDuelRoom, ws.sendAwareness])

  useEffect(() => {
    refreshRemoteCursorPositions()
  }, [ws.awareness, refreshRemoteCursorPositions])

  useEffect(() => {
    if (!ws.connected || !ws.gotSnapshot || isDuelRoom) return
    refreshRemoteCursorPositions()
  }, [ws.connected, ws.gotSnapshot, isDuelRoom, refreshRemoteCursorPositions])

  const schedulePersist = useCallback((code: string) => {
    currentCodeRef.current = code
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      ws.persistCode(currentCodeRef.current)
    }, 400)
  }, [ws.persistCode])

  // Fetch initial room data via REST
  useEffect(() => {
    if (!roomId || needsGuestName) return
    const state = location.state as { title?: string; statement?: string; starterCode?: string; language?: string; taskId?: string } | null
    codeRoomApi.joinRoom(roomId, undefined, guestNameRef.current)
      .then(async r => {
        const roomTaskHidden = shouldHideDuelTask(r)
        if (state?.title && !r.task && !roomTaskHidden) r = { ...r, task: state.title }
        setRoom(r)

        // If we have task data from navigation state, use it directly
        if (state?.statement && !roomTaskHidden) {
          setTaskStatement(state.statement)
          const taskId = state.taskId
          const draft = taskId ? getSoloDraft(taskId) : null
          const initCode = draft ?? r.code ?? state?.starterCode ?? ''
          initialCodeRef.current = initCode
          currentCodeRef.current = initCode
          const model = editorRef.current?.getModel()
          if (model && !bindingRef.current && model.getValue() !== initCode) {
            model.setValue(initCode)
          }
          return
        }
        if (roomTaskHidden) {
          setTaskStatement('')
        }

        // No navigation state but room has a taskId — fetch task details from API
        const taskId = state?.taskId || r.taskId
        if (taskId && !state?.statement && !roomTaskHidden) {
          try {
            const tasks = await codeRoomApi.listTasks()
            const task = tasks.find(t => t.id === taskId)
            if (task) {
              if (!r.task && task.title) setRoom(prev => prev ? { ...prev, task: task.title } : prev)
              if (task.statement) setTaskStatement(task.statement)
              const draft = getSoloDraft(taskId)
              const initCode = draft ?? r.code ?? task.starterCode ?? ''
              initialCodeRef.current = initCode
              currentCodeRef.current = initCode
              const model = editorRef.current?.getModel()
              if (model && !bindingRef.current && model.getValue() !== initCode) {
                model.setValue(initCode)
              }
              return
            }
          } catch { /* fallback to room data only */ }
        }

        // Fallback: use whatever the room has
        const draft = !roomTaskHidden && taskId ? getSoloDraft(taskId) : null
        const initCode = draft ?? r.code ?? state?.starterCode ?? ''
        initialCodeRef.current = initCode
        currentCodeRef.current = initCode
        const model = editorRef.current?.getModel()
        if (model && !bindingRef.current && model.getValue() !== initCode) {
          model.setValue(initCode)
        }
      })
      .catch(() => navigate('/practice/code-rooms'))
  }, [roomId, needsGuestName, location.state, navigate])

  useEffect(() => {
    if (!ws.gotSnapshot) return
    const model = editorRef.current?.getModel()
    if (!isDuelRoom) {
      const localCode = currentCodeRef.current || model?.getValue() || starterCodeRef.current || ''
      if (localCode) {
        initialCodeRef.current = localCode
        currentCodeRef.current = localCode
        return
      }
    }

    const baseCode = ws.code || currentCodeRef.current || starterCodeRef.current || ''
    initialCodeRef.current = baseCode
    currentCodeRef.current = baseCode

    if (model && !bindingRef.current && model.getValue() !== baseCode) {
      model.setValue(baseCode)
    }
  }, [isDuelRoom, ws.gotSnapshot, ws.code])

  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    const model = editor?.getModel()
    if (!editor || !monaco || !model || !ws.connected || !ws.gotSnapshot || bindingRef.current || isDuelRoom) return

    const snapshotCode = ws.code || ''
    const seedCode = snapshotCode || currentCodeRef.current || model.getValue()
    const shouldBootstrapFromSnapshot = ws.snapshotActiveClientCount <= 1

    const doc = new Y.Doc()
    const yText = doc.getText('code')
    yTextRef.current = yText
    if (shouldBootstrapFromSnapshot && seedCode) {
      yText.insert(0, seedCode)
    }

    let binding: MonacoBinding | null = null
    const attachBinding = () => {
      if (binding) return
      binding = new MonacoBinding(monaco, yText, model, new Set([editor]), {
        onRemoteChangeStart: () => { isApplyingRemoteDocRef.current = true },
        onRemoteChangeEnd: () => {
          isApplyingRemoteDocRef.current = false
          refreshRemoteCursorPositions()
        },
      })
      bindingRef.current = binding
      currentCodeRef.current = model.getValue()
    }

    const handleDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote') return

      const encoder = encoding.createEncoder()
      syncProtocol.writeUpdate(encoder, update)
      ws.sendDocSync(encodeBinaryToBase64(encoding.toUint8Array(encoder)))
    }

    doc.on('update', handleDocUpdate)

    yDocRef.current = doc
    onDocSyncAppliedRef.current = () => {
      if (!shouldBootstrapFromSnapshot) {
        attachBinding()
      }
      refreshRemoteCursorPositions()
    }

    if (shouldBootstrapFromSnapshot) {
      attachBinding()
      if (seedCode && seedCode !== snapshotCode) {
        ws.persistCode(seedCode)
      }
    }
    refreshRemoteCursorPositions()

    const syncEncoder = encoding.createEncoder()
    syncProtocol.writeSyncStep1(syncEncoder, doc)
    ws.sendDocSync(encodeBinaryToBase64(encoding.toUint8Array(syncEncoder)))
    flushQueuedDocMessages()

    return () => {
      onDocSyncAppliedRef.current = null
      doc.off('update', handleDocUpdate)
      binding?.destroy()
      doc.destroy()
      bindingRef.current = null
      yDocRef.current = null
      yTextRef.current = null
      isApplyingRemoteDocRef.current = false
    }
  }, [roomId, ws.connected, ws.gotSnapshot, ws.code, ws.snapshotActiveClientCount, ws.sendDocSync, ws.persistCode, flushQueuedDocMessages, isDuelRoom, refreshRemoteCursorPositions])

  useEffect(() => {
    refreshRemoteCursorPositions()
  }, [ws.awareness, refreshRemoteCursorPositions])

  // Update room from room_update WS message (fired on join/leave/status change)
  useEffect(() => {
    if (!ws.lastRoomUpdate) return
    const update = ws.lastRoomUpdate as {
      status?: string
      language?: string
      participants?: Array<{ id: string; displayName: string; userId?: string; isGuest?: boolean; isReady?: boolean; joinedAt?: string }>
    }

    // Detect new participants and notify
    if (update.participants) {
      const myId = user?.id ?? guestNameRef.current ?? ''
      update.participants.forEach(p => {
        const pid = p.id || p.userId || ''
        if (!prevParticipantIdsRef.current.has(pid) && prevParticipantIdsRef.current.size > 0 && pid !== myId) {
          addNotification(t('codeRoom.notifications.joined', { name: p.displayName }))
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
        ...(update.language ? { language: update.language as Room['language'] } : {}),
        ...(mappedParticipants ? { participants: mappedParticipants } : {}),
      }
    })
  }, [ws.lastRoomUpdate, user, t, addNotification])

  // Keep isCreatorRef in sync for use inside callbacks
  const isCreator = !!user && !!room && (user.id === room.creatorId || room.participants.some(p => p.userId === user.id && p.isCreator))
  const hasPredefinedTask = !duelTaskHidden && !!(room?.taskId || soloDraftTaskId)
  const canEditTask = isCreator && !hasPredefinedTask
  useEffect(() => { isCreatorRef.current = isCreator }, [isCreator])

  // Auto-start room: creator's connection triggers waiting→active transition
  // Duel rooms auto-start when the second player joins (backend handles it) — skip here.
  const startedRoomRef = useRef(false)
  useEffect(() => {
    if (!ws.connected || !isCreator || startedRoomRef.current || isDuelRoom) return
    if (room?.status === 'ROOM_STATUS_ACTIVE' || room?.status === 'ROOM_STATUS_FINISHED') return
    startedRoomRef.current = true
    codeRoomApi.startRoom(roomId!).catch((err) => { startedRoomRef.current = false; console.error('Failed to start room:', err) })
  }, [ws.connected, isCreator, room?.status, roomId, isDuelRoom])

  // Tab visibility anti-cheat tracking
  useEffect(() => {
    if (!ws.connected || isDuelRoom) return
    const handler = () => {
      sendCurrentAwareness({ tabHidden: document.hidden })
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [isDuelRoom, ws.connected, sendCurrentAwareness])

  // Remote cursor widgets — update mutable posRef in-place (no remove/re-add = no flicker)
  useEffect(() => {
    if (isDuelRoom) {
      const editor = editorRef.current
      widgetsRef.current.forEach(w => editor?.removeContentWidget(w))
      widgetsRef.current.clear()
      cursorPositionsRef.current.clear()
      decorationsRef.current?.clear()
      pendingWidgetLayoutsRef.current.clear()
      if (widgetLayoutRafRef.current !== null) {
        cancelAnimationFrame(widgetLayoutRafRef.current)
        widgetLayoutRafRef.current = null
      }
      return
    }
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
        pendingWidgetLayoutsRef.current.delete(userId)
      }
    })

    const newDecorations: Monaco.editor.IModelDeltaDecoration[] = []
    const selectionSignatureParts: string[] = []

    ws.awareness.forEach((state) => {
      const color = getCursorColor(state.userId)
      const safeId = state.userId.replace(/[^a-z0-9]/gi, '_')
      injectCursorCSS(safeId, color)
      const cursorPosition = resolveRemoteCursorPosition(state)
      if (!cursorPosition) return

      if (!widgetsRef.current.has(state.userId)) {
        const posRef = { line: cursorPosition.line, col: cursorPosition.col }
        cursorPositionsRef.current.set(state.userId, posRef)
        const widget = buildCursorWidget(state.userId, state.displayName, color, posRef, monaco)
        editor.addContentWidget(widget)
        widgetsRef.current.set(state.userId, widget)
      } else {
        const posRef = cursorPositionsRef.current.get(state.userId)
        if (posRef && (posRef.line !== cursorPosition.line || posRef.col !== cursorPosition.col)) {
          posRef.line = cursorPosition.line
          posRef.col = cursorPosition.col
          scheduleWidgetLayout(state.userId)
        }
      }

      let selectionRange: Monaco.IRange | null = null
      const doc = yDocRef.current
      const yText = yTextRef.current
      const model = editor.getModel()
      if (doc && yText && model && state.relAnchor && state.relHead) {
        const relAnchor = decodeRelativePositionFromBase64(state.relAnchor)
        const relHead = decodeRelativePositionFromBase64(state.relHead)
        if (relAnchor && relHead) {
          const anchor = Y.createAbsolutePositionFromRelativePosition(relAnchor, doc)
          const head = Y.createAbsolutePositionFromRelativePosition(relHead, doc)
          if (anchor && head && anchor.type === yText && head.type === yText && anchor.index !== head.index) {
            const start = model.getPositionAt(Math.min(anchor.index, head.index))
            const end = model.getPositionAt(Math.max(anchor.index, head.index))
            selectionRange = new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column)
          }
        }
      }

      if (selectionRange) {
        selectionSignatureParts.push([
          state.userId,
          selectionRange.startLineNumber,
          selectionRange.startColumn,
          selectionRange.endLineNumber,
          selectionRange.endColumn,
        ].join(':'))
        newDecorations.push({
          range: selectionRange,
          options: { className: `remote-sel-${safeId}`, isWholeLine: false },
        })
      }
    })

    const nextSelectionSignature = selectionSignatureParts.sort().join('|')
    if (selectionDecorationsSignatureRef.current !== nextSelectionSignature) {
      if (decorationsRef.current) {
        decorationsRef.current.set(newDecorations)
      } else {
        decorationsRef.current = editor.createDecorationsCollection(newDecorations)
      }
      selectionDecorationsSignatureRef.current = nextSelectionSignature
    }
    // No cleanup on re-run — managed by cursorPositionsRef; only unmount cleans up
  }, [isDuelRoom, ws.awareness])

  // Unmount cleanup for remote cursor widgets
  useEffect(() => () => {
    const editor = editorRef.current
    widgetsRef.current.forEach(w => editor?.removeContentWidget(w))
    widgetsRef.current.clear()
    cursorPositionsRef.current.clear()
    decorationsRef.current?.clear()
    selectionDecorationsSignatureRef.current = ''
    pendingWidgetLayoutsRef.current.clear()
    if (widgetLayoutRafRef.current !== null) {
      cancelAnimationFrame(widgetLayoutRafRef.current)
      widgetLayoutRafRef.current = null
    }
  }, [])

  useEffect(() => () => {
    if (saveDraftTimer.current) clearTimeout(saveDraftTimer.current)
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    if (currentCodeRef.current) {
      ws.persistCode(currentCodeRef.current)
    }
  }, [ws.persistCode])

  // Sync WebSocket submission results
  useEffect(() => {
    if (ws.lastSubmission) {
      setSubmitResult(ws.lastSubmission)
      setAiTab('result')
      setShowAiPanel(true)
      if (isMobile) setMobilePanel('ai')
    }
  }, [isMobile, ws.lastSubmission])

  // Duel-mode: countdown timer for editor lockout after wrong answer
  useEffect(() => {
    if (!editorLockedUntil) return
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((editorLockedUntil - Date.now()) / 1000))
      setLockCountdown(remaining)
      if (remaining === 0) setEditorLockedUntil(0)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [editorLockedUntil])

  const getCurrentCode = useCallback(() => {
    return editorRef.current?.getModel()?.getValue() ?? currentCodeRef.current
  }, [])

  const handleRun = async () => {
    if (!roomId) return
    if (editorLockedUntil && Date.now() < editorLockedUntil) return
    setRunning(true)
    setSubmitResult(null)
    try {
      const result = await codeRoomApi.submitCode(roomId, getCurrentCode(), guestNameRef.current, lang)
      setSubmitResult(result)
      setAiTab('result')
      setShowAiPanel(true)
      if (isMobile) setMobilePanel('ai')
      // Duel mode: lock editor for 30 s on wrong answer
      if (isDuelRoom && !result.isCorrect) {
        setEditorLockedUntil(Date.now() + 30_000)
      }
    } catch {} finally { setRunning(false) }
  }

  const handleAiReview = () => {
    if (isMobile) {
      setShowAiPanel(true)
      setAiTab('review')
      setMobilePanel('ai')
      return
    }
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
        code: getCurrentCode(),
        taskTitle: room?.task ?? '',
        statement: customPrompt || (room?.task ? t('codeRoom.solveTaskPrompt', { task: room.task }) : ''),
      })
      const data = res.data
      // The response is an object {provider, model, score, summary, strengths, issues, followUpQuestions}
      // Render it properly as a formatted string
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const parts: string[] = []
        if (data.summary) parts.push(`📋 ${data.summary}`)
        if (data.score !== undefined) parts.push(`⭐ ${t('codeRoom.review.score')}: ${data.score}/10`)
        if (data.strengths?.length) parts.push(`✅ ${t('codeRoom.review.strengths')}:\n${data.strengths.map((s: string) => `• ${s}`).join('\n')}`)
        if (data.issues?.length) parts.push(`⚠️ ${t('codeRoom.review.issues')}:\n${data.issues.map((i: string) => `• ${i}`).join('\n')}`)
        if (data.followUpQuestions?.length) parts.push(`❓ ${t('codeRoom.review.questions')}:\n${data.followUpQuestions.map((q: string) => `• ${q}`).join('\n')}`)
        setAiReview(parts.join('\n\n') || JSON.stringify(data, null, 2))
      } else {
        setAiReview(String(data?.review ?? data?.feedback ?? data ?? t('codeRoom.review.noData')))
      }
    } catch {
      setAiReview(t('codeRoom.review.failed'))
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
    registerFormatKeybinding(editor, monaco)
    monaco.editor.setTheme(theme === 'dark' ? 'druzya-dark' : 'vs')
    const model = editor.getModel()
    if (model && initialCodeRef.current && model.getValue() !== initialCodeRef.current) {
      model.setValue(initialCodeRef.current)
      currentCodeRef.current = initialCodeRef.current
    }

    editor.onDidChangeModelContent(() => {
      const nextModel = editor.getModel()
      if (!nextModel) return

      const oldCode = currentCodeRef.current
      const nextCode = nextModel.getValue()
      if (oldCode === nextCode) return

      currentCodeRef.current = nextCode

      if (isApplyingRemoteDocRef.current) {
        return
      }

      if (cursorPositionsRef.current.size > 0) {
        refreshRemoteCursorPositions()
      }

      if (soloDraftTaskId) {
        if (saveDraftTimer.current) clearTimeout(saveDraftTimer.current)
        saveDraftTimer.current = setTimeout(() => setSoloDraft(soloDraftTaskId, nextCode), 1000)
      }

      if (isDuelRoom) {
        ws.sendUpdate(nextCode)
      }
      schedulePersist(nextCode)
    })

    // Send cursor + selection awareness on every position change.
    // No throttle: at typical typing speed this is ~5-15 sends/sec, which is negligible.
    // Throttling was causing visible cursor lag for remote users during fast typing.
    editor.onDidChangeCursorSelection(() => {
      sendCurrentAwareness()
    })

    // Detect paste → anti-cheat signal
    editor.onDidPaste(() => {
      if (isDuelRoom) return
      if (!isCreatorRef.current) {
        sendCurrentAwareness({ pastedCode: true })
        // Clear the flag after a short delay so it can fire again
        setTimeout(() => {
          sendCurrentAwareness({ pastedCode: false })
        }, 2000)
      }
    })
  }, [theme, schedulePersist, soloDraftTaskId, isDuelRoom, ws.sendUpdate, refreshRemoteCursorPositions, sendCurrentAwareness])

  if (needsGuestName) {
    return <GuestNamePrompt onSubmit={handleGuestNameSubmit} />
  }

  const roomLanguage = getMonacoLanguage(room?.language ?? '')
  const lang = ws.language || (roomLanguage === 'plaintext' ? 'python' : roomLanguage)
  const roomLanguages = getAvailableRoomLanguages(room?.mode, lang)
  const aiHints = [
    t('codeRoom.hints.edgeCases'),
    t('codeRoom.hints.timeComplexity'),
    t('codeRoom.hints.breakIntoParts'),
  ]
  const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
    ROOM_STATUS_WAITING: { label: t('codeRoom.status.waiting'), variant: 'warning' },
    ROOM_STATUS_ACTIVE: { label: t('codeRoom.status.active'), variant: 'success' },
    ROOM_STATUS_FINISHED: { label: t('codeRoom.status.finished'), variant: 'default' },
  }
  const status = room ? (statusLabels[room.status] ?? { label: room.status, variant: 'default' as const }) : null

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F2F3F0] dark:bg-[#0d1117]">
        <header className="border-b border-[#d8d9d6] bg-white px-4 pt-3 pb-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:border-[#1e3158] dark:bg-[#161c2d]">
          <div className="flex items-start gap-3">
            <button
              onClick={() => handleLeaveRoom(false)}
              className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#666666] dark:bg-[#1a2236] dark:text-[#94a3b8]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#0f172a] dark:text-[#e2e8f0]">{room?.task || t('codeRoom.title')}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {status && <Badge variant={status.variant}>{status.label}</Badge>}
                {ws.connected ? (
                  <span className="flex items-center gap-1 text-[10px] text-[#22c55e]">
                    <Wifi className="w-3 h-3" /> {t('codeRoom.live')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-[#94a3b8]">
                    <WifiOff className="w-3 h-3" /> {t('codeRoom.offline')}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? t('codeRoom.theme.light') : t('codeRoom.theme.dark')}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#666666] transition-colors dark:bg-[#1a2236] dark:text-[#94a3b8]"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-[#fbbf24]" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {!isDuelRoom && Array.from(ws.awareness.values()).map(a => (
              <div key={a.userId} className="relative flex-shrink-0" title={a.displayName}>
                <Avatar name={a.displayName} size="xs" />
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white"
                  style={{ background: getCursorColor(a.userId) }}
                />
              </div>
            ))}
            {(isDuelRoom ? room?.participants : room?.participants?.filter(p => !ws.awareness.has(p.userId || p.name)))?.map(p => (
              <Avatar key={p.userId || p.name} name={p.name} size="xs" className={!isDuelRoom ? 'opacity-40' : undefined} />
            ))}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={copyInviteLink}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-2xl border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-medium text-[#111111] transition-colors dark:border-[#1e3158] dark:bg-[#0f1117] dark:text-[#e2e8f0]"
              title={t('codeRoom.copyInviteLink')}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? t('codeRoom.copied') : t('codeRoom.invite')}</span>
            </button>

            {isCreator && (
              <button
                onClick={handleTogglePrivacy}
                disabled={togglingPrivacy}
                title={room?.isPrivate ? t('codeRoom.makePublic') : t('codeRoom.makePrivate')}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${room?.isPrivate ? 'border-[#c7d2fe] bg-[#eef2ff] text-[#6366F1] dark:border-[#312e81] dark:bg-[#1e1b4b]' : 'border-[#e2e8f0] bg-white text-[#667085] dark:border-[#1e3158] dark:bg-[#0f1117] dark:text-[#94a3b8]'}`}
              >
                {room?.isPrivate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{room?.isPrivate ? t('codeRoom.private') : t('codeRoom.public')}</span>
              </button>
            )}

            {isCreator && (
              <button
                onClick={() => setNotificationsEnabled(v => !v)}
                title={notificationsEnabled ? t('codeRoom.notifications.disable') : t('codeRoom.notifications.enable')}
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border transition-colors ${notificationsEnabled ? 'border-[#c7d2fe] bg-[#eef2ff] text-[#6366F1] dark:border-[#312e81] dark:bg-[#1e1b4b]' : 'border-[#e2e8f0] bg-white text-[#94a3b8] dark:border-[#1e3158] dark:bg-[#0f1117]'}`}
              >
                {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
            )}

            {!isDuelRoom && (
              <Button variant="ghost" size="sm" onClick={handleAiReview} loading={reviewLoading} className="flex-shrink-0 rounded-2xl">
                <Bot className="w-3.5 h-3.5" /> {t('codeRoom.aiReview')}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleRun} loading={running} className="flex-shrink-0 rounded-2xl">
              <Play className="w-3.5 h-3.5" /> {t('codeRoom.run')}
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-24">
          <div className="grid grid-cols-3 gap-2 rounded-[24px] border border-[#d8d9d6] bg-white p-1 shadow-[0_12px_28px_rgba(15,23,42,0.06)] dark:border-[#1e3158] dark:bg-[#161c2d]">
            {[
              { key: 'problem' as const, label: t('codeRoom.panel.task') },
              { key: 'editor' as const, label: t('codeRoom.panel.editor') },
              { key: 'ai' as const, label: t('codeRoom.panel.ai') },
            ].map(panel => (
              <button
                key={panel.key}
                onClick={() => {
                  if (panel.key === 'ai') setShowAiPanel(true)
                  setMobilePanel(panel.key)
                }}
                className={`rounded-[18px] px-3 py-2 text-sm font-medium transition-colors ${mobilePanel === panel.key ? 'bg-[#111111] text-white dark:bg-[#0f1117]' : 'text-[#667085] dark:text-[#94a3b8]'}`}
              >
                {panel.label}
              </button>
            ))}
          </div>

          {mobilePanel === 'problem' && (
            <div className="rounded-[30px] border border-[#d8d9d6] bg-white shadow-[0_16px_32px_rgba(15,23,42,0.08)] dark:border-[#1e3158] dark:bg-[#161c2d]">
              <div className="flex items-center justify-between border-b border-[#e2e8f0] px-4 py-3 dark:border-[#1e3158]">
                <span className="text-sm font-semibold text-[#111111] dark:text-[#e2e8f0]">{t('codeRoom.task')}</span>
                {canEditTask && (
                  <button
                    onClick={openTaskEditor}
                    title="Edit task statement"
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F8FAFC] text-[#94a3b8] dark:bg-[#1a2236]"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="p-4">
                {room?.task ? (
                  <div>
                    <h2 className="mb-3 text-base font-bold text-[#0f172a] dark:text-[#e2e8f0]">{room.task}</h2>
                    {taskStatement ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8]">{taskStatement}</p>
                    ) : canEditTask ? (
                      <button onClick={openTaskEditor} className="text-sm font-medium text-[#6366F1] hover:underline">
                        {t('codeRoom.addDescription')}
                      </button>
                    ) : (
                      <p className="text-sm text-[#94a3b8]">{t('codeRoom.noDescription')}</p>
                    )}
                  </div>
                ) : canEditTask ? (
                  <button
                    onClick={openTaskEditor}
                    className="flex w-full flex-col items-center justify-center gap-2 py-8 text-center text-[#94a3b8] transition-colors hover:text-[#6366F1]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-dashed border-[#CBCCC9] dark:border-[#1e3158]">
                      <Pencil className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{t('codeRoom.addTaskStatement')}</span>
                  </button>
                ) : (
                  <p className="py-8 text-center text-sm text-[#94a3b8]">{t('codeRoom.noTask')}</p>
                )}
              </div>
            </div>
          )}

          <div className={mobilePanel === 'editor' ? '' : 'hidden'}>
            <div className="overflow-hidden rounded-[30px] border border-[#1e293b] bg-white shadow-[0_16px_32px_rgba(15,23,42,0.08)] dark:border-[#1e3158] dark:bg-[#161c2d]">
              <div className="flex items-center gap-3 bg-[#1e293b] px-4 py-3">
                <span className="text-xs font-mono text-[#94a3b8]">
                  solution.{lang === 'python' ? 'py' : lang === 'go' ? 'go' : lang === 'sql' ? 'sql' : 'txt'}
                </span>
                <button
                  onClick={() => { if (editorRef.current && monacoRef.current) formatEditorCode(editorRef.current, monacoRef.current) }}
                  className="ml-auto rounded-lg px-2 py-1 text-[10px] font-medium text-[#94a3b8] transition-colors hover:bg-[#0f172a] hover:text-white"
                  title="Format (Shift+Alt+F)"
                >
                  {t('codeRoom.format', 'Format')}
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowLangDropdown(v => !v)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#94a3b8] transition-colors hover:bg-[#0f172a]"
                  >
                    {getLanguageLabel(lang)} <ChevronDown className="w-3 h-3" />
                  </button>
                  {showLangDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />
                      <div className="absolute right-0 top-full z-50 mt-1 min-w-[130px] overflow-hidden rounded-lg border border-[#334155] bg-[#1e293b] shadow-xl">
                        {roomLanguages.map(l => (
                          <button
                            key={l.value}
                            onClick={() => { ws.sendLanguageChange(l.value); setShowLangDropdown(false) }}
                            className={`w-full px-3 py-2 text-left text-xs transition-colors ${lang === l.value ? 'bg-[#0f172a] text-[#6366F1]' : 'text-[#94a3b8] hover:bg-[#0f172a] hover:text-white'}`}
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="h-[52vh] min-h-[320px]">
                <Editor
                  height="100%"
                  language={getMonacoLanguage(lang)}
                  defaultValue={initialCodeRef.current}
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
              <div className="border-t border-[#e2e8f0] px-4 py-3 dark:border-[#1e3158]">
                {submitResult ? (
                  <div className="space-y-3">
                    <div className={`rounded-2xl p-3 ${submitResult.isCorrect ? 'border border-[#86efac] bg-[#e8f9ef] dark:border-[#166534] dark:bg-[#0d2a1f]' : 'border border-[#fca5a5] bg-[#fef2f2] dark:border-[#991b1b] dark:bg-[#2a0f0f]'}`}>
                      <div className="mb-2 flex items-center gap-2">
                        {submitResult.isCorrect ? <Check className="w-4 h-4 text-[#22c55e]" /> : <X className="w-4 h-4 text-[#ef4444]" />}
                        <span className="text-sm font-semibold text-[#111111] dark:text-[#e2e8f0]">{submitResult.isCorrect ? t('codeRoom.accepted') : t('codeRoom.needsWork')}</span>
                      </div>
                      {submitResult.output && <pre className="whitespace-pre-wrap text-xs text-[#475569] dark:text-[#94a3b8]">{submitResult.output}</pre>}
                      {submitResult.error && <pre className="mt-2 whitespace-pre-wrap text-xs text-[#ef4444]">{submitResult.error}</pre>}
                    </div>
                    {submitResult.submissionId && <ReviewCard review={solveReview} loading={solveReviewLoading} showComparison={false} />}
                  </div>
                ) : (
                  <p className="text-xs text-[#94a3b8]">{t('codeRoom.runResultsPlaceholder')}</p>
                )}
              </div>
            </div>
          </div>

          {mobilePanel === 'ai' && (
            <div className="overflow-hidden rounded-[30px] border border-[#d8d9d6] bg-white shadow-[0_16px_32px_rgba(15,23,42,0.08)] dark:border-[#1e3158] dark:bg-[#161c2d]">
              <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-4 py-3 dark:border-[#1e3158]">
                <Sparkles className="w-4 h-4 text-[#6366F1]" />
                <span className="text-sm font-bold text-[#111111] dark:text-[#e2e8f0]">{t('codeRoom.aiAssistant')}</span>
              </div>
              <div className="flex border-b border-[#e2e8f0] dark:border-[#1e3158]">
                {(['hints', 'result', 'review'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setAiTab(tab)}
                    className={`px-3 py-2.5 text-xs font-medium transition-colors ${aiTab === tab ? 'border-b-2 border-[#6366F1] text-[#111111] dark:text-[#e2e8f0]' : 'text-[#666666] dark:text-[#64748b]'}`}
                  >
                    {tab === 'hints' ? t('codeRoom.aiTabs.hints') : tab === 'result' ? t('codeRoom.aiTabs.result') : t('codeRoom.aiTabs.review')}
                  </button>
                ))}
              </div>
              <div className="p-4">
                {aiTab === 'hints' ? (
                  <div className="flex flex-col gap-3">
                    {hints.length === 0 ? (
                      <>
                        <p className="text-sm leading-relaxed text-[#666666] dark:text-[#94a3b8]">
                          {t('codeRoom.aiHelp')}
                        </p>
                        <Button
                          variant="orange"
                          size="sm"
                          className="w-full rounded-2xl"
                          onClick={() => setHints(aiHints)}
                        >
                          <Sparkles className="w-3.5 h-3.5" /> {t('codeRoom.getHint')}
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {hints.map((hint, i) => (
                          <div key={i} className="rounded-2xl border border-[#FDBA74] bg-[#FFF7ED] p-3 dark:border-[#78350f] dark:bg-[#2a1a06]">
                            <p className="mb-0.5 text-xs font-semibold text-[#9a3412] dark:text-[#fbbf24]">{t('codeRoom.hintN', { index: i + 1 })}</p>
                            <p className="text-sm text-[#111111] dark:text-[#e2e8f0]">{hint}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : aiTab === 'result' ? (
                  <div className="flex flex-col gap-3">
                    {submitResult ? (
                      <div className={`rounded-2xl p-3 ${submitResult.isCorrect ? 'border border-[#86efac] bg-[#e8f9ef] dark:border-[#166534] dark:bg-[#0d2a1f]' : 'border border-[#fca5a5] bg-[#fef2f2] dark:border-[#991b1b] dark:bg-[#2a0f0f]'}`}>
                        <div className="mb-2 flex items-center gap-2">
                          {submitResult.isCorrect ? <Check className="w-4 h-4 text-[#22c55e]" /> : <X className="w-4 h-4 text-[#ef4444]" />}
                          <span className="text-sm font-semibold dark:text-[#e2e8f0]">{submitResult.isCorrect ? t('codeRoom.acceptedBang') : t('codeRoom.wrong')}</span>
                        </div>
                        {submitResult.output && <pre className="whitespace-pre-wrap font-mono text-xs text-[#475569] dark:text-[#94a3b8]">{submitResult.output}</pre>}
                        {submitResult.error && <pre className="whitespace-pre-wrap font-mono text-xs text-[#ef4444]">{submitResult.error}</pre>}
                      </div>
                    ) : (
                      <p className="text-sm text-[#94a3b8]">{t('codeRoom.runToSeeResults')}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {reviewLoading ? (
                      <div className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#CBCCC9] border-t-[#6366F1] dark:border-[#1e3158]" />
                        <p className="text-sm text-[#666666] dark:text-[#94a3b8]">{t('codeRoom.analyzingCode')}</p>
                      </div>
                    ) : aiReview ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold text-[#111111] dark:text-[#e2e8f0]">{t('codeRoom.reviewResult')}</p>
                        <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#666666] dark:text-[#94a3b8]">{aiReview}</p>
                        <button onClick={() => setAiReview(null)} className="mt-1 text-left text-xs text-[#6366F1] hover:underline">{t('codeRoom.runAgain')}</button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <p className="text-xs text-[#666666] dark:text-[#94a3b8]">{t('codeRoom.optionalPrompt')}</p>
                        <textarea
                          value={reviewPrompt}
                          onChange={e => setReviewPrompt(e.target.value)}
                          placeholder={t('codeRoom.reviewPromptPlaceholder')}
                          rows={4}
                          className="w-full resize-none rounded-2xl border border-[#CBCCC9] bg-[#F2F3F0] px-3 py-2 text-xs focus:outline-none dark:border-[#1e3158] dark:bg-[#0d1117] dark:text-[#e2e8f0]"
                        />
                        <Button variant="primary" size="sm" className="w-full rounded-2xl" onClick={() => handleRunReview(reviewPrompt)} loading={reviewLoading}>
                          <Bot className="w-3.5 h-3.5" /> {t('codeRoom.runReview')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col gap-2">
            {notifications.map(n => (
              <div
                key={n.id}
                className="flex items-center gap-2 rounded-xl bg-[#1e293b] px-4 py-2.5 text-xs text-white shadow-lg animate-fade-in"
              >
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#94a3b8]" />
                {n.text}
              </div>
            ))}
          </div>
        )}

        {showTaskEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-[#CBCCC9] bg-white shadow-xl dark:border-[#1e3158] dark:bg-[#161c2d]">
              <div className="flex items-center justify-between border-b border-[#CBCCC9] px-5 py-4 dark:border-[#1e3158]">
                <h2 className="text-sm font-bold text-[#111111] dark:text-[#e2e8f0]">{t('codeRoom.taskStatement')}</h2>
                <button onClick={() => setShowTaskEditor(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#666666] hover:bg-[#F2F3F0] dark:text-[#94a3b8] dark:hover:bg-[#1a2236]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col gap-4 p-5">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#666666]">{t('codeRoom.taskTitle')}</label>
                  <input
                    value={editTaskTitle}
                    onChange={e => setEditTaskTitle(e.target.value)}
                    placeholder={t('codeRoom.taskTitlePlaceholder')}
                    className="w-full rounded-lg border border-[#CBCCC9] bg-white px-3 py-2 text-sm text-[#111111] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/10 dark:border-[#1e3158] dark:bg-[#0f1117] dark:text-[#e2e8f3]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#666666]">{t('codeRoom.taskStatement')}</label>
                  <textarea
                    value={editTaskStatement}
                    onChange={e => setEditTaskStatement(e.target.value)}
                    placeholder={t('codeRoom.taskStatementPlaceholder')}
                    rows={8}
                    className="w-full resize-none rounded-lg border border-[#CBCCC9] bg-white px-3 py-2 font-mono text-sm text-[#111111] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/10 dark:border-[#1e3158] dark:bg-[#0f1117] dark:text-[#e2e8f3]"
                  />
                </div>
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <Button variant="secondary" size="sm" onClick={() => setShowTaskEditor(false)}>{t('common.cancel')}</Button>
                <Button variant="primary" size="sm" onClick={saveTask} disabled={!editTaskTitle.trim()}>{t('common.save')}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#F2F3F0] dark:bg-[#0d1117] overflow-hidden">
      {/* Top bar */}
      <header className="h-[52px] bg-white dark:bg-[#161c2d] border-b border-[#CBCCC9] dark:border-[#1e3158] flex items-center justify-between px-5 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleLeaveRoom(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236] text-[#666666] dark:text-[#94a3b8]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-bold text-[#0f172a] dark:text-[#e2e8f0]">{room?.task || t('codeRoom.title')}</p>
            <div className="flex items-center gap-2">
              {status && <Badge variant={status.variant}>{status.label}</Badge>}
              {ws.connected ? (
                <span className="flex items-center gap-1 text-[10px] text-[#22c55e]">
                  <Wifi className="w-3 h-3" /> {t('codeRoom.live')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-[#94a3b8]">
                  <WifiOff className="w-3 h-3" /> {t('codeRoom.offline')}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isDuelRoom && Array.from(ws.awareness.values()).map(a => (
            <div key={a.userId} className="relative" title={a.displayName}>
              <Avatar name={a.displayName} size="xs" />
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                style={{ background: getCursorColor(a.userId) }}
              />
            </div>
          ))}
          {(isDuelRoom ? room?.participants : room?.participants?.filter(p => !ws.awareness.has(p.userId || p.name)))?.map(p => (
            <Avatar key={p.userId || p.name} name={p.name} size="xs" className={!isDuelRoom ? 'opacity-40' : undefined} />
          ))}

          {/* Theme toggle — available to all */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? t('codeRoom.theme.light') : t('codeRoom.theme.dark')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236] text-[#666666] dark:text-[#94a3b8] transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-[#fbbf24]" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Copy invite link */}
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#666666] dark:text-[#4d6380] hover:text-[#111111] dark:hover:text-[#c8d8ec] hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236] rounded-lg transition-colors"
            title={t('codeRoom.copyInviteLink')}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? t('codeRoom.copied') : t('codeRoom.invite')}</span>
          </button>

          {isCreator && (
            <button
              onClick={handleTogglePrivacy}
              disabled={togglingPrivacy}
              title={room?.isPrivate ? t('codeRoom.makePublic') : t('codeRoom.makePrivate')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-50 ${room?.isPrivate ? 'text-[#6366F1] hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236]' : 'text-[#94a3b8] hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236]'}`}
            >
              {room?.isPrivate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{room?.isPrivate ? t('codeRoom.private') : t('codeRoom.public')}</span>
            </button>
          )}
          {isCreator && (
            <button
              onClick={() => setNotificationsEnabled(v => !v)}
              title={notificationsEnabled ? t('codeRoom.notifications.disable') : t('codeRoom.notifications.enable')}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${notificationsEnabled ? 'text-[#6366F1] hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236]' : 'text-[#94a3b8] hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236]'}`}
            >
              {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
          )}
          {!isDuelRoom && (
            <Button variant="ghost" size="sm" onClick={handleAiReview} loading={reviewLoading}>
              <Bot className="w-3.5 h-3.5" /> {t('codeRoom.aiReview')}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleRun} loading={running}>
            <Play className="w-3.5 h-3.5" /> {t('codeRoom.run')}
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
              {t('codeRoom.task')}
            </button>
            {canEditTask && (
              <button
                onClick={openTaskEditor}
                title="Edit task statement"
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
                ) : canEditTask ? (
                  <button
                    onClick={openTaskEditor}
                    className="text-xs text-[#6366F1] hover:underline"
                  >
                    {t('codeRoom.addDescription')}
                  </button>
                ) : (
                  <p className="text-xs text-[#94a3b8]">{t('codeRoom.noDescription')}</p>
                )}
              </div>
            ) : canEditTask ? (
              <button
                onClick={openTaskEditor}
                className="w-full h-full flex flex-col items-center justify-center gap-2 text-center py-8 text-[#94a3b8] hover:text-[#6366F1] transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl border-2 border-dashed border-[#CBCCC9] dark:border-[#1e3158] group-hover:border-[#6366F1] flex items-center justify-center transition-colors">
                  <Pencil className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium dark:text-[#94a3b8]">{t('codeRoom.addTaskStatement')}</span>
              </button>
            ) : (
              <p className="text-sm text-[#94a3b8] text-center py-8">{t('codeRoom.noTask')}</p>
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
          {isDuelRoom && room?.status === 'ROOM_STATUS_WAITING' ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 rounded-xl border border-[#2d3748] bg-[#0d1117]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#334155]">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#334155] border-t-[#6366F1]" />
              </div>
              <p className="text-sm font-semibold text-[#e2e8f0]">{t('codeRoom.duel.waitingForOpponent')}</p>
              <p className="text-xs text-[#64748b]">{t('codeRoom.duel.duelStartsWhenBothJoin')}</p>
            </div>
          ) : (
          <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-[#2d3748] shadow-md">
            <div className="h-9 bg-[#1e293b] flex items-center px-4 gap-3 flex-shrink-0">
              <span className="text-xs text-[#94a3b8] font-mono">
                solution.{lang === 'python' ? 'py' : lang === 'go' ? 'go' : lang === 'sql' ? 'sql' : 'txt'}
              </span>
              {isDuelRoom && (
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-[10px] text-[#64748b]">{t('codeRoom.duel.opponent')}</span>
                  <div className="h-1.5 w-20 rounded-full bg-[#0f172a] border border-[#334155] overflow-hidden">
                    <div
                      className="h-full bg-[#f59e0b] transition-all duration-300"
                      style={{ width: `${Math.min(100, ws.opponentCodeLen > 0 ? Math.round((ws.opponentCodeLen / Math.max(ws.opponentCodeLen, currentCodeRef.current.length || 1)) * 100) : 0)}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-[#64748b]">{ws.opponentCodeLen} ch</span>
                </div>
              )}
              <button
                onClick={() => { if (editorRef.current && monacoRef.current) formatEditorCode(editorRef.current, monacoRef.current) }}
                className="ml-auto rounded px-2 py-1 text-[10px] font-medium text-[#94a3b8] transition-colors hover:bg-[#0f172a] hover:text-white"
                title="Format (Shift+Alt+F)"
              >
                {t('codeRoom.format', 'Format')}
              </button>
              <div className="relative">
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
                      {roomLanguages.map(l => (
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
            <div className="relative flex-1">
              <Editor
                height="100%"
                language={getMonacoLanguage(lang)}
                defaultValue={initialCodeRef.current}
                onMount={handleEditorMount}
                options={{
                  fontSize: 13,
                  fontFamily: '"JetBrains Mono", monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  padding: { top: 12 },
                  theme: 'druzya-dark',
                  readOnly: isDuelRoom && lockCountdown > 0,
                }}
              />
              {isDuelRoom && lockCountdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
                  <div className="flex flex-col items-center gap-2 rounded-xl bg-[#1e293b] px-6 py-4 shadow-xl">
                    <span className="text-2xl font-bold tabular-nums text-[#ef4444]">{lockCountdown}s</span>
                    <span className="text-xs text-[#94a3b8]">{t('codeRoom.duel.editorLocked')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {/* AI panel — hidden in duel mode and hidden by default */}
        {!isDuelRoom && showAiPanel && (
          <div className="w-[280px] flex-shrink-0 bg-white dark:bg-[#161c2d] border-l border-[#CBCCC9] dark:border-[#1e3158] flex flex-col">
            <div className="px-4 py-3 border-b border-[#CBCCC9] dark:border-[#1e3158] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#6366F1]" />
                <span className="text-sm font-bold text-[#111111] dark:text-[#e2e8f0]">{t('codeRoom.aiAssistant')}</span>
            </div>
            <div className="flex border-b border-[#CBCCC9] dark:border-[#1e3158]">
              {(['hints', 'result', 'review'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAiTab(tab)}
                  className={`px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${aiTab === tab ? 'border-[#6366F1] text-[#111111] dark:text-[#e2e8f0]' : 'border-transparent text-[#666666] dark:text-[#64748b]'}`}
                >
                  {tab === 'hints' ? t('codeRoom.aiTabs.hints') : tab === 'result' ? t('codeRoom.aiTabs.result') : t('codeRoom.aiTabs.review')}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {aiTab === 'hints' ? (
                <div className="flex flex-col gap-3">
                  {hints.length === 0 ? (
                    <>
                      <p className="text-sm text-[#666666] dark:text-[#94a3b8] leading-relaxed">
                        {t('codeRoom.aiHelp')}
                      </p>
                      <Button
                        variant="orange"
                        size="sm"
                        className="w-full"
                        onClick={() => setHints(aiHints)}
                      >
                        <Sparkles className="w-3.5 h-3.5" /> {t('codeRoom.getHint')}
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {hints.map((hint, i) => (
                        <div key={i} className="p-3 bg-[#FFF7ED] dark:bg-[#2a1a06] border border-[#FDBA74] dark:border-[#78350f] rounded-lg">
                          <p className="text-xs font-semibold text-[#9a3412] dark:text-[#fbbf24] mb-0.5">{t('codeRoom.hintN', { index: i + 1 })}</p>
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
                        <span className="text-sm font-semibold dark:text-[#e2e8f0]">{submitResult.isCorrect ? t('codeRoom.acceptedBang') : t('codeRoom.wrong')}</span>
                      </div>
                      {submitResult.output && <pre className="text-xs text-[#475569] dark:text-[#94a3b8] font-mono whitespace-pre-wrap">{submitResult.output}</pre>}
                      {submitResult.error && <pre className="text-xs text-[#ef4444] font-mono whitespace-pre-wrap">{submitResult.error}</pre>}
                    </div>
                  ) : (
                    <p className="text-sm text-[#94a3b8]">{t('codeRoom.runToSeeResults')}</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {reviewLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-[#CBCCC9] dark:border-[#1e3158] border-t-[#6366F1] rounded-full animate-spin" />
                      <p className="text-sm text-[#666666] dark:text-[#94a3b8]">{t('codeRoom.analyzingCode')}</p>
                    </div>
                  ) : aiReview ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-[#111111] dark:text-[#e2e8f0]">{t('codeRoom.reviewResult')}</p>
                      <p className="text-xs text-[#666666] dark:text-[#94a3b8] whitespace-pre-wrap leading-relaxed">{aiReview}</p>
                      <button onClick={() => setAiReview(null)} className="text-xs text-[#6366F1] hover:underline mt-1">{t('codeRoom.runAgain')}</button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs text-[#666666] dark:text-[#94a3b8]">{t('codeRoom.optionalPrompt')}</p>
                      <textarea
                        value={reviewPrompt}
                        onChange={e => setReviewPrompt(e.target.value)}
                        placeholder={t('codeRoom.reviewPromptPlaceholder')}
                        rows={3}
                        className="w-full px-3 py-2 text-xs bg-[#F2F3F0] dark:bg-[#0d1117] dark:text-[#e2e8f0] border border-[#CBCCC9] dark:border-[#1e3158] rounded-lg focus:outline-none resize-none"
                      />
                      <Button variant="primary" size="sm" className="w-full" onClick={() => handleRunReview(reviewPrompt)} loading={reviewLoading}>
                        <Bot className="w-3.5 h-3.5" /> {t('codeRoom.runReview')}
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
              <h2 className="text-sm font-bold text-[#111111] dark:text-[#e2e8f0]">{t('codeRoom.taskStatement')}</h2>
              <button onClick={() => setShowTaskEditor(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236] text-[#666666] dark:text-[#94a3b8]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1.5 block">{t('codeRoom.taskTitle')}</label>
                <input
                  value={editTaskTitle}
                  onChange={e => setEditTaskTitle(e.target.value)}
                  placeholder={t('codeRoom.taskTitlePlaceholder')}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0f1117] text-[#111111] dark:text-[#e2e8f3] border border-[#CBCCC9] dark:border-[#1e3158] rounded-lg focus:outline-none focus:border-[#6366F1] dark:focus:border-[#6366F1] placeholder:text-[#94a3b8] focus:ring-2 focus:ring-[#6366F1]/10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1.5 block">{t('codeRoom.taskStatement')}</label>
                <textarea
                  value={editTaskStatement}
                  onChange={e => setEditTaskStatement(e.target.value)}
                  placeholder={t('codeRoom.taskStatementPlaceholder')}
                  rows={8}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0f1117] text-[#111111] dark:text-[#e2e8f3] border border-[#CBCCC9] dark:border-[#1e3158] rounded-lg focus:outline-none focus:border-[#6366F1] dark:focus:border-[#6366F1] placeholder:text-[#94a3b8] focus:ring-2 focus:ring-[#6366F1]/10 resize-none font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <Button variant="secondary" size="sm" onClick={() => setShowTaskEditor(false)}>{t('common.cancel')}</Button>
              <Button variant="primary" size="sm" onClick={saveTask} disabled={!editTaskTitle.trim()}>{t('common.save')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Leave / End session confirm modal */}
      <Modal
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        title={t('codeRoom.leave.title')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowLeaveConfirm(false)}>{t('codeRoom.leave.stay')}</Button>
            <Button variant="orange" size="sm" onClick={() => handleLeaveRoom(true)}>{t('codeRoom.leave.confirm')}</Button>
          </>
        }
      >
        <p className="text-sm text-[#475569] dark:text-[#94a3b8]">
          {t('codeRoom.leave.body')}
        </p>
      </Modal>
    </div>
  )
}
