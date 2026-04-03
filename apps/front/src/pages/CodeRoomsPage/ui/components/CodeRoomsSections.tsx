import {
  ArenaLeaderboardEntry,
  ArenaPlayerStats,
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

type LaunchMode = CodeRoomMode | 'queue';

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
        {!isMobile && <span className="code-rooms-kicker">Practice Workspace</span>}
        <h1>{isMobile ? 'Practice' : motivationalQuote}</h1>
        <p className="code-rooms-subtitle">
          Live coding, ranked arena и interview prep теперь читаются как единый practice-контур.
        </p>
      </div>
      <div className="code-rooms-hero__actions">
        {isAdmin && (
          <button className="btn btn-secondary" onClick={onOpenAdmin} title="Админка">
            <ShieldCheck size={18} />
            {!isMobile && 'Tasks'}
          </button>
        )}
        <button className="btn btn-secondary" onClick={onShowLeagues} title="Лиги">
          <Trophy size={18} />
          {!isMobile && 'Лиги'}
        </button>
        <button className="btn btn-primary code-rooms-create-btn" onClick={onShowCreate}>
          <Plus size={18} />
          <span>{isMobile ? 'Создать' : 'Новая practice room'}</span>
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
