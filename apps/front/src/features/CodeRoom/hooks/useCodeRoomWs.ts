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
  onLeave?: (userId: string, displayName: string) => void
}

export interface SelectionInfo {
  startLine: number
  startCol: number
  endLine: number
  endCol: number
}

interface UseCodeRoomWsReturn {
  connected: boolean
  code: string
  language: string
  awareness: Map<string, AwarenessState>
  lastSubmission: SubmissionResult | null
  lastRoomUpdate: unknown
  sendUpdate: (code: string) => void
  sendLanguageChange: (lang: string) => void
  sendAwareness: (line: number, column: number, selection?: SelectionInfo) => void
}

export function useCodeRoomWs(opts: UseCodeRoomWsOptions): UseCodeRoomWsReturn {
  const { roomId, userId, displayName, guestName, enabled = true, onLeave } = opts
  const onLeaveRef = useRef(onLeave)
  onLeaveRef.current = onLeave
  const socketRef = useRef<RealtimeSocket | null>(null)
  const clientId = useRef(`client-${Math.random().toString(36).slice(2, 10)}`)
  const awarenessId = useRef(Math.floor(Math.random() * 0xffffffff))

  const [connected, setConnected] = useState(false)
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('python')
  const [awareness, setAwareness] = useState<Map<string, AwarenessState>>(new Map())
  const [lastSubmission, setLastSubmission] = useState<SubmissionResult | null>(null)
  const [lastRoomUpdate, setLastRoomUpdate] = useState<unknown>(null)

  // Track whether updates come from remote to avoid echo
  const isRemoteUpdate = useRef(false)

  const handleMessage = useCallback((raw: unknown) => {
    const msg = raw as CodeEditorMessage
    switch (msg.type) {
      case 'snapshot': {
        isRemoteUpdate.current = true
        if (msg.plainText !== undefined) setCode(msg.plainText)
        if (msg.language) setLanguage(msg.language)
        isRemoteUpdate.current = false
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
            try { cursorData = JSON.parse(msg.data) } catch {}
          }
          // active: false means user disconnected
          if (cursorData.active === false) {
            const displayName = (cursorData.displayName as string) ?? msg.userId!
            setAwareness(prev => { const next = new Map(prev); next.delete(msg.userId!); return next })
            onLeaveRef.current?.(msg.userId!, displayName)
            break
          }
          setAwareness(prev => {
            const next = new Map(prev)
            next.set(msg.userId!, {
              userId: msg.userId!,
              displayName: (cursorData.displayName as string) ?? msg.userId!,
              cursorLine: cursorData.cursorLine as number | undefined,
              cursorColumn: cursorData.cursorColumn as number | undefined,
              selStartLine: cursorData.selStartLine as number | undefined,
              selStartCol: cursorData.selStartCol as number | undefined,
              selEndLine: cursorData.selEndLine as number | undefined,
              selEndCol: cursorData.selEndCol as number | undefined,
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
        if (msg.room) {
          setLastRoomUpdate(msg.room)
        }
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
      plainText: newCode,
    })
  }, [])

  const sendLanguageChange = useCallback((lang: string) => {
    setLanguage(lang)
    socketRef.current?.send({ type: 'update', language: lang })
  }, [])

  const sendAwareness = useCallback((line: number, column: number, selection?: SelectionInfo) => {
    const cursorData: Record<string, unknown> = {
      displayName,
      cursorLine: line,
      cursorColumn: column,
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

  return { connected, code, language, awareness, lastSubmission, lastRoomUpdate, sendUpdate, sendLanguageChange, sendAwareness }
}
