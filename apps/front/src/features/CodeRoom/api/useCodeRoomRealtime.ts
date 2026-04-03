import { useEffect, useMemo, useRef, useState } from 'react';
import { CodeRoom, Participant } from '@/entities/CodeRoom/model/types';
import { normalizeRoom } from '@/features/CodeRoom/api/codeRoomMappers';
import {
  AwarenessState,
  AwarenessUser,
  colorFor,
  createStyleElement,
  dedupeParticipants,
  keepAliveIntervalMs,
  makeCodeRoomWsUrl,
  normalizeIdentity,
} from '@/features/CodeRoom/api/codeRoomRealtimeUtils';
import {
  SubmissionEvent,
  WSMessage,
  debugCodeRoom,
  getSelectionOffsets,
  parseAwarenessState,
  syncEditorModelPreservingSelection,
} from '@/features/CodeRoom/api/codeRoomRealtimeHelpers';
import {
  buildLocalAwarenessState,
  cleanupRemoteDecorations,
  layoutRemoteWidgets,
  remapRemoteAwarenessSelections,
  syncRealtimeParticipants,
  updateAwarenessStyles,
  updateRemoteDecorations,
} from '@/features/CodeRoom/api/codeRoomRealtimeAwareness';
import {
  clearRealtimeTimers,
  scheduleRealtimeReconnect,
  sendRealtimeMessage,
} from '@/features/CodeRoom/api/codeRoomRealtimeSocket';

type UseCodeRoomRealtimeParams = {
  roomId: string;
  editor: any | null;
  initialRoom: CodeRoom | null;
  userName: string;
  participantId: string;
  creatorId?: string;
  onRoomUpdate?: (room: CodeRoom) => void;
  onSubmission?: (submission: SubmissionEvent) => void;
};


export const useCodeRoomRealtime = ({
  roomId,
  editor,
  initialRoom,
  userName,
  participantId,
  creatorId,
  onRoomUpdate,
  onSubmission,
}: UseCodeRoomRealtimeParams) => {
  const normalizedInitialRoom = useMemo(
    () => (initialRoom ? normalizeRoom(initialRoom) : null),
    [initialRoom],
  );
  const [isConnected, setIsConnected] = useState(false);
  const [code, setCode] = useState(normalizedInitialRoom?.code || '');
  const codeRef = useRef(normalizedInitialRoom?.code || '');
  const [room, setRoom] = useState<CodeRoom | null>(normalizedInitialRoom);
  const [participants, setParticipants] = useState<Participant[]>(normalizedInitialRoom?.participants || []);

  const clientId = useMemo(() => `client-${Math.random().toString(36).slice(2)}`, []);
  const awarenessId = useMemo(() => Math.floor(Math.random() * 2147483647) + 1, []);
  const awarenessColorSeed = useMemo(
    () => normalizeIdentity(participantId) || normalizeIdentity(userName) || clientId,
    [clientId, participantId, userName],
  );
  const editorRef = useRef<any | null>(editor);
  const wsRef = useRef<WebSocket | null>(null);
  const selectionSubscriptionRef = useRef<{ dispose: () => void } | null>(null);
  const remoteDecorationIdsRef = useRef<string[]>([]);
  const remoteWidgetsRef = useRef<Map<number, any>>(new Map());
  const reconnectTimerRef = useRef<number | null>(null);
  const keepAliveTimerRef = useRef<number | null>(null);
  const selectionFrameRef = useRef<number | null>(null);
  const styleElementRef = useRef<HTMLStyleElement | null>(null);
  const isUnmountedRef = useRef(false);
  const applyingRemoteChangesRef = useRef(false);
  const initialRoomRef = useRef<CodeRoom | null>(normalizedInitialRoom);
  const roomParticipantsRef = useRef<Participant[]>(normalizedInitialRoom?.participants || []);
  const remoteAwarenessStatesRef = useRef<Map<number, AwarenessState>>(new Map());

  // Track current creator for reactive check
  const creatorIdRef = useRef(creatorId);
  creatorIdRef.current = creatorId;

  const localAwarenessStateRef = useRef<AwarenessState>({
    ...buildLocalAwarenessState({
      participantId,
      userName,
      color: colorFor(`${userName}-${clientId}`),
    }),
  });

  initialRoomRef.current = normalizedInitialRoom;
  editorRef.current = editor;
  codeRef.current = code;

  const syncParticipants = (baseParticipants?: Participant[]) => {
    const source = baseParticipants || roomParticipantsRef.current || [];
    const nextParticipants = syncRealtimeParticipants({
      baseParticipants: source,
      roomId,
      localAwarenessState: localAwarenessStateRef.current,
      remoteAwarenessStates: remoteAwarenessStatesRef.current,
      participantId,
      userName,
    });
    setParticipants(nextParticipants);
  };

  const send = (message: WSMessage) => {
    sendRealtimeMessage(wsRef.current, message);
  };

  const publishLocalAwareness = (overrides?: Partial<AwarenessState>) => {
    const nextState: AwarenessState = {
      ...localAwarenessStateRef.current,
      ...overrides,
      user: {
        ...(localAwarenessStateRef.current.user as AwarenessUser),
        ...(overrides?.user || {}),
      } as AwarenessUser,
    };

    localAwarenessStateRef.current = nextState;
    syncParticipants();
    send({
      type: 'awareness',
      clientId,
      awarenessId,
      data: JSON.stringify(nextState),
    });
  };

  useEffect(() => {
    if (normalizedInitialRoom && !room) {
      setRoom(normalizedInitialRoom);
    }

    const mergedParticipants = dedupeParticipants([
      ...(roomParticipantsRef.current || []),
      ...(normalizedInitialRoom?.participants || []),
    ]);

    roomParticipantsRef.current = mergedParticipants;
    syncParticipants(mergedParticipants);
  }, [normalizedInitialRoom, room]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    isUnmountedRef.current = false;
    remoteAwarenessStatesRef.current.clear();
    localAwarenessStateRef.current = buildLocalAwarenessState({
      participantId,
      userName,
      color: colorFor(awarenessColorSeed),
    });

    if (!styleElementRef.current) {
      styleElementRef.current = createStyleElement();
    }
    updateAwarenessStyles({
      styleElement: styleElementRef.current,
      remoteAwarenessStates: remoteAwarenessStatesRef.current,
      awarenessId,
    });
    remoteDecorationIdsRef.current = updateRemoteDecorations({
      editor: editorRef.current,
      remoteAwarenessStates: remoteAwarenessStatesRef.current,
      remoteWidgets: remoteWidgetsRef.current,
      remoteDecorationIds: remoteDecorationIdsRef.current,
    });
    syncParticipants(initialRoomRef.current?.participants || []);

    const connect = () => {
      clearRealtimeTimers({
        reconnectTimerRef,
        keepAliveTimerRef,
      });
      const ws = new WebSocket(makeCodeRoomWsUrl(roomId));
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        send({
          type: 'hello',
          clientId,
          awarenessId,
          userId: participantId,
        });

        const currentSelection = getSelectionOffsets(editorRef.current);
        publishLocalAwareness({
          active: true,
          selection: currentSelection || undefined,
        });

        queueMicrotask(() => {
          const nextSelection = getSelectionOffsets(editorRef.current);
          publishLocalAwareness({
            active: true,
            selection: nextSelection || undefined,
          });
        });

        keepAliveTimerRef.current = window.setInterval(() => {
          send({ type: 'ping', clientId });
        }, keepAliveIntervalMs);
      };

      ws.onmessage = (event) => {
        let message: WSMessage;
        try {
          message = JSON.parse(event.data) as WSMessage;
        } catch (error) {
          console.error('Failed to parse CodeRoom realtime message', error);
          return;
        }

        switch (message.type) {
          case 'snapshot':
            if (typeof message.plainText === 'string') {
              const currentEditor = editorRef.current;
              const prevText = currentEditor?.getModel?.()?.getValue?.() ?? code;
              const nextText = message.plainText;

              debugCodeRoom('snapshot:receive', { roomId, length: nextText.length });

              applyingRemoteChangesRef.current = true;
              syncEditorModelPreservingSelection(currentEditor, nextText);
              remoteAwarenessStatesRef.current = remapRemoteAwarenessSelections(
                remoteAwarenessStatesRef.current,
                prevText,
                nextText,
              );
              applyingRemoteChangesRef.current = false;

              remoteDecorationIdsRef.current = updateRemoteDecorations({
                editor: currentEditor,
                remoteAwarenessStates: remoteAwarenessStatesRef.current,
                remoteWidgets: remoteWidgetsRef.current,
                remoteDecorationIds: remoteDecorationIdsRef.current,
              });
              layoutRemoteWidgets({
                editor: currentEditor,
                remoteAwarenessStates: remoteAwarenessStatesRef.current,
                remoteWidgets: remoteWidgetsRef.current,
              });
              codeRef.current = nextText;
              setCode(nextText);
            }
            break;
          case 'update':
            if (message.clientId === clientId) {
              return;
            }
            if (typeof message.plainText === 'string') {
              const currentEditor = editorRef.current;
              const prevText = currentEditor?.getModel?.()?.getValue?.() ?? code;
              const nextText = message.plainText;

              debugCodeRoom('update:receive', {
                roomId,
                fromClientId: message.clientId,
                length: nextText.length,
              });

              applyingRemoteChangesRef.current = true;
              syncEditorModelPreservingSelection(currentEditor, nextText);
              remoteAwarenessStatesRef.current = remapRemoteAwarenessSelections(
                remoteAwarenessStatesRef.current,
                prevText,
                nextText,
              );
              applyingRemoteChangesRef.current = false;

              remoteDecorationIdsRef.current = updateRemoteDecorations({
                editor: currentEditor,
                remoteAwarenessStates: remoteAwarenessStatesRef.current,
                remoteWidgets: remoteWidgetsRef.current,
                remoteDecorationIds: remoteDecorationIdsRef.current,
              });
              layoutRemoteWidgets({
                editor: currentEditor,
                remoteAwarenessStates: remoteAwarenessStatesRef.current,
                remoteWidgets: remoteWidgetsRef.current,
              });
              setCode(nextText);
            }
            break;
          case 'awareness':
            if (message.clientId === clientId || !message.data) {
              return;
            }
            {
              const nextAwarenessState = parseAwarenessState<AwarenessState>(message.data);
              if (!nextAwarenessState) {
                return;
              }
              remoteAwarenessStatesRef.current.set(message.awarenessId || 0, nextAwarenessState);
            }
            updateAwarenessStyles({
              styleElement: styleElementRef.current,
              remoteAwarenessStates: remoteAwarenessStatesRef.current,
              awarenessId,
            });
            remoteDecorationIdsRef.current = updateRemoteDecorations({
              editor: editorRef.current,
              remoteAwarenessStates: remoteAwarenessStatesRef.current,
              remoteWidgets: remoteWidgetsRef.current,
              remoteDecorationIds: remoteDecorationIdsRef.current,
            });
            syncParticipants();
            debugCodeRoom('awareness:update', {
              roomId,
              fromClientId: message.clientId,
              awarenessId: message.awarenessId,
            });
            break;
          case 'awareness_remove':
            for (const removedAwarenessId of message.awarenessIds || []) {
              remoteAwarenessStatesRef.current.delete(removedAwarenessId);
            }
            updateAwarenessStyles({
              styleElement: styleElementRef.current,
              remoteAwarenessStates: remoteAwarenessStatesRef.current,
              awarenessId,
            });
            remoteDecorationIdsRef.current = updateRemoteDecorations({
              editor: editorRef.current,
              remoteAwarenessStates: remoteAwarenessStatesRef.current,
              remoteWidgets: remoteWidgetsRef.current,
              remoteDecorationIds: remoteDecorationIdsRef.current,
            });
            syncParticipants();
            debugCodeRoom('awareness:remove', {
              roomId,
              awarenessIds: message.awarenessIds || [],
            });
            break;
          case 'room_update':
            if (!message.room) {
              return;
            }
            const nextRoom = normalizeRoom(message.room);
            debugCodeRoom('room:update', {
              roomId,
              participants: (nextRoom.participants || []).map((participant) => ({
                id: participant.id,
                userId: participant.userId,
                displayName: participant.displayName,
                isGuest: participant.isGuest,
                role: participant.role,
              })),
            });
            setRoom(nextRoom);
            roomParticipantsRef.current = dedupeParticipants(nextRoom.participants || []);
            syncParticipants(roomParticipantsRef.current);
            onRoomUpdate?.(nextRoom);
            break;
          case 'submission':
            if (!message.submission) {
              return;
            }
            onSubmission?.(message.submission);
            break;
          case 'pong':
            break;
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        clearRealtimeTimers({
          reconnectTimerRef,
          keepAliveTimerRef,
        });
        if (isUnmountedRef.current) {
          return;
        }
        scheduleRealtimeReconnect({
          reconnectTimerRef,
          connect,
        });
      };
    };

    setCode(initialRoomRef.current?.code || '');
    connect();

    return () => {
      isUnmountedRef.current = true;
      clearRealtimeTimers({
        reconnectTimerRef,
        keepAliveTimerRef,
      });
      if (selectionFrameRef.current !== null) {
        window.cancelAnimationFrame(selectionFrameRef.current);
        selectionFrameRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
      remoteAwarenessStatesRef.current.clear();
      if (styleElementRef.current) {
        styleElementRef.current.remove();
        styleElementRef.current = null;
      }
      remoteDecorationIdsRef.current = cleanupRemoteDecorations({
        editor: editorRef.current,
        remoteDecorationIds: remoteDecorationIdsRef.current,
        remoteWidgets: remoteWidgetsRef.current,
      });
    };
  }, [awarenessColorSeed, awarenessId, clientId, onRoomUpdate, onSubmission, participantId, roomId, userName]);

  useEffect(() => {
    const nextColor = colorFor(awarenessColorSeed);
    publishLocalAwareness({
      user: {
        participantId,
        name: userName || 'Гость',
        color: nextColor.color,
        colorLight: nextColor.colorLight,
      },
      active: true,
    });
  }, [awarenessColorSeed, clientId, participantId, userName]);

  useEffect(() => {
    if (!editor) {
      selectionSubscriptionRef.current?.dispose();
      selectionSubscriptionRef.current = null;
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    if (model.getValue() !== code) {
      syncEditorModelPreservingSelection(editor, code);
    }

    const publishEditorSelection = () => {
      const selection = getSelectionOffsets(editor);
      publishLocalAwareness({
        active: true,
        selection: selection || undefined,
      });
    };

    const scheduleEditorSelectionPublish = () => {
      if (selectionFrameRef.current !== null) {
        return;
      }
      selectionFrameRef.current = window.requestAnimationFrame(() => {
        selectionFrameRef.current = null;
        publishEditorSelection();
      });
    };

    const contentSubscription = model.onDidChangeContent(() => {
      layoutRemoteWidgets({
        editor,
        remoteAwarenessStates: remoteAwarenessStatesRef.current,
        remoteWidgets: remoteWidgetsRef.current,
      });

      if (applyingRemoteChangesRef.current) {
        return;
      }

      const prevText = codeRef.current;
      const nextCode = model.getValue();
      remoteAwarenessStatesRef.current = remapRemoteAwarenessSelections(
        remoteAwarenessStatesRef.current,
        prevText,
        nextCode,
      );
      remoteDecorationIdsRef.current = updateRemoteDecorations({
        editor,
        remoteAwarenessStates: remoteAwarenessStatesRef.current,
        remoteWidgets: remoteWidgetsRef.current,
        remoteDecorationIds: remoteDecorationIdsRef.current,
      });
      layoutRemoteWidgets({
        editor,
        remoteAwarenessStates: remoteAwarenessStatesRef.current,
        remoteWidgets: remoteWidgetsRef.current,
      });
      codeRef.current = nextCode;
      setCode(nextCode);
      publishEditorSelection();
      debugCodeRoom('update:send', { roomId, length: nextCode.length });
      send({
        type: 'update',
        clientId,
        plainText: nextCode,
      });
    });

    selectionSubscriptionRef.current?.dispose();
    selectionSubscriptionRef.current = editor.onDidChangeCursorSelection(scheduleEditorSelectionPublish);
    publishEditorSelection();

    const handleVisibilityChange = () => {
      publishLocalAwareness({ active: !document.hidden });
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (selectionFrameRef.current !== null) {
        window.cancelAnimationFrame(selectionFrameRef.current);
        selectionFrameRef.current = null;
      }
      contentSubscription.dispose();
      selectionSubscriptionRef.current?.dispose();
      selectionSubscriptionRef.current = null;
      remoteDecorationIdsRef.current = cleanupRemoteDecorations({
        editor,
        remoteDecorationIds: remoteDecorationIdsRef.current,
        remoteWidgets: remoteWidgetsRef.current,
      });
    };
  }, [clientId, editor, roomId]);

  return {
    isConnected,
    code,
    room,
    participants,
  };
};
