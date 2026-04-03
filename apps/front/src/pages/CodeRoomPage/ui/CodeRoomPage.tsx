import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OnMount } from '@monaco-editor/react';
import { useAuth } from '@/app/providers/AuthProvider';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { getStoredGuestName, setStoredGuestName } from '@/features/CodeRoom/lib/guestIdentity';
import { useCodeRoomRealtime } from '@/features/CodeRoom/api/useCodeRoomRealtime';
import { CodeRoom, Participant, Submission } from '@/entities/CodeRoom/model/types';
import { Loader2 } from 'lucide-react';
import { AxiosError } from '@/shared/api/base';
import { GuestNameModal } from '@/features/CodeRoom/ui/GuestNameModal';
import {
  CodeRoomEditorPanels,
  CodeRoomHeader,
  CodeRoomLoadingState,
  LeaveToasts,
  ParticipantsStrip,
  TimelapseToolbar,
} from './components/CodeRoomSections';
import { useResizableEditor } from './hooks/useResizableEditor';
import { useRoomLoader } from './hooks/useRoomLoader';
import { useRoomPresenceToasts } from './hooks/useRoomPresenceToasts';

const DEFAULT_CODE = `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
`;

const roomNotificationsStorageKey = (roomId: string) => `code_room_notifications:${roomId}`;

const normalizeParticipantIdentity = (value?: string | null) => (value || '').trim().toLowerCase();

const matchesCreator = (
  participant: Pick<Participant, 'id' | 'userId' | 'role'> | null | undefined,
  creatorId?: string | null,
) => {
  if (!participant) {
    return false;
  }

  if (participant.role === 'creator') {
    return true;
  }

  const normalizedCreatorId = normalizeParticipantIdentity(creatorId);
  if (!normalizedCreatorId) {
    return false;
  }

  return (
    normalizeParticipantIdentity(participant.userId) === normalizedCreatorId
    || normalizeParticipantIdentity(participant.id) === normalizedCreatorId
  );
};

export const CodeRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [room, setRoom] = useState<CodeRoom | null>(null);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [error, setError] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [editorInstance, setEditorInstance] = useState<any | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'output' | 'history' | 'description'>('output');
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [isTimelapsePlaying, setIsTimelapsePlaying] = useState(false);
  const [timelapseIndex, setTimelapseIndex] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isTimelapseTransitioning, setIsTimelapseTransitioning] = useState(false);

  const editorRef = useRef<any>(null);
  const codeRef = useRef(code);
  const timelineStartedAtRef = useRef(Date.now());
  const timelineSnapshotsRef = useRef<Array<{ timestamp: number; code: string }>>([]);
  const { editorWidth, editorContainerRef, startResize } = useResizableEditor();

  const handleRoomLoaded = useCallback((nextRoom: CodeRoom) => {
    setRoom(nextRoom);
    if (nextRoom.code) {
      setCode(nextRoom.code);
      codeRef.current = nextRoom.code;
    }
  }, []);

  const {
    isRoomLoading,
    roomLoadError,
    needsGuestName,
    setNeedsGuestName,
    setIsRoomLoading,
    setRoomLoadError,
  } = useRoomLoader({
    roomId,
    user,
    onRoomLoaded: handleRoomLoaded,
  });

  useEffect(() => {
    if (!roomId) {
      return;
    }

    timelineStartedAtRef.current = Date.now();
    timelineSnapshotsRef.current = [];
    setShowTimelapse(false);
    setIsTimelapsePlaying(false);
    setTimelapseIndex(0);
  }, [roomId]);

  const timelineSnapshots = useMemo(() => {
    if (timelineSnapshotsRef.current.length === 0) {
      return [{ timestamp: 0, code: codeRef.current || DEFAULT_CODE }];
    }
    return [...timelineSnapshotsRef.current];
  }, [code, showTimelapse, timelapseIndex]);

  useEffect(() => {
    if (!editorInstance || showTimelapse) {
      return;
    }

    const recordSnapshot = (nextCode: string) => {
      codeRef.current = nextCode;
      const timestamp = Date.now() - timelineStartedAtRef.current;
      const snapshots = timelineSnapshotsRef.current;
      const last = snapshots[snapshots.length - 1];
      if (last?.code === nextCode) {
        return;
      }
      snapshots.push({ timestamp, code: nextCode });
    };

    recordSnapshot(codeRef.current || DEFAULT_CODE);

    const subscription = editorInstance.onDidChangeModelContent(() => {
      recordSnapshot(editorInstance.getValue?.() || '');
    });

    return () => {
      subscription?.dispose?.();
    };
  }, [editorInstance, showTimelapse]);

  useEffect(() => {
    if (!showTimelapse || !isTimelapsePlaying) {
      return;
    }

    let timer: number | null = null;

    const scheduleNext = (index: number) => {
      if (index >= timelineSnapshots.length - 1) {
        setIsTimelapsePlaying(false);
        return;
      }

      const current = timelineSnapshots[index];
      const next = timelineSnapshots[index + 1];
      const delay = Math.max(40, Math.min(220, next.timestamp - current.timestamp));

      timer = window.setTimeout(() => {
        setTimelapseIndex(index + 1);
      }, delay);
    };

    scheduleNext(timelapseIndex);

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [isTimelapsePlaying, showTimelapse, timelapseIndex, timelineSnapshots]);

  const displayedPlaybackCode = showTimelapse
    ? (timelineSnapshots[Math.min(timelapseIndex, timelineSnapshots.length - 1)]?.code || '')
    : '';

  // Обработчик обновления комнаты
  const handleRoomUpdate = useCallback((updatedRoom: CodeRoom) => {
    setRoom(updatedRoom);
    // Если статус изменился на finished - загрузим submissions
    if (updatedRoom.status === 'finished' && roomId) {
      codeRoomApi.getSubmissions(roomId)
        .then((subs) => setSubmissions(subs))
        .catch(console.error);
    }
  }, [roomId]);

  // Обработчик нового submission
  const handleSubmission = useCallback((sub: { output: string; error?: string; exitCode: number; submittedBy: string }) => {
    // Обновляем вывод
    setOutput(sub.error || sub.output);
    setIsRunning(false);

    if (sub.exitCode !== 0) {
      setError(`Ошибка (код ${sub.exitCode})`);
    } else {
      setError('');
    }

    // Проверяем на дубликаты по output за последние 2 секунды
    const now = Date.now();
    setSubmissions((prev) => {
      const recentDuplicate = prev.find((s) => {
        const timeDiff = now - new Date(s.submittedAt).getTime();
        return timeDiff < 2000 && s.output === sub.output;
      });
      if (recentDuplicate) {
        return prev;
      }

      // Добавляем в историю с уникальным ID
      const newSubmission: Submission = {
        id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
        output: sub.output,
        error: sub.error,
        exitCode: sub.exitCode,
        executionTimeMs: 0,
        submittedBy: sub.submittedBy,
        submittedByName: '',
        submittedAt: new Date().toISOString(),
      };
      return [...prev, newSubmission];
    });
  }, []);

  const currentUserName = useMemo(() => {
    const authName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
      || user?.username
      || '';
    if (authName) {
      return authName;
    }
    return getStoredGuestName() || '';
  }, [user?.firstName, user?.lastName, user?.username]);

  const currentParticipantId = useMemo(() => {
    if (user?.id) {
      return user.id;
    }
    return getStoredGuestName() || '';
  }, [user?.id]);

  const { isConnected: isRealtimeConnected, code: realtimeCode, room: realtimeRoom, participants } = useCodeRoomRealtime({
    roomId: roomId || '',
    editor: editorInstance,
    initialRoom: room,
    userName: currentUserName,
    participantId: currentParticipantId,
    creatorId: room?.creatorId,
    onRoomUpdate: handleRoomUpdate,
    onSubmission: handleSubmission,
  });

  useEffect(() => {
    if (realtimeCode == null) {
      return;
    }
    const model = editorRef.current?.getModel?.();
    if (model && model.getValue() !== realtimeCode) {
      model.setValue(realtimeCode);
    }
    codeRef.current = realtimeCode;
  }, [realtimeCode]);

  useEffect(() => {
    if (!realtimeRoom) {
      return;
    }
    setRoom(realtimeRoom);
  }, [realtimeRoom]);

  useEffect(() => {
    if (!roomId) {
      return;
    }
    const raw = window.localStorage.getItem(roomNotificationsStorageKey(roomId));
    setNotificationsEnabled(raw !== 'false');
  }, [roomId]);

  useEffect(() => {
    if (!roomId) {
      return;
    }
    window.localStorage.setItem(roomNotificationsStorageKey(roomId), String(notificationsEnabled));
  }, [notificationsEnabled, roomId]);

  // Запуск кода (Submit)
  const handleSubmitCode = async () => {
    if (!roomId || isRunning) return;

    setIsRunning(true);
    setOutput('⏳ Запуск...');
    setError('');

    try {
      const result = await codeRoomApi.submitCode(
        roomId,
        codeRef.current,
        !user ? getStoredGuestName() : undefined,
      );
      // Если SSE по какой-то причине не дошёл, не оставляем пользователя без ответа.
      if (result.error) {
        setOutput(result.error);
        setError('Ошибка');
      } else {
        setOutput(result.output || '(нет вывода)');
      }
      setIsRunning(false);
    } catch (e) {
      const axiosErr = e as AxiosError<{ message?: string }>;
      setOutput(axiosErr.response?.data?.message || 'Ошибка выполнения');
      setError('Ошибка');
      setIsRunning(false);
    }
  };

  // Копирование ссылки приглашения
  const handleCopyInviteCode = async () => {
    if (!room?.inviteCode) return;

    const inviteLink = `${window.location.origin}/code-rooms?invite=${room.inviteCode}`;
    await navigator.clipboard.writeText(inviteLink);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleBack = () => {
    navigate('/practice/code-rooms');
  };

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    setEditorInstance(editor);
  };

  const editorOptions = useMemo(() => ({
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on' as const,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'off' as const,
    padding: { top: 16, bottom: 0 },
    cursorBlinking: 'blink' as const,
    smoothScrolling: true,
    overviewRulerLanes: 0,
    renderLineHighlight: 'none' as const,
    renderValidationDecorations: 'off' as const,
    occurrencesHighlight: 'off' as const,
    selectionHighlight: false,
    guides: {
      bracketPairs: false,
      indentation: false,
      highlightActiveIndentation: false,
    },
    bracketPairColorization: {
      enabled: false,
    },
    readOnly: room?.status === 'finished',
    fixedOverflowWidgets: true,
  }), [room?.status]);

  const displayedParticipants = participants.length > 0 ? participants : (room?.participants ?? []);
  const uniqueParticipants = useMemo(() => {
    const seen = new Map<string, Participant>();
    for (const participant of displayedParticipants) {
      if (!participant) {
        continue;
      }
      const key = participant.id || participant.userId || `${participant.displayName}:${participant.joinedAt}`;
      // Check if this participant is the room creator
      const isCreator = matchesCreator(participant, room?.creatorId);
      const nextParticipant = {
        ...participant,
        role: isCreator ? 'creator' : participant.role,
      } as Participant;
      if (!seen.has(key)) {
        seen.set(key, nextParticipant);
      }
    }
    return Array.from(seen.values());
  }, [displayedParticipants, room?.creatorId]);

  const isParticipantInRoom = useCallback((participant: Participant) => {
    // Room creator is always considered in the room (check both role and creatorId)
    if (participant.role === 'creator') {
      return true;
    }
    // Also check if participant is the creator by userId
    if (participant.userId && room?.creatorId && participant.userId === room.creatorId) {
      return true;
    }
    if (normalizeParticipantIdentity(participant.id) === normalizeParticipantIdentity(currentParticipantId)) {
      return true;
    }
    if (normalizeParticipantIdentity(participant.userId) === normalizeParticipantIdentity(user?.id)) {
      return true;
    }
    if (participant.isGuest && normalizeParticipantIdentity(participant.displayName) === normalizeParticipantIdentity(currentUserName)) {
      return true;
    }
    return participant.isActive === true;
  }, [currentParticipantId, currentUserName, user?.id, room?.creatorId]);

  const activeParticipantsCount = useMemo(
    () => uniqueParticipants.filter((participant) => isParticipantInRoom(participant)).length,
    [isParticipantInRoom, uniqueParticipants],
  );

  const isRoomCreator = useMemo(() => {
    // Only show notification toggle for authenticated room creator
    // Both user and room must be loaded (not loading states)
    if (isRoomLoading) {
      return false;
    }
    const userId = user?.id;
    const creatorId = room?.creatorId;
    if (!userId || !creatorId) {
      return false;
    }
    return userId === creatorId;
  }, [user?.id, room?.creatorId, isRoomLoading]);

  const { leaveToasts, dismissToast } = useRoomPresenceToasts({
    uniqueParticipants,
    notificationsEnabled,
    isParticipantInRoom,
  });

  if (isRoomLoading) {
    return (
      <CodeRoomLoadingState message={<><Loader2 className="animate-spin" size={28} /><span>Загружаем комнату...</span></>} />
    );
  }

  if (needsGuestName) {
    return (
      <div className="code-room-page">
        <GuestNameModal
          open
          initialValue={getStoredGuestName()}
          onConfirm={(name) => {
            setStoredGuestName(name);
            setNeedsGuestName(false);
            // Trigger room reload by clearing roomId dependency (we'll use a separate effect)
            window.location.reload();
          }}
        />
      </div>
    );
  }

  if (roomLoadError) {
    return (
      <CodeRoomLoadingState
        message={<div className="error-banner" style={{ marginTop: 0 }}>{roomLoadError}</div>}
        action={(
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setRoom(null);
              setRoomLoadError('');
              setIsRoomLoading(true);
              navigate(0);
            }}
          >
            Перезагрузить комнату
          </button>
        )}
      />
    );
  }

  if (!room) {
    return null;
  }

  return (
    <div className="code-room-page interview-ide-page">
      <div className="interview-ide-shell">
        <CodeRoomHeader
          isRealtimeConnected={isRealtimeConnected}
          activeParticipantsCount={activeParticipantsCount}
          isRoomCreator={isRoomCreator}
          notificationsEnabled={notificationsEnabled}
          isTimelapseTransitioning={isTimelapseTransitioning}
          showTimelapse={showTimelapse}
          showCopied={showCopied}
          onBack={handleBack}
          onToggleNotifications={() => setNotificationsEnabled((current) => !current)}
          onToggleTimelapse={() => {
            if (isTimelapseTransitioning) {
              return;
            }
            setIsTimelapseTransitioning(true);

            if (!showTimelapse) {
              setShowTimelapse(true);
              setTimelapseIndex(Math.max(0, timelineSnapshots.length - 1));
              setIsTimelapsePlaying(false);
            } else {
              setShowTimelapse(false);
              setIsTimelapsePlaying(false);
            }

            setTimeout(() => setIsTimelapseTransitioning(false), 300);
          }}
          onCopyInvite={handleCopyInviteCode}
        />

        <ParticipantsStrip
          participants={uniqueParticipants}
          room={room}
          matchesCreator={matchesCreator}
          isParticipantInRoom={isParticipantInRoom}
        />

        {showTimelapse && (
          <TimelapseToolbar
            snapshotsCount={timelineSnapshots.length}
            timelapseIndex={timelapseIndex}
            currentTimestampSeconds={(((timelineSnapshots[Math.min(timelapseIndex, timelineSnapshots.length - 1)]?.timestamp ?? 0) / 1000).toFixed(1))}
            isTimelapsePlaying={isTimelapsePlaying}
            onReset={() => {
              setIsTimelapsePlaying(false);
              setTimelapseIndex(0);
            }}
            onTogglePlay={() => setIsTimelapsePlaying((current) => !current)}
            onSeek={(value) => {
              setIsTimelapsePlaying(false);
              setTimelapseIndex(value);
            }}
          />
        )}

        <CodeRoomEditorPanels
          room={room}
          editorWidth={editorWidth}
          editorContainerRef={editorContainerRef}
          showTimelapse={showTimelapse}
          displayedPlaybackCode={displayedPlaybackCode || DEFAULT_CODE}
          handleEditorMount={handleEditorMount}
          editorOptions={editorOptions as unknown as Record<string, unknown>}
          startResize={startResize}
          activeRightTab={activeRightTab}
          isRunning={isRunning}
          submissions={submissions}
          error={error}
          output={output}
          onTabChange={setActiveRightTab}
          onSubmitCode={() => { void handleSubmitCode(); }}
        />
        <LeaveToasts toasts={leaveToasts} onClose={dismissToast} />
      </div>
    </div>
  );
};
