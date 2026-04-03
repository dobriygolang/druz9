import { syncEditorModelFromYText } from '@/features/CodeRoom/api/codeRoomRealtimeUtils';

export type SubmissionEvent = {
  output: string;
  error?: string;
  exitCode: number;
  submittedBy: string;
};

export type WSMessage = {
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
  room?: unknown;
  submission?: SubmissionEvent;
  userId?: string;
};

export const debugCodeRoom = (...args: unknown[]) => {
  if (typeof window !== 'undefined' && window.localStorage.getItem('debugCodeRoom') !== 'true') {
    return;
  }
  console.log('[code-room]', ...args);
};

export const parseAwarenessState = <T>(raw?: string): T | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as T | null;
    if (!parsed || typeof parsed !== 'object' || !('user' in parsed)) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('Failed to parse CodeRoom awareness payload', error);
    return null;
  }
};

export const getSelectionOffsets = (editor: any) => {
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

export const clampOffset = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const remapOffsetAfterTextChange = (
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

export const remapSelectionAfterTextChange = (
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

export const syncEditorModelPreservingSelection = (editor: any, nextCode: string) => {
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
