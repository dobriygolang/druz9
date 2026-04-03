import { useNavigate } from 'react-router-dom';
import {
  ArenaLeaderboardEntry,
  ArenaMatch,
  ArenaPlayerStats,
  ArenaQueueState,
  CodeRoomMode,
} from '@/entities/CodeRoom/model/types';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Eye,
  FileCode,
  Plus,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Swords,
  TimerReset,
  Trophy,
  Users,
} from 'lucide-react';
import { FancySelect } from '@/shared/ui/FancySelect';
import { getStoredGuestId } from '@/features/CodeRoom/lib/guestIdentity';

type LaunchMode = CodeRoomMode | 'queue';

type RuleSection = {
  title: string;
  items: string[];
};

type League = {
  name: string;
  minRating: number;
};

type InterviewPrepCategoryOption = {
  value: string;
  label: string;
};

type SelectOption = {
  value: string;
  label: string;
};

export function CodeRoomsHeroSection({
  isMobile,
  isAdmin,
  motivationalQuote,
  onOpenAdmin,
  onShowLeagues,
  onShowCreate,
}: {
  isMobile: boolean;
  isAdmin: boolean;
  motivationalQuote: string;
  onOpenAdmin: () => void;
  onShowLeagues: () => void;
  onShowCreate: () => void;
}) {
  return (
    <div className="page-header code-rooms-hero">
      <div className="code-rooms-hero__copy">
        {!isMobile && <span className="code-rooms-kicker">Duel Arena</span>}
        <h1>{isMobile ? 'Арена' : motivationalQuote}</h1>
      </div>
      <div className="code-rooms-hero__actions">
        {isAdmin && (
          <button className="btn btn-secondary" onClick={onOpenAdmin} title="Админка">
            <ShieldCheck size={18} />
            {!isMobile && 'Админка'}
          </button>
        )}
        <button className="btn btn-secondary" onClick={onShowLeagues} title="Лиги">
          <Trophy size={18} />
          {!isMobile && 'Лиги'}
        </button>
        <button className="btn btn-primary code-rooms-create-btn" onClick={onShowCreate}>
          <Plus size={18} />
          <span>{isMobile ? 'Создать' : 'Новая комната'}</span>
        </button>
      </div>
    </div>
  );
}

export function SoloPracticeSection({
  prepLaunchCategory,
  prepLaunchCompany,
  categoryOptions,
  companyOptions,
  onCategoryChange,
  onCompanyChange,
  onStartScenario,
  onOpenRandomTask,
  onOpenCatalog,
}: {
  prepLaunchCategory: string;
  prepLaunchCompany: string;
  categoryOptions: InterviewPrepCategoryOption[];
  companyOptions: SelectOption[];
  onCategoryChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
  onStartScenario: () => void;
  onOpenRandomTask: () => void;
  onOpenCatalog: () => void;
}) {
  return (
    <section className="card dashboard-card solo-practice-section">
      <div className="solo-practice-section__head">
        <div className="solo-practice-section__title-wrap">
          <BookOpen size={18} />
          <h3 className="solo-practice-section__title">Solo practice</h3>
        </div>
        <div className="solo-practice-section__filters">
          <div className="solo-practice-filter-group">
            <span className="solo-practice-filter-label">Категория</span>
            <div className="pill-selector">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`pill-selector__pill ${prepLaunchCategory === option.value ? 'active' : ''}`}
                  onClick={() => onCategoryChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="solo-practice-grid">
        <div className="solo-practice-hero">
          <div className="solo-practice-hero__content">
            <div className="solo-practice-hero__icon">
              <BrainCircuit size={32} />
            </div>
            <div className="solo-practice-hero__copy">
              <h4>Mock Interview</h4>
              <p>
                Полноценная симуляция интервью: coding, follow-up и system design.
                {prepLaunchCompany === 'all'
                  ? ' Если компанию не выбирать, сценарий стартует на случайной доступной компании.'
                  : ` Сценарий будет собран под компанию ${prepLaunchCompany}.`}
              </p>
            </div>
          </div>
          <div className="solo-practice-hero__cta">
            <button type="button" className="btn btn-primary solo-practice-hero__btn" onClick={onStartScenario}>
              <Sparkles size={16} />
              <span>Начать сценарий</span>
            </button>
          </div>
        </div>

        <div className="solo-practice-sidebar">
          <div className="solo-practice-filter-group solo-practice-filter-group--sidebar">
            <span className="solo-practice-filter-label">Компания</span>
            <FancySelect value={prepLaunchCompany} options={companyOptions} onChange={onCompanyChange} />
          </div>

          <button type="button" className="solo-practice-action-card" onClick={onOpenRandomTask}>
            <div className="solo-practice-action-card__icon"><Shuffle size={18} /></div>
            <div className="solo-practice-action-card__copy">
              <strong>Случайная задача</strong>
              <span>Быстрый старт с рандомным таском</span>
            </div>
            <ArrowRight size={16} />
          </button>

          <button type="button" className="solo-practice-action-card" onClick={onOpenCatalog}>
            <div className="solo-practice-action-card__icon"><Eye size={18} /></div>
            <div className="solo-practice-action-card__copy">
              <strong>Открыть каталог</strong>
              <span>Выбрать задачу вручную</span>
            </div>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

export function ArenaPrimaryGrid({
  isMobile,
  isGuest,
  myArenaStats,
  activeTaskCount,
  leaderboardLoading,
  leaderboard,
  leaderboardAvatars,
  pluralizeRu,
  onOpenRoom,
}: {
  isMobile: boolean;
  isGuest: boolean;
  myArenaStats: ArenaPlayerStats | null;
  activeTaskCount: number;
  leaderboardLoading: boolean;
  leaderboard: ArenaLeaderboardEntry[];
  leaderboardAvatars: Record<string, string>;
  pluralizeRu: (count: number, one: string, few: string, many: string) => string;
  onOpenRoom: (mode: LaunchMode) => void;
}) {
  return (
    <div className="code-rooms-dashboard-grid code-rooms-dashboard-grid--primary">
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
          {isMobile ? 'Создай комнату для работы или дуэль.' : 'Создай комнату для совместной работы или дуэль, выбери тему и отправь ссылку.'}
        </p>

        <div className="code-rooms-launch-grid">
          <button type="button" className="code-rooms-mode-card" onClick={() => onOpenRoom('all')}>
            <div className="code-rooms-mode-card__icon"><Users size={18} /></div>
            <div>
              <div className="code-rooms-mode-card__title">Комната</div>
              <div className="code-rooms-mode-card__text">Live-coding и общий запуск.</div>
            </div>
            <ArrowRight size={16} />
          </button>

          <button type="button" className="code-rooms-mode-card" onClick={() => onOpenRoom('duel')}>
            <div className="code-rooms-mode-card__icon"><Swords size={18} /></div>
            <div>
              <div className="code-rooms-mode-card__title">Дуэль</div>
              <div className="code-rooms-mode-card__text">
                {isGuest ? 'Рейтинг и матчи доступны после регистрации.' : 'Случайная задача, таймер и судья.'}
              </div>
            </div>
            <ArrowRight size={16} />
          </button>

          <button type="button" className="code-rooms-mode-card" onClick={() => onOpenRoom('queue')}>
            <div className="code-rooms-mode-card__icon"><TimerReset size={18} /></div>
            <div>
              <div className="code-rooms-mode-card__title">Очередь</div>
              <div className="code-rooms-mode-card__text">Быстрый подбор соперника онлайн.</div>
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
              const avatarUrl = leaderboardAvatars[entry.userId] || '';
              return (
                <div key={`${entry.userId}-${index}`} className="leaderboard-item">
                  <div className={`leaderboard-rank ${rankClass}`}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={entry.displayName} className="leaderboard-rank__avatar" />
                    ) : (
                      <span>{entry.displayName.charAt(0).toUpperCase()}</span>
                    )}
                    <span className="leaderboard-rank__place">{index + 1}</span>
                  </div>
                  <div className="leaderboard-main">
                    <div className="leaderboard-name">{entry.displayName}</div>
                    <div className="leaderboard-meta">
                      {isMobile ? (
                        <span>{entry.rating} ELO • {entry.wins} {pluralizeRu(entry.wins, 'победа', 'победы', 'побед')}</span>
                      ) : (
                        <span>{entry.rating} ELO <span>•</span> <span>{entry.league}</span> <span>•</span> <span>{entry.wins} {pluralizeRu(entry.wins, 'победа', 'победы', 'побед')}</span> <span>•</span> <span>{entry.matches} {pluralizeRu(entry.matches, 'матч', 'матча', 'матчей')}</span></span>
                      )}
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
  );
}

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
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide code-rooms-create-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Новая комната</h2>
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
              <span className="mode-btn-title">Для всех</span>
              <span className="mode-desc">Совместное редактирование одного файла</span>
            </button>
            <button type="button" className={`mode-btn ${newRoomMode === 'duel' ? 'active' : ''}`} onClick={() => onModeChange('duel')}>
              <span className="mode-icon">⚔️</span>
              <span className="mode-btn-title">По приглашению</span>
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
  if (!open) {
    return null;
  }

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
