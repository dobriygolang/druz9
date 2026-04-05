import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { getStoredGuestId, getStoredGuestName, setStoredGuestName } from '@/features/CodeRoom/lib/guestIdentity';
import { GuestNameModal } from '@/features/CodeRoom/ui/GuestNameModal';
import { ArenaMatch, ArenaPlayerStats, ArenaQueueState, CodeRoomMode, CodeTask } from '@/entities/CodeRoom/model/types';
import { ArrowRight, Search } from 'lucide-react';
import { LeaguesModal } from './components/CodeRoomsDeferredSections';

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

const LEAGUES = [
  { name: 'Bronze', minRating: 300 },
  { name: 'Silver', minRating: 500 },
  { name: 'Gold', minRating: 800 },
  { name: 'Platinum', minRating: 1150 },
  { name: 'Diamond', minRating: 1500 },
  { name: 'Master', minRating: 1900 },
  { name: 'Legend', minRating: 2350 },
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

  const [openMatches, setOpenMatches] = useState<ArenaMatch[]>([]);
  const [myArenaStats, setMyArenaStats] = useState<ArenaPlayerStats | null>(null);
  const [tasksCatalog, setTasksCatalog] = useState<CodeTask[]>([]);
  const [showLeaguesModal, setShowLeaguesModal] = useState(false);

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

  useEffect(() => {
    let cancelled = false;

    const loadOpenMatches = async () => {
      try {
        const data = await codeRoomApi.getOpenArenaMatches(8);
        if (!cancelled) {
          setOpenMatches(data);
        }
      } catch (e) {
        console.error('Failed to load open arena matches:', e);
      }
    };

    void loadOpenMatches();
    const interval = window.setInterval(() => {
      void loadOpenMatches();
    }, 10000);

    return () => {
      cancelled = true;
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

  return (
    <>
      {isGuest && (
        <Suspense fallback={null}>
          <GuestLoginBanner />
        </Suspense>
      )}
      <div className="practice-surface practice-surface--code-rooms">
        <div className="practice-rooms-toolbar">
          <div className="practice-rooms-search">
            <Search size={14} />
            <span>Поиск</span>
          </div>
          <div className="practice-rooms-filters">
            {['Topic', 'Easy', 'Medium', 'Hard', 'Tree', 'Array', 'DFS'].map((item) => (
              <span key={item} className="practice-rooms-filter">{item}</span>
            ))}
          </div>
        </div>

        <div className="practice-rooms-layout">
          <section className="practice-rooms-list">
            {visibleTasks.length > 0 ? visibleTasks.map((task, index) => (
              <article key={task.id} className="practice-rooms-row">
                <span className={`practice-rooms-row__difficulty practice-rooms-row__difficulty--${task.difficulty || 'easy'}`}>
                  {task.difficulty || 'Easy'}
                </span>
                <div className="practice-rooms-row__copy">
                  <strong>{task.title}</strong>
                  <span>{task.topics.slice(0, 2).join(' · ') || 'Code Room task'}</span>
                </div>
                <div className="practice-rooms-row__meta">
                  <span>{index + 1}/{Math.max(visibleTasks.length, 1)}</span>
                  <button
                    type="button"
                    className="practice-rooms-row__action"
                    onClick={() => {
                      setNewRoomMode('all');
                      setShowCreateModal(true);
                    }}
                  >
                    {index === visibleTasks.length - 1 ? 'Смотреть' : 'Быстро'}
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
                <h3>Соло режим</h3>
                <span className="practice-rooms-widget__pill">new</span>
              </div>
              <p>Практикуй solо задачи без таймера и соперников.</p>
              <button
                type="button"
                className="practice-rooms-widget__button"
                onClick={() => navigate('/practice/solo')}
              >
                Открыть хаб
                <ArrowRight size={14} />
              </button>
            </article>

            <article className="practice-rooms-widget practice-rooms-widget--accent">
              <div className="practice-rooms-widget__top">
                <h3>Дуэль</h3>
                <span className="practice-rooms-widget__pill practice-rooms-widget__pill--dark">{openMatches.length} online</span>
              </div>
              <p>Быстрый вход в рейтинг и формат live-соперника.</p>
              <button
                type="button"
                className="practice-rooms-widget__button practice-rooms-widget__button--solid"
                onClick={() => {
                  setNewRoomMode('queue');
                  setShowCreateModal(true);
                }}
              >
                Найти соперника
              </button>
            </article>

            <article className="practice-rooms-stats">
              <div className="practice-rooms-stats__row">
                <span>Мои stats</span>
                <strong>{myArenaStats?.rating ?? 300}</strong>
              </div>
              <div className="practice-rooms-stats__row">
                <span>Точность</span>
                <strong>{myArenaStats ? `${Math.round(myArenaStats.winRate * 100)}%` : '91%'}</strong>
              </div>
              <div className="practice-rooms-stats__row">
                <span>Серия дня</span>
                <strong>{queueState?.queueSize ?? 0}</strong>
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

      <Suspense fallback={null}>
        <LeaguesModal open={showLeaguesModal} leagues={LEAGUES} onClose={() => setShowLeaguesModal(false)} />
      </Suspense>
    </>
  );
};
