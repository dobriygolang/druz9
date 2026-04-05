import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, Code2, Plus, Search, Sparkles, Sword, Terminal } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { ArenaLeaderboardEntry, ArenaMatch, CodeTask } from '@/entities/CodeRoom/model/types';
import { CommunityMapPoint } from '@/entities/User/model/types';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { geoApi } from '@/features/Geo/api/geoApi';

type ActivityRow = {
  label: string;
  meta: string;
  badge: string;
  tone: 'easy' | 'medium' | 'hard';
};

const toneLabel: Record<ActivityRow['tone'], string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const PracticeHubPage: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<ArenaLeaderboardEntry[]>([]);
  const [openMatches, setOpenMatches] = useState<ArenaMatch[]>([]);
  const [tasks, setTasks] = useState<CodeTask[]>([]);
  const [communityPoints, setCommunityPoints] = useState<CommunityMapPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        const [nextLeaderboard, nextMatches, nextTasks, nextPoints] = await Promise.all([
          codeRoomApi.getArenaLeaderboard(4),
          codeRoomApi.getOpenArenaMatches(4),
          codeRoomApi.listTasks({ includeInactive: false }),
          geoApi.communityMap().catch(() => []),
        ]);

        if (!cancelled) {
          setLeaderboard(nextLeaderboard);
          setOpenMatches(nextMatches);
          setTasks(nextTasks);
          setCommunityPoints(nextPoints);
        }
      } catch (error) {
        console.error('Failed to load practice overview', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const isOverview = location.pathname === '/practice';
  const onlineCount = communityPoints.filter((point) => point.activityStatus === 'online').length;
  const tasksCount = tasks.length;
  const activeMatches = openMatches.length;
  const userRating = user?.id ? leaderboard.find((entry) => entry.userId === user.id)?.rating ?? 300 : 300;

  const activityRows = useMemo<ActivityRow[]>(() => {
    const taskTopics = tasks.map((task) => task.topics[0]).filter(Boolean);
    const fallbackRows: ActivityRow[] = [
      { label: 'Two Sum', meta: 'Математика', badge: 'Комната', tone: 'easy' },
      { label: 'LRU Cache', meta: 'System Design', badge: 'Быстро', tone: 'medium' },
      { label: 'Serialize Binary Tree', meta: 'Trees', badge: 'Бот', tone: 'hard' },
    ];

    const matchRows = openMatches.slice(0, 3).map((match, index) => ({
      label: match.taskTitle || `Arena Match #${index + 1}`,
      meta: match.topic || taskTopics[index] || 'Arena',
      badge: match.status === 'waiting' ? 'Ждёт' : 'Live',
      tone: (index % 3 === 0 ? 'easy' : index % 3 === 1 ? 'medium' : 'hard') as ActivityRow['tone'],
    }));

    return matchRows.length > 0 ? matchRows : fallbackRows;
  }, [openMatches, tasks]);

  const focusItems = useMemo(() => {
    const total = Math.max(tasksCount, 1);
    return [
      { label: 'Из каталога', value: `${tasksCount} задач`, width: Math.min(100, (tasksCount / 60) * 100) },
      { label: 'Решено за неделю', value: `${Math.min(activeMatches + 2, 9)}`, width: Math.min(100, ((activeMatches + 2) / 10) * 100) },
      { label: 'Серия дня', value: `${Math.max(1, Math.min(7, onlineCount))}`, width: Math.min(100, (onlineCount / total) * 100) },
    ];
  }, [activeMatches, onlineCount, tasksCount]);

  const nextStepLabel = openMatches[0]?.taskTitle || 'Подобрать duel';

  return (
    <div className="practice-overview fade-in">
      <section className="practice-overview__header">
        <div className="practice-overview__title-block">
          <h1>Practice</h1>
          <p>Тренируйся в реальном времени или выходи в Arena</p>
        </div>

        <div className="practice-overview__actions">
          <div className="practice-overview__stats">
            <span className="practice-overview__stat practice-overview__stat--green">
              <span className="practice-overview__dot" />
              {isLoading ? 'Загрузка...' : `${activeMatches} сессий активно`}
            </span>
            <span className="practice-overview__stat">
              <Search size={12} />
              {isLoading ? 'Загрузка...' : `${tasksCount} задачек online`}
            </span>
          </div>

          <Link to="/practice/code-rooms" className="practice-overview__cta">
            <Plus size={16} />
            <span>Создать комнату</span>
          </Link>
        </div>
      </section>

      <nav className="practice-overview__tabs" aria-label="Practice sections">
        <NavLink to="/practice" end className={({ isActive }) => `practice-overview__tab${isActive ? ' is-active' : ''}`}>Обзор</NavLink>
        <NavLink to="/practice/code-rooms" className={({ isActive }) => `practice-overview__tab${isActive ? ' is-active' : ''}`}>Code Rooms</NavLink>
        <NavLink to="/practice/arena" className={({ isActive }) => `practice-overview__tab${isActive ? ' is-active' : ''}`}>Arena</NavLink>
      </nav>

      {isOverview ? (
        <div className="practice-overview__body">
          <section className="practice-overview__modes">
            <article className="practice-mode-panel practice-mode-panel--rooms">
              <div className="practice-mode-panel__top">
                <span className="practice-mode-panel__pill">Live</span>
              </div>
              <div className="practice-mode-panel__icon">
                <Code2 size={18} />
              </div>
              <h2>Code Rooms</h2>
              <p>Открывай live-комнаты, устраивай pair review или запускай совместную практику.</p>
              <div className="practice-mode-panel__meta">
                <span>{isLoading ? '...' : `${tasksCount} каталога`}</span>
                <span>Личный формат</span>
                <span>до 4 участников</span>
              </div>
              <Link to="/practice/code-rooms" className="practice-mode-panel__link">
                Join Code Room
                <ArrowRight size={14} />
              </Link>
            </article>

            <article className="practice-mode-panel practice-mode-panel--arena">
              <div className="practice-mode-panel__top">
                <span className="practice-mode-panel__pill practice-mode-panel__pill--amber">Дуэль</span>
              </div>
              <div className="practice-mode-panel__icon">
                <Sword size={18} />
              </div>
              <h2>Arena Duel</h2>
              <p>Устройся на быстрые 1v1-рейтинги и разбери технику боя в условиях live-соперника.</p>
              <div className="practice-mode-panel__meta">
                <span>{isLoading ? '...' : `${userRating} рейтинг`}</span>
                <span>один на один</span>
                <span>rage-free</span>
              </div>
              <Link to="/practice/arena" className="practice-mode-panel__button">
                Найти соперника
              </Link>
            </article>

            <article className="practice-mode-panel practice-mode-panel--mock">
              <div className="practice-mode-panel__top">
                <span className="practice-mode-panel__pill practice-mode-panel__pill--violet">new</span>
              </div>
              <div className="practice-mode-panel__icon">
                <Terminal size={18} />
              </div>
              <h2>Mock Interview</h2>
              <p>Для интервью нужен кодовый режим. Готовься к системным созвонам, SQL и whiteboard flow.</p>
              <div className="practice-mode-panel__meta">
                <span>soft + hard skills</span>
              </div>
              <Link to="/growth/interview-prep" className="practice-mode-panel__link practice-mode-panel__link--light">
                Перейти
                <ArrowRight size={14} />
              </Link>
            </article>
          </section>

          <section className="practice-overview__columns">
            <article className="practice-activity-card">
              <div className="practice-activity-card__head">
                <h3>Активные занятия</h3>
                <Link to="/practice/code-rooms">Всё комнаты →</Link>
              </div>

              <div className="practice-activity-card__rows">
                {activityRows.map((row) => (
                  <div key={row.label} className="practice-activity-row">
                    <span className={`practice-activity-row__tone practice-activity-row__tone--${row.tone}`}>{toneLabel[row.tone]}</span>
                    <div className="practice-activity-row__copy">
                      <strong>{row.label}</strong>
                      <span>{row.meta}</span>
                    </div>
                    <span className="practice-activity-row__badge">{row.badge}</span>
                  </div>
                ))}
              </div>
            </article>

            <aside className="practice-overview__side">
              <article className="practice-side-card">
                <h3>Фокус на сегодня</h3>
                <div className="practice-focus-list">
                  {focusItems.map((item) => (
                    <div key={item.label} className="practice-focus-item">
                      <div className="practice-focus-item__top">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                      <div className="practice-focus-item__track">
                        <span style={{ width: `${item.width}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="practice-side-card practice-side-card--accent">
                <div className="practice-side-card__kicker">
                  <Sparkles size={14} />
                  <span>Следующий шаг</span>
                </div>
                <strong>{nextStepLabel}</strong>
                <p>Продолжи тренировку: создай комнату или запусти live-дуэль с новым соперником.</p>
                <Link to={openMatches.length > 0 ? '/practice/arena' : '/practice/code-rooms'} className="practice-side-card__button">
                  Запланировать
                  <ArrowRight size={14} />
                </Link>
              </article>
            </aside>
          </section>
        </div>
      ) : (
        <div className="practice-overview__nested">
          <Outlet />
        </div>
      )}
    </div>
  );
};
