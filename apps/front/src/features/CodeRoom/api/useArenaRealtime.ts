import { useEffect, useMemo, useRef, useState } from 'react';
import { ArenaMatch } from '@/entities/CodeRoom/model/types';
import { ENV } from '@/shared/config/env';

type ArenaRealtimeCode = {
  userId: string;
  displayName: string;
  code: string;
  isSelf: boolean;
};

type ArenaRealtimeMatch = ArenaMatch;

type ArenaRealtimeMessage = {
  type: 'hello' | 'snapshot' | 'code_update' | 'match' | 'ping' | 'pong';
  userId?: string;
  displayName?: string;
  code?: string;
  spectator?: boolean;
  updatedAt?: string;
  match?: ArenaRealtimeMatch;
  players?: ArenaRealtimeCode[];
};

const reconnectDelayMs = 1500;

const makeArenaWsUrl = (matchId: string) => {
  const raw = ENV.WS_URL || ENV.API_URL;
  if (!raw) {
    return `${window.location.origin.replace(/^http/, 'ws')}/api/v1/arena/realtime/${matchId}`;
  }
  const url = new URL(raw, window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `/api/v1/arena/realtime/${matchId}`;
  url.search = '';
  url.hash = '';
  return url.toString();
};

export const useArenaRealtime = ({
  matchId,
  userId,
  initialMatch,
  displayName,
  spectator,
}: {
  matchId: string;
  userId: string;
  initialMatch: ArenaMatch | null;
  displayName: string;
  spectator?: boolean;
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [match, setMatch] = useState<ArenaMatch | null>(initialMatch);
  const [selfCode, setSelfCode] = useState(initialMatch?.starterCode || '');
  const [opponentCode, setOpponentCode] = useState('');
  const [playerCodes, setPlayerCodes] = useState<Record<string, string>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const keepAliveTimerRef = useRef<number | null>(null);
  const latestCodeRef = useRef(selfCode);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    latestCodeRef.current = selfCode;
  }, [selfCode]);

  useEffect(() => {
    setMatch(initialMatch);
    const self = initialMatch?.players.find((item) => item.userId === userId);
    const opponent = initialMatch?.players.find((item) => item.userId !== userId);
    if (self?.currentCode) {
      setSelfCode(self.currentCode);
      latestCodeRef.current = self.currentCode;
    } else if (!latestCodeRef.current) {
      const starterCode = initialMatch?.starterCode || '';
      setSelfCode(starterCode);
      latestCodeRef.current = starterCode;
    }
    setOpponentCode(opponent?.currentCode || '');
    const nextCodes: Record<string, string> = {};
    for (const player of initialMatch?.players || []) {
      nextCodes[player.userId] = player.currentCode || '';
    }
    setPlayerCodes(nextCodes);
  }, [initialMatch, userId]);

  const wsUrl = useMemo(() => makeArenaWsUrl(matchId), [matchId]);

  useEffect(() => {
    if (!matchId || !userId) {
      return;
    }

    isUnmountedRef.current = false;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmountedRef.current) {
          ws.close();
          return;
        }
        setIsConnected(true);
        ws.send(JSON.stringify({ type: 'hello', userId, displayName, spectator: Boolean(spectator) }));
        keepAliveTimerRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ArenaRealtimeMessage;
          if (message.type === 'snapshot' || message.type === 'match') {
            if (message.match) {
              setMatch(message.match);
            }

            const players = message.players || [];
            const nextCodes: Record<string, string> = {};
            for (const player of players) {
              if (!player.userId) continue;
              nextCodes[player.userId] = player.code || '';
            }
            setPlayerCodes(nextCodes);

            if (!spectator) {
              const self = players.find((item) => item.userId === userId);
              const opponent = players.find((item) => item.userId !== userId);

              if (self && self.code && self.code !== latestCodeRef.current) {
                setSelfCode(self.code);
                latestCodeRef.current = self.code;
              }
              setOpponentCode(opponent?.code || '');
            }

            return;
          }

          if (message.type === 'code_update') {
            if (message.userId === userId) {
              return;
            }
            if (message.userId) {
              const uid = message.userId;
              setPlayerCodes((prev) => ({
                ...prev,
                [uid]: message.code || '',
              }));
            }
            if (!spectator) {
              setOpponentCode(message.code || '');
            }
          }
        } catch (error) {
          console.error('Failed to parse arena realtime message', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (keepAliveTimerRef.current) {
          window.clearInterval(keepAliveTimerRef.current);
          keepAliveTimerRef.current = null;
        }
        if (!isUnmountedRef.current) {
          reconnectTimerRef.current = window.setTimeout(connect, reconnectDelayMs);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      isUnmountedRef.current = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (keepAliveTimerRef.current) {
        window.clearInterval(keepAliveTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [displayName, matchId, spectator, userId, wsUrl]);

  const sendCode = (nextCode: string) => {
    setSelfCode(nextCode);
    latestCodeRef.current = nextCode;
    setPlayerCodes((prev) => ({
      ...prev,
      [userId]: nextCode,
    }));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'code_update',
        userId,
        code: nextCode,
      } satisfies ArenaRealtimeMessage));
    }
  };

  return {
    isConnected,
    match,
    selfCode,
    opponentCode,
    playerCodes,
    setSelfCode: sendCode,
  };
};
