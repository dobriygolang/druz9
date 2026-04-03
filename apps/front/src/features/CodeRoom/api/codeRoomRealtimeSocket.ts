import { reconnectDelayMs } from '@/features/CodeRoom/api/codeRoomRealtimeUtils';
import { WSMessage } from '@/features/CodeRoom/api/codeRoomRealtimeHelpers';

export const sendRealtimeMessage = (
  ws: WebSocket | null,
  message: WSMessage,
) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }
  ws.send(JSON.stringify(message));
};

export const clearRealtimeTimers = ({
  reconnectTimerRef,
  keepAliveTimerRef,
}: {
  reconnectTimerRef: { current: number | null };
  keepAliveTimerRef: { current: number | null };
}) => {
  if (reconnectTimerRef.current !== null) {
    window.clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
  }
  if (keepAliveTimerRef.current !== null) {
    window.clearInterval(keepAliveTimerRef.current);
    keepAliveTimerRef.current = null;
  }
};

export const scheduleRealtimeReconnect = ({
  reconnectTimerRef,
  connect,
}: {
  reconnectTimerRef: { current: number | null };
  connect: () => void;
}) => {
  reconnectTimerRef.current = window.setTimeout(connect, reconnectDelayMs);
};
