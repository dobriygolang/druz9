import { useEffect, useMemo, useRef, useState } from 'react';
import { CodeRoom, Participant } from '@/entities/CodeRoom/model/types';
import { normalizeRoom } from '@/features/CodeRoom/api/codeRoomMappers';
import {
  AwarenessState,
  AwarenessUser,
  buildAwarenessStyles,
  colorFor,
  createStyleElement,
  dedupeParticipants,
  keepAliveIntervalMs,
  makeCodeRoomWsUrl,
  matchesParticipantToAwareness,
  normalizeIdentity,
  participantIdentityKeys,
  reconnectDelayMs,
  syncEditorModelFromYText,
} from '@/features/CodeRoom/api/codeRoomRealtimeUtils';

type SubmissionEvent = {
  output: string;
  error?: string;
  exitCode: number;
  submittedBy: string;
};

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

type WSMessage = {
  type:
    | 'hello'
    | 'snapshot'
    | 'update'
    | 'awareness'
    | 'awareness_remove'
    | 'ping'
    | 'pong'
    | 'room_update'
    | 'submission';
  clientId?: string;
  awarenessId?: number;
  awarenessIds?: number[];
  data?: string;
  plainText?: string;
  room?: CodeRoom;
  submission?: SubmissionEvent;
  userId?: string;
};

const debugCodeRoom = (...args: unknown[]) => {
  if (typeof window !== 'undefined' && window.localStorage.getItem('debugCodeRoom') !== 'true') {
    return;
  }
  console.log('[code-room]', ...args);
};

const parseAwarenessState = (raw?: string): AwarenessState | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AwarenessState | null;
    if (!parsed?.user) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('Failed to parse CodeRoom awareness payload', error);
    return null;
  }
};

const getSelectionOffsets = (editor: any) => {
  const model = editor?.getModel?.();
  const selection = editor?.getSelection?.();
  if (!model || !selection) {
    return null;
  }

  return {
    anchor: model.getOffsetAt(selection.getStartPosition()),
    head: model.getOffsetAt(selection.getEndPosition()),
  };
};

const clampOffset = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const remapOffsetAfterTextChange = (
  offset: number,
  prevText: string,
  nextText: string,
) => {
  if (prevText === nextText) {
    return offset;
  }

  let prefix = 0;
  const minLength = Math.min(prevText.length, nextText.length);

  while (prefix < minLength && prevText.charCodeAt(prefix) === nextText.charCodeAt(prefix)) {
    prefix += 1;
  }

  let prevSuffix = prevText.length;
  let nextSuffix = nextText.length;

  while (
    prevSuffix > prefix &&
    nextSuffix > prefix &&
    prevText.charCodeAt(prevSuffix - 1) === nextText.charCodeAt(nextSuffix - 1)
  ) {
    prevSuffix -= 1;
    nextSuffix -= 1;
  }

  const changedStart = prefix;
  const changedEndPrev = prevSuffix;
  const changedEndNext = nextSuffix;
  const delta = (changedEndNext - changedStart) - (changedEndPrev - changedStart);

  const safeOffset = clampOffset(offset, 0, prevText.length);

  if (safeOffset <= changedStart) {
    return safeOffset;
  }

  if (safeOffset >= changedEndPrev) {
    return clampOffset(safeOffset + delta, 0, nextText.length);
  }

  return clampOffset(changedEndNext, 0, nextText.length);
};

const remapSelectionAfterTextChange = (
  selection: { anchor?: number; head?: number } | undefined,
  prevText: string,
  nextText: string,
) => {
  if (
    !selection ||
    typeof selection.anchor !== 'number' ||
    typeof selection.head !== 'number'
  ) {
    return selection;
  }

  return {
    anchor: remapOffsetAfterTextChange(selection.anchor, prevText, nextText),
    head: remapOffsetAfterTextChange(selection.head, prevText, nextText),
  };
};

const syncEditorModelPreservingSelection = (editor: any, nextCode: string) => {
  const model = editor?.getModel?.();
  if (!editor || !model || model.getValue() === nextCode) {
    return;
  }

  syncEditorModelFromYText(editor, nextCode);

  const selection = editor.getSelection?.();
  if (selection && typeof editor.revealPositionInCenterIfOutsideViewport === 'function') {
    editor.revealPositionInCenterIfOutsideViewport(selection.getPosition());
  }
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
    user: {
      participantId,
      name: userName || 'Гость',
      ...colorFor(`${userName}-${clientId}`),
    },
    active: true,
  });

  initialRoomRef.current = normalizedInitialRoom;
  editorRef.current = editor;

  const updateAwarenessStyles = () => {
    const styleElement = styleElementRef.current;
    if (!styleElement) {
      return;
    }

    styleElement.textContent = buildAwarenessStyles(
      getRenderableRemoteAwarenessEntries(),
      awarenessId,
    );
  };

  const getRenderableRemoteAwarenessEntries = () => {
    const deduped = new Map<string, [number, AwarenessState]>();
    remoteAwarenessStatesRef.current.forEach((state, remoteAwarenessId) => {
      const user = state?.user;
      if (!user) {
        return;
      }
      const identity = normalizeIdentity(user.participantId) || normalizeIdentity(user.name) || String(remoteAwarenessId);
      deduped.set(identity, [remoteAwarenessId, state]);
    });
    return Array.from(deduped.values());
  };

  const syncParticipants = (baseParticipants?: Participant[]) => {
    const source = baseParticipants || roomParticipantsRef.current || [];
    const awarenessStates = [
      localAwarenessStateRef.current,
      ...getRenderableRemoteAwarenessEntries().map(([, state]) => state),
    ];

    const localIdentityKeys = [
      normalizeIdentity(participantId),
      normalizeIdentity(userName),
    ].filter(Boolean);

    const nextParticipants = dedupeParticipants(
      source.map((item) => {
        const isLocalParticipant = participantIdentityKeys(item).some((key) => localIdentityKeys.includes(key));
        const matchedAwareness = awarenessStates.find((state) => (
          state?.active !== false && matchesParticipantToAwareness(item, state?.user)
        ));

        return {
          ...item,
          isActive: isLocalParticipant || Boolean(matchedAwareness),
        };
      }),
    );

    debugCodeRoom('syncParticipants', {
      roomId,
      localIdentityKeys,
      participants: nextParticipants.map((item) => ({
        id: item.id,
        userId: item.userId,
        displayName: item.displayName,
        isGuest: item.isGuest,
        isActive: item.isActive,
        identityKeys: participantIdentityKeys(item),
      })),
      awareness: Array.from(remoteAwarenessStatesRef.current.entries()).map(([remoteAwarenessId, state]) => ({
        awarenessID: remoteAwarenessId,
        participantId: state?.user?.participantId,
        name: state?.user?.name,
        active: state?.active,
      })),
    });

    setParticipants(nextParticipants);
  };

  const remapRemoteAwarenessSelections = (prevText: string, nextText: string) => {
    if (prevText === nextText) {
      return;
    }

    const nextStates = new Map<number, AwarenessState>();

    remoteAwarenessStatesRef.current.forEach((state, remoteAwarenessId) => {
      nextStates.set(remoteAwarenessId, {
        ...state,
        selection: remapSelectionAfterTextChange(
          state?.selection as { anchor?: number; head?: number } | undefined,
          prevText,
          nextText,
        ),
      });
    });

    remoteAwarenessStatesRef.current = nextStates;
  };

  const updateRemoteDecorations = () => {
    const currentEditor = editorRef.current;
    if (!currentEditor) {
      return;
    }

    const model = currentEditor.getModel?.();
    if (!model) {
      return;
    }

    const decorations: any[] = [];
    const activeWidgetIds = new Set<number>();

    getRenderableRemoteAwarenessEntries().forEach(([remoteAwarenessId, state]) => {
      const user = state?.user;
      const selection = state?.selection as { anchor?: number; head?: number } | undefined;
      if (!user || typeof selection?.anchor !== 'number' || typeof selection?.head !== 'number') {
        return;
      }

      const start = Math.min(selection.anchor, selection.head);
      const end = Math.max(selection.anchor, selection.head);
      const headPosition = model.getPositionAt(selection.head);
      activeWidgetIds.add(remoteAwarenessId);

      const offlineSuffix = state?.active === false ? ' code-room-remote-caret-offline' : '';
      decorations.push({
        range: {
          startLineNumber: headPosition.lineNumber,
          startColumn: headPosition.column,
          endLineNumber: headPosition.lineNumber,
          endColumn: headPosition.column,
        },
        options: {
          afterContentClassName: `code-room-remote-caret code-room-remote-caret-${remoteAwarenessId}${offlineSuffix}`,
          stickiness: 1,
        },
      });

      let widget = remoteWidgetsRef.current.get(remoteAwarenessId);
      if (!widget) {
        const domNode = document.createElement('div');
        domNode.className = `code-room-remote-label-pill code-room-remote-label-pill-${remoteAwarenessId}`;
        domNode.textContent = state?.active === false ? `${user.name || 'Гость'} offline` : (user.name || 'Гость');
        const nextWidget: any = {
          position: {
            position: headPosition,
            preference: [0],
          },
          getId: () => `code-room-remote-label-${remoteAwarenessId}`,
          getDomNode: () => domNode,
          getPosition() {
            return nextWidget.position;
          },
          allowEditorOverflow: false,
          suppressMouseDown: true,
        };
        widget = nextWidget;
        remoteWidgetsRef.current.set(remoteAwarenessId, widget);
        currentEditor.addContentWidget(widget);
      } else {
        widget.getDomNode().textContent = state?.active === false ? `${user.name || 'Гость'} offline` : (user.name || 'Гость');
        widget.getDomNode().className = `code-room-remote-label-pill code-room-remote-label-pill-${remoteAwarenessId}${state?.active === false ? ' code-room-remote-label-pill-offline' : ''}`;
        widget.position = {
          position: headPosition,
          preference: [0],
        };
        currentEditor.layoutContentWidget(widget);
      }

      if (!widget.getDomNode().className.includes('code-room-remote-label-pill-offline') && state?.active === false) {
        widget.getDomNode().className = `code-room-remote-label-pill code-room-remote-label-pill-${remoteAwarenessId} code-room-remote-label-pill-offline`;
      }
      if (state?.active !== false) {
        widget.getDomNode().className = `code-room-remote-label-pill code-room-remote-label-pill-${remoteAwarenessId}`;
      }

      if (end > start) {
        const startPosition = model.getPositionAt(start);
        const endPosition = model.getPositionAt(end);
        decorations.push({
          range: {
            startLineNumber: startPosition.lineNumber,
            startColumn: startPosition.column,
            endLineNumber: endPosition.lineNumber,
            endColumn: endPosition.column,
          },
          options: {
            inlineClassName: `code-room-remote-selection code-room-remote-selection-${remoteAwarenessId}${state?.active === false ? ' code-room-remote-selection-offline' : ''}`,
            stickiness: 1,
          },
        });
      }
    });

    remoteWidgetsRef.current.forEach((widget, remoteAwarenessId) => {
      if (activeWidgetIds.has(remoteAwarenessId)) {
        return;
      }
      currentEditor.removeContentWidget(widget);
      remoteWidgetsRef.current.delete(remoteAwarenessId);
    });

    remoteDecorationIdsRef.current = currentEditor.deltaDecorations(remoteDecorationIdsRef.current, decorations);
  };

  const layoutRemoteWidgets = () => {
    const currentEditor = editorRef.current;
    const model = currentEditor?.getModel?.();
    if (!currentEditor || !model) {
      return;
    }

    getRenderableRemoteAwarenessEntries().forEach(([remoteAwarenessId, state]) => {
      const selection = state?.selection as { head?: number } | undefined;
      const widget = remoteWidgetsRef.current.get(remoteAwarenessId);

      if (!widget || typeof selection?.head !== 'number') {
        return;
      }

      const safeHead = Math.max(0, Math.min(selection.head, model.getValueLength()));
      widget.position = {
        position: model.getPositionAt(safeHead),
        preference: [0],
      };
      currentEditor.layoutContentWidget(widget);
    });
  };

  const send = (message: WSMessage) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    ws.send(JSON.stringify(message));
  };

  const publishLocalAwareness = (overrides?: Partial<AwarenessState>) => {
    const nextState: AwarenessState = {
      ...localAwarenessStateRef.current,
      ...overrides,
      user: {
        ...(localAwarenessStateRef.current.user as AwarenessUser),
        ...(overrides?.user || {}),
      },
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
    localAwarenessStateRef.current = {
      user: {
        participantId,
        name: userName || 'Гость',
        ...colorFor(awarenessColorSeed),
      },
      active: true,
    };

    if (!styleElementRef.current) {
      styleElementRef.current = createStyleElement();
    }
    updateAwarenessStyles();
    updateRemoteDecorations();
    syncParticipants(initialRoomRef.current?.participants || []);

    const clearTimers = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (keepAliveTimerRef.current !== null) {
        window.clearInterval(keepAliveTimerRef.current);
        keepAliveTimerRef.current = null;
      }
    };

    const connect = () => {
      clearTimers();
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
              remapRemoteAwarenessSelections(prevText, nextText);
              applyingRemoteChangesRef.current = false;

              updateRemoteDecorations();
              layoutRemoteWidgets();
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
              remapRemoteAwarenessSelections(prevText, nextText);
              applyingRemoteChangesRef.current = false;

              updateRemoteDecorations();
              layoutRemoteWidgets();
              setCode(nextText);
            }
            break;
          case 'awareness':
            if (message.clientId === clientId || !message.data) {
              return;
            }
            {
              const nextAwarenessState = parseAwarenessState(message.data);
              if (!nextAwarenessState) {
                return;
              }
              remoteAwarenessStatesRef.current.set(message.awarenessId || 0, nextAwarenessState);
            }
            updateAwarenessStyles();
            updateRemoteDecorations();
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
            updateAwarenessStyles();
            updateRemoteDecorations();
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
        clearTimers();
        if (isUnmountedRef.current) {
          return;
        }
        reconnectTimerRef.current = window.setTimeout(connect, reconnectDelayMs);
      };
    };

    setCode(initialRoomRef.current?.code || '');
    connect();

    return () => {
      isUnmountedRef.current = true;
      clearTimers();
      wsRef.current?.close();
      wsRef.current = null;
      remoteAwarenessStatesRef.current.clear();
      if (styleElementRef.current) {
        styleElementRef.current.remove();
        styleElementRef.current = null;
      }
      if (editorRef.current) {
        remoteDecorationIdsRef.current = editorRef.current.deltaDecorations(remoteDecorationIdsRef.current, []);
        remoteWidgetsRef.current.forEach((widget) => {
          editorRef.current?.removeContentWidget(widget);
        });
        remoteWidgetsRef.current.clear();
      }
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

    const contentSubscription = model.onDidChangeContent(() => {
      layoutRemoteWidgets();

      if (applyingRemoteChangesRef.current) {
        return;
      }

      const nextCode = model.getValue();
      setCode(nextCode);
      debugCodeRoom('update:send', { roomId, length: nextCode.length });
      send({
        type: 'update',
        clientId,
        plainText: nextCode,
      });
      publishEditorSelection();
    });

    selectionSubscriptionRef.current?.dispose();
    selectionSubscriptionRef.current = editor.onDidChangeCursorSelection(publishEditorSelection);
    publishEditorSelection();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        publishLocalAwareness({ active: true });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      contentSubscription.dispose();
      selectionSubscriptionRef.current?.dispose();
      selectionSubscriptionRef.current = null;
      remoteDecorationIdsRef.current = editor.deltaDecorations(remoteDecorationIdsRef.current, []);
      remoteWidgetsRef.current.forEach((widget) => {
        editor.removeContentWidget(widget);
      });
      remoteWidgetsRef.current.clear();
    };
  }, [clientId, editor, roomId]);

  return {
    isConnected,
    code,
    room,
    participants,
  };
};
