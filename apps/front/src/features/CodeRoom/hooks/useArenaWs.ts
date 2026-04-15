import { useEffect, useRef, useState, useCallback } from 'react'
import { RealtimeSocket, buildWsUrl } from '@/shared/api/ws'

/* ─── Message types matching backend schema ─── */
interface ArenaMessage {
  type: 'hello' | 'snapshot' | 'code_update' | 'match' | 'ping' | 'pong'
  userId?: string
  displayName?: string
  spectator?: boolean
  players?: ArenaPlayerState[]
  match?: ArenaMatchState
  code?: string
  obfuscated?: boolean
}

export interface ArenaPlayerState {
  userId: string
  displayName: string
  code: string
  currentCode?: string
  obfuscated?: boolean
  submittedAt?: string
  isCorrect?: boolean
  freezeUntil?: string
  isCreator?: boolean
  isWinner?: boolean
}

export interface ArenaMatchState {
  id: string
  status: string
  taskTitle?: string
  taskStatement?: string
  starterCode?: string
  difficulty?: number | string
  difficultyLabel?: string
  durationSeconds?: number
  startedAt?: string
  winnerId?: string
  players?: ArenaPlayerState[]
}

interface UseArenaWsOptions {
  matchId: string | undefined
  userId: string | undefined
  displayName: string
  spectator?: boolean
  enabled?: boolean
}

interface UseArenaWsReturn {
  connected: boolean
  matchState: ArenaMatchState | null
  players: ArenaPlayerState[]
  /** Send local code change to server */
  sendCodeUpdate: (code: string) => void
  /** Whether opponent code is currently hidden */
  opponentHidden: boolean
}

export function useArenaWs(opts: UseArenaWsOptions): UseArenaWsReturn {
  const { matchId, userId, displayName, spectator = false, enabled = true } = opts
  const socketRef = useRef<RealtimeSocket | null>(null)

  const [connected, setConnected] = useState(false)
  const [matchState, setMatchState] = useState<ArenaMatchState | null>(null)
  const [players, setPlayers] = useState<ArenaPlayerState[]>([])

  const normalizePlayer = useCallback((player: ArenaPlayerState) => ({
    ...player,
    code: player.code ?? player.currentCode ?? '',
  }), [])

  const handleMessage = useCallback((raw: unknown) => {
    const msg = raw as ArenaMessage

    switch (msg.type) {
      case 'snapshot': {
        if (msg.match) setMatchState(msg.match)
        if (msg.players) setPlayers(msg.players.map(normalizePlayer))
        break
      }
      case 'code_update': {
        // Update a specific player's code
        if (msg.userId && msg.code !== undefined) {
          setPlayers(prev =>
            prev.map(p =>
              p.userId === msg.userId ? { ...p, code: msg.code!, obfuscated: msg.obfuscated ?? p.obfuscated } : p,
            ),
          )
        }
        break
      }
      case 'match': {
        // Match state update (status change, winner declared, etc.)
        if (msg.match) {
          setMatchState(msg.match)
        }
        if (msg.players) setPlayers(msg.players.map(normalizePlayer))
        break
      }
    }
  }, [normalizePlayer])

  useEffect(() => {
    if (!matchId || !enabled) return

    const url = buildWsUrl(`/api/v1/arena/realtime/${matchId}`)
    const socket = new RealtimeSocket({
      url,
      onMessage: handleMessage,
      onOpen: () => {
        setConnected(true)
        socket.send({
          type: 'hello',
          userId: userId ?? undefined,
          displayName,
          spectator,
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
  }, [matchId, userId, displayName, spectator, enabled, handleMessage])

  const sendCodeUpdate = useCallback((code: string) => {
    socketRef.current?.send({
      type: 'code_update',
      userId,
      code,
    })
  }, [userId])

  // Opponent code is hidden if any player has obfuscated flag
  const opponentHidden = players.some(
    p => p.userId !== userId && p.obfuscated,
  )

  return { connected, matchState, players, sendCodeUpdate, opponentHidden }
}
