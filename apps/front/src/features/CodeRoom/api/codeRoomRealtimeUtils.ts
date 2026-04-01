import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { Participant } from '@/entities/CodeRoom/model/types';
import { ENV } from '@/shared/config/env';

export type AwarenessUser = {
  participantId: string;
  name: string;
  color: string;
  colorLight: string;
};

export type AwarenessState = {
  user?: AwarenessUser;
  selection?: {
    anchor?: unknown;
    head?: unknown;
  };
  active?: boolean;
};

const COLORS = [
  ['#5B8CFF', '#DCE8FF'],
  ['#FF7A59', '#FFE3DB'],
  ['#9B8CFF', '#ECE7FF'],
  ['#18C29C', '#D7FFF5'],
  ['#F59E0B', '#FFF0CC'],
  ['#EC4899', '#FFD8EC'],
  ['#14B8A6', '#CFFAFE'],
  ['#8B5CF6', '#E9D5FF'],
];

export const reconnectDelayMs = 1200;
export const keepAliveIntervalMs = 15000;

export const encodeBase64 = (buffer: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < buffer.length; i += 1) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
};

export const decodeBase64 = (value: string) => {
  const binary = atob(value);
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    result[i] = binary.charCodeAt(i);
  }
  return result;
};

export const makeCodeRoomWsUrl = (roomId: string) => {
  const raw = ENV.WS_URL || ENV.API_URL;
  if (!raw) {
    return `${window.location.origin.replace(/^http/, 'ws')}/api/v1/code-editor/realtime/${roomId}`;
  }

  const url = new URL(raw, window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `/api/v1/code-editor/realtime/${roomId}`;
  url.search = '';
  url.hash = '';
  return url.toString();
};

export const colorFor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const [color, colorLight] = COLORS[Math.abs(hash) % COLORS.length];
  return { color, colorLight };
};

export const createStyleElement = () => {
  const style = document.createElement('style');
  style.setAttribute('data-code-room-awareness', 'true');
  document.head.appendChild(style);
  return style;
};

export const dedupeParticipants = (items: Participant[]) => {
  const unique = new Map<string, Participant>();
  for (const item of items) {
    // For guests, use displayName as key to avoid duplicates from WS reconnections
    const key = item.isGuest && item.displayName
      ? `guest:${item.displayName.toLowerCase().trim()}`
      : item.id || item.userId;
    if (key) {
      // Only set if not already present (keep first occurrence)
      if (!unique.has(key)) {
        unique.set(key, item);
      }
    } else {
      // Fallback to id if available
      unique.set(item.id, item);
    }
  }
  return Array.from(unique.values());
};

export const normalizeIdentity = (value?: string | null) => (value || '').trim().toLowerCase();

export const participantIdentityKeys = (participant: Participant) => (
  [
    normalizeIdentity(participant.id),
    normalizeIdentity(participant.userId),
    participant.isGuest ? normalizeIdentity(participant.displayName) : '',
  ].filter(Boolean)
);

export const matchesParticipantToAwareness = (
  participant: Participant,
  awarenessUser?: AwarenessUser,
) => {
  if (!awarenessUser) {
    return false;
  }

  const participantIds = participantIdentityKeys(participant);
  const awarenessIds = [
    normalizeIdentity(awarenessUser.participantId),
    normalizeIdentity(awarenessUser.name),
  ].filter(Boolean);

  return awarenessIds.some((value) => participantIds.includes(value));
};

export const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export const buildAwarenessStyles = (
  states: Iterable<[number, AwarenessState]>,
  localClientID: number,
) => {
  let css = `
    @keyframes codeRoomCaretBlink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0; }
    }

    .code-room-remote-selection {
      border-radius: 4px;
      color: inherit !important;
      text-shadow: none !important;
    }

    .code-room-remote-caret {
      position: relative;
    }

    .code-room-remote-caret::after {
      content: '';
      position: absolute;
      left: -1px;
      top: 0;
      height: 1.15em;
      border-left: 1px solid currentColor;
      z-index: 12;
      pointer-events: none;
    }

    .code-room-remote-label-pill {
      display: inline-flex;
      align-items: center;
      min-height: 16px;
      padding: 0 4px;
      border-radius: 4px;
      border: 1px solid transparent;
      font-size: 10px;
      font-weight: 500;
      line-height: 16px;
      white-space: nowrap;
      transform: translateY(-100%);
      pointer-events: none;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
    }

    .code-room-remote-selection-offline {
      opacity: 0.45;
    }

    .code-room-remote-caret-offline::after {
      opacity: 0.5;
    }

    .code-room-remote-label-pill-offline {
      opacity: 0.72;
      filter: saturate(0.75);
    }
  `;

  for (const [awarenessID, state] of states) {
    if (awarenessID === localClientID) {
      continue;
    }

    const typedState = state as AwarenessState | undefined;
    const user = typedState?.user;
    if (!user) {
      continue;
    }
    const isOffline = typedState?.active === false;
    const selectionAlpha = isOffline ? 0.16 : 0.3;
    const borderAlpha = isOffline ? 0.12 : 0.2;
    const backgroundAlpha = isOffline ? 0.82 : 0.96;

    css += `
      .code-room-remote-selection-${awarenessID} {
        background: ${hexToRgba(user.color, selectionAlpha)};
      }

      .code-room-remote-caret-${awarenessID}::after {
        border-left-color: ${user.color};
      }

      .code-room-remote-label-pill-${awarenessID} {
        background: ${hexToRgba(user.colorLight, backgroundAlpha)};
        border-color: ${hexToRgba(user.color, borderAlpha)};
        color: ${user.color};
      }
    `;
  }

  return css;
};

export const publishCurrentSelection = (editor: any, awareness: Awareness, yText: Y.Text) => {
  const model = editor?.getModel?.();
  const selection = editor?.getSelection?.();
  if (!model || !selection) {
    return;
  }

  awareness.setLocalStateField('selection', {
    anchor: Y.createRelativePositionFromTypeIndex(yText, model.getOffsetAt(selection.getStartPosition())),
    head: Y.createRelativePositionFromTypeIndex(yText, model.getOffsetAt(selection.getEndPosition())),
  });
};

export const syncEditorModelFromYText = (editor: any, nextCode: string) => {
  const model = editor?.getModel?.();
  if (!editor || !model) {
    return;
  }

  const prevCode = model.getValue();
  if (prevCode === nextCode) {
    return;
  }

  let start = 0;
  const minLength = Math.min(prevCode.length, nextCode.length);

  while (start < minLength && prevCode.charCodeAt(start) === nextCode.charCodeAt(start)) {
    start += 1;
  }

  let prevEnd = prevCode.length;
  let nextEnd = nextCode.length;

  while (
    prevEnd > start &&
    nextEnd > start &&
    prevCode.charCodeAt(prevEnd - 1) === nextCode.charCodeAt(nextEnd - 1)
  ) {
    prevEnd -= 1;
    nextEnd -= 1;
  }

  const range = {
    startLineNumber: model.getPositionAt(start).lineNumber,
    startColumn: model.getPositionAt(start).column,
    endLineNumber: model.getPositionAt(prevEnd).lineNumber,
    endColumn: model.getPositionAt(prevEnd).column,
  };

  const text = nextCode.slice(start, nextEnd);

  editor.executeEdits('code-room-remote', [
    {
      range,
      text,
      forceMoveMarkers: true,
    },
  ]);
};
