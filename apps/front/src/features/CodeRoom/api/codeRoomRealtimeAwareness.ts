import { Participant } from '@/entities/CodeRoom/model/types';
import {
  AwarenessState,
  AwarenessUser,
  buildAwarenessStyles,
  dedupeParticipants,
  matchesParticipantToAwareness,
  normalizeIdentity,
  participantIdentityKeys,
} from '@/features/CodeRoom/api/codeRoomRealtimeUtils';
import { debugCodeRoom, remapSelectionAfterTextChange } from '@/features/CodeRoom/api/codeRoomRealtimeHelpers';

export const getRenderableRemoteAwarenessEntries = (
  remoteAwarenessStates: Map<number, AwarenessState>,
) => {
  const deduped = new Map<string, [number, AwarenessState]>();
  remoteAwarenessStates.forEach((state, remoteAwarenessId) => {
    const user = state?.user;
    if (!user) {
      return;
    }
    const identity =
      normalizeIdentity(user.participantId) ||
      normalizeIdentity(user.name) ||
      String(remoteAwarenessId);
    const existing = deduped.get(identity);
    if (!existing) {
      deduped.set(identity, [remoteAwarenessId, state]);
      return;
    }
    if (existing[1]?.active !== false && state?.active === false) {
      deduped.set(identity, [remoteAwarenessId, state]);
      return;
    }
    if (existing[1]?.active === false && state?.active !== false) {
      return;
    }
    deduped.set(identity, [remoteAwarenessId, state]);
  });
  return Array.from(deduped.values());
};

export const updateAwarenessStyles = ({
  styleElement,
  remoteAwarenessStates,
  awarenessId,
}: {
  styleElement: HTMLStyleElement | null;
  remoteAwarenessStates: Map<number, AwarenessState>;
  awarenessId: number;
}) => {
  if (!styleElement) {
    return;
  }

  styleElement.textContent = buildAwarenessStyles(
    getRenderableRemoteAwarenessEntries(remoteAwarenessStates),
    awarenessId,
  );
};

export const syncRealtimeParticipants = ({
  baseParticipants,
  roomId,
  localAwarenessState,
  remoteAwarenessStates,
  participantId,
  userName,
}: {
  baseParticipants: Participant[];
  roomId: string;
  localAwarenessState: AwarenessState;
  remoteAwarenessStates: Map<number, AwarenessState>;
  participantId: string;
  userName: string;
}) => {
  const awarenessStates = [
    localAwarenessState,
    ...getRenderableRemoteAwarenessEntries(remoteAwarenessStates).map(([, state]) => state),
  ];

  const localIdentityKeys = [
    normalizeIdentity(participantId),
    normalizeIdentity(userName),
  ].filter(Boolean);

  const nextParticipants = dedupeParticipants(
    baseParticipants.map((item) => {
      const isLocalParticipant = participantIdentityKeys(item).some((key) =>
        localIdentityKeys.includes(key),
      );
      const matchedAwareness = awarenessStates.find(
        (state) => state?.active !== false && matchesParticipantToAwareness(item, state?.user),
      );

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
    awareness: Array.from(remoteAwarenessStates.entries()).map(([remoteAwarenessId, state]) => ({
      awarenessID: remoteAwarenessId,
      participantId: state?.user?.participantId,
      name: state?.user?.name,
      active: state?.active,
    })),
  });

  return nextParticipants;
};

export const remapRemoteAwarenessSelections = (
  remoteAwarenessStates: Map<number, AwarenessState>,
  prevText: string,
  nextText: string,
) => {
  if (prevText === nextText) {
    return remoteAwarenessStates;
  }

  const nextStates = new Map<number, AwarenessState>();
  remoteAwarenessStates.forEach((state, remoteAwarenessId) => {
    nextStates.set(remoteAwarenessId, {
      ...state,
      selection: remapSelectionAfterTextChange(
        state?.selection as { anchor?: number; head?: number } | undefined,
        prevText,
        nextText,
      ),
    });
  });

  return nextStates;
};

export const updateRemoteDecorations = ({
  editor,
  remoteAwarenessStates,
  remoteWidgets,
  remoteDecorationIds,
}: {
  editor: any;
  remoteAwarenessStates: Map<number, AwarenessState>;
  remoteWidgets: Map<number, any>;
  remoteDecorationIds: string[];
}) => {
  if (!editor) {
    return remoteDecorationIds;
  }

  const model = editor.getModel?.();
  if (!model) {
    return remoteDecorationIds;
  }

  const decorations: any[] = [];
  const activeWidgetIds = new Set<number>();

  getRenderableRemoteAwarenessEntries(remoteAwarenessStates).forEach(([remoteAwarenessId, state]) => {
    const user = state?.user;
    const selection = state?.selection as { anchor?: number; head?: number } | undefined;
    if (!user || typeof selection?.anchor !== 'number' || typeof selection?.head !== 'number') {
      return;
    }

    const start = Math.min(selection.anchor, selection.head);
    const end = Math.max(selection.anchor, selection.head);
    const headPosition = model.getPositionAt(selection.head);
    activeWidgetIds.add(remoteAwarenessId);

    let widget = remoteWidgets.get(remoteAwarenessId);
    if (!widget) {
      const domNode = document.createElement('div');
      domNode.className = `code-room-remote-label-pill code-room-remote-label-pill-${remoteAwarenessId}${state?.active === false ? ' code-room-remote-label-pill-offline' : ''}`;
      domNode.textContent = user.name || 'Гость';

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
      remoteWidgets.set(remoteAwarenessId, widget);
      editor.addContentWidget(widget);
    } else {
      const domNode = widget.getDomNode();
      domNode.className = `code-room-remote-label-pill code-room-remote-label-pill-${remoteAwarenessId}${state?.active === false ? ' code-room-remote-label-pill-offline' : ''}`;
      domNode.textContent = user.name || 'Гость';
      widget.position = {
        position: headPosition,
        preference: [0],
      };
      editor.layoutContentWidget(widget);
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

    decorations.push({
      range: {
        startLineNumber: headPosition.lineNumber,
        startColumn: headPosition.column,
        endLineNumber: headPosition.lineNumber,
        endColumn: headPosition.column,
      },
      options: {
        afterContentClassName: `code-room-remote-caret code-room-remote-caret-${remoteAwarenessId}${state?.active === false ? ' code-room-remote-caret-offline' : ''}`,
        stickiness: 1,
      },
    });
  });

  remoteWidgets.forEach((widget, remoteAwarenessId) => {
    if (activeWidgetIds.has(remoteAwarenessId)) {
      return;
    }
    editor.removeContentWidget(widget);
    remoteWidgets.delete(remoteAwarenessId);
  });

  return editor.deltaDecorations(remoteDecorationIds, decorations);
};

export const layoutRemoteWidgets = ({
  editor,
  remoteAwarenessStates,
  remoteWidgets,
}: {
  editor: any;
  remoteAwarenessStates: Map<number, AwarenessState>;
  remoteWidgets: Map<number, any>;
}) => {
  const model = editor?.getModel?.();
  if (!editor || !model) {
    return;
  }

  getRenderableRemoteAwarenessEntries(remoteAwarenessStates).forEach(([remoteAwarenessId, state]) => {
    const selection = state?.selection as { head?: number } | undefined;
    const widget = remoteWidgets.get(remoteAwarenessId);
    if (!widget || typeof selection?.head !== 'number') {
      return;
    }

    const safeHead = Math.max(0, Math.min(selection.head, model.getValueLength()));
    widget.position = {
      position: model.getPositionAt(safeHead),
      preference: [0],
    };
    editor.layoutContentWidget(widget);
  });
};

export const buildLocalAwarenessState = ({
  participantId,
  userName,
  color,
}: {
  participantId: string;
  userName: string;
  color: Pick<AwarenessUser, 'color' | 'colorLight'>;
}) => ({
  user: {
    participantId,
    name: userName || 'Гость',
    ...color,
  },
  active: true,
});

export const cleanupRemoteDecorations = ({
  editor,
  remoteDecorationIds,
  remoteWidgets,
}: {
  editor: any;
  remoteDecorationIds: string[];
  remoteWidgets: Map<number, any>;
}) => {
  if (!editor) {
    remoteWidgets.clear();
    return [];
  }

  const nextDecorationIds = editor.deltaDecorations(remoteDecorationIds, []);
  remoteWidgets.forEach((widget) => {
    editor.removeContentWidget(widget);
  });
  remoteWidgets.clear();
  return nextDecorationIds;
};
