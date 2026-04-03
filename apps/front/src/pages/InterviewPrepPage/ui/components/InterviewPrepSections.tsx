import { ArrowRight, BrainCircuit, Clock3, Filter, ShieldCheck, Shuffle, Sparkles, TerminalSquare } from 'lucide-react';
import { InterviewPrepTask } from '@/features/InterviewPrep/api/interviewPrepApi';
import {
  CATEGORY_LABELS,
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
  onStartRandomCheckpoint,
  onResetFilters,
}: {
  isMobile: boolean;
  startingMock: boolean;
  summary: { total: number; executable: number; guidedCount: number };
  onStartMockInterview: () => void;
  onStartRandomTask: () => void;
  onStartRandomCheckpoint: () => void;
  onResetFilters: () => void;
}) {
  return (
    <section className="page-header code-rooms-hero interview-prep-hero">
      <div className="code-rooms-hero__copy">
        {!isMobile && <span className="code-rooms-kicker">Interview Prep</span>}
        <h1 style={{ fontSize: isMobile ? '28px' : '36px' }}>Подготовка к интервью</h1>
        <p className="code-rooms-subtitle">
          {isMobile
            ? 'Сценарии для подготовки к техническим интервью.'
            : 'Запускай mock interview, выбирай задачу вручную или стартуй со случайного сценария.'}
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
          <button className="btn btn-secondary" onClick={onStartRandomCheckpoint} style={{ height: isMobile ? '48px' : 'auto', width: isMobile ? '100%' : 'auto' }}>
            <ShieldCheck size={16} />
            <span>Checkpoint</span>
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
            <span>{summary.guidedCount} с разбором</span>
          </div>
        </div>
      )}
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
  categoryStats,
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
  categoryStats: Array<{ key: TaskCategory; label: string; count: number }>;
  onCategoryChange: (value: TaskCategory) => void;
  onModeFilterChange: (value: TaskModeFilter) => void;
  onCompanyChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}) {
  return (
    <section className="card dashboard-card interview-prep-filter-card">
      <div className="dashboard-card__header">
        <div>
          <h2 style={{ fontSize: isMobile ? '20px' : '24px' }}>Каталог задач</h2>
          {!isMobile && <p className="interview-prep-muted">Фильтры по категории, формату, компании и поиску.</p>}
        </div>
      </div>

      <div className="interview-prep-filters">
        <div className="form-group">
          <label>Категория</label>
          <select className="input" value={category} onChange={(event) => onCategoryChange(event.target.value as TaskCategory)}>
            <option value="all">Все категории</option>
            {categoryStats.map((item) => (
              <option key={item.key} value={item.key}>{item.label} ({item.count})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Формат</label>
          <select className="input" value={modeFilter} onChange={(event) => onModeFilterChange(event.target.value as TaskModeFilter)}>
            <option value="all">Все форматы</option>
            <option value="executable">Live coding</option>
            <option value="guided">С разбором</option>
          </select>
          {category === 'system_design' && (
            <div className="interview-prep-muted" style={{ marginTop: '8px' }}>
              Для system design доступны сценарии с разбором.
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Компания / группа</label>
          <select className="input" value={company} onChange={(event) => onCompanyChange(event.target.value)}>
            {companyOptions.map((item) => (
              <option key={item} value={item}>{item === 'all' ? 'Все компании' : item}</option>
            ))}
          </select>
          <div className="interview-prep-muted" style={{ marginTop: '8px' }}>
            Если компанию не выбирать, mock interview стартует случайно.
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
  startingCheckpointTaskId,
  onStartTask,
  onStartCheckpoint,
  onRandomStart,
  onShowMore,
}: {
  isMobile: boolean;
  groupedTasks: Array<{ key: TaskCategory; label: string; tasks: InterviewPrepTask[] }>;
  visibleCounts: Record<TaskCategory, number>;
  startingTaskId: string | null;
  startingCheckpointTaskId: string | null;
  onStartTask: (taskId: string) => void;
  onStartCheckpoint: (taskId: string) => void;
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
                <span>Случайная задача</span>
              </button>
            </div>

            <section className="interview-prep-grid">
              {visibleTasks.map((task) => {
                const taskCategory = categoryForTask(task);
                const supportsCheckpoint = task.isActive && task.isExecutable && task.prepType !== 'system_design' && task.prepType !== 'code_review';
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
                          ? 'Схема и follow-up вопросы'
                          : task.isExecutable
                            ? 'Live coding с автопроверкой'
                            : 'Решение и последовательные вопросы'}
                      </div>
                      <div className="interview-prep-card__actions">
                        {supportsCheckpoint && (
                          <button className="btn btn-secondary" onClick={() => onStartCheckpoint(task.id)} disabled={startingCheckpointTaskId === task.id}>
                            <span>{startingCheckpointTaskId === task.id ? 'Старт...' : 'Checkpoint'}</span>
                          </button>
                        )}
                        <button className="btn btn-primary" onClick={() => onStartTask(task.id)} disabled={startingTaskId === task.id}>
                          <span>{startingTaskId === task.id ? 'Запуск...' : 'Начать'}</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
            {hasMore && (
              <div className="interview-prep-group__more">
                <button type="button" className="btn btn-secondary" onClick={() => onShowMore(group.key)}>
                  Показать ещё 2
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
