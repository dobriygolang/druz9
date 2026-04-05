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
    <div className="practice-surface practice-surface--arena">
      <section className="practice-arena-hero">
        <div className="practice-arena-hero__copy">
          <span className="practice-arena-hero__eyebrow">Arena</span>
          <h2>Арена</h2>
          <p>Здесь рейтинговые матчи, открытые дуэли и быстрый вход в соревновательный режим.</p>
          <div className="practice-arena-hero__stats">
            <div>
              <strong>{isLoading ? '...' : leaderboard.length}</strong>
              <span>в топе сейчас</span>
            </div>
            <div>
              <strong>{isLoading ? '...' : matches.length}</strong>
              <span>открытых матчей</span>
            </div>
          </div>
        </div>

        <Link to="/practice/code-rooms" className="practice-arena-hero__cta">
          <span>К code rooms</span>
          <ArrowRight size={16} />
        </Link>
      </section>

      <section className="practice-arena-grid">
        <article className="practice-arena-card">
          <div className="practice-arena-card__head">
            <Trophy size={16} />
            <strong>Лидерборд</strong>
          </div>
          <div className="practice-arena-card__body">
            {isLoading ? 'Загрузка рейтинга...' : leaderboard.length > 0 ? 'Есть активные рейтинги.' : 'Лидерборд пока пуст.'}
          </div>
        </article>

        <article className="practice-arena-card">
          <div className="practice-arena-card__head">
            <Users size={16} />
            <strong>Открытые матчи</strong>
          </div>
          <div className="practice-arena-card__body">
            {isLoading ? 'Загрузка матчей...' : matches.length > 0 ? 'Открытых матчей сейчас нет.' : 'Открытых матчей сейчас нет.'}
          </div>
        </article>

        <article className="practice-arena-card practice-arena-card--notes">
          <div className="practice-arena-card__head">
            <Shield size={16} />
            <strong>Форматы</strong>
          </div>
          <div className="practice-arena-card__notes">
            <div>Закрытые scrims для своей команды.</div>
            <div>Локальные ладдеры внутри circles.</div>
          </div>
        </article>
      </section>
    </div>
  );
};
