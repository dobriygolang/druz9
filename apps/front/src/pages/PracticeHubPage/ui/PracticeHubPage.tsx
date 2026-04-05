import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowRight, Code2, Sword, Terminal, Trophy, Users, Zap } from 'lucide-react';

import { ArenaLeaderboardEntry, ArenaMatch } from '@/entities/CodeRoom/model/types';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { useAuth } from '@/app/providers/AuthProvider';

export const PracticeHubPage: React.FC = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<ArenaLeaderboardEntry[]>([]);
  const [openMatches, setOpenMatches] = useState<ArenaMatch[]>([]);
  const [tasksCount, setTasksCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [lb, matches, tasks] = await Promise.all([
          codeRoomApi.getArenaLeaderboard(3),
          codeRoomApi.getOpenArenaMatches(3),
          codeRoomApi.listTasks({}),
        ]);
        if (!cancelled) {
          setLeaderboard(lb);
          setOpenMatches(matches);
          setTasksCount(tasks.length);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const userRating = user?.id
    ? leaderboard.find((e) => e.userId === user.id)?.rating
    : null;

  return (
    <div className="practice-hub fade-in">
      {/* Hero */}
      <section className="practice-hub__hero">
        <div className="practice-hub__hero-copy">
          <span className="hub-shell__eyebrow">Practice</span>
          <h1>Практика кода в одном месте</h1>
          <p>
            Code rooms для совместной работы, арена для дуэлей 1v1 и соло-режим для прокачки алгоритмов.
          </p>
        </div>
        <div className="practice-hub__hero-stats">
          <div className="practice-hub__stat">
            <strong>{isLoading ? '—' : (tasksCount ?? 0)}</strong>
            <span>задач в базе</span>
          </div>
          <div className="practice-hub__stat">
            <strong>{isLoading ? '—' : openMatches.length}</strong>
            <span>открытых матчей</span>
          </div>
          {userRating != null && (
            <div className="practice-hub__stat practice-hub__stat--accent">
              <strong>{userRating}</strong>
              <span>твой ELO</span>
            </div>
          )}
        </div>
      </section>

      {/* Mode cards */}
      <div className="practice-hub__modes">
        <Link to="/practice/code-rooms" className="practice-mode-card practice-mode-card--rooms">
          <div className="practice-mode-card__icon">
            <Code2 size={28} />
          </div>
          <div className="practice-mode-card__body">
            <strong>Code Rooms</strong>
            <p>Совместная работа в реальном времени — пишите код вместе или проводите code review.</p>
            <div className="practice-mode-card__meta">
              <Users size={13} />
              <span>до 10 участников</span>
            </div>
          </div>
          <ArrowRight size={18} className="practice-mode-card__arrow" />
        </Link>

        <Link to="/practice/arena" className="practice-mode-card practice-mode-card--arena">
          <div className="practice-mode-card__icon">
            <Sword size={28} />
          </div>
          <div className="practice-mode-card__body">
            <strong>Arena</strong>
            <p>Дуэли 1v1 с рейтинговой системой ELO. Решай алгоритмические задачи быстрее соперника.</p>
            <div className="practice-mode-card__meta">
              <Trophy size={13} />
              <span>
                {isLoading ? '...' : leaderboard.length > 0
                  ? `${leaderboard[0].displayName} ведёт`
                  : 'рейтинговые дуэли'}
              </span>
            </div>
          </div>
          <ArrowRight size={18} className="practice-mode-card__arrow" />
        </Link>

        <Link to="/practice/solo" className="practice-mode-card practice-mode-card--solo">
          <div className="practice-mode-card__icon">
            <Terminal size={28} />
          </div>
          <div className="practice-mode-card__body">
            <strong>Solo Practice</strong>
            <p>Выбери задачу из каталога и реши её в персональной комнате. Easy, Medium, Hard.</p>
            <div className="practice-mode-card__meta">
              <Zap size={13} />
              <span>{isLoading ? '...' : `${tasksCount ?? 0} задач`}</span>
            </div>
          </div>
          <ArrowRight size={18} className="practice-mode-card__arrow" />
        </Link>
      </div>

      {/* Sub-nav */}
      <nav className="hub-shell__tabs">
        {[
          { to: '/practice/code-rooms', label: 'Code Rooms' },
          { to: '/practice/arena', label: 'Arena' },
          { to: '/practice/solo', label: 'Solo' },
        ].map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `hub-shell__tab ${isActive ? 'is-active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="hub-shell__content">
        <Outlet />
      </div>
    </div>
  );
};
