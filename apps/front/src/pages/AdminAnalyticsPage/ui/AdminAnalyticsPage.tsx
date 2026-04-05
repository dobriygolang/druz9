import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Activity,
  BarChart2,
  Code2,
  RefreshCw,
  Sword,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { CodeTask } from '@/entities/CodeRoom/model/types';

interface StatCard {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: '#16a34a',
  medium: '#d97706',
  hard: '#dc2626',
};

const DIFFICULTY_BG: Record<string, string> = {
  easy: '#dcfce7',
  medium: '#fef9c3',
  hard: '#fee2e2',
};

export const AdminAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<CodeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = Boolean(user?.isAdmin);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const data = await codeRoomApi.listTasks({ includeInactive: true });
      setTasks(data);
    } catch {
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  const activeTasks = tasks.filter((t) => t.isActive).length;
  const topicSet = new Set(tasks.flatMap((t) => t.topics));
  const byDifficulty = tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.difficulty] = (acc[t.difficulty] || 0) + 1;
    return acc;
  }, {});

  const statCards: StatCard[] = [
    {
      label: 'Всего задач',
      value: tasks.length,
      sub: `${activeTasks} активных`,
      icon: <Code2 size={22} />,
      accent: '#6366f1',
    },
    {
      label: 'Тем / топиков',
      value: topicSet.size,
      sub: 'уникальных тем',
      icon: <BarChart2 size={22} />,
      accent: '#0891b2',
    },
    {
      label: 'Easy задачи',
      value: byDifficulty['easy'] || 0,
      icon: <TrendingUp size={22} />,
      accent: '#16a34a',
    },
    {
      label: 'Hard задачи',
      value: byDifficulty['hard'] || 0,
      icon: <Zap size={22} />,
      accent: '#dc2626',
    },
  ];

  const topTasks = [...tasks]
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 10);

  return (
    <div className="admin-page fade-in">
      {/* Header */}
      <div className="admin-page__header">
        <div className="admin-page__header-left">
          <div className="admin-page__icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
            <Activity size={22} />
          </div>
          <div>
            <h1 className="admin-page__title">Аналитика</h1>
            <p className="admin-page__subtitle">Статистика платформы и задач</p>
          </div>
        </div>
        <button
          className="btn btn-secondary admin-page__refresh-btn"
          onClick={() => void load(true)}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          Обновить
        </button>
      </div>

      {error && (
        <div className="admin-page__error">{error}</div>
      )}

      {/* Stat cards */}
      <div className="admin-stat-grid">
        {statCards.map((card) => (
          <div key={card.label} className="admin-stat-card">
            <div className="admin-stat-card__icon" style={{ background: `${card.accent}18`, color: card.accent }}>
              {card.icon}
            </div>
            <div className="admin-stat-card__body">
              <div className="admin-stat-card__value">
                {loading ? '—' : card.value}
              </div>
              <div className="admin-stat-card__label">{card.label}</div>
              {card.sub && (
                <div className="admin-stat-card__sub">{card.sub}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="admin-charts-row">
        {/* Difficulty distribution */}
        <div className="admin-chart-card">
          <div className="admin-chart-card__header">
            <BarChart2 size={18} />
            <span>Распределение по сложности</span>
          </div>
          <div className="admin-chart-card__body">
            {loading ? (
              <div className="admin-chart-card__loading">Загрузка...</div>
            ) : (
              <div className="admin-difficulty-bars">
                {['easy', 'medium', 'hard'].map((diff) => {
                  const count = byDifficulty[diff] || 0;
                  const pct = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0;
                  return (
                    <div key={diff} className="admin-difficulty-bar-row">
                      <span
                        className="admin-difficulty-badge"
                        style={{ background: DIFFICULTY_BG[diff], color: DIFFICULTY_COLOR[diff] }}
                      >
                        {DIFFICULTY_LABEL[diff]}
                      </span>
                      <div className="admin-difficulty-bar-track">
                        <div
                          className="admin-difficulty-bar-fill"
                          style={{ width: `${pct}%`, background: DIFFICULTY_COLOR[diff] }}
                        />
                      </div>
                      <span className="admin-difficulty-bar-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Platform activity placeholder */}
        <div className="admin-chart-card admin-chart-card--placeholder">
          <div className="admin-chart-card__header">
            <TrendingUp size={18} />
            <span>Активность за 30 дней</span>
          </div>
          <div className="admin-chart-card__body admin-chart-card__body--empty">
            <Activity size={32} style={{ color: '#cbd5e1', marginBottom: 8 }} />
            <span>График будет доступен после подключения аналитики</span>
          </div>
        </div>
      </div>

      {/* Top tasks table */}
      <div className="admin-table-card">
        <div className="admin-table-card__header">
          <div className="admin-table-card__title">
            <Code2 size={18} />
            <span>Задачи</span>
          </div>
          <span className="admin-table-card__count">{tasks.length} всего</span>
        </div>

        {loading ? (
          <div className="admin-table-loading">Загрузка...</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Сложность</th>
                  <th>Темы</th>
                  <th>Тип</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {topTasks.map((task) => (
                  <tr key={task.id}>
                    <td className="admin-table__title-cell">{task.title}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: DIFFICULTY_BG[task.difficulty] || '#f1f5f9',
                          color: DIFFICULTY_COLOR[task.difficulty] || '#475569',
                          border: `1px solid ${DIFFICULTY_COLOR[task.difficulty] || '#e2e8f0'}`,
                          fontWeight: 600,
                          fontSize: 11,
                        }}
                      >
                        {DIFFICULTY_LABEL[task.difficulty] || task.difficulty}
                      </span>
                    </td>
                    <td className="admin-table__topics-cell">
                      {task.topics.slice(0, 3).map((topic) => (
                        <span key={topic} className="admin-topic-tag">{topic}</span>
                      ))}
                      {task.topics.length > 3 && (
                        <span className="admin-topic-tag admin-topic-tag--more">+{task.topics.length - 3}</span>
                      )}
                    </td>
                    <td>
                      <span className="admin-type-badge">{task.taskType}</span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: task.isActive ? '#dcfce7' : '#f1f5f9',
                          color: task.isActive ? '#16a34a' : '#94a3b8',
                          border: `1px solid ${task.isActive ? '#bbf7d0' : '#e2e8f0'}`,
                          fontWeight: 600,
                          fontSize: 11,
                        }}
                      >
                        {task.isActive ? 'Активна' : 'Скрыта'}
                      </span>
                    </td>
                  </tr>
                ))}
                {topTasks.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      Задачи не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Additional stat cards row */}
      <div className="admin-stat-grid admin-stat-grid--secondary">
        <div className="admin-info-card">
          <Users size={18} style={{ color: '#6366f1' }} />
          <div>
            <div className="admin-info-card__title">Пользователи</div>
            <div className="admin-info-card__desc">Статистика пользователей будет доступна через API аналитики</div>
          </div>
        </div>
        <div className="admin-info-card">
          <Sword size={18} style={{ color: '#f59e0b' }} />
          <div>
            <div className="admin-info-card__title">Arena матчи</div>
            <div className="admin-info-card__desc">История дуэлей и рейтинги ELO — раздел в разработке</div>
          </div>
        </div>
        <div className="admin-info-card">
          <Activity size={18} style={{ color: '#10b981' }} />
          <div>
            <div className="admin-info-card__title">Сессии</div>
            <div className="admin-info-card__desc">Активность сессий и время решения задач</div>
          </div>
        </div>
      </div>
    </div>
  );
};
