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
  code?: string
  language?: string
  awareness?: Record<string, AwarenessState>
  room?: unknown
  submission?: SubmissionResult
}

export interface AwarenessState {
  userId: string
  displayName: string
  cursorLine?: number
  cursorColumn?: number
  color?: string
}

export interface SubmissionResult {
  isCorrect: boolean
  passedCount: number
  totalCount: number
  output: string
  error: string
}

interface UseCodeRoomWsOptions {
  roomId: string | undefined
  userId: string | undefined
  displayName: string
  /** If no userId, connect as guest with this name */
  guestName?: string
  enabled?: boolean
}

interface UseCodeRoomWsReturn {
  connected: boolean
  code: string
  language: string
  awareness: Map<string, AwarenessState>
  lastSubmission: SubmissionResult | null
  sendUpdate: (code: string) => void
  sendAwareness: (line: number, column: number) => void
}

export function useCodeRoomWs(opts: UseCodeRoomWsOptions): UseCodeRoomWsReturn {
  const { roomId, userId, displayName, guestName, enabled = true } = opts
  const socketRef = useRef<RealtimeSocket | null>(null)
  const clientId = useRef(`client-${Math.random().toString(36).slice(2, 10)}`)
  const awarenessId = useRef(Math.floor(Math.random() * 0xffffffff))

  const [connected, setConnected] = useState(false)
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('python')
  const [awareness, setAwareness] = useState<Map<string, AwarenessState>>(new Map())
  const [lastSubmission, setLastSubmission] = useState<SubmissionResult | null>(null)

  // Track whether updates come from remote to avoid echo
  const isRemoteUpdate = useRef(false)

  const handleMessage = useCallback((raw: unknown) => {
    const msg = raw as CodeEditorMessage
    switch (msg.type) {
      case 'snapshot': {
        isRemoteUpdate.current = true
        if (msg.code !== undefined) setCode(msg.code)
        if (msg.language) setLanguage(msg.language)
        if (msg.awareness) {
          setAwareness(new Map(Object.entries(msg.awareness)))
        }
        isRemoteUpdate.current = false
        break
      }
      case 'update': {
        isRemoteUpdate.current = true
        if (msg.code !== undefined) setCode(msg.code)
        isRemoteUpdate.current = false
        break
      }
      case 'awareness': {
        if (msg.userId && msg.awarenessId !== undefined) {
          setAwareness(prev => {
            const next = new Map(prev)
            next.set(msg.userId!, {
              userId: msg.userId!,
              displayName: (msg as any).displayName ?? msg.userId!,
              cursorLine: (msg as any).cursorLine,
              cursorColumn: (msg as any).cursorColumn,
              color: (msg as any).color,
            })
            return next
          })
        }
        break
      }
      case 'awareness_remove': {
        if (msg.userId) {
          setAwareness(prev => {
            const next = new Map(prev)
            next.delete(msg.userId!)
            return next
          })
        }
        break
      }
      case 'room_update': {
        // Room metadata changed (status, participants, etc.)
        break
      }
      case 'submission': {
        if (msg.submission) {
          setLastSubmission(msg.submission)
        }
        break
      }
    }
  }, [])

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
    }
  }, [roomId, userId, enabled, handleMessage, displayName, guestName])

  const sendUpdate = useCallback((newCode: string) => {
    if (isRemoteUpdate.current) return
    socketRef.current?.send({
      type: 'update',
      clientId: clientId.current,
      code: newCode,
    })
  }, [])

  const sendAwareness = useCallback((line: number, column: number) => {
    socketRef.current?.send({
      type: 'awareness',
      awarenessId: awarenessId.current,
      userId: userId ?? guestName ?? 'anonymous',
      cursorLine: line,
      cursorColumn: column,
      displayName,
    })
  }, [userId, guestName, displayName])

  return { connected, code, language, awareness, lastSubmission, sendUpdate, sendAwareness }
}
