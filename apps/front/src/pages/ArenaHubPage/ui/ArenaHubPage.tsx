import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Timer } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';

import { ArenaLeaderboardEntry, ArenaMatch } from '@/entities/CodeRoom/model/types';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';

// Module-level cache (TTL: 2 min)
type ArenaCache = {
  leaderboard: ArenaLeaderboardEntry[];
  matches: ArenaMatch[];
  expiresAt: number;
};
let arenaCache: ArenaCache | null = null;
const ARENA_CACHE_TTL = 2 * 60 * 1000;

export const ArenaHubPage: React.FC = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<ArenaLeaderboardEntry[]>([]);
  const [matches, setMatches] = useState<ArenaMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (arenaCache && Date.now() < arenaCache.expiresAt) {
        if (!cancelled) {
          setLeaderboard(arenaCache.leaderboard);
          setMatches(arenaCache.matches);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        const [nextLeaderboard, nextMatches] = await Promise.all([
          codeRoomApi.getArenaLeaderboard(5),
          codeRoomApi.getOpenArenaMatches(5),
        ]);
        if (!cancelled) {
          arenaCache = {
            leaderboard: nextLeaderboard,
            matches: nextMatches,
            expiresAt: Date.now() + ARENA_CACHE_TTL,
          };
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

  const topLeague = leaderboard[0]?.league || 'Silver';
  const topRating = leaderboard[0]?.rating || 1284;
  const winRate = leaderboard[0] ? Math.round(leaderboard[0].winRate * 100) : 69;

  const visibleMatches = matches.slice(0, 3);
  const visibleLeaders = leaderboard.slice(0, 4);
  const selfLabel = user?.username || 'joe_doe';

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

      <section className="practice-arena-layout">
        <div className="practice-arena-main">
          <article className="practice-arena-queue">
            <div className="practice-arena-queue__copy">
              <strong>Очередь Arena</strong>
              <p>Найди соперника своего уровня — обычно меньше минуты</p>
              <div className="practice-arena-queue__pills">
                <span className="practice-arena-queue__pill">
                  <span className="practice-arena-queue__dot" />
                  {Math.max(visibleLeaders.length * 8, 3)} онлайн
                </span>
                <span className="practice-arena-queue__pill">
                  <Timer size={11} />
                  avg wait 42s
                </span>
              </div>
            </div>

            <Link to="/practice/code-rooms" className="practice-arena-queue__button">
              Войти в очередь
              <ArrowRight size={12} />
            </Link>
          </article>

          <article className="practice-arena-matches">
            <div className="practice-arena-matches__head">
              <strong>Идут прямо сейчас</strong>
              <span className="practice-arena-live-pill">
                <span className="practice-arena-live-pill__dot" />
                Live
              </span>
            </div>

            {isLoading ? (
              <div className="practice-arena-empty">Загрузка матчей...</div>
            ) : visibleMatches.length > 0 ? visibleMatches.map((match) => (
              <div key={match.id} className="practice-arena-match-row">
                <span className={`practice-arena-diff practice-arena-diff--${match.difficulty || 'easy'}`}>
                  {match.difficulty || 'easy'}
                </span>
                <div className="practice-arena-match-row__copy">
                  <strong>{match.taskTitle}</strong>
                  <span>{match.players.map((player) => player.displayName).slice(0, 2).join(' vs ') || 'Arena players'}</span>
                </div>
                <div className="practice-arena-match-row__meta">
                  <span className="practice-arena-board-row__copy"><span>{match.durationSeconds ? `${Math.floor(match.durationSeconds / 60)} мин` : '∞'}</span></span>
                  <button type="button" className="practice-arena-watch">Смотреть</button>
                </div>
              </div>
            )) : (
              <div className="practice-arena-empty">Открытых матчей сейчас нет.</div>
            )}
          </article>
        </div>

        <div className="practice-arena-side">
          <article className="practice-arena-league">
            <div className="practice-arena-league__top">
              <strong>Моя лига</strong>
              <span className="practice-arena-league__badge">
                <Shield size={12} />
                {topLeague}
              </span>
            </div>
            <div className="practice-arena-league__score">
              <span className="practice-arena-league__emoji" aria-hidden="true">⚔️</span>
              <strong>{topRating.toLocaleString('ru-RU')}</strong>
              <span>ELO рейтинг</span>
            </div>
            <div className="practice-arena-league__stats">
              <div>
                <strong className="is-green">{leaderboard[0]?.wins ?? 24}</strong>
                <span>Победы</span>
              </div>
              <div>
                <strong className="is-red">{leaderboard[0]?.losses ?? 11}</strong>
                <span>Поражения</span>
              </div>
              <div>
                <strong className="is-amber">{winRate}%</strong>
                <span>Winrate</span>
              </div>
            </div>
          </article>

          <article className="practice-arena-board">
            <div className="practice-arena-board__head">
              <strong>Топ игроки</strong>
              <Link to="/practice/arena" className="practice-activity-card__head-link">Весь рейтинг →</Link>
            </div>

            {isLoading ? (
              <div className="practice-arena-empty">Загрузка рейтинга...</div>
            ) : visibleLeaders.length > 0 ? (
              <>
                {visibleLeaders.map((entry, index) => (
                  <div key={entry.userId} className="practice-arena-board-row">
                    <span className="practice-arena-board-row__rank">{index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}</span>
                    <div className="practice-arena-board-row__meta">
                      <span className={`practice-arena-board-row__avatar ${
                        index === 0 ? 'practice-arena-board-row__avatar--gold' :
                        index === 1 ? 'practice-arena-board-row__avatar--violet' :
                        index === 2 ? 'practice-arena-board-row__avatar--cyan' :
                        'practice-arena-board-row__avatar--green'
                      }`}>
                        {entry.displayName.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="practice-arena-board-row__copy">
                        <strong>{entry.displayName}</strong>
                        <span>{entry.league}</span>
                      </div>
                    </div>
                    <span className="practice-arena-board-row__elo">{entry.rating.toLocaleString('ru-RU')}</span>
                  </div>
                ))}
                <div className="practice-arena-board-row practice-arena-board-row--self">
                  <span className="practice-arena-board-row__rank">38</span>
                  <div className="practice-arena-board-row__meta">
                    <span className="practice-arena-board-row__avatar practice-arena-board-row__avatar--self">ВЫ</span>
                    <div className="practice-arena-board-row__copy">
                      <strong>{selfLabel}</strong>
                      <span>{topLeague}</span>
                    </div>
                  </div>
                  <span className="practice-arena-board-row__elo">{topRating.toLocaleString('ru-RU')}</span>
                </div>
              </>
            ) : (
              <div className="practice-arena-empty">Лидерборд пока пуст.</div>
            )}
          </article>
        </div>
      </section>
    </div>
  );
};
