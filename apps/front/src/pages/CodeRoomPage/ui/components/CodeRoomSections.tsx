import Editor, { OnMount } from '@monaco-editor/react';
import { CodeRoom, Participant, Submission } from '@/entities/CodeRoom/model/types';
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCircle,
  Clock,
  Copy,
  History,
  Loader2,
  Pause,
  Play,
  SkipBack,
  X,
  XCircle,
} from 'lucide-react';

export function CodeRoomLoadingState({
  message,
  action,
}: {
  message: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="code-room-page">
      <div className="code-room-loading-state">
        {message}
        {action}
      </div>
    </div>
  );
}

export function CodeRoomHeader({
  isRealtimeConnected,
  activeParticipantsCount,
  isRoomCreator,
  notificationsEnabled,
  isTimelapseTransitioning,
  showTimelapse,
  showCopied,
  onBack,
  onToggleNotifications,
  onToggleTimelapse,
  onCopyInvite,
}: {
  isRealtimeConnected: boolean;
  activeParticipantsCount: number;
  isRoomCreator: boolean;
  notificationsEnabled: boolean;
  isTimelapseTransitioning: boolean;
  showTimelapse: boolean;
  showCopied: boolean;
  onBack: () => void;
  onToggleNotifications: () => void;
  onToggleTimelapse: () => void;
  onCopyInvite: () => void;
}) {
  return (
    <div className="code-room-header interview-ide-header code-room-hero">
      <div className="code-room-toolbar">
        <div className="interview-ide-header__left">
          <div className="code-room-hero__title-row">
            <button className="btn code-room-back-btn" onClick={onBack}>
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
              onClick={onToggleNotifications}
              title={notificationsEnabled ? 'Отключить уведомления комнаты' : 'Включить уведомления комнаты'}
            >
              {notificationsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
              {notificationsEnabled ? 'Уведомления вкл' : 'Уведомления выкл'}
            </button>
          )}
          <button className="btn btn-secondary" disabled={isTimelapseTransitioning} onClick={onToggleTimelapse}>
            <History size={14} />
            {showTimelapse ? 'Вернуться в live' : 'Завершить интервью'}
          </button>
          <button className="btn btn-secondary" onClick={onCopyInvite}>
            <Copy size={14} />
            {showCopied ? 'Скопировано' : 'Скопировать'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ParticipantsStrip({
  participants,
  room,
  matchesCreator,
  isParticipantInRoom,
}: {
  participants: Participant[];
  room: CodeRoom;
  matchesCreator: (participant: Participant, creatorId?: string | null) => boolean;
  isParticipantInRoom: (participant: Participant) => boolean;
}) {
  return (
    <div className="code-room-participants-strip">
      {participants.map((participant) => (
        <div key={participant.id || participant.userId || `${participant.displayName}:${participant.joinedAt}`} className="code-room-participant-pill">
          <span className="participant-name">
            <span className="participant-name__text">{participant.displayName}</span>
            {participant.isGuest && <span className="guest-badge">Гость</span>}
            {matchesCreator(participant, room.creatorId) && <span className="badge creator-badge">Создатель</span>}
            <span className={`participant-state ${isParticipantInRoom(participant) ? 'active' : 'inactive'}`}>
              {isParticipantInRoom(participant) ? 'В комнате' : 'Неактивен'}
            </span>
            {room.mode === 'duel' && participant.score !== undefined && (
              <span className="score-badge">{participant.score} очков</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TimelapseToolbar({
  snapshotsCount,
  timelapseIndex,
  currentTimestampSeconds,
  isTimelapsePlaying,
  onReset,
  onTogglePlay,
  onSeek,
}: {
  snapshotsCount: number;
  timelapseIndex: number;
  currentTimestampSeconds: string;
  isTimelapsePlaying: boolean;
  onReset: () => void;
  onTogglePlay: () => void;
  onSeek: (value: number) => void;
}) {
  return (
    <div className="timelapse-toolbar">
      <button type="button" className="btn-icon timelapse-toolbar__icon" onClick={onReset}>
        <SkipBack size={16} />
      </button>
      <button type="button" className="btn-icon timelapse-toolbar__icon" onClick={onTogglePlay}>
        {isTimelapsePlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <input
        className="timelapse-toolbar__range"
        type="range"
        min={0}
        max={Math.max(0, snapshotsCount - 1)}
        value={Math.min(timelapseIndex, Math.max(0, snapshotsCount - 1))}
        onChange={(event) => onSeek(Number(event.target.value))}
      />
      <div className="timelapse-toolbar__meta">
        <span>{currentTimestampSeconds}s</span>
        <span>{snapshotsCount} steps</span>
      </div>
    </div>
  );
}

export function CodeRoomEditorPanels({
  room,
  editorWidth,
  editorContainerRef,
  showTimelapse,
  displayedPlaybackCode,
  handleEditorMount,
  editorOptions,
  startResize,
  activeRightTab,
  isRunning,
  submissions,
  error,
  output,
  onTabChange,
  onSubmitCode,
}: {
  room: CodeRoom;
  editorWidth: number;
  editorContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  showTimelapse: boolean;
  displayedPlaybackCode: string;
  handleEditorMount: OnMount;
  editorOptions: Record<string, unknown>;
  startResize: () => void;
  activeRightTab: 'output' | 'history' | 'description';
  isRunning: boolean;
  submissions: Submission[];
  error: string;
  output: string;
  onTabChange: (tab: 'output' | 'history' | 'description') => void;
  onSubmitCode: () => void;
}) {
  return (
    <div className="interview-ide-main">
      <div
        ref={editorContainerRef}
        className="editor-container interview-ide-grid"
        style={{ gridTemplateColumns: `minmax(0, ${editorWidth}fr) 6px minmax(0, ${100 - editorWidth}fr)` }}
      >
        <div className="editor-panel interview-ide-editor-panel">
          <div className="panel-header panel-header--editor">
            <div className="panel-header__group">
              <span>main.go</span>
              <span className="language-badge">Go</span>
            </div>
            <div className="panel-header__group">
              <button className="btn btn-primary editor-run-button" onClick={onSubmitCode} disabled={isRunning || room.status === 'finished'}>
                {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                Запустить код
              </button>
            </div>
          </div>
          <div className="interview-ide-editor-scroll">
            {showTimelapse ? (
              <div className="timelapse-code-view">
                <pre>{displayedPlaybackCode}</pre>
              </div>
            ) : (
              <Editor
                height="100%"
                defaultLanguage="go"
                defaultValue={room.code}
                onMount={handleEditorMount}
                theme="vs-dark"
                options={editorOptions}
              />
            )}
          </div>
        </div>

        <button type="button" className="editor-resize-handle" aria-label="Изменить размер панелей" onMouseDown={startResize} />

        <div className="output-panel interview-ide-output-panel">
          <div className="panel-header panel-header-tabs">
            <div className="panel-tabs">
              <button type="button" className={`panel-tab ${activeRightTab === 'output' ? 'active' : ''}`} onClick={() => onTabChange('output')}>Вывод</button>
              <button type="button" className={`panel-tab ${activeRightTab === 'history' ? 'active' : ''}`} onClick={() => onTabChange('history')}>История {submissions.length > 0 && `(${submissions.length})`}</button>
              <button type="button" className={`panel-tab ${activeRightTab === 'description' ? 'active' : ''}`} onClick={() => onTabChange('description')}>Описание</button>
            </div>
            {activeRightTab === 'output' && isRunning && <Loader2 size={14} className="animate-spin" />}
          </div>
          <div className="interview-ide-output-body">
            {activeRightTab === 'output' ? (
              <pre className={`output-content ${error ? 'error' : ''}`}>{output || 'Нажмите "Запустить" для выполнения кода'}</pre>
            ) : activeRightTab === 'history' ? (
              <div className="submissions-list">
                {submissions.length === 0 ? (
                  <div className="empty-history">История пуста</div>
                ) : (
                  submissions.slice().reverse().map((submission) => (
                    <div key={submission.id} className="submission-item">
                      <div className="submission-header">
                        <span className="submission-user">{submission.submittedByName}</span>
                        <span className="submission-time">
                          <Clock size={12} />
                          {new Date(submission.submittedAt).toLocaleTimeString('ru')}
                        </span>
                        {submission.exitCode === 0 ? <CheckCircle size={14} className="icon-success" /> : <XCircle size={14} className="icon-error" />}
                      </div>
                      <pre className="submission-output">{submission.error || submission.output}</pre>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="task-description-panel">
                <div className="task-description-panel__label">Описание комнаты</div>
                <div className="task-description-panel__body">
                  {room.task || 'Пока описание задачи не задано. Когда комната будет связана с задачей, здесь появится условие, ограничения и примеры.'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeaveToasts({
  toasts,
  onClose,
}: {
  toasts: Array<{ id: string; message: string }>;
  onClose: (id: string) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="room-leave-toasts">
      {toasts.map((toast) => (
        <div key={toast.id} className="room-leave-toast">
          <span>{toast.message}</span>
          <button type="button" className="btn-icon room-leave-toast__close" onClick={() => onClose(toast.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
