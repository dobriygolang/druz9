import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { authApi } from '@/features/Auth/api/authApi';
import { interviewPrepApi } from '@/features/InterviewPrep/api/interviewPrepApi';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { getStoredGuestId, getStoredGuestName, setStoredGuestName } from '@/features/CodeRoom/lib/guestIdentity';
import { GuestNameModal } from '@/features/CodeRoom/ui/GuestNameModal';
import { ArenaLeaderboardEntry, ArenaMatch, ArenaPlayerStats, ArenaQueueState, CodeRoomMode } from '@/entities/CodeRoom/model/types';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import {
  ArenaPrimaryGrid,
  ArenaSecondaryGrid,
  CodeRoomsHeroSection,
  CreateRoomModal,
  GuestLoginBanner,
  LeaguesModal,
  SoloPracticeSection,
} from './components/CodeRoomsSections';
import { pickRandomValue, pluralizeRu, shuffledValues } from './lib/helpers';

const MOTIVATIONAL_QUOTES = [
  'Код — это поэзия логики',
  'Баг — это возможность',
  'Решение в процессе',
  'Твой код изменит мир',
  'Ошибки — путь к мастерству',
  'Сила в практике',
  'Лучший код — рабочий код',
  'Отладка учит терпению',
  'Читай код — пиши код',
  'Сомневаешься — пиши тесты',
  'Баги временны, код вечен',
  'Сложные задачи — это рост',
];

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

const INTERVIEW_PREP_CATEGORY_OPTIONS = [
  { value: 'coding', label: 'Coding' },
  { value: 'sql', label: 'SQL' },
  { value: 'system_design', label: 'System Design' },
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
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const skipArenaResume = Boolean(location.state?.skipArenaResume);
  const { user, isLoading: authLoading } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);
  const isGuest = !user;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [guestNameModalMode, setGuestNameModalMode] = useState<'create' | null>(null);
  const [creating, setCreating] = useState(false);

  // Random motivational quote on each page load
  const [motivationalQuote] = useState(() => {
    const index = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    return MOTIVATIONAL_QUOTES[index];
  });

  const [newRoomMode, setNewRoomMode] = useState<LaunchMode>(() => {
    const saved = localStorage.getItem('arenaNewRoomMode');
    if (saved === 'queue' || saved === 'duel' || saved === 'all') {
      return saved;
    }
    return 'all';
  });
  const [newRoomTopic, setNewRoomTopic] = useState('');
  const [newRoomDifficulty, setNewRoomDifficulty] = useState('');
  const [prepLaunchCategory, setPrepLaunchCategory] = useState('coding');
  const [prepLaunchCompany, setPrepLaunchCompany] = useState('all');

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

  const [leaderboard, setLeaderboard] = useState<ArenaLeaderboardEntry[]>([]);
  const [leaderboardAvatars, setLeaderboardAvatars] = useState<Record<string, string>>({});
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [openMatches, setOpenMatches] = useState<ArenaMatch[]>([]);
  const [openMatchesLoading, setOpenMatchesLoading] = useState(true);
  const [myArenaStats, setMyArenaStats] = useState<ArenaPlayerStats | null>(null);
  const [activeTaskCount, setActiveTaskCount] = useState(0);
  const [showLeaguesModal, setShowLeaguesModal] = useState(false);
  const prepCompanyOptions = ['ozon', 'avito'];

  const resolveMockLaunchCompany = useCallback(() => {
    if (prepLaunchCompany !== 'all') {
      return prepLaunchCompany;
    }
    return pickRandomValue(prepCompanyOptions);
  }, [prepLaunchCompany]);

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
    const loadLeaderboardAvatars = async () => {
      if (leaderboard.length === 0) {
        setLeaderboardAvatars({});
        return;
      }
      const entries = await Promise.all(leaderboard.map(async (entry) => {
        try {
          const profile = await authApi.getProfileById(entry.userId);
          return [entry.userId, profile.user.avatarUrl] as const;
        } catch (error) {
          console.error('Failed to load leaderboard avatar:', error);
          return [entry.userId, ''] as const;
        }
      }));
      if (!cancelled) {
        setLeaderboardAvatars(Object.fromEntries(entries));
      }
    };
    void loadLeaderboardAvatars();
    return () => {
      cancelled = true;
    };
  }, [leaderboard]);

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
      {isGuest && <GuestLoginBanner />}
      <div className="code-rooms-page">
        <CodeRoomsHeroSection
          isMobile={isMobile}
          isAdmin={isAdmin}
          motivationalQuote={motivationalQuote}
          onOpenAdmin={() => navigate('/admin/code-tasks')}
          onShowLeagues={() => setShowLeaguesModal(true)}
          onShowCreate={() => setShowCreateModal(true)}
        />

        {user?.isTrusted && (
          <SoloPracticeSection
            prepLaunchCategory={prepLaunchCategory}
            prepLaunchCompany={prepLaunchCompany}
            categoryOptions={INTERVIEW_PREP_CATEGORY_OPTIONS}
            companyOptions={[
              { value: 'all', label: 'Случайная компания' },
              { value: 'ozon', label: 'ozon' },
              { value: 'avito', label: 'avito' },
            ]}
            onCategoryChange={setPrepLaunchCategory}
            onCompanyChange={setPrepLaunchCompany}
            onStartScenario={() => {
              void (async () => {
                const explicitCompany = resolveMockLaunchCompany();
                if (!explicitCompany) {
                  return;
                }
                const candidateCompanies = prepLaunchCompany === 'all'
                  ? shuffledValues(prepCompanyOptions)
                  : [explicitCompany];
                try {
                  for (const companyTag of candidateCompanies) {
                    try {
                      const session = await interviewPrepApi.startMockSession(companyTag);
                      navigate(`/interview-prep/mock/${session.id}`);
                      return;
                    } catch (innerError: any) {
                      const apiError = innerError?.response?.data?.error || '';
                      if (!apiError.includes('mock interview task pool is incomplete')) {
                        throw innerError;
                      }
                    }
                  }
                } catch (error: any) {
                  console.error('Failed to start mock interview:', error);
                }
              })();
            }}
            onOpenRandomTask={() => navigate(`/interview-prep?category=${prepLaunchCategory}${prepLaunchCompany !== 'all' ? `&company=${prepLaunchCompany}` : ''}&pick=random`)}
            onOpenCatalog={() => navigate(`/interview-prep?category=${prepLaunchCategory}${prepLaunchCompany !== 'all' ? `&company=${prepLaunchCompany}` : ''}`)}
          />
        )}

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

        <ArenaPrimaryGrid
          isMobile={isMobile}
          isGuest={isGuest}
          myArenaStats={myArenaStats}
          activeTaskCount={activeTaskCount}
          leaderboardLoading={leaderboardLoading}
          leaderboard={leaderboard}
          leaderboardAvatars={leaderboardAvatars}
          pluralizeRu={pluralizeRu}
          onOpenRoom={(mode) => {
            setNewRoomMode(mode);
            setShowCreateModal(true);
          }}
        />

        <ArenaSecondaryGrid
          userId={user?.id}
          openMatchesLoading={openMatchesLoading}
          openMatches={openMatches}
          sortedOpenMatches={sortedOpenMatches}
          ruleSections={ARENA_RULE_SECTIONS}
          onOpenMatch={(href) => navigate(href)}
        />

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
          // If in queue mode and queued, don't cancel - just close modal
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

      <LeaguesModal open={showLeaguesModal} leagues={LEAGUES} onClose={() => setShowLeaguesModal(false)} />
    </>
  );
};
