import { ArrowRight, BrainCircuit, Clock3, Filter, ShieldCheck, Shuffle, Sparkles, TerminalSquare } from 'lucide-react';
import { InterviewPrepTask } from '@/features/InterviewPrep/api/interviewPrepApi';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  PREP_TYPE_LABELS,
  TaskCategory,
  TaskModeFilter,
  categoryAccentClass,
  categoryForTask,
} from '../lib/interviewPrepPageHelpers';

export function InterviewPrepHero({
  isMobile,
  startingMock,
  summary,
  onStartMockInterview,
  onStartRandomTask,
  onResetFilters,
}: {
  isMobile: boolean;
  startingMock: boolean;
  summary: { total: number; executable: number; guidedCount: number };
  onStartMockInterview: () => void;
  onStartRandomTask: () => void;
  onResetFilters: () => void;
}) {
  return (
    <section className="page-header code-rooms-hero interview-prep-hero">
      <div className="code-rooms-hero__copy">
        {!isMobile && <span className="code-rooms-kicker">Trusted Only</span>}
        <h1 style={{ fontSize: isMobile ? '28px' : '36px' }}>Interview Prep</h1>
        <p className="code-rooms-subtitle">
          {isMobile
            ? 'Сценарии для подготовки к техническим интервью.'
            : 'Выбирай категорию, бери случайную executable-задачу или фильтруй каталог вручную. Coding можно решать на Go или Python, system design поддерживает AI review.'}
        </p>
        <div className="interview-prep-hero__actions" style={{ flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
          <button className="btn btn-secondary" disabled={startingMock} onClick={onStartMockInterview} style={{ height: isMobile ? '48px' : 'auto', width: isMobile ? '100%' : 'auto' }}>
            <BrainCircuit size={16} />
            <span>Запустить mock interview</span>
          </button>
          <button className="btn btn-primary" onClick={onStartRandomTask} style={{ height: isMobile ? '48px' : 'auto', width: isMobile ? '100%' : 'auto' }}>
            <Shuffle size={16} />
            <span>Случайная задача</span>
          </button>
          {!isMobile && (
            <button className="btn btn-secondary" onClick={onResetFilters}>
              <Filter size={16} />
              <span>Сбросить фильтры</span>
            </button>
          )}
        </div>
      </div>

      {!isMobile && (
        <div className="interview-prep-summary interview-prep-summary--rich">
          <div className="interview-prep-summary__item">
            <Sparkles size={16} />
            <span>{summary.total} сценариев</span>
          </div>
          <div className="interview-prep-summary__item">
            <TerminalSquare size={16} />
            <span>{summary.executable} с автопроверкой</span>
          </div>
          <div className="interview-prep-summary__item">
            <ShieldCheck size={16} />
            <span>{summary.guidedCount} guided flow</span>
          </div>
        </div>
      )}
    </section>
  );
}

export function InterviewPrepCategoryStats({
  isMobile,
  category,
  categoryStats,
  onCategoryChange,
}: {
  isMobile: boolean;
  category: TaskCategory;
  categoryStats: Array<{ key: TaskCategory; label: string; count: number }>;
  onCategoryChange: (value: TaskCategory) => void;
}) {
  return (
    <section className="interview-prep-category-strip" style={{ gap: isMobile ? '8px' : '12px' }}>
      {categoryStats.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`card dashboard-card interview-prep-category-card ${category === item.key ? 'is-active' : ''} ${categoryAccentClass(item.key)}`}
          onClick={() => onCategoryChange(item.key)}
          style={{ padding: isMobile ? '12px' : '16px' }}
        >
          <span className="interview-prep-category-card__label" style={{ fontSize: isMobile ? '13px' : '14px' }}>{item.label}</span>
          <strong style={{ fontSize: isMobile ? '18px' : '20px' }}>{item.count}</strong>
        </button>
      ))}
    </section>
  );
}

export function InterviewPrepFilters({
  isMobile,
  category,
  modeFilter,
  company,
  companyOptions,
  search,
  onCategoryChange,
  onModeFilterChange,
  onCompanyChange,
  onSearchChange,
}: {
  isMobile: boolean;
  category: TaskCategory;
  modeFilter: TaskModeFilter;
  company: string;
  companyOptions: string[];
  search: string;
  onCategoryChange: (value: TaskCategory) => void;
  onModeFilterChange: (value: TaskModeFilter) => void;
  onCompanyChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}) {
  return (
    <section className="card dashboard-card interview-prep-filter-card">
      <div className="dashboard-card__header">
        <div>
          <h2 style={{ fontSize: isMobile ? '20px' : '24px' }}>Задачи</h2>
          {!isMobile && <p className="interview-prep-muted">Фильтруй по категории, типу потока и тексту задачи.</p>}
        </div>
      </div>

      <div className="interview-prep-filters">
        <div className="form-group">
          <label>Категория</label>
          <div className="pill-selector">
            <button type="button" className={`pill-selector__pill ${category === 'all' ? 'active' : ''}`} onClick={() => onCategoryChange('all')}>
              Все
            </button>
            {CATEGORY_ORDER.map((item) => (
              <button
                key={item}
                type="button"
                className={`pill-selector__pill ${category === item ? 'active' : ''}`}
                onClick={() => onCategoryChange(item)}
              >
                {CATEGORY_LABELS[item]}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Формат</label>
          <div className="pill-selector">
            <button type="button" className={`pill-selector__pill ${modeFilter === 'all' ? 'active' : ''}`} onClick={() => onModeFilterChange('all')}>Все</button>
            <button type="button" className={`pill-selector__pill ${modeFilter === 'executable' ? 'active' : ''}`} onClick={() => onModeFilterChange('executable')}>Live coding</button>
            <button type="button" className={`pill-selector__pill ${modeFilter === 'guided' ? 'active' : ''}`} onClick={() => onModeFilterChange('guided')}>Guided</button>
          </div>
          {category === 'system_design' && (
            <div className="interview-prep-muted" style={{ marginTop: '8px' }}>
              Для System Design доступны guided-сценарии с AI review, поэтому live-coding фильтр здесь не применяется.
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Компания / группа</label>
          <div className="pill-selector">
            {companyOptions.map((item) => (
              <button
                key={item}
                type="button"
                className={`pill-selector__pill ${company === item ? 'active' : ''}`}
                onClick={() => onCompanyChange(item || '')}
              >
                {item === 'all' ? 'Все' : item}
              </button>
            ))}
          </div>
          <div className="interview-prep-muted" style={{ marginTop: '8px' }}>
            Если компанию не выбирать, mock interview стартует на случайной доступной компании.
          </div>
        </div>

        <div className="form-group">
          <label>Поиск</label>
          <input
            className="input"
            placeholder="worker pool, sql, url shortener..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>
    </section>
  );
}

export function InterviewPrepTaskGroups({
  isMobile,
  groupedTasks,
  visibleCounts,
  startingTaskId,
  onStartTask,
  onRandomStart,
  onShowMore,
}: {
  isMobile: boolean;
  groupedTasks: Array<{ key: TaskCategory; label: string; tasks: InterviewPrepTask[] }>;
  visibleCounts: Record<TaskCategory, number>;
  startingTaskId: string | null;
  onStartTask: (taskId: string) => void;
  onRandomStart: (tasks: InterviewPrepTask[]) => void;
  onShowMore: (category: TaskCategory) => void;
}) {
  return (
    <div className="interview-prep-groups">
      {groupedTasks.map((group) => {
        const visibleCount = visibleCounts[group.key] ?? 3;
        const visibleTasks = group.tasks.slice(0, visibleCount);
        const hasMore = group.tasks.length > visibleTasks.length;

        return (
          <section key={group.key} className="interview-prep-group">
            <div className="interview-prep-group__head">
              <div>
                <h2>{group.label}</h2>
                <p className="interview-prep-muted">{group.tasks.length} задач в текущем фильтре</p>
              </div>
              <button className="btn btn-secondary interview-prep-group__action" onClick={() => onRandomStart(group.tasks)}>
                <Shuffle size={16} />
                <span>Рандом по категории</span>
              </button>
            </div>

            <section className="interview-prep-grid">
              {visibleTasks.map((task) => {
                const taskCategory = categoryForTask(task);
                return (
                  <article key={task.id} className={`card dashboard-card interview-prep-card interview-prep-card--category ${categoryAccentClass(taskCategory)}`}>
                    <div className="interview-prep-card__head">
                      <div className="task-item__meta" style={{ flexWrap: 'wrap', gap: '4px' }}>
                        <span className="badge">{isMobile ? group.label.charAt(0) : CATEGORY_LABELS[taskCategory]}</span>
                        <span className="badge">{isMobile ? '' : (PREP_TYPE_LABELS[task.prepType] ?? task.prepType)}</span>
                        {task.companyTag && <span className="badge">{task.companyTag}</span>}
                        {!isMobile && <span className="badge">{task.language}</span>}
                        <span className="badge">
                          <Clock3 size={12} />
                          {Math.round(task.durationSeconds / 60)}м
                        </span>
                      </div>
                      {!task.isActive && <span className="badge task-inactive">Неактивна</span>}
                    </div>

                    <h3 className="interview-prep-card__title" style={{ fontSize: isMobile ? '16px' : '18px' }}>{task.title}</h3>
                    <p className={`interview-prep-card__statement ${isMobile ? 'text-prune-2' : ''}`}>{task.statement}</p>

                    <div className="interview-prep-card__footer">
                      <div className="interview-prep-card__hint">
                        {task.prepType === 'system_design'
                          ? 'AI review схемы + follow-up вопросы'
                          : task.isExecutable
                            ? 'Live coding с автопроверкой'
                            : 'Guided flow: решение + последовательные вопросы'}
                      </div>
                      <button className="btn btn-primary" onClick={() => onStartTask(task.id)} disabled={startingTaskId === task.id}>
                        <span>{startingTaskId === task.id ? 'Запуск...' : 'Начать'}</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
            {hasMore && (
              <div className="interview-prep-group__more">
                <button type="button" className="btn btn-secondary" onClick={() => onShowMore(group.key)}>
                  Показать ещё 3
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
