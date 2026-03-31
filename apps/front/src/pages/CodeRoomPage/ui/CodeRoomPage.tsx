import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor, { OnMount } from '@monaco-editor/react';
import { useAuth } from '@/app/providers/AuthProvider';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { getStoredGuestName, setStoredGuestName } from '@/features/CodeRoom/lib/guestIdentity';
import { useCodeRoomRealtime } from '@/features/CodeRoom/api/useCodeRoomRealtime';
import { CodeRoom, Participant, Submission } from '@/entities/CodeRoom/model/types';
import { Copy, Play, ArrowLeft, Loader2, Clock, CheckCircle, XCircle, Pause, SkipBack, Bell, BellOff, X, History } from 'lucide-react';
import { AxiosError } from '@/shared/api/base';
import { GuestNameModal } from '@/features/CodeRoom/ui/GuestNameModal';

const DEFAULT_CODE = `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
`;

const roomNotificationsStorageKey = (roomId: string) => `code_room_notifications:${roomId}`;

type LeaveToast = {
  id: string;
  message: string;
};

const normalizeParticipantIdentity = (value?: string | null) => (value || '').trim().toLowerCase();

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
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [roomLoadError, setRoomLoadError] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [editorWidth, setEditorWidth] = useState(50);
  const [editorInstance, setEditorInstance] = useState<any | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'output' | 'description'>('output');
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [isTimelapsePlaying, setIsTimelapsePlaying] = useState(false);
  const [timelapseIndex, setTimelapseIndex] = useState(0);
  const [leaveToasts, setLeaveToasts] = useState<LeaveToast[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [needsGuestName, setNeedsGuestName] = useState(false);
  const [isTimelapseTransitioning, setIsTimelapseTransitioning] = useState(false);

  const editorRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const codeRef = useRef(code);
  const isResizing = useRef(false);
  const timelineStartedAtRef = useRef(Date.now());
  const timelineSnapshotsRef = useRef<Array<{ timestamp: number; code: string }>>([]);
  const previousParticipantsRef = useRef<Participant[]>([]);
  const leaveBatchRef = useRef<string[]>([]);
  const leaveBatchTimerRef = useRef<number | null>(null);

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

    // Добавляем в историю
    const newSubmission: Submission = {
      id: Date.now().toString(),
      code: codeRef.current,
      output: sub.output,
      error: sub.error,
      exitCode: sub.exitCode,
      executionTimeMs: 0,
      submittedBy: sub.submittedBy,
      submittedByName: 'Участник',
      submittedAt: new Date().toISOString(),
    };
    setSubmissions((prev) => [...prev, newSubmission]);
  }, []);

  // Загрузка начального состояния комнаты
  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    const loadRoom = async () => {
      setIsRoomLoading(true);
      setRoomLoadError('');

      // Check if user is authenticated
      if (!user) {
        const guestName = getStoredGuestName();
        if (!guestName) {
          // Need to get guest name first
          setNeedsGuestName(true);
          setIsRoomLoading(false);
          return;
        }

        // Join as guest
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const nextRoom = await codeRoomApi.joinRoom(roomId, { guestName });
            if (cancelled) {
              return;
            }
            setRoom(nextRoom);
            if (nextRoom.code) {
              setCode(nextRoom.code);
              codeRef.current = nextRoom.code;
            }
            setIsRoomLoading(false);
            return;
          } catch (e) {
            if (cancelled) {
              return;
            }
            console.error('Failed to join room:', e);
            if (attempt < 2) {
              await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
            }
          }
        }
      }

      // Get room (for authenticated users or as fallback)
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const nextRoom = await codeRoomApi.getRoom(roomId);
          if (cancelled) {
            return;
          }
          setRoom(nextRoom);
          if (nextRoom.code) {
            setCode(nextRoom.code);
            codeRef.current = nextRoom.code;
          }
          setIsRoomLoading(false);
          return;
        } catch (e) {
          if (cancelled) {
            return;
          }
          console.error('Failed to load room:', e);
          if (attempt < 2) {
            await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
          }
        }
      }

      if (!cancelled) {
        setRoomLoadError('Не удалось загрузить комнату. Попробуйте еще раз.');
        setIsRoomLoading(false);
      }
    };

    loadRoom();

    return () => {
      cancelled = true;
    };
  }, [roomId, navigate, user]);

  const currentUserName = useMemo(() => {
    const authName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
      || user?.telegramUsername
      || '';
    if (authName) {
      return authName;
    }
    return getStoredGuestName() || 'Гость';
  }, [user?.firstName, user?.lastName, user?.telegramUsername]);

  const currentParticipantId = useMemo(() => {
    if (user?.id) {
      return user.id;
    }
    return getStoredGuestName() || 'guest';
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
    navigate('/code-rooms');
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
      const nextParticipant = {
        ...participant,
        role: participant.role === 'creator'
          || (participant.userId && room?.creatorId && participant.userId === room.creatorId)
          ? 'creator'
          : participant.role,
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
    return participant.isActive !== false;
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

  useEffect(() => {
    const previous = previousParticipantsRef.current;
    previousParticipantsRef.current = uniqueParticipants;

    if (!notificationsEnabled || previous.length === 0) {
      return;
    }

    const previousById = new Map(previous.map((participant) => [participant.id, participant]));
    const currentById = new Map(uniqueParticipants.map((participant) => [participant.id, participant]));
    const leftNames: string[] = [];

    previousById.forEach((participant, id) => {
      if (participant.role === 'creator') {
        return;
      }

      const wasActive = isParticipantInRoom(participant);
      const current = currentById.get(id);
      const isNowActive = current ? isParticipantInRoom(current) : false;

      if (wasActive && !isNowActive) {
        leftNames.push(participant.displayName);
      }
    });

    if (leftNames.length === 0) {
      return;
    }

    leaveBatchRef.current.push(...leftNames);

    if (leaveBatchTimerRef.current !== null) {
      return;
    }

    leaveBatchTimerRef.current = window.setTimeout(() => {
      const batch = Array.from(new Set(leaveBatchRef.current));
      leaveBatchRef.current = [];
      leaveBatchTimerRef.current = null;

      if (batch.length === 0) {
        return;
      }

      const message = batch.length === 1
        ? `${batch[0]} покинул страницу`
        : batch.length === 2
          ? `${batch[0]} и ${batch[1]} покинули страницу`
          : `${batch[0]}, ${batch[1]} и еще ${batch.length - 2} покинули страницу`;

      const toastId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setLeaveToasts((current) => [...current.slice(-2), { id: toastId, message }]);
      window.setTimeout(() => {
        setLeaveToasts((current) => current.filter((toast) => toast.id !== toastId));
      }, 5200);
    }, 1200);
  }, [isParticipantInRoom, notificationsEnabled, uniqueParticipants]);

  useEffect(() => () => {
    if (leaveBatchTimerRef.current !== null) {
      window.clearTimeout(leaveBatchTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing.current) {
        return;
      }

      const minEditor = 10;
      const maxEditor = 90;
      const container = editorContainerRef.current;
      if (!container) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const next = ((event.clientX - rect.left) / rect.width) * 100;
      setEditorWidth(Math.min(maxEditor, Math.max(minEditor, next)));
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      // Ensure styles are reset on unmount
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const startResize = () => {
    if (window.innerWidth <= 768) {
      return;
    }
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  if (isRoomLoading) {
    return (
      <div className="code-room-page">
        <div className="code-room-loading-state">
          <Loader2 className="animate-spin" size={28} />
          <span>Загружаем комнату...</span>
        </div>
      </div>
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
      <div className="code-room-page">
        <div className="code-room-loading-state">
          <div className="error-banner" style={{ marginTop: 0 }}>
            {roomLoadError}
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setRoom(null);
              setRoomLoadError('');
              setIsRoomLoading(true);
              navigate(0);
            }}
          >
            Перезагрузить комнату
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return null;
  }

  return (
    <div className="code-room-page interview-ide-page">
      <div className="interview-ide-shell">
        <div className="code-room-header interview-ide-header code-room-hero">
          <div className="code-room-toolbar">
            <div className="interview-ide-header__left">
              <div className="code-room-hero__title-row">
                <button className="btn code-room-back-btn" onClick={handleBack}>
                  <ArrowLeft size={14} />
                </button>

                <span className="code-rooms-kicker">Code room</span>
              </div>
            </div>

            <div className="code-room-toolbar__spacer" />

            <div className="room-actions">
              <div className={`connection-status ${isRealtimeConnected ? 'connected' : ''}`}>
                <span className={`status-dot ${isRealtimeConnected ? 'connected' : 'disconnected'}`} />
                <span>{isRealtimeConnected ? 'Подключено' : 'Подключение...'}</span>
              </div>
              <div className="arena-chip">Активных {activeParticipantsCount}</div>
              {isRoomCreator && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setNotificationsEnabled((current) => !current)}
                  title={notificationsEnabled ? 'Отключить уведомления комнаты' : 'Включить уведомления комнаты'}
                >
                  {notificationsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                  {notificationsEnabled ? 'Уведомления вкл' : 'Уведомления выкл'}
                </button>
              )}
              <button
                className="btn btn-secondary"
                disabled={isTimelapseTransitioning}
                onClick={() => {
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
              >
                <History size={14} />
                {showTimelapse ? 'Вернуться в live' : 'Завершить интервью'}
              </button>
              <button className="btn btn-secondary" onClick={handleCopyInviteCode}>
                <Copy size={14} />
                {showCopied ? 'Скопировано' : 'Скопировать'}
              </button>
            </div>
          </div>
        </div>

        <div className="code-room-participants-strip">
          {uniqueParticipants.map((p) => (
            <div key={p.id || p.userId || `${p.displayName}:${p.joinedAt}`} className="code-room-participant-pill">
              <span className="participant-name">
                {p.displayName}
                {p.isGuest && <span className="guest-badge">Гость</span>}
                {p.role === 'creator' && <span className="creator-badge">Создатель</span>}
                <span className={`participant-state ${isParticipantInRoom(p) ? 'active' : 'inactive'}`}>
                  {isParticipantInRoom(p) ? 'В комнате' : 'Неактивен'}
                </span>
                {room.mode === 'duel' && p.score !== undefined && (
                  <span className="score-badge">{p.score} очков</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {showTimelapse && (
          <div className="timelapse-toolbar">
            <button
              type="button"
              className="btn-icon timelapse-toolbar__icon"
              onClick={() => {
                setIsTimelapsePlaying(false);
                setTimelapseIndex(0);
              }}
            >
              <SkipBack size={16} />
            </button>
            <button
              type="button"
              className="btn-icon timelapse-toolbar__icon"
              onClick={() => setIsTimelapsePlaying((current) => !current)}
            >
              {isTimelapsePlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <input
              className="timelapse-toolbar__range"
              type="range"
              min={0}
              max={Math.max(0, timelineSnapshots.length - 1)}
              value={Math.min(timelapseIndex, Math.max(0, timelineSnapshots.length - 1))}
              onChange={(event) => {
                setIsTimelapsePlaying(false);
                setTimelapseIndex(Number(event.target.value));
              }}
            />
            <div className="timelapse-toolbar__meta">
              <span>{(((timelineSnapshots[Math.min(timelapseIndex, timelineSnapshots.length - 1)]?.timestamp ?? 0) / 1000).toFixed(1))}s</span>
              <span>{timelineSnapshots.length} steps</span>
            </div>
          </div>
        )}

        <div className="interview-ide-main">
          <div
            ref={editorContainerRef}
            className="editor-container interview-ide-grid"
            style={{ gridTemplateColumns: `minmax(0, ${editorWidth}fr) 6px minmax(0, ${100 - editorWidth}fr)` }}
          >
            <div className="editor-panel interview-ide-editor-panel">
              <div className="panel-header">
                <span>main.go</span>
                <span className="language-badge">Go</span>
              </div>
              <div className="interview-ide-editor-scroll">
                {showTimelapse ? (
                  <div className="timelapse-code-view">
                    <pre>{displayedPlaybackCode || DEFAULT_CODE}</pre>
                  </div>
                ) : (
                  <Editor
                    height="100%"
                    defaultLanguage="go"
                    defaultValue={room.code || DEFAULT_CODE}
                    onMount={handleEditorMount}
                    theme="vs-dark"
                    options={editorOptions}
                  />
                )}
              </div>
              <div className="editor-footer">
                <button
                  className="btn btn-primary editor-run-button"
                  onClick={handleSubmitCode}
                  disabled={isRunning || room.status === 'finished'}
                >
                  {isRunning ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Play size={16} />
                  )}
                  Запустить код
                </button>
              </div>
            </div>

            <button
              type="button"
              className="editor-resize-handle"
              aria-label="Изменить размер панелей"
              onMouseDown={startResize}
            />

            <div className="output-panel interview-ide-output-panel">
              <div className="panel-header panel-header-tabs">
                <div className="panel-tabs">
                  <button
                    type="button"
                    className={`panel-tab ${activeRightTab === 'output' ? 'active' : ''}`}
                    onClick={() => setActiveRightTab('output')}
                  >
                    Вывод
                  </button>
                  <button
                    type="button"
                    className={`panel-tab ${activeRightTab === 'description' ? 'active' : ''}`}
                    onClick={() => setActiveRightTab('description')}
                  >
                    Описание
                  </button>
                </div>
                {activeRightTab === 'output' && isRunning && <Loader2 size={14} className="animate-spin" />}
              </div>
              <div className="interview-ide-output-body">
                {activeRightTab === 'output' ? (
                  <pre className={`output-content ${error ? 'error' : ''}`}>
                    {output || 'Нажмите "Запустить" для выполнения кода'}
                  </pre>
                ) : (
                  <div className="task-description-panel">
                    <div className="task-description-panel__label">
                      Описание комнаты
                    </div>
                    <div className="task-description-panel__body">
                      {room.task || 'Пока описание задачи не задано. Когда комната будет связана с задачей, здесь появится условие, ограничения и примеры.'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {submissions.length > 0 && (
          <div className="submissions-panel">
            <div className="panel-header">
              <span>История ({submissions.length})</span>
            </div>
            <div className="submissions-list">
              {submissions.slice().reverse().map((sub) => (
                <div key={sub.id} className="submission-item">
                  <div className="submission-header">
                    <span className="submission-user">{sub.submittedByName}</span>
                    <span className="submission-time">
                      <Clock size={12} />
                      {new Date(sub.submittedAt).toLocaleTimeString('ru')}
                    </span>
                    {sub.exitCode === 0 ? (
                      <CheckCircle size={14} className="icon-success" />
                    ) : (
                      <XCircle size={14} className="icon-error" />
                    )}
                  </div>
                  <pre className="submission-output">{sub.error || sub.output}</pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {leaveToasts.length > 0 && (
          <div className="room-leave-toasts">
            {leaveToasts.map((toast) => (
              <div key={toast.id} className="room-leave-toast">
                <span>{toast.message}</span>
                <button
                  type="button"
                  className="btn-icon room-leave-toast__close"
                  onClick={() => setLeaveToasts((current) => current.filter((item) => item.id !== toast.id))}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
