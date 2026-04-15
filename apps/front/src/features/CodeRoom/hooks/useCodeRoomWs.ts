import { useEffect, useRef, useState, useCallback } from 'react'
import { RealtimeSocket, buildWsUrl } from '@/shared/api/ws'

/* ─── Message types matching backend schema ─── */
interface CodeEditorMessage {
  type:
    | 'hello'
    | 'snapshot'
    | 'update'
    | 'doc_sync'
    | 'persist'
    | 'awareness'
    | 'awareness_remove'
    | 'room_update'
    | 'submission'
    | 'language'
    | 'ping'
    | 'pong'
  clientId?: string
  awarenessId?: number
  userId?: string
  activeClientCount?: number
  plainText?: string
  data?: string
  language?: string
  room?: unknown
  submission?: SubmissionResult
}

export interface AwarenessState {
  userId: string
  displayName: string
  cursorLine?: number
  cursorColumn?: number
  selStartLine?: number
  selStartCol?: number
  selEndLine?: number
  selEndCol?: number
  tabHidden?: boolean
  pastedCode?: boolean
  codeLen?: number
}

export interface SubmissionResult {
  isCorrect: boolean
  passedCount: number
  totalCount: number
  output: string
  error: string
}

export type BehaviorEventType = 'tab_hidden' | 'tab_visible' | 'pasted'

interface UseCodeRoomWsOptions {
  roomId: string | undefined
  userId: string | undefined
  displayName: string
  guestName?: string
  mode?: 'ROOM_MODE_ALL' | 'ROOM_MODE_DUEL'
  enabled?: boolean
  initialLanguage?: string
  onDocSync?: (data: string) => void
  onLeave?: (userId: string, displayName: string) => void
  onBehaviorEvent?: (userId: string, displayName: string, event: BehaviorEventType) => void
  /** Fired synchronously on every cursor position change — use for direct widget updates without React cycle */
  onCursorUpdate?: (userId: string, line: number, col: number, remoteCodeLen?: number) => void
}

export interface SelectionInfo {
  startLine: number
  startCol: number
  endLine: number
  endCol: number
}

interface UseCodeRoomWsReturn {
  connected: boolean
  gotSnapshot: boolean
  snapshotActiveClientCount: number
  code: string
  language: string
  awareness: Map<string, AwarenessState>
  lastSubmission: SubmissionResult | null
  lastRoomUpdate: unknown
  sendUpdate: (code: string) => void
  sendDocSync: (data: string) => void
  persistCode: (code: string) => void
  sendLanguageChange: (lang: string) => void
  sendAwareness: (line: number, column: number, selection?: SelectionInfo, meta?: Record<string, unknown>) => void
}

export function useCodeRoomWs(opts: UseCodeRoomWsOptions): UseCodeRoomWsReturn {
  const { roomId, userId, displayName, guestName, mode, enabled = true, initialLanguage, onDocSync, onLeave, onBehaviorEvent, onCursorUpdate } = opts
  const onDocSyncRef = useRef(onDocSync)
  onDocSyncRef.current = onDocSync
  const onLeaveRef = useRef(onLeave)
  onLeaveRef.current = onLeave
  const onBehaviorRef = useRef(onBehaviorEvent)
  onBehaviorRef.current = onBehaviorEvent
  const onCursorUpdateRef = useRef(onCursorUpdate)
  onCursorUpdateRef.current = onCursorUpdate

  const socketRef = useRef<RealtimeSocket | null>(null)
  const clientId = useRef(`client-${Math.random().toString(36).slice(2, 10)}`)
  const awarenessId = useRef(Math.floor(Math.random() * 0xffffffff))
  const queuedDocSyncRef = useRef<string[]>([])
  const queuedAwarenessPayloadRef = useRef<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [gotSnapshot, setGotSnapshot] = useState(false)
  const [snapshotActiveClientCount, setSnapshotActiveClientCount] = useState(0)
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState(initialLanguage ?? 'python')
  const [awareness, setAwareness] = useState<Map<string, AwarenessState>>(new Map())
  const [lastSubmission, setLastSubmission] = useState<SubmissionResult | null>(null)
  const [lastRoomUpdate, setLastRoomUpdate] = useState<unknown>(null)

  const isRemoteUpdate = useRef(false)
  const languageRef = useRef(language)
  languageRef.current = language

  // Fast userId→displayName index — avoids reading React state to resolve names
  const displayNameIndex = useRef<Map<string, string>>(new Map())
  // Batch awareness updates into a single React render per animation frame
  const pendingAwareness = useRef<Map<string, { action: 'set'; state: AwarenessState } | { action: 'delete' }>>(new Map())
  const rafId = useRef<number | null>(null)

  const flushAwareness = useCallback(() => {
    rafId.current = null
    const batch = pendingAwareness.current
    if (batch.size === 0) return
    // Copy and clear before applying to avoid re-entrancy issues
    const entries = new Map(batch)
    batch.clear()

    setAwareness(prev => {
      const next = new Map(prev)
      entries.forEach((op, key) => {
        if (op.action === 'delete') {
          next.delete(key)
        } else {
          next.set(key, op.state)
        }
      })
      return next
    })
  }, [])

  const scheduleAwarenessFlush = useCallback(() => {
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(flushAwareness)
    }
  }, [flushAwareness])

  const flushOutboundQueue = useCallback((socket?: RealtimeSocket | null) => {
    const target = socket ?? socketRef.current
    if (!target?.isConnected) return

    while (queuedDocSyncRef.current.length > 0) {
      const data = queuedDocSyncRef.current.shift()
      if (!data) continue
      target.send({
        type: 'doc_sync',
        clientId: clientId.current,
        data,
      })
    }

    const awarenessPayload = queuedAwarenessPayloadRef.current
    queuedAwarenessPayloadRef.current = null
    if (awarenessPayload) {
      target.send({
        type: 'awareness',
        awarenessId: awarenessId.current,
        userId: userId ?? guestName ?? 'anonymous',
        data: awarenessPayload,
      })
    }
  }, [guestName, userId])

  useEffect(() => {
    setConnected(false)
    setGotSnapshot(false)
    setSnapshotActiveClientCount(0)
    setCode('')
    setAwareness(new Map())
    setLastSubmission(null)
    setLastRoomUpdate(null)
  }, [roomId, enabled, mode])

  useEffect(() => {
    if (initialLanguage) {
      setLanguage(initialLanguage)
    }
  }, [initialLanguage])

  const handleMessage = useCallback((raw: unknown) => {
    const msg = raw as CodeEditorMessage
    switch (msg.type) {
      case 'snapshot': {
        isRemoteUpdate.current = true
        if (msg.plainText !== undefined) setCode(msg.plainText)
        if (msg.language) setLanguage(msg.language)
        isRemoteUpdate.current = false
        setSnapshotActiveClientCount(msg.activeClientCount ?? 0)
        setGotSnapshot(true)
        break
      }
      case 'update': {
        isRemoteUpdate.current = true
        if (msg.plainText !== undefined) setCode(msg.plainText)
        if (msg.language) setLanguage(msg.language)
        isRemoteUpdate.current = false
        break
      }
      case 'language': {
        if (msg.language) setLanguage(msg.language)
        if (msg.plainText !== undefined) setCode(msg.plainText)
        break
      }
      case 'doc_sync': {
        if (msg.data) onDocSyncRef.current?.(msg.data)
        break
      }
      case 'awareness': {
        if (mode === 'ROOM_MODE_DUEL') break
        if (msg.userId && msg.awarenessId !== undefined) {
          let cursorData: Record<string, unknown> = {}
          if (msg.data) {
            try { cursorData = JSON.parse(msg.data) } catch (err) { console.error('Failed to parse cursor data:', err) }
          }

          const incomingDisplayName = (cursorData.displayName as string) ?? msg.userId!
          // Explicit disconnect signal
          if (cursorData.active === false) {
            pendingAwareness.current.set(msg.userId!, { action: 'delete' })
            scheduleAwarenessFlush()
            onLeaveRef.current?.(msg.userId!, incomingDisplayName)
            break
          }

          // Detect behavior transitions for anti-cheat (read current state synchronously)
          const existing = pendingAwareness.current.has(msg.userId!)
            ? (pendingAwareness.current.get(msg.userId!) as { action: 'set'; state: AwarenessState } | undefined)?.state
            : undefined
          if (cursorData.tabHidden === true && !existing?.tabHidden) {
            onBehaviorRef.current?.(msg.userId!, incomingDisplayName, 'tab_hidden')
          } else if (cursorData.tabHidden === false && existing?.tabHidden) {
            onBehaviorRef.current?.(msg.userId!, incomingDisplayName, 'tab_visible')
          }
          if (cursorData.pastedCode === true && !existing?.pastedCode) {
            onBehaviorRef.current?.(msg.userId!, incomingDisplayName, 'pasted')
          }

          const cursorLine = cursorData.cursorLine as number | undefined
          const cursorColumn = cursorData.cursorColumn as number | undefined
          const remoteCodeLen = cursorData.codeLen as number | undefined

          // Fire synchronously — bypasses RAF/React for zero-lag widget repositioning
          if (cursorLine) {
            onCursorUpdateRef.current?.(msg.userId!, cursorLine, cursorColumn ?? 1, remoteCodeLen)
          }

          displayNameIndex.current.set(msg.userId!, incomingDisplayName)
          pendingAwareness.current.set(msg.userId!, {
            action: 'set',
            state: {
              userId: msg.userId!,
              displayName: incomingDisplayName,
              cursorLine,
              cursorColumn,
              selStartLine: cursorData.selStartLine as number | undefined,
              selStartCol: cursorData.selStartCol as number | undefined,
              selEndLine: cursorData.selEndLine as number | undefined,
              selEndCol: cursorData.selEndCol as number | undefined,
              tabHidden: cursorData.tabHidden as boolean | undefined,
              pastedCode: cursorData.pastedCode as boolean | undefined,
              codeLen: cursorData.codeLen as number | undefined,
            },
          })
          scheduleAwarenessFlush()
        }
        break
      }
      case 'awareness_remove': {
        if (mode === 'ROOM_MODE_DUEL') break
        if (msg.userId) {
          pendingAwareness.current.set(msg.userId!, { action: 'delete' })
          scheduleAwarenessFlush()
          const name = displayNameIndex.current.get(msg.userId!)
          if (name) {
            onLeaveRef.current?.(msg.userId!, name)
            displayNameIndex.current.delete(msg.userId!)
          }
        }
        break
      }
      case 'room_update': {
        if (msg.room) setLastRoomUpdate(msg.room)
        break
      }
      case 'submission': {
        if (msg.submission) setLastSubmission(msg.submission)
        break
      }
    }
  }, [mode, scheduleAwarenessFlush])

  useEffect(() => {
    if (!roomId || !enabled) return

    const url = buildWsUrl(`/api/v1/code-editor/realtime/${roomId}`)
    const socket = new RealtimeSocket({
      url,
      onMessage: handleMessage,
      onOpen: () => {
        setConnected(true)
        socket.send({
          type: 'hello',
          clientId: clientId.current,
          awarenessId: awarenessId.current,
          userId: userId ?? undefined,
          guestName: guestName ?? displayName,
        })
        flushOutboundQueue(socket)
      },
      onClose: () => setConnected(false),
    })

    socketRef.current = socket
    socket.connect()

    return () => {
      // Graceful departure: proactively signal other clients before the TCP close,
      // so their cursors are removed without waiting for server-side disconnect detection.
      if (socket.isConnected) {
        socket.send({
          type: 'awareness',
          awarenessId: awarenessId.current,
          userId: userId ?? guestName ?? 'anonymous',
          data: JSON.stringify({ displayName, active: false }),
        })
      }
      socket.close()
      socketRef.current = null
      setConnected(false)
      // Cancel any pending awareness batch
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current)
        rafId.current = null
      }
      queuedDocSyncRef.current = []
      queuedAwarenessPayloadRef.current = null
      pendingAwareness.current.clear()
      displayNameIndex.current.clear()
    }
  }, [roomId, userId, enabled, handleMessage, displayName, guestName, flushOutboundQueue])

  const sendUpdate = useCallback((newCode: string) => {
    if (isRemoteUpdate.current) return
    socketRef.current?.send({
      type: 'update',
      clientId: clientId.current,
      plainText: newCode,
      language: languageRef.current,
    })
  }, [])

  const sendDocSync = useCallback((data: string) => {
    if (!socketRef.current?.isConnected) {
      queuedDocSyncRef.current.push(data)
      if (queuedDocSyncRef.current.length > 200) {
        queuedDocSyncRef.current.splice(0, queuedDocSyncRef.current.length - 200)
      }
      return
    }

    socketRef.current.send({
      type: 'doc_sync',
      clientId: clientId.current,
      data,
    })
  }, [])

  const persistCode = useCallback((plainText: string) => {
    socketRef.current?.send({
      type: 'persist',
      clientId: clientId.current,
      plainText,
      language: languageRef.current,
    })
  }, [])

  const sendLanguageChange = useCallback((lang: string) => {
    setLanguage(lang)
    socketRef.current?.send({
      type: 'language',
      clientId: clientId.current,
      language: lang,
    })
  }, [])

  const sendAwareness = useCallback((
    line: number,
    column: number,
    selection?: SelectionInfo,
    meta?: Record<string, unknown>,
  ) => {
    const cursorData: Record<string, unknown> = {
      displayName,
      cursorLine: line,
      cursorColumn: column,
      ...meta,
    }
    if (selection) {
      cursorData.selStartLine = selection.startLine
      cursorData.selStartCol = selection.startCol
      cursorData.selEndLine = selection.endLine
      cursorData.selEndCol = selection.endCol
    }
    const payload = JSON.stringify(cursorData)
    if (!socketRef.current?.isConnected) {
      queuedAwarenessPayloadRef.current = payload
      return
    }

    socketRef.current.send({
      type: 'awareness',
      awarenessId: awarenessId.current,
      userId: userId ?? guestName ?? 'anonymous',
      data: payload,
    })
  }, [userId, guestName, displayName])

  return {
    connected,
    gotSnapshot,
    snapshotActiveClientCount,
    code,
    language,
    awareness,
    lastSubmission,
    lastRoomUpdate,
    sendUpdate,
    sendDocSync,
    persistCode,
    sendLanguageChange,
    sendAwareness,
  }
}
