import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  AlertTriangle,
  ArrowLeft,
  Clock3,
  Copy,
  Eye,
  Pause,
  Play,
  ShieldAlert,
  SkipBack,
  Square,
  Swords,
  TimerReset,
  Trophy,
  X,
} from 'lucide-react';

import { ArenaMatch, ArenaPlayer } from '@/entities/CodeRoom/model/types';
import { APP_MONACO_THEME, configureAppMonacoTheme } from '@/shared/lib/monacoTheme';
import { ARENA_RULES, formatClock } from '../lib/arenaMatchHelpers';

export const AntiCheatCountdown: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => {
      setSecondsLeft(secondsLeft - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, onComplete]);

  useEffect(() => {
    setKey((prev) => prev + 1);
  }, []);

  return (
    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '40px', height: '4px', background: 'rgba(245, 158, 11, 0.3)', borderRadius: '2px', overflow: 'hidden' }}>
        <div
          key={key}
          style={{ width: '100%', height: '100%', background: '#fcd34d', animation: 'antiCheatShrink 10s linear forwards' }}
        />
      </div>
      <span style={{ fontSize: '12px', opacity: 0.8 }}>{secondsLeft}s</span>
    </span>
  );
};

export const ArenaPageState: React.FC<{
  message: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
}> = ({ message, buttonLabel, onButtonClick }) => (
  <div className="arena-page-state">
    <div>{message}</div>
    {buttonLabel && onButtonClick && (
      <button className="btn btn-secondary" onClick={onButtonClick}>{buttonLabel}</button>
    )}
  </div>
);

export const ArenaRulesModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal arena-rules-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Правила арены</h2>
        <div className="arena-rules-modal__list">
          {ARENA_RULES.map((rule) => (
            <div key={rule} className="arena-rules-modal__item">
              <span className="arena-rules-modal__dot" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>Понятно</button>
        </div>
      </div>
    </div>
  );
};

export const ArenaMatchHeader: React.FC<{
  isConnected: boolean;
  isMobile: boolean;
  isSpectator: boolean;
  copied: boolean;
  elapsedSeconds: number;
  remainingSeconds: number;
  winner: ArenaPlayer | null;
  winnerReasonLabel: string;
  match: ArenaMatch;
  canShowReplayActions: boolean;
  canUseTimelapse: boolean;
  showTimelapse: boolean;
  onBack: () => void;
  onCopyLink: () => void;
  onToggleTimelapse: () => void;
  onShowAntiCheat: () => void;
}> = ({
  isConnected,
  isMobile,
  isSpectator,
  copied,
  elapsedSeconds,
  remainingSeconds,
  winner,
  winnerReasonLabel,
  match,
  canShowReplayActions,
  canUseTimelapse,
  showTimelapse,
  onBack,
  onCopyLink,
  onToggleTimelapse,
  onShowAntiCheat,
}) => (
  <div className="arena-page__header">
    <div className="arena-page__header-left">
      <button className="btn btn-secondary arena-back-btn" onClick={onBack}>
        <ArrowLeft size={16} />
      </button>
      <span className="code-rooms-kicker">Arena duel</span>
    </div>
    <div className="arena-page__meta">
      <div className={`connection-status ${isConnected ? 'connected' : ''}`}>
        <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
        {!isMobile && <span>{isConnected ? 'Realtime активен' : 'Переподключение...'}</span>}
      </div>
      {winner && (
        <div className="arena-chip arena-chip--winner">
          <Trophy size={14} />
          <span>{isMobile ? winner.displayName : `Победил ${winner.displayName}`}</span>
        </div>
      )}
      {!isMobile && winnerReasonLabel && <div className="arena-chip arena-chip--winner-reason">{winnerReasonLabel}</div>}
      {!isMobile && (
        <>
          <div className="arena-chip"><Clock3 size={14} /> {formatClock(elapsedSeconds)}</div>
          <div className="arena-chip"><TimerReset size={14} /> {formatClock(remainingSeconds)}</div>
          <div className="arena-chip"><Swords size={14} /> {match.topic || 'any'} / {match.difficulty || 'any'}</div>
        </>
      )}
      {isMobile && <div className="arena-chip"><TimerReset size={14} /> {formatClock(remainingSeconds)}</div>}
      {!isMobile && !isSpectator && match.startedAt && match.status !== 'finished' && (
        <div className="arena-chip" onClick={onShowAntiCheat}>Anti-cheat активен</div>
      )}
      {isSpectator && <div className="arena-chip arena-chip--spectator"><Eye size={14} /> {isMobile ? '' : 'Режим зрителя'}</div>}
      {!isSpectator && (
        <button className="btn btn-primary arena-copy-btn" onClick={onCopyLink} style={{ width: isMobile ? '40px' : 'auto', padding: isMobile ? 0 : '0 12px' }}>
          <Copy size={16} />
          {!isMobile && <span>{copied ? 'Скопировано' : 'Скопировать'}</span>}
        </button>
      )}
      {canShowReplayActions && canUseTimelapse && (
        <button className="btn btn-primary arena-copy-btn" onClick={onToggleTimelapse} style={{ width: isMobile ? '40px' : 'auto', padding: isMobile ? 0 : '0 12px' }}>
          {showTimelapse ? <Play size={16} /> : <Square size={16} />}
          {!isMobile && <span>{showTimelapse ? 'Вернуться в live' : 'Таймлайн'}</span>}
        </button>
      )}
    </div>
  </div>
);

export const ArenaMobileTabs: React.FC<{
  bothPlayersConnected: boolean;
  activeTab: 'editor' | 'opponent' | 'output';
  submitError: string;
  onChange: (tab: 'editor' | 'opponent' | 'output') => void;
}> = ({ bothPlayersConnected, activeTab, submitError, onChange }) => {
  if (!bothPlayersConnected) {
    return null;
  }

  return (
    <div className="arena-mobile-tabs">
      <button className={`arena-mobile-tab ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => onChange('editor')}>Код</button>
      <button className={`arena-mobile-tab ${activeTab === 'opponent' ? 'active' : ''}`} onClick={() => onChange('opponent')}>Соперник</button>
      <button className={`arena-mobile-tab ${activeTab === 'output' ? 'active' : ''} ${submitError ? 'has-error' : ''}`} onClick={() => onChange('output')}>Output</button>
    </div>
  );
};

export const ArenaTimelapseToolbar: React.FC<{
  isVisible: boolean;
  isPlaying: boolean;
  timelineLength: number;
  timelapseIndex: number;
  currentTimestamp: number;
  onReset: () => void;
  onTogglePlay: () => void;
  onSeek: (index: number) => void;
}> = ({
  isVisible,
  isPlaying,
  timelineLength,
  timelapseIndex,
  currentTimestamp,
  onReset,
  onTogglePlay,
  onSeek,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="timelapse-toolbar arena-timelapse-toolbar">
      <button type="button" className="btn-icon timelapse-toolbar__icon" onClick={onReset}>
        <SkipBack size={16} />
      </button>
      <button type="button" className="btn-icon timelapse-toolbar__icon" onClick={onTogglePlay}>
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <input
        className="timelapse-toolbar__range"
        type="range"
        min={0}
        max={Math.max(0, timelineLength - 1)}
        value={Math.min(timelapseIndex, Math.max(0, timelineLength - 1))}
        onChange={(event) => onSeek(Number(event.target.value))}
      />
      <div className="timelapse-toolbar__meta">
        <span>{(currentTimestamp / 1000).toFixed(1)}s</span>
        <span>{timelineLength} steps</span>
      </div>
    </div>
  );
};

export const ArenaNotice: React.FC<{
  message: string;
  showLiveCountdown?: boolean;
  strikes?: number;
  matchFinished?: boolean;
  onClose: () => void;
}> = ({ message, showLiveCountdown, strikes, matchFinished, onClose }) => (
  <div className={`arena-anti-cheat-notice ${showLiveCountdown ? 'arena-anti-cheat-notice--live' : ''}`}>
    <ShieldAlert size={16} />
    <span>
      {message}
      {!matchFinished && strikes && strikes > 0 ? ` (${Math.min(strikes, 2)}/2)` : ''}
    </span>
    {showLiveCountdown && !matchFinished ? (
      <AntiCheatCountdown onComplete={onClose} />
    ) : matchFinished ? (
      <button type="button" className="btn-icon" onClick={onClose} aria-label="Закрыть уведомление">
        <X size={14} />
      </button>
    ) : null}
  </div>
);

export const ArenaWaitingState: React.FC<{
  copied: boolean;
  onCopyLink: () => void;
}> = ({ copied, onCopyLink }) => (
  <div className="arena-waiting-opponent">
    <div className="arena-waiting-opponent__content">
      <div className="arena-waiting-opponent__icon">
        <Swords size={48} />
      </div>
      <h2>Ожидаем соперника</h2>
      <p>Поделитесь ссылкой с другом, чтобы начать дуэль</p>
      <button className="btn btn-primary arena-waiting-opponent__btn" onClick={onCopyLink}>
        <Copy size={16} />
        <span>{copied ? 'Скопировано' : 'Скопировать'}</span>
      </button>
    </div>
  </div>
);

type GridProps = {
  isMobile: boolean;
  isSpectator: boolean;
  match: ArenaMatch;
  bothPlayersConnected: boolean;
  waitingForOpponent: boolean;
  activeTab: 'editor' | 'opponent' | 'output';
  gridRef: React.MutableRefObject<HTMLDivElement | null>;
  editorWidth: number;
  me: ArenaPlayer | null;
  opponent: ArenaPlayer | null;
  leftPlayer: ArenaPlayer | null;
  rightPlayer: ArenaPlayer | null;
  freezeLeft: number;
  canSubmit: boolean;
  showTimelapse: boolean;
  displayedLeftCode: string;
  displayedRightCode: string;
  leftCode: string;
  arenaLanguage: string;
  submitting: boolean;
  submitError: string;
  output: string;
  outputStateClass: string;
  shouldHideOpponentCode: boolean;
  setSelfCode: (code: string) => void;
  onSubmit: () => void;
  onResizeStart: () => void;
};

export const ArenaMatchGrid: React.FC<GridProps> = ({
  isMobile,
  isSpectator,
  match,
  bothPlayersConnected,
  waitingForOpponent,
  activeTab,
  gridRef,
  editorWidth,
  me,
  opponent,
  leftPlayer,
  rightPlayer,
  freezeLeft,
  canSubmit,
  showTimelapse,
  displayedLeftCode,
  displayedRightCode,
  leftCode,
  arenaLanguage,
  submitting,
  submitError,
  output,
  outputStateClass,
  shouldHideOpponentCode,
  setSelfCode,
  onSubmit,
  onResizeStart,
}) => {
  if (!bothPlayersConnected) {
    return null;
  }

  return (
    <div
      ref={gridRef}
      className="arena-page__grid arena-page__grid--resizable"
      style={{
        gridTemplateColumns: isMobile
          ? '1fr'
          : isSpectator
          ? `minmax(0, ${editorWidth}fr) minmax(0, ${100 - editorWidth}fr)`
          : `minmax(0, ${editorWidth}fr) 8px minmax(0, ${100 - editorWidth}fr)`,
      }}
    >
      {(!isMobile || activeTab === 'editor') && (
        <section className="arena-panel arena-panel--editor">
          <div className="arena-panel__header">
            <div>
              <div className="arena-panel__title">{isSpectator ? 'Игрок слева' : 'Твой редактор'}</div>
              <div className="arena-panel__subtitle">
                {isSpectator ? (leftPlayer?.displayName || 'Ожидаем первого игрока') : (me?.displayName || 'Игрок')}
                {!isSpectator && freezeLeft > 0 ? ` • freeze ${freezeLeft}s` : ''}
              </div>
            </div>
            {!isSpectator && freezeLeft > 0 && <div className="arena-freeze-badge"><TimerReset size={14} /> {freezeLeft}s</div>}
          </div>
          <div className="arena-panel__body">
            {showTimelapse ? (
              <div className="arena-editor-shell">
                <pre className="arena-editor-shell__pre">{displayedLeftCode}</pre>
              </div>
            ) : (
              <Editor
                height="100%"
                beforeMount={configureAppMonacoTheme}
                defaultLanguage={arenaLanguage}
                language={arenaLanguage}
                value={leftCode}
                onChange={(value) => {
                  if (!isSpectator) {
                    setSelfCode(value || '');
                  }
                }}
                options={{
                  fontSize: isMobile ? 12 : 14,
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  automaticLayout: true,
                  readOnly: isSpectator || freezeLeft > 0 || match.status === 'finished',
                  scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
                  lineNumbers: isMobile ? 'off' : 'on',
                }}
                theme={APP_MONACO_THEME}
              />
            )}
          </div>
          <div className="arena-panel__footer">
            {isSpectator ? (
              <div className="arena-spectator-note">
                <Eye size={16} />
                {!isMobile && 'Только просмотр без участия в матче.'}
              </div>
            ) : (
              <>
                <button className="btn btn-primary arena-submit-btn" disabled={!canSubmit} onClick={onSubmit} style={{ height: isMobile ? '40px' : 'auto' }}>
                  <Play size={16} />
                  <span>{submitting ? '...' : 'Отправить'}</span>
                </button>
                {submitError && !isMobile && <span className="arena-error-inline">{submitError}</span>}
              </>
            )}
          </div>
        </section>
      )}

      {!isSpectator && !isMobile && (
        <button
          type="button"
          className="arena-resize-handle"
          aria-label="Изменить размер панелей арены"
          onMouseDown={onResizeStart}
        />
      )}

      {(!isMobile || activeTab === 'opponent' || activeTab === 'output') && (
        <section className="arena-panel arena-panel--opponent">
          {(!isMobile || activeTab === 'opponent') && (
            <>
              <div className="arena-panel__header">
                <div>
                  <div className="arena-panel__title">{isSpectator ? 'Игрок справа' : 'Соперник'}</div>
                  <div className="arena-panel__subtitle">
                    {isSpectator ? (rightPlayer?.displayName || 'Ожидаем второго игрока') : (opponent?.displayName || 'Ожидаем второго игрока')}
                  </div>
                </div>
                {!isSpectator && match.obfuscateOpponent && match.status !== 'finished' && opponent && (
                  <div className="arena-freeze-badge arena-freeze-badge--ghost"><ShieldAlert size={14} /> {isMobile ? '' : 'Код скрыт'}</div>
                )}
              </div>
              <div className="arena-panel__body">
                {waitingForOpponent ? (
                  <div className="arena-waiting-state">
                    <Eye size={16} />
                    <span>Ждём второго игрока.</span>
                  </div>
                ) : (
                  <div className="arena-editor-shell">
                    <pre className="arena-editor-shell__pre" style={{ fontSize: isMobile ? '12px' : '13px' }}>
                      {displayedRightCode || (!showTimelapse && shouldHideOpponentCode ? '**********\n**********\n**********' : '// соперник пока ничего не написал')}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
          {(!isMobile || activeTab === 'output') && (
            <div className="arena-panel__footer arena-panel__footer--output" style={{ borderTop: (isMobile && activeTab === 'output') ? 'none' : '1px solid rgba(255, 255, 255, 0.06)', flex: (isMobile && activeTab === 'output') ? 1 : 'unset' }}>
              <div className="arena-output-label">
                <AlertTriangle size={15} />
                Judge output
              </div>
              <pre className={outputStateClass} style={{ fontSize: isMobile ? '12px' : '13px' }}>{output || 'Результат проверки появится здесь.'}</pre>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
