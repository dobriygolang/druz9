import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import { ArenaMatch } from '@/entities/CodeRoom/model/types';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { useArenaRealtime } from '@/features/CodeRoom/api/useArenaRealtime';
import { getStoredGuestId, getStoredGuestName } from '@/features/CodeRoom/lib/guestIdentity';
import { AxiosError } from '@/shared/api/base';
import { inferLanguageFromSource, monacoLanguageFor } from '@/shared/lib/codeEditorLanguage';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import {
  ArenaMatchGrid,
  ArenaMatchHeader,
  ArenaMobileTabs,
  ArenaNotice,
  ArenaPageState,
  ArenaRulesModal,
  ArenaTimelapseToolbar,
  ArenaWaitingState,
} from './components/ArenaMatchSections';
import {
  WIN_REASON_LABELS,
  buildArenaEditorTemplate,
  buildArenaSubmitError,
  getPlayerCode,
} from './lib/arenaMatchHelpers';

export const ArenaMatchPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
  const [antiCheatWasEnabled, setAntiCheatWasEnabled] = useState(false);
  const [showAntiCheatBanner, setShowAntiCheatBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'opponent' | 'output'>('editor');
  const arenaLanguage = monacoLanguageFor(inferLanguageFromSource(match?.starterCode));

  const hasJoinedRef = useRef(false);
  const isResizingRef = useRef(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const timelineStartedAtRef = useRef(Date.now());
  const timelineSnapshotsRef = useRef<Array<{ timestamp: number; leftCode: string; rightCode: string }>>([]);
  const finalOpponentCodeRef = useRef('');
  const antiCheatCooldownsRef = useRef<Map<string, number>>(new Map());

  const myUserId = user?.id || getStoredGuestId();
  const myDisplayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || ''
    : getStoredGuestName() || '';

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

  const myAntiCheatStrikes = me?.suspicionCount ?? 0;


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

  const outputStateClass =
    submitError || /wrong answer|runtime error|compile|не прошло проверку|ошибка:/i.test(`${output} ${submitError}`)
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

  // Track when anti-cheat was enabled once
  useEffect(() => {
    if (match?.antiCheatEnabled) {
      setAntiCheatWasEnabled(true);
    }
  }, [match?.antiCheatEnabled]);

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
    const bothPlayersConnectedNow = Boolean(match?.players && match.players.length >= 2);

    if (
      isSpectator ||
      !match ||
      !matchId ||
      match.status === 'finished' ||
      !bothPlayersConnectedNow ||
      !antiCheatWasEnabled
    ) {
      return;
    }

    const report = async (reason: string, message: string, cooldownKey = reason) => {
      const now = Date.now();
      const last = antiCheatCooldownsRef.current.get(cooldownKey) || 0;

      if (now - last < 5000) {
        return;
      }

      antiCheatCooldownsRef.current.set(cooldownKey, now);

      try {
        await codeRoomApi.reportArenaSuspicion(
          matchId,
          reason,
          myUserId,
          user ? undefined : myDisplayName,
        );

        const nextStrikes = Math.min(myAntiCheatStrikes + 1, 2);
        const suffix = nextStrikes >= 2
          ? ' Применён штраф рейтинга.'
          : ` (${nextStrikes}/2)`;

        setAntiCheatNotice(`${message}${suffix}`);
      } catch (e) {
        console.error('Failed to report arena suspicion:', e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void report('tab_hidden', 'Выход из вкладки зафиксирован anti-cheat системой', 'focus_loss');
      }
    };

    const handleBlur = () => {
      if (document.visibilityState === 'visible') {
        void report('window_blur', 'Переключение окна зафиксировано anti-cheat системой', 'focus_loss');
      }
    };

    const handlePaste = (event: ClipboardEvent) => {
      event.preventDefault();
      void report('paste_attempt', 'Попытка вставки зафиксирована anti-cheat системой');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('paste', handlePaste);
    };
  }, [isSpectator, match, matchId, myDisplayName, myUserId, user, antiCheatWasEnabled, myAntiCheatStrikes]);

  const handleCopyLink = async () => {
    if (!matchId) {
      return;
    }
    await navigator.clipboard.writeText(`${window.location.origin}/arena/${matchId}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleBack = async () => {
    if (!matchId) return;
    try {
      await codeRoomApi.leaveArenaMatch(
        matchId,
        user?.id || getStoredGuestId(),
        user ? undefined : getStoredGuestName(),
      );
    } catch (e) {
      console.error('Failed to leave arena match:', e);
    } finally {
      navigate('/practice/code-rooms', { state: { skipArenaResume: true } });
    }
  };

  const handleSubmit = async () => {
    if (!matchId || !me || isSpectator) {
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await codeRoomApi.submitArenaCode(matchId, leftCode, myUserId, user ? undefined : myDisplayName);

      const lines: string[] = [];

      if (response.error) {
        lines.push(`Ошибка: ${response.error}`);
      } else if (response.isCorrect) {
        lines.push('✅ Решение принято');
      } else {
        // Используем детальное сообщение об ошибке
        if (response.passedCount !== undefined && response.totalCount !== undefined) {
          setSubmitError(buildArenaSubmitError({
            passedCount: response.passedCount,
            totalCount: response.totalCount,
            failedTestIndex: response.failedTestIndex,
            failureKind: response.failureKind,
            freezeUntil: response.freezeUntil,
            error: response.error,
          }));
        } else {
          lines.push('❌ Решение не прошло проверку');
        }
      }

      if (response.isCorrect && typeof response.runtimeMs === 'number' && response.runtimeMs > 0) {
        lines.push(`Runtime: ${response.runtimeMs} ms`);
      }

      if (response.output && !response.isCorrect) {
        lines.push('');
        lines.push(response.output);
      }

      if (!response.isCorrect && response.freezeUntil) {
        // freeze info already in submitError
      } else if (response.freezeUntil && response.isCorrect) {
        const freezeLeftSec = Math.max(
          0,
          Math.ceil((new Date(response.freezeUntil).getTime() - Date.now()) / 1000),
        );
        if (freezeLeftSec > 0) {
          lines.push('');
          lines.push(`Следующая отправка через ${freezeLeftSec} сек.`);
        }
      }

      setOutput(lines.join('\n'));

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

  const handleToggleTimelapse = () => {
    if (!showTimelapse) {
      setShowTimelapse(true);
      setTimelapseIndex(Math.max(0, timelineSnapshots.length - 1));
      setIsTimelapsePlaying(false);
      return;
    }
    setShowTimelapse(false);
    setIsTimelapsePlaying(false);
  };

  const handleTimelapseReset = () => {
    setIsTimelapsePlaying(false);
    setTimelapseIndex(0);
  };

  const handleTimelapseSeek = (index: number) => {
    setIsTimelapsePlaying(false);
    setTimelapseIndex(index);
  };

  const handleResizeStart = () => {
    if (window.innerWidth <= 1024) {
      return;
    }
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  if (loading) {
    return <ArenaPageState message="Загрузка арены..." />;
  }

  if (error || !match) {
    return (
      <ArenaPageState
        message={error || 'Матч не найден'}
        buttonLabel="Назад"
        onButtonClick={handleBack}
      />
    );
  }

  return (
    <>
      <ArenaRulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />

      <div className="arena-page">
        <ArenaMatchHeader
          isConnected={isConnected}
          isMobile={isMobile}
          isSpectator={isSpectator}
          copied={copied}
          elapsedSeconds={elapsedSeconds}
          remainingSeconds={remainingSeconds}
          winner={winner}
          winnerReasonLabel={winnerReasonLabel}
          match={match}
          canShowReplayActions={canShowReplayActions}
          canUseTimelapse={canUseTimelapse}
          showTimelapse={showTimelapse}
          onBack={handleBack}
          onCopyLink={handleCopyLink}
          onToggleTimelapse={handleToggleTimelapse}
          onShowAntiCheat={() => setShowAntiCheatBanner(true)}
        />

        <ArenaMobileTabs
          bothPlayersConnected={bothPlayersConnected}
          activeTab={activeTab}
          submitError={submitError}
          onChange={setActiveTab}
        />

        {!isSpectator && showAntiCheatBanner && match.status === 'active' && (
          <ArenaNotice
            message="Anti-cheat активен: уход со вкладки, переключение окна и paste фиксируются. При 2 нарушениях применяется penalty."
            showLiveCountdown
            onClose={() => setShowAntiCheatBanner(false)}
          />
        )}

        <ArenaTimelapseToolbar
          isVisible={canShowReplayActions && canUseTimelapse && showTimelapse}
          isPlaying={isTimelapsePlaying}
          timelineLength={timelineSnapshots.length}
          timelapseIndex={timelapseIndex}
          currentTimestamp={displayedTimelineSnapshot?.timestamp ?? 0}
          onReset={handleTimelapseReset}
          onTogglePlay={() => setIsTimelapsePlaying((current) => !current)}
          onSeek={handleTimelapseSeek}
        />

        {antiCheatNotice && (
          <ArenaNotice
            message={antiCheatNotice}
            strikes={myAntiCheatStrikes}
            matchFinished={match.status === 'finished'}
            onClose={() => setAntiCheatNotice('')}
          />
        )}

        {bothPlayersConnected ? (
          <ArenaMatchGrid
            isMobile={isMobile}
            isSpectator={isSpectator}
            match={match}
            bothPlayersConnected={bothPlayersConnected}
            waitingForOpponent={waitingForOpponent}
            activeTab={activeTab}
            gridRef={gridRef}
            editorWidth={editorWidth}
            me={me}
            opponent={opponent}
            leftPlayer={leftPlayer}
            rightPlayer={rightPlayer}
            freezeLeft={freezeLeft}
            canSubmit={canSubmit}
            showTimelapse={showTimelapse}
            displayedLeftCode={displayedLeftCode}
            displayedRightCode={displayedRightCode}
            leftCode={leftCode}
            arenaLanguage={arenaLanguage}
            submitting={submitting}
            submitError={submitError}
            output={output}
            outputStateClass={outputStateClass}
            shouldHideOpponentCode={shouldHideOpponentCode}
            setSelfCode={setSelfCode}
            onSubmit={handleSubmit}
            onResizeStart={handleResizeStart}
          />
        ) : (
          <ArenaWaitingState copied={copied} onCopyLink={handleCopyLink} />
        )}
      </div>
    </>
  );
};
