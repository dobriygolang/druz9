import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { getStoredGuestId, getStoredGuestName, setStoredGuestName } from '@/features/CodeRoom/lib/guestIdentity';
import { GuestNameModal } from '@/features/CodeRoom/ui/GuestNameModal';
import { ArenaPlayerStats, ArenaQueueState, CodeRoomMode, CodeTask } from '@/entities/CodeRoom/model/types';
import { ArrowRight, Flame, Search, Swords, Users } from 'lucide-react';

const CreateRoomModal = lazy(() => import('./components/CodeRoomsDeferredSections').then((m) => ({ default: m.CreateRoomModal })));
const GuestLoginBanner = lazy(() => import('./components/CodeRoomsDeferredSections').then((m) => ({ default: m.GuestLoginBanner })));

const DUEL_TOPICS = [
  { value: '', label: 'Любая тема' },
  { value: 'two-pointers', label: 'Two Pointers' },
  { value: 'linked-list', label: 'Linked List' },
  { value: 'arrays', label: 'Arrays' },
  { value: 'strings', label: 'Strings' },
  { value: 'hash-map', label: 'Hash Map' },
  { value: 'stack', label: 'Stack' },
  { value: 'queue', label: 'Queue' },
  { value: 'tree', label: 'Tree' },
  { value: 'graph', label: 'Graph' },
  { value: 'dp', label: 'DP' },
];

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Любая сложность' },
  { value: 'easy', label: 'easy' },
  { value: 'medium', label: 'medium' },
  { value: 'hard', label: 'hard' },
];

export const CodeRoomsPage: React.FC = () => {
  type LaunchMode = CodeRoomMode | 'queue';
  const navigate = useNavigate();
  const location = useLocation();
  const skipArenaResume = Boolean(location.state?.skipArenaResume);
  const { user, isLoading: authLoading } = useAuth();
  const isGuest = !user;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [guestNameModalMode, setGuestNameModalMode] = useState<'create' | null>(null);
  const [creating, setCreating] = useState(false);

  const [newRoomMode, setNewRoomMode] = useState<LaunchMode>(() => {
    const saved = localStorage.getItem('arenaNewRoomMode');
    if (saved === 'queue' || saved === 'duel' || saved === 'all') {
      return saved;
    }
    return 'all';
  });
  const [newRoomTopic, setNewRoomTopic] = useState('');
  const [newRoomDifficulty, setNewRoomDifficulty] = useState('');
  // Initialize queueState from localStorage to persist across page refreshes
  const [queueState, setQueueState] = useState<ArenaQueueState | null>(() => {
    const saved = localStorage.getItem('arenaQueueState');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Persist queueState and newRoomMode to localStorage whenever they change
  useEffect(() => {
    if (queueState) {
      localStorage.setItem('arenaQueueState', JSON.stringify(queueState));
    } else {
      localStorage.removeItem('arenaQueueState');
    }
  }, [queueState]);

  useEffect(() => {
    localStorage.setItem('arenaNewRoomMode', newRoomMode);
  }, [newRoomMode]);

  // Restore queue state on mount - verify with server
  useEffect(() => {
    const restoreQueueState = async () => {
      if (queueState?.status === 'queued' && newRoomMode === 'queue') {
        try {
          const actorId = user?.id || getStoredGuestId();
          const guestName = user ? undefined : getStoredGuestName();
          const serverState = await codeRoomApi.getArenaQueueStatus(actorId, guestName);
          if (!skipArenaResume && serverState.status === 'matched' && serverState.match?.id) {
            // Queue matched while we were away
            navigate(`/arena/${serverState.match.id}`);
          } else if (serverState.status !== 'queued') {
            // Queue expired, clear state
            setQueueState(null);
          }
          // Keep queued state - banner shows without modal
        } catch (e) {
          console.error('Failed to restore queue state:', e);
          setQueueState(null);
        }
      }
    };
    void restoreQueueState();
  }, []);

  const [myArenaStats, setMyArenaStats] = useState<ArenaPlayerStats | null>(null);
  const [tasksCatalog, setTasksCatalog] = useState<CodeTask[]>([]);

  useEffect(() => {
    let cancelled = false;
    codeRoomApi.listTasks()
      .then((tasks) => {
        if (!cancelled) {
          setTasksCatalog(tasks.filter((task) => task.isActive));
        }
      })
      .catch((e) => {
        console.error('Failed to load active tasks count:', e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setMyArenaStats(null);
      return;
    }
    let cancelled = false;
    codeRoomApi.getArenaStats(user.id)
      .then((stats) => {
        if (!cancelled) {
          setMyArenaStats(stats);
        }
      })
      .catch((e) => {
        console.error('Failed to load my arena stats:', e);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const loadQueueSize = async () => {
      try {
        await codeRoomApi.getArenaQueueStatus();
      } catch (e) {
        console.error('Failed to load public arena queue size:', e);
      }
    };

    void loadQueueSize();
    const interval = window.setInterval(() => {
      void loadQueueSize();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const resetCreateModal = (clearQueueState = true, closeModal = true) => {
    const shouldLeaveQueue = queueState?.status === 'queued';
    if (closeModal) {
      setShowCreateModal(false);
    }
    setNewRoomTopic('');
    setNewRoomDifficulty('');
    if (shouldLeaveQueue) {
      void codeRoomApi.leaveArenaQueue(user?.id || getStoredGuestId(), user ? undefined : getStoredGuestName());
    }
    if (clearQueueState) {
      setQueueState(null);
      setNewRoomMode('all');
    }
  };

  useEffect(() => {
    if (newRoomMode !== 'queue' || queueState?.status !== 'queued') {
      return;
    }
    const actorId = user?.id || getStoredGuestId();
    const guestName = user ? undefined : getStoredGuestName();
    const interval = window.setInterval(async () => {
      try {
        const next = await codeRoomApi.getArenaQueueStatus(actorId, guestName);
        setQueueState(next);
        if (!skipArenaResume && next.status === 'matched' && next.match?.id) {
          setShowCreateModal(false);
          navigate(`/arena/${next.match.id}`);
        }
      } catch (e) {
        console.error('Failed to poll arena queue:', e);
      }
    }, 2000);
    return () => window.clearInterval(interval);
  }, [navigate, newRoomMode, queueState?.status, user]);

  const handleCreateRoom = async (guestNameOverride?: string) => {
    if (authLoading) {
      return;
    }

    const guestName = guestNameOverride || getStoredGuestName();

    if (!user && !guestName) {
      setGuestNameModalMode('create');
      return;
    }

    setCreating(true);
    try {
      if (newRoomMode === 'duel') {
        const match = await codeRoomApi.createArenaMatch({
          topic: newRoomTopic,
          difficulty: newRoomDifficulty,
          obfuscateOpponent: true,
          actorId: user?.id || getStoredGuestId(),
          guestName: user ? undefined : guestName,
        });
        resetCreateModal();
        navigate(`/arena/${match.id}`);
        return;
      }

      if (newRoomMode === 'queue') {
        // If already in queue, just close modal (don't rejoin)
        if (queueState?.status === 'queued') {
          setShowCreateModal(false);
          return;
        }
        const state = await codeRoomApi.joinArenaQueue({
          topic: newRoomTopic,
          difficulty: newRoomDifficulty,
          obfuscateOpponent: true,
          actorId: user?.id || getStoredGuestId(),
          guestName: user ? undefined : guestName,
        });
        setQueueState(state);
        setShowCreateModal(false);
        if (state.status === 'matched' && state.match?.id) {
          navigate(`/arena/${state.match.id}`);
        }
        return;
      }

      const room = await codeRoomApi.createRoom({
        mode: newRoomMode,
        topic: newRoomTopic,
        difficulty: newRoomDifficulty,
        guestName: !user ? guestName : undefined,
      });
      resetCreateModal();
      navigate(`/code-rooms/${room.id}`);
    } catch (e) {
      console.error('Failed to create room:', e);
    } finally {
      setCreating(false);
    }
  };

  const visibleTasks = useMemo(
    () => tasksCatalog.slice(0, 5),
    [tasksCatalog],
  );

  const taskRows = useMemo(
    () => visibleTasks.map((task, index) => {
      const participantCount = index === visibleTasks.length - 1 ? 0 : 2 + ((index + 1) % 4);
      const avatarSeeds = ['AL', 'MK', 'IR', 'TN'].slice(0, Math.max(0, Math.min(3, participantCount)));

      return {
        ...task,
        participantCount,
        avatarSeeds,
        actionLabel: index === visibleTasks.length - 1 ? 'Войти первым' : 'Войти',
        actionTone: index === visibleTasks.length - 1 ? 'primary' : 'ghost',
      };
    }),
    [visibleTasks],
  );

  return (
    <>
      {isGuest && (
        <Suspense fallback={null}>
          <GuestLoginBanner />
        </Suspense>
      )}
      <div className="practice-surface practice-surface--code-rooms">
        <div className="practice-rooms-toolbar">
          <div className="practice-rooms-search" role="searchbox" aria-label="Поиск задачи">
            <Search size={14} />
            <span>Поиск задачи...</span>
          </div>
          <div className="practice-rooms-filters">
            <span className="practice-rooms-filter practice-rooms-filter--active">Все</span>
            <span className="practice-rooms-filter practice-rooms-filter--easy">Easy</span>
            <span className="practice-rooms-filter practice-rooms-filter--medium">Medium</span>
            <span className="practice-rooms-filter practice-rooms-filter--hard">Hard</span>
            <span className="practice-rooms-filter practice-rooms-filter--label">Тема:</span>
            <span className="practice-rooms-filter practice-rooms-filter--topic-active">Arrays</span>
            <span className="practice-rooms-filter">Trees</span>
            <span className="practice-rooms-filter">DP</span>
            <span className="practice-rooms-filter">Graph</span>
            <span className="practice-rooms-filter">Hash Map</span>
          </div>
        </div>

        <div className="practice-rooms-layout">
          <section className="practice-rooms-list">
            {taskRows.length > 0 ? taskRows.map((task) => (
              <article key={task.id} className="practice-rooms-row">
                <span className={`practice-rooms-row__difficulty practice-rooms-row__difficulty--${task.difficulty || 'easy'}`}>
                  {formatDifficulty(task.difficulty)}
                </span>
                <div className="practice-rooms-row__copy">
                  <strong>{task.title}</strong>
                  <span>{formatTopics(task.topics)}</span>
                </div>
                <div className="practice-rooms-row__meta">
                  {task.avatarSeeds.length > 0 ? (
                    <div className="practice-rooms-row__avatars" aria-hidden="true">
                      {task.avatarSeeds.map((seed, index) => (
                        <span key={`${task.id}-${seed}`} className={`practice-rooms-row__avatar practice-rooms-row__avatar--${index + 1}`}>
                          {seed}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <span className="practice-rooms-row__count">
                    <Users size={12} />
                    {task.participantCount}
                  </span>
                  <button
                    type="button"
                    className={`practice-rooms-row__action${task.actionTone === 'ghost' ? ' practice-rooms-row__action--ghost' : ''}`}
                    onClick={() => {
                      setNewRoomMode('all');
                      setShowCreateModal(true);
                    }}
                  >
                    {task.actionLabel}
                  </button>
                </div>
              </article>
            )) : (
              <div className="practice-surface__empty">Загрузка задач...</div>
            )}
          </section>

          <aside className="practice-rooms-side">
            <article className="practice-rooms-widget">
              <div className="practice-rooms-widget__top">
                <h3>Соло-режим</h3>
                <span className="practice-rooms-widget__pill">Solo</span>
              </div>
              <p>Практикуй в своём темпе, без таймера и соперников.</p>
              <button
                type="button"
                className="practice-rooms-widget__button"
                onClick={() => navigate('/practice/solo')}
              >
                <span>Открыть задачу</span>
                <ArrowRight size={12} />
              </button>
            </article>

            <article className="practice-rooms-widget practice-rooms-widget--accent">
              <div className="practice-rooms-widget__top">
                <h3>Дуэль</h3>
                <span className="practice-rooms-widget__pill practice-rooms-widget__pill--dark">1v1</span>
              </div>
              <p>Реши задачу быстрее соперника и забери ELO.</p>
              <button
                type="button"
                className="practice-rooms-widget__button practice-rooms-widget__button--solid"
                onClick={() => {
                  setNewRoomMode('queue');
                  setShowCreateModal(true);
                }}
              >
                <Swords size={12} />
                Найти соперника
              </button>
            </article>

            <article className="practice-rooms-stats">
              <div className="practice-rooms-stats__head">
                <h3>Моя статистика</h3>
              </div>
              <div className="practice-rooms-stats__row">
                <span>Решено задач</span>
                <strong>
                  <span className="practice-rooms-stats__chips" aria-hidden="true">
                    <i className="is-green" />
                    <i className="is-amber" />
                    <i className="is-red" />
                  </span>
                  {tasksCatalog.length || 83}
                </strong>
              </div>
              <div className="practice-rooms-stats__row">
                <span>Точность</span>
                <strong>{myArenaStats ? `${Math.round(myArenaStats.winRate * 100)}%` : '91%'}</strong>
              </div>
              <div className="practice-rooms-stats__row">
                <span>Серия дня</span>
                <strong className="practice-rooms-stats__flame"><Flame size={12} /> 6 дней</strong>
              </div>
            </article>
          </aside>
        </div>

        {queueState?.status === 'queued' && (
          <div className="queue-active-banner">
            <div className="queue-active-banner__content">
              <div className="queue-active-banner__info">
                <span className="queue-active-banner__kicker">Queue</span>
                <strong>Ищем соперника...</strong>
                <span className="queue-active-banner__meta">Тема: {queueState.topic || 'любая'} • в очереди {queueState.queueSize || 0} чел.</span>
              </div>
              <button className="btn btn-secondary" onClick={() => resetCreateModal(true, false)}>Отмена</button>
            </div>
          </div>
        )}

        <Suspense fallback={null}>
          <CreateRoomModal
            open={showCreateModal}
            isGuest={isGuest}
            creating={creating}
            newRoomMode={newRoomMode}
            queueState={queueState}
            duelTopics={DUEL_TOPICS}
            difficultyOptions={DIFFICULTY_OPTIONS}
            newRoomTopic={newRoomTopic}
            newRoomDifficulty={newRoomDifficulty}
            onClose={() => {
              if (newRoomMode === 'queue' && queueState?.status === 'queued') {
                setShowCreateModal(false);
              } else {
                resetCreateModal();
              }
            }}
            onCancelQueue={() => resetCreateModal()}
            onCreate={() => { void handleCreateRoom(); }}
            onModeChange={setNewRoomMode}
            onTopicChange={setNewRoomTopic}
            onDifficultyChange={setNewRoomDifficulty}
          />
        </Suspense>
      </div>

      <GuestNameModal
        open={guestNameModalMode !== null}
        initialValue={getStoredGuestName()}
        title="Please, introduce yourself"
        description="Укажите имя, под которым вы будете отображаться в редакторе и в комнате."
        onCancel={() => setGuestNameModalMode(null)}
        onConfirm={(name) => {
          setStoredGuestName(name);
          setGuestNameModalMode(null);
          void handleCreateRoom(name);
        }}
      />
    </>
  );
};

function formatDifficulty(value?: string) {
  if (!value) return 'Easy';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatTopics(topics: string[]) {
  return topics.slice(0, 2).map((topic) => (
    topic
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  )).join(' · ') || 'Arrays · Hash Map';
}
