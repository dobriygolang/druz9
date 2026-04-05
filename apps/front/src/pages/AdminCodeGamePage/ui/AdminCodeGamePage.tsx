import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Activity,
  Clock,
  RefreshCw,
  Sword,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { ArenaLeaderboardEntry, ArenaMatch } from '@/entities/CodeRoom/model/types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  return `${Math.floor(hrs / 24)} дн назад`;
}

const MATCH_STATUS_LABEL: Record<string, string> = {
  waiting: 'Ожидание',
  active: 'Идёт',
  finished: 'Завершён',
};

const MATCH_STATUS_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  waiting: { bg: '#fef9c3', color: '#d97706', border: '#fde68a' },
  active: { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  finished: { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
};

export const AdminCodeGamePage: React.FC = () => {
  const { user } = useAuth();
  const [openMatches, setOpenMatches] = useState<ArenaMatch[]>([]);
  const [leaderboard, setLeaderboard] = useState<ArenaLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = Boolean(user?.isAdmin);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const [matches, lb] = await Promise.all([
        codeRoomApi.getOpenArenaMatches(20),
        codeRoomApi.getArenaLeaderboard(10),
      ]);
      setOpenMatches(matches);
      setLeaderboard(lb);
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

  const activeMatches = openMatches.filter((m) => m.status === 'active');
  const waitingMatches = openMatches.filter((m) => m.status === 'waiting');
  const totalPlayers = openMatches.reduce((acc, m) => acc + (m.players?.length || 0), 0);
  const avgElo = leaderboard.length > 0
    ? Math.round(leaderboard.reduce((acc, e) => acc + e.rating, 0) / leaderboard.length)
    : 0;

  return (
    <div className="admin-page fade-in">
      {/* Header */}
      <div className="admin-page__header">
        <div className="admin-page__header-left">
          <div className="admin-page__icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
            <Sword size={22} />
          </div>
          <div>
            <h1 className="admin-page__title">Code Game</h1>
            <p className="admin-page__subtitle">Arena дуэли и рейтинги игроков</p>
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
        <div className="admin-stat-card">
          <div className="admin-stat-card__icon" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
            <Activity size={22} />
          </div>
          <div className="admin-stat-card__body">
            <div className="admin-stat-card__value">{loading ? '—' : activeMatches.length}</div>
            <div className="admin-stat-card__label">Активных матчей</div>
            <div className="admin-stat-card__sub">прямо сейчас</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-card__icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
            <Clock size={22} />
          </div>
          <div className="admin-stat-card__body">
            <div className="admin-stat-card__value">{loading ? '—' : waitingMatches.length}</div>
            <div className="admin-stat-card__label">Ожидают игрока</div>
            <div className="admin-stat-card__sub">открытые лобби</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-card__icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
            <Users size={22} />
          </div>
          <div className="admin-stat-card__body">
            <div className="admin-stat-card__value">{loading ? '—' : totalPlayers}</div>
            <div className="admin-stat-card__label">Игроков онлайн</div>
            <div className="admin-stat-card__sub">в открытых матчах</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-card__icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
            <Trophy size={22} />
          </div>
          <div className="admin-stat-card__body">
            <div className="admin-stat-card__value">{loading ? '—' : avgElo > 0 ? avgElo : '—'}</div>
            <div className="admin-stat-card__label">Средний ELO</div>
            <div className="admin-stat-card__sub">топ-10 игроков</div>
          </div>
        </div>
      </div>

      {/* Two columns: live sessions + leaderboard */}
      <div className="admin-two-col">
        {/* Live sessions table */}
        <div className="admin-table-card">
          <div className="admin-table-card__header">
            <div className="admin-table-card__title">
              <Zap size={18} />
              <span>Живые сессии</span>
            </div>
            <span className="admin-table-card__count">{openMatches.length} матчей</span>
          </div>

          {loading ? (
            <div className="admin-table-loading">Загрузка...</div>
          ) : openMatches.length === 0 ? (
            <div className="admin-table-empty">
              <Sword size={32} style={{ color: '#cbd5e1', marginBottom: 8 }} />
              <span>Нет активных матчей</span>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Задача</th>
                    <th>Игроки</th>
                    <th>Статус</th>
                    <th>Время</th>
                  </tr>
                </thead>
                <tbody>
                  {openMatches.map((match) => {
                    const statusStyle = MATCH_STATUS_COLOR[match.status] || MATCH_STATUS_COLOR.waiting;
                    return (
                      <tr key={match.id}>
                        <td className="admin-table__title-cell">
                          {match.taskTitle || match.taskId || 'Случайная задача'}
                        </td>
                        <td>
                          <div className="admin-match-players">
                            {match.players?.map((p) => (
                              <span key={p.userId} className="admin-player-chip">
                                {p.displayName}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: statusStyle.bg,
                              color: statusStyle.color,
                              border: `1px solid ${statusStyle.border}`,
                              fontWeight: 600,
                              fontSize: 11,
                            }}
                          >
                            {MATCH_STATUS_LABEL[match.status] || match.status}
                          </span>
                        </td>
                        <td style={{ color: '#94a3b8', fontSize: 12 }}>
                          {match.createdAt ? timeAgo(match.createdAt) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="admin-table-card">
          <div className="admin-table-card__header">
            <div className="admin-table-card__title">
              <Trophy size={18} />
              <span>Топ игроков</span>
            </div>
            <span className="admin-table-card__count">ELO рейтинг</span>
          </div>

          {loading ? (
            <div className="admin-table-loading">Загрузка...</div>
          ) : leaderboard.length === 0 ? (
            <div className="admin-table-empty">
              <Trophy size={32} style={{ color: '#cbd5e1', marginBottom: 8 }} />
              <span>Нет данных рейтинга</span>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Игрок</th>
                    <th>ELO</th>
                    <th>W/L</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, idx) => (
                    <tr key={entry.userId}>
                      <td>
                        <span
                          className="admin-rank-badge"
                          style={{
                            color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#64748b',
                            fontWeight: 700,
                          }}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="admin-table__title-cell">{entry.displayName}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#6366f1', fontSize: 14 }}>
                          {entry.rating}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>{entry.wins}W</span>
                        {' / '}
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>{entry.losses}L</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
