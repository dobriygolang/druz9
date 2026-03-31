import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { AlertTriangle, ArrowLeft, Clock3, Copy, Eye, Pause, Play, ShieldAlert, SkipBack, Square, Swords, TimerReset, Trophy } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { ArenaMatch, ArenaPlayer } from '@/entities/CodeRoom/model/types';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { useArenaRealtime } from '@/features/CodeRoom/api/useArenaRealtime';
import { getStoredGuestId, getStoredGuestName } from '@/features/CodeRoom/lib/guestIdentity';
import { AxiosError } from '@/shared/api/base';

// Anti-cheat countdown timer component
const AntiCheatCountdown: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
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

  // Reset animation on mount
  useEffect(() => {
    setKey(prev => prev + 1);
  }, []);

  return (
    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '40px',
        height: '4px',
        background: 'rgba(245, 158, 11, 0.3)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div
          key={key}
          style={{
            width: '100%',
            height: '100%',
            background: '#fcd34d',
            animation: 'antiCheatShrink 10s linear forwards'
          }}
        />
      </div>
      <span style={{ fontSize: '12px', opacity: 0.8 }}>{secondsLeft}s</span>
    </span>
  );
};

const ARENA_RULES = [
  'Первый accepted submit сразу завершает матч и фиксирует победителя.',
  'После wrong answer или runtime error включается freeze на 30 секунд.',
  'Рейтинг начисляется только авторизованным пользователям.',
  'Изменение ELO не фиксированное: максимум +50 или -50, точное число зависит от разницы рейтингов.',
  'Лиги арены: Bronze, Silver, Gold, Diamond, Master, Legend.',
  'Anti-cheat: переключение вкладки и попытки paste во время матча логируются.',
  'После завершения матча оба игрока видят решения друг друга.',
  'Зритель видит оба редактора, но не может менять код или отправлять решение.',
];

const TASK_HEADER_MARKER = '// Arena Task';

const WIN_REASON_LABELS: Record<string, string> = {
  single_ac: 'первый accepted',
  accepted_time: 'раньше по времени',
  runtime: 'быстрее по runtime',
  timeout: 'победа к концу таймера',
  none: 'без победителя',
};

const formatClock = (totalSeconds: number) => {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getPlayerCode = (player: ArenaPlayer | null, playerCodes: Record<string, string>, fallback = '') => {
  if (!player) {
    return fallback;
  }
  return playerCodes[player.userId] ?? player.currentCode ?? fallback;
};

const buildArenaEditorTemplate = (match: ArenaMatch | null, code: string) => {
  const baseCode = code || match?.starterCode || '';
  if (!match?.taskStatement) {
    return baseCode;
  }
  if (baseCode.startsWith(TASK_HEADER_MARKER)) {
    return baseCode;
  }

  const commentBlock = [
    `${TASK_HEADER_MARKER}: ${match.taskTitle || 'Duel task'}`,
    '//',
    ...match.taskStatement.split('\n').map((line) => `// ${line}`),
    '',
  ].join('\n');

  return `${commentBlock}\n${baseCode}`.trim();
};

export const ArenaMatchPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const isSpectator = searchParams.get('spectator') === '1';

  const [match, setMatch] = useState<ArenaMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [output, setOutput] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editorWidth, setEditorWidth] = useState(54);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [isTimelapsePlaying, setIsTimelapsePlaying] = useState(false);
  const [timelapseIndex, setTimelapseIndex] = useState(0);
  const [antiCheatNotice, setAntiCheatNotice] = useState('');
  const [showAntiCheatBanner, setShowAntiCheatBanner] = useState(false);

  const hasJoinedRef = useRef(false);
  const isResizingRef = useRef(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const timelineStartedAtRef = useRef(Date.now());
  const timelineSnapshotsRef = useRef<Array<{ timestamp: number; leftCode: string; rightCode: string }>>([]);
  const finalOpponentCodeRef = useRef('');

  const myUserId = user?.id || getStoredGuestId();
  const myDisplayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.telegramUsername || 'User'
    : getStoredGuestName() || 'Guest';

  const {
    isConnected,
    match: liveMatch,
    selfCode,
    opponentCode,
    playerCodes,
    setSelfCode,
  } = useArenaRealtime({
    matchId: matchId || '',
    userId: myUserId,
    initialMatch: match,
    displayName: myDisplayName,
    spectator: isSpectator,
  });

  useEffect(() => {
    setShowTimelapse(false);
    setIsTimelapsePlaying(false);
    setTimelapseIndex(0);
    setAntiCheatNotice('');
    timelineStartedAtRef.current = Date.now();
    timelineSnapshotsRef.current = [];
    finalOpponentCodeRef.current = '';
  }, [matchId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingRef.current || !gridRef.current) {
        return;
      }
      const rect = gridRef.current.getBoundingClientRect();
      const next = ((event.clientX - rect.left) / rect.width) * 100;
      setEditorWidth(Math.min(70, Math.max(38, next)));
    };
    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (liveMatch) {
      setMatch(liveMatch);
    }
  }, [liveMatch]);

  useEffect(() => {
    if (!matchId) {
      return;
    }

    if (authLoading) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        let nextMatch = await codeRoomApi.getArenaMatch(matchId, myUserId, user ? undefined : myDisplayName);
        const alreadyInMatch = nextMatch.players.some((item) => item.userId === myUserId);
        if (!isSpectator && !alreadyInMatch && !hasJoinedRef.current) {
          hasJoinedRef.current = true;
          nextMatch = await codeRoomApi.joinArenaMatch(matchId, myUserId, user ? undefined : myDisplayName);
        }
        if (!cancelled) {
          setMatch(nextMatch);
        }
      } catch (e) {
        const axiosErr = e as AxiosError<{ message?: string }>;
        if (!cancelled) {
          setError(axiosErr.response?.data?.message || 'Не удалось загрузить арену');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isSpectator, matchId, myDisplayName, myUserId, user]);

  const me = useMemo(() => match?.players.find((item) => item.userId === myUserId) || null, [match, myUserId]);
  const leftPlayer = useMemo(() => match?.players.find((item) => item.side === 'left') || null, [match]);
  const rightPlayer = useMemo(() => match?.players.find((item) => item.side === 'right') || null, [match]);
  const opponent = useMemo(() => match?.players.find((item) => item.userId !== myUserId) || null, [match, myUserId]);
  const winner = useMemo(() => match?.players.find((item) => item.userId === match?.winnerUserId) || null, [match]);
  const winnerReasonLabel = useMemo(() => {
    if (!match?.winnerReason) {
      return '';
    }
    return WIN_REASON_LABELS[match.winnerReason] || match.winnerReason;
  }, [match?.winnerReason]);

  const freezeLeft = useMemo(() => {
    if (!me?.freezeUntil) {
      return 0;
    }
    return Math.max(0, Math.ceil((new Date(me.freezeUntil).getTime() - nowTs) / 1000));
  }, [me?.freezeUntil, nowTs]);

  const elapsedSeconds = useMemo(() => {
    if (!match?.startedAt) {
      return 0;
    }
    const startedAt = new Date(match.startedAt).getTime();
    const endAt = match.finishedAt ? new Date(match.finishedAt).getTime() : nowTs;
    return Math.max(0, Math.floor((endAt - startedAt) / 1000));
  }, [match?.finishedAt, match?.startedAt, nowTs]);

  const remainingSeconds = useMemo(() => {
    if (!match?.startedAt || !match.durationSeconds) {
      return match?.durationSeconds || 0;
    }
    return Math.max(0, match.durationSeconds - elapsedSeconds);
  }, [elapsedSeconds, match?.durationSeconds, match?.startedAt]);

  const canSubmit = !isSpectator && Boolean(me) && freezeLeft === 0 && !submitting && match?.status !== 'finished';
  const waitingForOpponent = !rightPlayer;
  const bothPlayersConnected = Boolean(leftPlayer && rightPlayer);
  const shouldHideOpponentCode = !isSpectator && Boolean(match?.obfuscateOpponent) && match?.status !== 'finished';
  const canUseTimelapse = isSpectator || !match?.obfuscateOpponent;
  const canShowReplayActions = Boolean(match?.status === 'finished' || match?.winnerUserId || match?.finishedAt);

  const rawSelfCode = useMemo(() => buildArenaEditorTemplate(match, selfCode), [match, selfCode]);
  const rawOpponentCode = useMemo(() => {
    if (waitingForOpponent) {
      return '';
    }
    const currentOpponentCode = opponentCode || getPlayerCode(opponent, playerCodes, '');
    return buildArenaEditorTemplate(match, currentOpponentCode || match?.starterCode || '');
  }, [match, opponent, opponentCode, playerCodes, waitingForOpponent]);

  const leftCode = useMemo(() => {
    if (isSpectator) {
      return buildArenaEditorTemplate(match, getPlayerCode(leftPlayer, playerCodes, match?.starterCode || ''));
    }
    return rawSelfCode;
  }, [isSpectator, leftPlayer, match, playerCodes, rawSelfCode]);

  const rightCode = useMemo(() => {
    if (waitingForOpponent) {
      return '';
    }

    if (isSpectator) {
      return buildArenaEditorTemplate(match, getPlayerCode(rightPlayer, playerCodes, match?.starterCode || ''));
    }

    if (shouldHideOpponentCode) {
      return '';
    }

    return rawOpponentCode;
  }, [isSpectator, match, playerCodes, rawOpponentCode, rightPlayer, shouldHideOpponentCode, waitingForOpponent]);

  useEffect(() => {
    if (!match || match.status !== 'finished') {
      return;
    }
    const revealedOpponentCode = getPlayerCode(opponent, playerCodes, '');
    if (revealedOpponentCode) {
      finalOpponentCodeRef.current = buildArenaEditorTemplate(match, revealedOpponentCode);
    }
  }, [match, opponent, playerCodes]);

  const outputStateClass = submitError || /wrong answer|runtime error|compile/i.test(`${output} ${submitError}`)
    ? 'arena-output arena-output--error'
    : output
      ? 'arena-output arena-output--filled'
      : 'arena-output';

  useEffect(() => {
    if (showTimelapse) {
      return;
    }
    const snapshots = timelineSnapshotsRef.current;
    const next = {
      timestamp: Date.now() - timelineStartedAtRef.current,
      leftCode: isSpectator ? leftCode : rawSelfCode,
      rightCode: isSpectator ? rightCode : rawOpponentCode,
    };
    const previous = snapshots[snapshots.length - 1];
    if (previous && previous.leftCode === next.leftCode && previous.rightCode === next.rightCode) {
      return;
    }
    snapshots.push(next);
  }, [isSpectator, leftCode, rawOpponentCode, rawSelfCode, rightCode, showTimelapse]);

  const timelineSnapshots = useMemo(() => {
    const snapshots = timelineSnapshotsRef.current.map((snapshot) => ({ ...snapshot }));
    if (!isSpectator && finalOpponentCodeRef.current) {
      for (const snapshot of snapshots) {
        if (!snapshot.rightCode || snapshot.rightCode.includes('*')) {
          snapshot.rightCode = finalOpponentCodeRef.current;
        }
      }
    }
    if (snapshots.length === 0) {
      return [{
        timestamp: 0,
        leftCode: isSpectator ? leftCode : rawSelfCode,
        rightCode: isSpectator ? rightCode : (finalOpponentCodeRef.current || rawOpponentCode),
      }];
    }
    return snapshots;
  }, [isSpectator, leftCode, rawOpponentCode, rawSelfCode, rightCode, showTimelapse, timelapseIndex]);

  useEffect(() => {
    if (!canUseTimelapse) {
      setShowTimelapse(false);
      setIsTimelapsePlaying(false);
      return;
    }
    if (match?.status === 'finished' || match?.winnerUserId || match?.finishedAt) {
      setShowTimelapse(true);
      setTimelapseIndex(Math.max(0, timelineSnapshotsRef.current.length - 1));
      setIsTimelapsePlaying(false);
    }
  }, [canUseTimelapse, match?.finishedAt, match?.status, match?.winnerUserId]);

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

  const displayedTimelineSnapshot = timelineSnapshots[Math.min(timelapseIndex, Math.max(0, timelineSnapshots.length - 1))];
  const displayedLeftCode = showTimelapse ? (displayedTimelineSnapshot?.leftCode || leftCode) : leftCode;
  const displayedRightCode = showTimelapse ? (displayedTimelineSnapshot?.rightCode || rightCode) : rightCode;

  // Show banner when match becomes active (show for everyone when anti-cheat is active)
  useEffect(() => {
    if (!isSpectator && match?.status === 'active' && match?.startedAt && match?.antiCheatEnabled) {
      setShowAntiCheatBanner(true);
    }
  }, [match?.status, match?.startedAt, match?.antiCheatEnabled, isSpectator]);

  // Auto-hide anti-cheat banner after 10 seconds (only when match is active)
  useEffect(() => {
    if (!showAntiCheatBanner || match?.status !== 'active') return;
    const timer = setTimeout(() => {
      setShowAntiCheatBanner(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, [showAntiCheatBanner, match?.status]);

  useEffect(() => {
    const bothPlayersConnected = Boolean(match?.players && match.players.length >= 2);
    const antiCheatActive = Boolean(match?.antiCheatEnabled && match?.status === 'active');

    if (isSpectator || !match || !matchId || !bothPlayersConnected || !antiCheatActive) {
      return;
    }

    const cooldowns = new Map<string, number>();

    const report = async (reason: string, message: string) => {
      const now = Date.now();
      const last = cooldowns.get(reason) || 0;
      if (now - last < 5000) {
        return;
      }
      cooldowns.set(reason, now);
      setAntiCheatNotice(message);
      try {
        await codeRoomApi.reportArenaSuspicion(matchId, reason, myUserId, user ? undefined : myDisplayName);
      } catch (e) {
        console.error('Failed to report arena suspicion:', e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void report('tab_hidden', 'Выход из вкладки зафиксирован anti-cheat системой.');
      }
    };

    const handleBlur = () => {
      if (document.visibilityState !== 'hidden') {
        void report('window_blur', 'Переключение окна зафиксировано anti-cheat системой.');
      }
    };

    const handlePaste = (event: ClipboardEvent) => {
      event.preventDefault();
      void report('paste_attempt', 'Вставка кода отключена в arena-матче.');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('paste', handlePaste);
    };
  }, [isSpectator, match, matchId, myDisplayName, myUserId, user]);

  const handleCopyLink = async () => {
    if (!matchId) {
      return;
    }
    await navigator.clipboard.writeText(`${window.location.origin}/arena/${matchId}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleSubmit = async () => {
    if (!matchId || !me || isSpectator) {
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await codeRoomApi.submitArenaCode(matchId, leftCode, myUserId, user ? undefined : myDisplayName);
      setOutput(response.error || response.output || 'Проверка завершена');

      if (response.match) {
        setMatch(response.match);

        const nextSelf = response.match.players.find((item) => item.userId === myUserId);
        const nextOpponent = response.match.players.find((item) => item.userId !== myUserId);

        if (nextSelf?.currentCode) {
          setSelfCode(nextSelf.currentCode);
        }

        if (response.match.status === 'finished' && nextOpponent?.currentCode) {
          finalOpponentCodeRef.current = buildArenaEditorTemplate(response.match, nextOpponent.currentCode);
        }
      }
    } catch (e) {
      const axiosErr = e as AxiosError<{ message?: string }>;
      setSubmitError(axiosErr.response?.data?.message || 'Не удалось отправить решение');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="arena-page-state">Загрузка арены...</div>;
  }

  if (error || !match) {
    return (
      <div className="arena-page-state">
        <div>{error || 'Матч не найден'}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/code-rooms')}>Назад</button>
      </div>
    );
  }

  return (
    <>
      {showRulesModal && (
        <div className="modal-overlay" onClick={() => setShowRulesModal(false)}>
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
              <button className="btn btn-primary" onClick={() => setShowRulesModal(false)}>Понятно</button>
            </div>
          </div>
        </div>
      )}

      <div className="arena-page">
        <div className="arena-page__header">
          <div className="arena-page__header-left">
            <button className="btn btn-secondary arena-back-btn" onClick={() => navigate('/code-rooms')}>
              <ArrowLeft size={16} />
            </button>
            <span className="code-rooms-kicker">Arena duel</span>
          </div>
          <div className="arena-page__meta">
            <div className={`connection-status ${isConnected ? 'connected' : ''}`}>
              <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
              <span>{isConnected ? 'Realtime активен' : 'Переподключение...'}</span>
            </div>
            {winner && (
              <div className="arena-chip arena-chip--winner">
                <Trophy size={14} />
                Победил {winner.displayName}
              </div>
            )}
            {winnerReasonLabel && (
              <div className="arena-chip arena-chip--winner-reason">
                {winnerReasonLabel}
              </div>
            )}
            {!isSpectator && match.startedAt && match.status !== 'finished' && <div className="arena-chip" onClick={() => setShowAntiCheatBanner(true)}>Anti-cheat активен</div>}
            {match.status === 'finished' && match.isRated === false && (
              <div className="arena-chip arena-chip--winner-reason">
                unrated{match.unratedReason ? ` • ${match.unratedReason}` : ''}
              </div>
            )}
            {isSpectator && <div className="arena-chip arena-chip--spectator"><Eye size={14} /> Режим зрителя</div>}
            <div className="arena-chip"><Clock3 size={14} /> прошло {formatClock(elapsedSeconds)}</div>
            <div className="arena-chip"><TimerReset size={14} /> осталось {formatClock(remainingSeconds)}</div>
            <div className="arena-chip"><Swords size={14} /> {match.topic || 'any'} / {match.difficulty || 'any'}</div>
            {!isSpectator && (
              <button className="btn btn-primary arena-copy-btn" onClick={handleCopyLink}>
                <Copy size={16} />
                <span>{copied ? 'Скопировано' : 'Скопировать'}</span>
              </button>
            )}
            {canShowReplayActions && canUseTimelapse && (
              <button
                className="btn btn-primary arena-copy-btn"
                onClick={() => {
                  if (!showTimelapse) {
                    setShowTimelapse(true);
                    setTimelapseIndex(Math.max(0, timelineSnapshots.length - 1));
                    setIsTimelapsePlaying(false);
                    return;
                  }
                  setShowTimelapse(false);
                  setIsTimelapsePlaying(false);
                }}
              >
                <Square size={16} />
                <span>{showTimelapse ? 'Вернуться в live' : 'Таймлайн'}</span>
              </button>
            )}
            {canShowReplayActions && !canUseTimelapse && (
              <button
                className="btn btn-primary arena-copy-btn"
                onClick={() => navigate(`/arena/${match.id}?spectator=1&replay=1`)}
              >
                <Eye size={16} />
                <span>Режим зрителя</span>
              </button>
            )}
          </div>
        </div>

        {!isSpectator && showAntiCheatBanner && match.status === 'active' && (
          <div className="arena-anti-cheat-notice arena-anti-cheat-notice--live">
            <ShieldAlert size={16} />
            <span>Anti-cheat активен: уход со вкладки, переключение окна и paste фиксируются во время матча.</span>
            <AntiCheatCountdown onComplete={() => setShowAntiCheatBanner(false)} />
          </div>
        )}

        {canShowReplayActions && canUseTimelapse && showTimelapse && (
          <div className="timelapse-toolbar arena-timelapse-toolbar">
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
              <span>{(((displayedTimelineSnapshot?.timestamp ?? 0) / 1000).toFixed(1))}s</span>
              <span>{timelineSnapshots.length} steps</span>
            </div>
          </div>
        )}

        {antiCheatNotice && (
          <div className="arena-anti-cheat-notice">
            <ShieldAlert size={16} />
            <span>{antiCheatNotice}</span>
            <AntiCheatCountdown onComplete={() => setAntiCheatNotice('')} />
          </div>
        )}

        {bothPlayersConnected ? (
        <div
          ref={gridRef}
          className="arena-page__grid arena-page__grid--resizable"
          style={{
            gridTemplateColumns: isSpectator
              ? `minmax(0, ${editorWidth}fr) minmax(0, ${100 - editorWidth}fr)`
              : `minmax(0, ${editorWidth}fr) 8px minmax(0, ${100 - editorWidth}fr)`,
          }}
        >
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
                  defaultLanguage="go"
                  language="go"
                  value={leftCode}
                  onChange={(value) => {
                    if (!isSpectator) {
                      setSelfCode(value || '');
                    }
                  }}
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    automaticLayout: true,
                    readOnly: isSpectator || freezeLeft > 0 || match.status === 'finished',
                    scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
                  }}
                  theme="vs-dark"
                />
              )}
            </div>
            <div className="arena-panel__footer">
              {isSpectator ? (
                <div className="arena-spectator-note">
                  <Eye size={16} />
                  Только просмотр без участия в матче.
                </div>
              ) : (
                <>
                  <button className="btn btn-primary arena-submit-btn" disabled={!canSubmit} onClick={handleSubmit}>
                    <Play size={16} />
                    <span>{submitting ? 'Проверка...' : 'Отправить'}</span>
                  </button>
                  {submitError && <span className="arena-error-inline">{submitError}</span>}
                </>
              )}
            </div>
          </section>

          {!isSpectator && (
            <button
              type="button"
              className="arena-resize-handle"
              aria-label="Изменить размер панелей арены"
              onMouseDown={() => {
                if (window.innerWidth <= 1024) {
                  return;
                }
                isResizingRef.current = true;
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
              }}
            />
          )}

          <section className="arena-panel arena-panel--opponent">
            <div className="arena-panel__header">
              <div>
                <div className="arena-panel__title">{isSpectator ? 'Игрок справа' : 'Соперник'}</div>
                <div className="arena-panel__subtitle">
                  {isSpectator ? (rightPlayer?.displayName || 'Ожидаем второго игрока') : (opponent?.displayName || 'Ожидаем второго игрока')}
                </div>
              </div>
              {!isSpectator && match.obfuscateOpponent && match.status !== 'finished' && opponent && (
                <div className="arena-freeze-badge arena-freeze-badge--ghost"><ShieldAlert size={14} /> Код скрыт</div>
              )}
            </div>
            <div className="arena-panel__body">
              {waitingForOpponent ? (
                <div className="arena-waiting-state">
                  <Eye size={16} />
                  <span>Ждём второго игрока. Как только он зайдёт по ссылке, статус обновится сразу.</span>
                </div>
              ) : (
                <div className="arena-editor-shell">
                  <pre className="arena-editor-shell__pre">
                    {displayedRightCode || (!showTimelapse && shouldHideOpponentCode ? '**********\n**********\n**********' : '// соперник пока ничего не написал')}
                  </pre>
                </div>
              )}
            </div>
            <div className="arena-panel__footer arena-panel__footer--output">
              <div className="arena-output-label">
                <AlertTriangle size={15} />
                Judge output
              </div>
              <pre className={outputStateClass}>{output || 'Результат проверки появится здесь. Wrong answer и ошибки подсвечиваются отдельно.'}</pre>
            </div>
          </section>
        </div>
        ) : (
          <div className="arena-waiting-opponent">
            <div className="arena-waiting-opponent__content">
              <div className="arena-waiting-opponent__icon">
                <Swords size={48} />
              </div>
              <h2>Ожидаем соперника</h2>
              <p>Поделитесь ссылкой с другом, чтобы начать дуэль</p>
              <button className="btn btn-primary arena-waiting-opponent__btn" onClick={handleCopyLink}>
                <Copy size={16} />
                <span>{copied ? 'Скопировано' : 'Скопировать'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
