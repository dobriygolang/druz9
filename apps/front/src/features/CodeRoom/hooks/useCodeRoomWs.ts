import { useEffect, useRef, useState, useCallback } from 'react'
import { RealtimeSocket, buildWsUrl } from '@/shared/api/ws'

/* ─── Message types matching backend schema ─── */
interface CodeEditorMessage {
  type:
    | 'hello'
    | 'snapshot'
    | 'update'
    | 'awareness'
    | 'awareness_remove'
    | 'room_update'
    | 'submission'
    | 'ping'
    | 'pong'
  clientId?: string
  awarenessId?: number
  userId?: string
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
  enabled?: boolean
  initialLanguage?: string
  onLeave?: (userId: string, displayName: string) => void
  onBehaviorEvent?: (userId: string, displayName: string, event: BehaviorEventType) => void
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
  code: string
  language: string
  awareness: Map<string, AwarenessState>
  lastSubmission: SubmissionResult | null
  lastRoomUpdate: unknown
  sendUpdate: (code: string) => void
  sendLanguageChange: (lang: string) => void
  sendAwareness: (line: number, column: number, selection?: SelectionInfo, meta?: Record<string, unknown>) => void
}

export function useCodeRoomWs(opts: UseCodeRoomWsOptions): UseCodeRoomWsReturn {
  const { roomId, userId, displayName, guestName, enabled = true, initialLanguage, onLeave, onBehaviorEvent } = opts
  const onLeaveRef = useRef(onLeave)
  onLeaveRef.current = onLeave
  const onBehaviorRef = useRef(onBehaviorEvent)
  onBehaviorRef.current = onBehaviorEvent

  const socketRef = useRef<RealtimeSocket | null>(null)
  const clientId = useRef(`client-${Math.random().toString(36).slice(2, 10)}`)
  const awarenessId = useRef(Math.floor(Math.random() * 0xffffffff))

  const [connected, setConnected] = useState(false)
  const [gotSnapshot, setGotSnapshot] = useState(false)
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState(initialLanguage ?? 'python')
  const [awareness, setAwareness] = useState<Map<string, AwarenessState>>(new Map())
  const [lastSubmission, setLastSubmission] = useState<SubmissionResult | null>(null)
  const [lastRoomUpdate, setLastRoomUpdate] = useState<unknown>(null)

  const isRemoteUpdate = useRef(false)

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

  const handleMessage = useCallback((raw: unknown) => {
    const msg = raw as CodeEditorMessage
    switch (msg.type) {
      case 'snapshot': {
        isRemoteUpdate.current = true
        if (msg.plainText !== undefined) setCode(msg.plainText)
        if (msg.language) setLanguage(msg.language)
        isRemoteUpdate.current = false
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
      case 'awareness': {
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

          pendingAwareness.current.set(msg.userId!, {
            action: 'set',
            state: {
              userId: msg.userId!,
              displayName: incomingDisplayName,
              cursorLine: cursorData.cursorLine as number | undefined,
              cursorColumn: cursorData.cursorColumn as number | undefined,
              selStartLine: cursorData.selStartLine as number | undefined,
              selStartCol: cursorData.selStartCol as number | undefined,
              selEndLine: cursorData.selEndLine as number | undefined,
              selEndCol: cursorData.selEndCol as number | undefined,
              tabHidden: cursorData.tabHidden as boolean | undefined,
              pastedCode: cursorData.pastedCode as boolean | undefined,
            },
          })
          scheduleAwarenessFlush()
        }
        break
      }
      case 'awareness_remove': {
        if (msg.userId) {
          // Check pending batch first, then fall back to committed state via callback
          const pendingEntry = pendingAwareness.current.get(msg.userId!)
          const pendingDisplayName = pendingEntry && pendingEntry.action === 'set'
            ? pendingEntry.state.displayName : undefined
          pendingAwareness.current.set(msg.userId!, { action: 'delete' })
          scheduleAwarenessFlush()
          // Fire onLeave - if we have a pending displayName use it, otherwise
          // the callback from the committed state is handled by the flush
          if (pendingDisplayName) {
            onLeaveRef.current?.(msg.userId!, pendingDisplayName)
          } else {
            // Read from committed state synchronously via a one-off setState
            setAwareness(prev => {
              const existing = prev.get(msg.userId!)
              if (existing) {
                onLeaveRef.current?.(msg.userId!, existing.displayName)
              }
              return prev // no change, flush handles deletion
            })
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
  }, [scheduleAwarenessFlush])

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
      },
      onClose: () => setConnected(false),
    })

    socketRef.current = socket
    socket.connect()

    return () => {
      socket.close()
      socketRef.current = null
      setConnected(false)
      // Cancel any pending awareness batch
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current)
        rafId.current = null
      }
      pendingAwareness.current.clear()
    }
  }, [roomId, userId, enabled, handleMessage, displayName, guestName])

  const sendUpdate = useCallback((newCode: string) => {
    if (isRemoteUpdate.current) return
    socketRef.current?.send({
      type: 'update',
      clientId: clientId.current,
      plainText: newCode,
    })
  }, [])

  const sendLanguageChange = useCallback((lang: string) => {
    setLanguage(lang)
    socketRef.current?.send({ type: 'update', language: lang })
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
    socketRef.current?.send({
      type: 'awareness',
      awarenessId: awarenessId.current,
      userId: userId ?? guestName ?? 'anonymous',
      data: JSON.stringify(cursorData),
    })
  }, [userId, guestName, displayName])

  return { connected, gotSnapshot, code, language, awareness, lastSubmission, lastRoomUpdate, sendUpdate, sendLanguageChange, sendAwareness }
}
