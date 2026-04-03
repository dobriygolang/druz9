import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Trophy, Users } from 'lucide-react';

import { ArenaLeaderboardEntry, ArenaMatch } from '@/entities/CodeRoom/model/types';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';

export const ArenaHubPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<ArenaLeaderboardEntry[]>([]);
  const [matches, setMatches] = useState<ArenaMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        const [nextLeaderboard, nextMatches] = await Promise.all([
          codeRoomApi.getArenaLeaderboard(5),
          codeRoomApi.getOpenArenaMatches(5),
        ]);
        if (!cancelled) {
          setLeaderboard(nextLeaderboard);
          setMatches(nextMatches);
        }
      } catch (error) {
        console.error('Failed to load arena hub', error);
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

  return (
    <div className="arena-hub">
      <section className="arena-hub__hero">
        <div className="arena-hub__copy">
          <span>Arena</span>
          <h2>Арена</h2>
          <p>
            Здесь рейтинговые матчи, открытые дуэли и быстрый вход в соревновательный режим.
          </p>
          <div className="arena-hub__hero-stats">
            <div className="arena-hub__hero-pill">
              <strong>{isLoading ? '...' : leaderboard.length}</strong>
              <span>в топе сейчас</span>
            </div>
            <div className="arena-hub__hero-pill">
              <strong>{isLoading ? '...' : matches.length}</strong>
              <span>открытых матчей</span>
            </div>
          </div>
        </div>
        <Link to="/practice/code-rooms" className="arena-hub__cta">
          <span>К code rooms</span>
          <ArrowRight size={16} />
        </Link>
      </section>

      <div className="arena-hub__grid">
        <article className="arena-hub__panel arena-hub__panel--leaderboard">
          <div className="arena-hub__panel-head">
            <Trophy size={18} />
            <strong>Лидерборд</strong>
          </div>
          <div className="arena-hub__list">
            {isLoading ? (
              <div className="home-empty">Загрузка рейтинга...</div>
            ) : leaderboard.length > 0 ? leaderboard.map((entry, index) => (
              <div key={entry.userId} className="arena-hub__row">
                <span>#{index + 1}</span>
                <div>
                  <strong>{entry.displayName}</strong>
                  <span>{entry.matches} матчей</span>
                </div>
                <span>{entry.rating} ELO</span>
              </div>
            )) : (
              <div className="home-empty">Лидерборд пока пуст.</div>
            )}
          </div>
        </article>

        <article className="arena-hub__panel arena-hub__panel--matches">
          <div className="arena-hub__panel-head">
            <Users size={18} />
            <strong>Открытые матчи</strong>
          </div>
          <div className="arena-hub__list">
            {isLoading ? (
              <div className="home-empty">Загрузка матчей...</div>
            ) : matches.length > 0 ? matches.map((match) => (
              <div key={match.id} className="arena-hub__row">
                <div>
                  <strong>{match.taskTitle}</strong>
                  <span>{match.difficulty} • {match.players.length}/2 игрока</span>
                </div>
                <Link to={`/arena/${match.id}`}>Открыть</Link>
              </div>
            )) : (
              <div className="home-empty">Открытых матчей сейчас нет.</div>
            )}
          </div>
        </article>

        <article className="arena-hub__panel arena-hub__panel--notes">
          <div className="arena-hub__panel-head">
            <Shield size={18} />
            <strong>Форматы</strong>
          </div>
          <div className="arena-hub__notes">
            <div>Закрытые scrims для своей команды.</div>
            <div>Локальные ладдеры внутри circles.</div>
          </div>
        </article>
      </div>
    </div>
  );
};
