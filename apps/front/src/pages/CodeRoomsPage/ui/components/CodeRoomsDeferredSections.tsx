import { useNavigate } from 'react-router-dom';
import { ArenaMatch, ArenaQueueState, CodeRoomMode } from '@/entities/CodeRoom/model/types';
import { getStoredGuestId } from '@/features/CodeRoom/lib/guestIdentity';
import { Eye, Swords, TimerReset } from 'lucide-react';

type LaunchMode = CodeRoomMode | 'queue';

type RuleSection = {
  title: string;
  items: string[];
};

type League = {
  name: string;
  minRating: number;
};

type SelectOption = {
  value: string;
  label: string;
};

export function ArenaSecondaryGrid({
  userId,
  openMatchesLoading,
  openMatches,
  sortedOpenMatches,
  ruleSections,
  onOpenMatch,
}: {
  userId?: string;
  openMatchesLoading: boolean;
  openMatches: ArenaMatch[];
  sortedOpenMatches: ArenaMatch[];
  ruleSections: RuleSection[];
  onOpenMatch: (href: string) => void;
}) {
  return (
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
              const isMyMatch = arenaMatch.players.some((item) => item.userId === (userId || getStoredGuestId()));
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
                      onClick={() => onOpenMatch(isMyMatch ? `/arena/${arenaMatch.id}` : `/arena/${arenaMatch.id}?spectator=1`)}
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
        <div className="arena-rules-overview arena-rules-overview--compact">
          {ruleSections.map((section) => (
            <div key={section.title} className="arena-rules-overview__card">
              <div className="arena-rules-overview__card-head">
                <div className="arena-rules-overview__title">{section.title}</div>
              </div>
              <ul className="arena-rules-overview__list">
                {section.items.map((rule) => (
                  <li key={rule} className="arena-rules-overview__item">
                    <span className="arena-rules-overview__dot" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function CreateRoomModal({
  open,
  isGuest,
  creating,
  newRoomMode,
  queueState,
  duelTopics,
  difficultyOptions,
  newRoomTopic,
  newRoomDifficulty,
  onClose,
  onCancelQueue,
  onCreate,
  onModeChange,
  onTopicChange,
  onDifficultyChange,
}: {
  open: boolean;
  isGuest: boolean;
  creating: boolean;
  newRoomMode: LaunchMode;
  queueState: ArenaQueueState | null;
  duelTopics: SelectOption[];
  difficultyOptions: SelectOption[];
  newRoomTopic: string;
  newRoomDifficulty: string;
  onClose: () => void;
  onCancelQueue: () => void;
  onCreate: () => void;
  onModeChange: (mode: LaunchMode) => void;
  onTopicChange: (value: string) => void;
  onDifficultyChange: (value: string) => void;
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide code-rooms-create-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Новая practice room</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">✕</button>
        </div>
        <p className="dashboard-card__subtitle" style={{ marginBottom: '20px' }}>
          Выберите режим. Для пригласительной дуэли можно отправить ссылку, для онлайн-дуэли включится поиск соперника.
        </p>

        <div className="form-group">
          <label>Режим</label>
          <div className="mode-selector">
            <button type="button" className={`mode-btn ${newRoomMode === 'all' ? 'active' : ''}`} onClick={() => onModeChange('all')}>
              <span className="mode-icon">👥</span>
              <span className="mode-btn-title">Комната</span>
              <span className="mode-desc">Совместное редактирование одного файла</span>
            </button>
            <button type="button" className={`mode-btn ${newRoomMode === 'duel' ? 'active' : ''}`} onClick={() => onModeChange('duel')}>
              <span className="mode-icon">⚔️</span>
              <span className="mode-btn-title">Дуэль</span>
              <span className="mode-desc">{isGuest ? 'Доступно и гостям' : 'Judge по тестам и фиксируем первого победителя'}</span>
            </button>
            <button type="button" className={`mode-btn ${newRoomMode === 'queue' ? 'active' : ''}`} onClick={() => onModeChange('queue')}>
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
                {duelTopics.map((opt) => (
                  <button
                    key={opt.value || '__empty'}
                    type="button"
                    className={`pill-selector__pill ${newRoomTopic === opt.value ? 'active' : ''}`}
                    onClick={() => onTopicChange(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Сложность</label>
              <div className="pill-selector">
                {difficultyOptions.map((opt) => (
                  <button
                    key={opt.value || '__empty'}
                    type="button"
                    className={`pill-selector__pill pill-${opt.value} ${newRoomDifficulty === opt.value ? 'active' : ''}`}
                    onClick={() => onDifficultyChange(opt.value)}
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
              <button className="btn btn-secondary" onClick={onCancelQueue}>Отменить поиск</button>
            </div>
          </>
        ) : (
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
            <button className="btn btn-primary" onClick={onCreate} disabled={creating}>
              {creating ? 'Создание...' : (newRoomMode === 'queue' ? 'Играть' : 'Создать комнату')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function LeaguesModal({
  open,
  leagues,
  onClose,
}: {
  open: boolean;
  leagues: League[];
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide code-room-leagues-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Лиги и ELO</h2>
        <p className="dashboard-card__subtitle">
          Рейтинг нужен для подбора силы соперника и перехода между лигами. Новый игрок стартует с <strong>300 ELO</strong>.
        </p>
        <div className="arena-rules-overview arena-rules-overview--leagues">
          <div className="arena-rules-overview__card">
            <div className="arena-rules-overview__card-head">
              <div className="arena-rules-overview__title">Как меняется рейтинг</div>
            </div>
            <ul className="arena-rules-overview__list">
              <li className="arena-rules-overview__item"><span className="arena-rules-overview__dot" /><span>Победа дает рейтинг, поражение его снимает.</span></li>
              <li className="arena-rules-overview__item"><span className="arena-rules-overview__dot" /><span>Если соперник был сильнее тебя, за победу получишь больше.</span></li>
              <li className="arena-rules-overview__item"><span className="arena-rules-overview__dot" /><span>Чем выше сложность, тем сильнее изменение: <code>easy 1x</code>, <code>medium 1.5x</code>, <code>hard 2x</code>.</span></li>
              <li className="arena-rules-overview__item"><span className="arena-rules-overview__dot" /><span>Рейтинг не падает ниже <code>100 ELO</code>.</span></li>
            </ul>
          </div>

          <div className="arena-rules-overview__card">
            <div className="arena-rules-overview__card-head">
              <div className="arena-rules-overview__title">Ориентир по изменению за матч</div>
            </div>
            <ul className="arena-rules-overview__list">
              <li className="arena-rules-overview__item"><span className="arena-rules-overview__dot" /><span>Против равного соперника: примерно <code>+20 / -20</code> на <code>easy</code>.</span></li>
              <li className="arena-rules-overview__item"><span className="arena-rules-overview__dot" /><span>На <code>medium</code>: около <code>+30 / -30</code>.</span></li>
              <li className="arena-rules-overview__item"><span className="arena-rules-overview__dot" /><span>На <code>hard</code>: около <code>+40 / -40</code>.</span></li>
              <li className="arena-rules-overview__item"><span className="arena-rules-overview__dot" /><span>Если рейтинг игроков сильно отличается, итоговый сдвиг будет несимметричным.</span></li>
            </ul>
          </div>

          <div className="arena-rules-overview__card">
            <div className="arena-rules-overview__card-head">
              <div className="arena-rules-overview__title">Лестница лиг</div>
            </div>
            <ul className="arena-rules-overview__list">
              {leagues.map((league) => (
                <li key={league.name} className="arena-rules-overview__item arena-rules-overview__item--league">
                  <span className="arena-rules-overview__dot" />
                  <span className="arena-rules-overview__league-name">{league.name}</span>
                  <span className="arena-rules-overview__league-rating">от {league.minRating} ELO</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}

export function GuestLoginBanner() {
  const navigate = useNavigate();

  return (
    <div className="guest-cta-banner" style={{ marginBottom: '20px' }}>
      <div className="guest-cta-banner__copy">
        <span className="guest-cta-banner__kicker">Регистрация</span>
        <strong>Зарегистрируйся, чтобы сохранить рейтинг и историю матчей</strong>
        <span>Гости могут играть, но прогресс не сохраняется.</span>
      </div>
      <button className="btn btn-primary" onClick={() => navigate('/login')}>Войти / Регистрация</button>
    </div>
  );
}
