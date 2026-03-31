import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { getStoredGuestId, getStoredGuestName, setStoredGuestName } from '@/features/CodeRoom/lib/guestIdentity';
import { GuestNameModal } from '@/features/CodeRoom/ui/GuestNameModal';
import { ArenaLeaderboardEntry, ArenaMatch, ArenaPlayerStats, ArenaQueueState, CodeRoomMode } from '@/entities/CodeRoom/model/types';
import { ArrowRight, Eye, FileCode, Plus, ShieldCheck, Swords, TimerReset, Trophy, Users } from 'lucide-react';

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

const ARENA_RULE_SECTIONS = [
  {
    title: 'Arena duel',
    caption: 'Как определяется победитель',
    items: [
      'Побеждает первый accepted submit.',
      'После wrong answer или runtime error включается freeze на 30 секунд.',
      'Зрители могут смотреть матч, но не могут менять код.',
    ],
  },
  {
    title: 'Policy layer',
    caption: 'Что именно задача может делать во время запуска',
    items: [
      '`pure`: можно читать вход и печатать ответ. Нельзя файлы, сеть, временную запись.',
      '`file_io`: можно читать только заранее выданные файлы. Нельзя интернет, нельзя выходить за workspace.',
      '`http_client`: можно делать HTTP-запросы только в разрешенные mock/host endpoints. Нельзя произвольную сеть и файлы.',
      '`interview_realistic`: можно разрешенные файлы и mock HTTP. Нельзя внешний интернет и unrestricted access.',
    ],
  },
  {
    title: 'Рейтинг',
    caption: 'Что влияет на ELO',
    items: [
      'Новый игрок стартует с 300 ELO.',
      'Сложность влияет на изменение рейтинга: easy 1x, medium 1.5x, hard 2x.',
      'Подробные пороги и формула есть в кнопке `Лиги`.',
    ],
  },
];

export const CodeRoomsPage: React.FC = () => {
  type LaunchMode = CodeRoomMode | 'queue';
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);
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
          if (serverState.status === 'matched' && serverState.match?.id) {
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

  const [leaderboard, setLeaderboard] = useState<ArenaLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [openMatches, setOpenMatches] = useState<ArenaMatch[]>([]);
  const [openMatchesLoading, setOpenMatchesLoading] = useState(true);
  const [myArenaStats, setMyArenaStats] = useState<ArenaPlayerStats | null>(null);
  const [publicQueueSize, setPublicQueueSize] = useState(0);
  const [activeTaskCount, setActiveTaskCount] = useState(0);
  const [showLeaguesModal, setShowLeaguesModal] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const data = await codeRoomApi.getArenaLeaderboard(12);
      setLeaderboard(data);
    } catch (e) {
      console.error('Failed to load leaderboard:', e);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    let cancelled = false;
    codeRoomApi.listTasks()
      .then((tasks) => {
        if (!cancelled) {
          setActiveTaskCount(tasks.filter((task) => task.isActive).length);
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
    let cancelled = false;

    const loadQueueSize = async () => {
      try {
        const state = await codeRoomApi.getArenaQueueStatus();
        if (!cancelled) {
          setPublicQueueSize(state.queueSize || 0);
        }
      } catch (e) {
        console.error('Failed to load public arena queue size:', e);
      }
    };

    void loadQueueSize();
    const interval = window.setInterval(() => {
      void loadQueueSize();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadOpenMatches = async () => {
      setOpenMatchesLoading(true);
      try {
        const data = await codeRoomApi.getOpenArenaMatches(8);
        if (!cancelled) {
          setOpenMatches(data);
        }
      } catch (e) {
        console.error('Failed to load open arena matches:', e);
      } finally {
        if (!cancelled) {
          setOpenMatchesLoading(false);
        }
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
        if (next.status === 'matched' && next.match?.id) {
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

  const sortedOpenMatches = [...openMatches].sort((a, b) => {
    const aMine = a.players.some((player) => player.userId === (user?.id || getStoredGuestId()));
    const bMine = b.players.some((player) => player.userId === (user?.id || getStoredGuestId()));
    if (aMine !== bMine) {
      return aMine ? -1 : 1;
    }
    const aStartedAt = a.startedAt || a.createdAt || '';
    const bStartedAt = b.startedAt || b.createdAt || '';
    return bStartedAt.localeCompare(aStartedAt);
  });

  return (
    <>
      <div className="code-rooms-page">
        <div className="page-header code-rooms-hero">
          <div className="code-rooms-hero__copy">
            <span className="code-rooms-kicker">Duel</span>
            <h1>Выживает сильнейший</h1>
          </div>
          <div className="code-rooms-hero__actions">
            {isAdmin && (
              <button className="btn btn-secondary" onClick={() => navigate('/admin/code-tasks')}>
                <ShieldCheck size={16} />
                Админка
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setShowLeaguesModal(true)}>
              <Trophy size={16} />
              Лиги
            </button>
            <button className="btn btn-primary code-rooms-create-btn" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} />
              <span>Новая комната</span>
            </button>
          </div>
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

        <div className="code-rooms-dashboard-grid">
          <section className="card dashboard-card code-rooms-launch-card">
            <div className="dashboard-card__header">
              <div>
                <h3>Быстрый запуск</h3>
              </div>
              <div className="launch-card-badges">
                <span className="arena-chip"><FileCode size={14} />{activeTaskCount} задач</span>
                {myArenaStats && (
                  <span className="arena-chip arena-chip--winner"><Trophy size={14} />{myArenaStats.rating} ELO • {myArenaStats.league}</span>
                )}
              </div>
            </div>
            <p className="dashboard-card__subtitle launch-card-desc">
              Создай комнату для совместной работы или дуэль, выбери тему и отправь другу ссылку-приглашение.
            </p>

            <div className="code-rooms-launch-grid">
              <button type="button" className="code-rooms-mode-card" onClick={() => {
                setNewRoomMode('all');
                setShowCreateModal(true);
              }}>
                <div className="code-rooms-mode-card__icon"><Users size={18} /></div>
                <div>
                  <div className="code-rooms-mode-card__title">Комната для всех</div>
                  <div className="code-rooms-mode-card__text">Один редактор, live-coding и общий запуск кода.</div>
                </div>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="code-rooms-mode-card"
                onClick={() => {
                  setNewRoomMode('duel');
                  setShowCreateModal(true);
                }}
              >
                <div className="code-rooms-mode-card__icon"><Swords size={18} /></div>
                <div>
                  <div className="code-rooms-mode-card__title">Дуэль по приглашению</div>
                  <div className="code-rooms-mode-card__text">
                    {isGuest
                      ? 'Гости тоже могут играть, но рейтинг, история матчей и профиль доступны после регистрации.'
                      : 'Случайная задача по теме, timer, judge по тестам и отдельный match-сценарий.'}
                  </div>
                </div>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="code-rooms-mode-card"
                onClick={() => {
                  setNewRoomMode('queue');
                  setShowCreateModal(true);
                }}
              >
                <div className="code-rooms-mode-card__icon"><TimerReset size={18} /></div>
                <div>
                  <div className="code-rooms-mode-card__title">Дуэль онлайн <span className="arena-chip card-chip"><Users size={12} />{publicQueueSize}</span></div>
                  <div className="code-rooms-mode-card__text">
                    Быстрый подбор соперника в очереди с такой же темой и случайной задачей.
                  </div>
                </div>
                <ArrowRight size={16} />
              </button>
            </div>
          </section>

          <section className="card dashboard-card">
            <div className="dashboard-card__header">
              <div className="dashboard-card__header-left">
                <h3>Лидерборд</h3>
                <p className="dashboard-card__subtitle">Только авторизованные игроки: победы, матчи, ELO и лучшее время решения.</p>
              </div>
              <Trophy size={18} />
            </div>
          {leaderboardLoading ? (
            <div className="empty-state compact">Загрузка рейтинга...</div>
          ) : leaderboard.length === 0 ? (
            <div className="empty-state compact">Пока нет завершенных дуэлей.</div>
          ) : (
            <div className="leaderboard-list">
              {leaderboard.map((entry, index) => {
                const rankClass = index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : '';
                return (
                  <div key={`${entry.userId}-${index}`} className="leaderboard-item">
                    <div className={`leaderboard-rank ${rankClass}`}>{index + 1}</div>
                    <div className="leaderboard-main">
                      <div className="leaderboard-name">{entry.displayName}</div>
                      <div className="leaderboard-meta">
                        <span>{entry.rating} ELO</span> <span>•</span> <span>{entry.league}</span> <span>•</span> <span>{entry.wins} побед</span> <span>•</span> <span>{entry.matches} матчей</span>
                      </div>
                    </div>
                    <div className="leaderboard-rate">{Math.round(entry.winRate * 100)}%</div>
                  </div>
                );
              })}
            </div>
          )}
          </section>
        </div>

        <div className="code-rooms-dashboard-grid code-rooms-dashboard-grid--secondary">
          <section className="card dashboard-card">
            <div className="dashboard-card__header">
              <div className="dashboard-card__header-left">
                <h3>Открытые дуэли</h3>
                <p className="dashboard-card__subtitle">Можно открыть матч как зритель и смотреть за двумя редакторами в realtime.</p>
              </div>
              <Eye size={18} />
            </div>
            {openMatchesLoading ? (
              <div className="empty-state compact">Загрузка открытых дуэлей...</div>
            ) : openMatches.length === 0 ? (
              <div className="empty-state compact">Сейчас нет открытых матчей для просмотра.</div>
            ) : (
              <div className="arena-open-list">
                {sortedOpenMatches.map((arenaMatch) => {
                  const leftPlayer = arenaMatch.players.find((item) => item.side === 'left');
                  const rightPlayer = arenaMatch.players.find((item) => item.side === 'right');
                  const isMyMatch = arenaMatch.players.some((item) => item.userId === (user?.id || getStoredGuestId()));
                  return (
                    <div key={arenaMatch.id} className="arena-open-card">
                      <div className="arena-open-card__header">
                        <div>
                          <div className="arena-open-card__title">{arenaMatch.taskTitle || 'Arena duel'}</div>
                          <div className="arena-open-card__meta">
                            <span>{arenaMatch.topic || 'any'}</span> <span>/</span> <span>{arenaMatch.difficulty || 'any'}</span>
                          </div>
                        </div>
                        <div className={`badge ${arenaMatch.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                          {arenaMatch.status === 'active' ? 'Идёт матч' : 'Ожидает старт'}
                        </div>
                      </div>
                      <div className="arena-open-card__players">
                        <span>{leftPlayer?.displayName || 'Игрок слева'}</span>
                        <Swords size={14} className="swords-icon" />
                        <span>{rightPlayer?.displayName || 'Ждём соперника'}</span>
                      </div>
                      <div className="arena-open-card__footer">
                        <div className="arena-open-card__timer">
                          <TimerReset size={14} />
                          <span>{arenaMatch.durationSeconds > 0 ? `${Math.floor(arenaMatch.durationSeconds / 60)} мин` : 'Без лимита'}</span>
                        </div>
                        <button
                          className="arena-watch-btn"
                          onClick={() => navigate(isMyMatch ? `/arena/${arenaMatch.id}` : `/arena/${arenaMatch.id}?spectator=1`)}
                        >
                          <Eye size={16} />
                          <span>{isMyMatch ? 'Вернуться в матч' : 'Смотреть'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card dashboard-card">
            <div className="dashboard-card__header">
              <div className="dashboard-card__header-left">
                <h3>Правила арены</h3>
                <p className="dashboard-card__subtitle">Коротко о том, как сейчас работает duel flow.</p>
              </div>
              <ShieldCheck size={18} />
            </div>
            <div className="arena-rules-overview">
              {ARENA_RULE_SECTIONS.map((section) => (
                <div key={section.title} className="arena-rules-overview__card">
                  <div className="arena-rules-overview__card-head">
                    <div className="arena-rules-overview__title">{section.title}</div>
                    <div className="arena-rules-overview__caption">{section.caption}</div>
                  </div>
                  <div className="arena-rules-overview__chips">
                    {section.items.map((rule) => (
                      <div key={rule} className="arena-rules-overview__item">
                        <span className="arena-rules-overview__dot" />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => {
          // If in queue mode and queued, don't cancel - just close modal
          if (newRoomMode === 'queue' && queueState?.status === 'queued') {
            setShowCreateModal(false);
          } else {
            resetCreateModal();
          }
        }}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <>
              <div className="modal-header">
                <h2>Новая комната</h2>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => {
                    if (newRoomMode === 'queue' && queueState?.status === 'queued') {
                      setShowCreateModal(false);
                    } else {
                      resetCreateModal();
                    }
                  }}
                  aria-label="Закрыть"
                >
                  ✕
                </button>
              </div>
                <p className="dashboard-card__subtitle" style={{ marginBottom: '20px' }}>
                  Выберите режим. Для пригласительной дуэли можно отправить ссылку, для онлайн-дуэли включится поиск соперника.
                </p>

                <div className="form-group">
                  <label>Режим</label>
                  <div className="mode-selector">
                    <button
                      type="button"
                      className={`mode-btn ${newRoomMode === 'all' ? 'active' : ''}`}
                      onClick={() => setNewRoomMode('all')}
                    >
                      <span className="mode-icon">👥</span>
                      <span className="mode-btn-title">Для всех</span>
                      <span className="mode-desc">Совместное редактирование одного файла</span>
                    </button>
                    <button
                      type="button"
                      className={`mode-btn ${newRoomMode === 'duel' ? 'active' : ''}`}
                      onClick={() => {
                        setNewRoomMode('duel');
                      }}
                    >
                      <span className="mode-icon">⚔️</span>
                      <span className="mode-btn-title">По приглашению</span>
                      <span className="mode-desc">
                        {isGuest
                          ? 'Доступно и гостям'
                          : 'Judge по тестам и фиксируем первого победителя'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`mode-btn ${newRoomMode === 'queue' ? 'active' : ''}`}
                      onClick={() => {
                        setNewRoomMode('queue');
                      }}
                    >
                      <span className="mode-icon">🎯</span>
                      <span className="mode-btn-title">Онлайн матч</span>
                      <span className="mode-desc">Встаешь в очередь и ждёшь соперника с той же темой</span>
                    </button>
                  </div>
                </div>

                {(newRoomMode === 'duel' || newRoomMode === 'queue') && (
                  <div className="task-filters code-room-create-filters">
                    <div className="form-group">
                      <label>Тема дуэли</label>
                      <div className="pill-selector">
                        {DUEL_TOPICS.map((opt) => (
                          <button
                            key={opt.value || '__empty'}
                            type="button"
                            className={`pill-selector__pill ${newRoomTopic === opt.value ? 'active' : ''}`}
                            onClick={() => setNewRoomTopic(opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Сложность</label>
                      <div className="pill-selector">
                        {DIFFICULTY_OPTIONS.map((opt) => (
                          <button
                            key={opt.value || '__empty'}
                            type="button"
                            className={`pill-selector__pill pill-${opt.value} ${newRoomDifficulty === opt.value ? 'active' : ''}`}
                            onClick={() => setNewRoomDifficulty(opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {newRoomMode === 'queue' && queueState?.status === 'queued' ? (
                  <>
                    <div className="guest-cta-banner" style={{ marginTop: '16px' }}>
                      <div className="guest-cta-banner__copy">
                        <span className="guest-cta-banner__kicker">Queue</span>
                        <strong>Ищем соперника...</strong>
                        <span>Тема: {queueState.topic || 'любая'} • в очереди сейчас {queueState.queueSize || 0} чел. • поиск обновляется автоматически.</span>
                      </div>
                    </div>
                    <div className="modal-actions">
                      <button className="btn btn-secondary" onClick={() => resetCreateModal()}>Отменить поиск</button>
                    </div>
                  </>
                ) : (
                  <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => resetCreateModal()}>Отмена</button>
                    <button className="btn btn-primary" onClick={() => void handleCreateRoom()} disabled={creating}>
                      {creating ? 'Создание...' : (newRoomMode === 'queue' ? 'Играть' : 'Создать')}
                    </button>
                  </div>
                )}
            </>
          </div>
        </div>
      )}
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

      {showLeaguesModal && (
        <div className="modal-overlay" onClick={() => setShowLeaguesModal(false)}>
          <div className="modal modal-wide code-room-leagues-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Лиги и ELO</h2>
            <p className="dashboard-card__subtitle">
              Новый игрок стартует с <strong>300 ELO</strong>. Чем сложнее задача, тем сильнее изменение рейтинга.
            </p>
            <div className="arena-rules-overview">
              <div className="arena-rules-overview__card">
                <div className="arena-rules-overview__card-head">
                  <div className="arena-rules-overview__title">Формула</div>
                  <div className="arena-rules-overview__caption">Сложность влияет на коэффициент изменения</div>
                </div>
                <div className="arena-rules-overview__chips">
                  <div className="arena-rules-overview__item"><span className="arena-rules-overview__dot" /><span>`new = old + 40 * difficultyMultiplier * (score - expectedScore)`</span></div>
                  <div className="arena-rules-overview__item"><span className="arena-rules-overview__dot" /><span>`easy = 1x`, `medium = 1.5x`, `hard = 2x`</span></div>
                  <div className="arena-rules-overview__item"><span className="arena-rules-overview__dot" /><span>Минимальный рейтинг: `100`</span></div>
                </div>
              </div>
              <div className="arena-rules-overview__card">
                <div className="arena-rules-overview__card-head">
                  <div className="arena-rules-overview__title">Лиги</div>
                  <div className="arena-rules-overview__caption">Порог повышается автоматически по ELO</div>
                </div>
                <div className="arena-rules-overview__chips">
                  {LEAGUES.map((league) => (
                    <div key={league.name} className="arena-rules-overview__item">
                      <span className="arena-rules-overview__dot" />
                      <span>{league.name}: от {league.minRating} ELO</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowLeaguesModal(false)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
