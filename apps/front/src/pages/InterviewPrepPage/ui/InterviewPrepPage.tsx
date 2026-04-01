import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock3, Filter, Shuffle, ShieldCheck, Sparkles, TerminalSquare } from 'lucide-react';

import { interviewPrepApi, InterviewPrepTask, InterviewPrepType } from '@/features/InterviewPrep/api/interviewPrepApi';

type TaskCategory = 'all' | 'coding' | 'sql' | 'system_design';
type TaskModeFilter = 'all' | 'executable' | 'guided';

const PREP_TYPE_LABELS: Record<InterviewPrepType, string> = {
  coding: 'Coding',
  algorithm: 'Algorithm',
  system_design: 'System Design',
  sql: 'SQL',
  code_review: 'Code Review',
};

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  all: 'Все категории',
  coding: 'Coding',
  sql: 'SQL',
  system_design: 'System Design',
};

const CATEGORY_ORDER: TaskCategory[] = ['coding', 'sql', 'system_design'];

function categoryForTask(task: InterviewPrepTask): TaskCategory {
  if (task.prepType === 'system_design') {
    return 'system_design';
  }
  if (task.language === 'sql') {
    return 'sql';
  }
  return 'coding';
}

function categoryAccentClass(category: TaskCategory) {
  switch (category) {
    case 'coding':
      return 'is-coding';
    case 'sql':
      return 'is-sql';
    case 'system_design':
      return 'is-system-design';
    default:
      return '';
  }
}

export function InterviewPrepPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<InterviewPrepTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [modeFilter, setModeFilter] = useState<TaskModeFilter>((searchParams.get('mode') as TaskModeFilter) || 'executable');
  const [category, setCategory] = useState<TaskCategory>((searchParams.get('category') as TaskCategory) || 'all');
  const [company, setCompany] = useState(searchParams.get('company') ?? 'all');
  const randomLaunchTriggered = useRef(false);

  useEffect(() => {
    interviewPrepApi.listTasks()
      .then(setTasks)
      .catch((e) => {
        console.error('Failed to load interview prep tasks:', e);
        setError(e.response?.data?.error || 'Не удалось загрузить задачи');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    category === 'all' ? next.delete('category') : next.set('category', category);
    company === 'all' ? next.delete('company') : next.set('company', company);
    modeFilter === 'all' ? next.delete('mode') : next.set('mode', modeFilter);
    search.trim() ? next.set('q', search.trim()) : next.delete('q');
    if (searchParams.get('pick') === 'random') {
      next.set('pick', 'random');
    }
    setSearchParams(next, { replace: true });
  }, [category, company, modeFilter, search, searchParams, setSearchParams]);

  const summary = useMemo(() => {
    return {
      total: tasks.length,
      executable: tasks.filter((task) => task.isExecutable).length,
      guidedCount: tasks.filter((task) => !task.isExecutable).length,
    };
  }, [tasks]);

  const categoryStats = useMemo(() => {
    return CATEGORY_ORDER.map((item) => ({
      key: item,
      label: CATEGORY_LABELS[item],
      count: tasks.filter((task) => categoryForTask(task) === item).length,
    }));
  }, [tasks]);

  const companyOptions = useMemo(() => {
    const tags = Array.from(new Set(tasks.map((task) => task.companyTag).filter(Boolean))).sort();
    return ['all', ...tags];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.prepType !== 'system_design' && !task.isExecutable) {
        return false;
      }
      const taskCategory = categoryForTask(task);
      if (category !== 'all' && taskCategory !== category) {
        return false;
      }
      if (company !== 'all' && (task.companyTag || 'general') !== company) {
        return false;
      }
      if (modeFilter === 'executable' && !task.isExecutable) {
        return false;
      }
      if (modeFilter === 'guided' && task.isExecutable) {
        return false;
      }
      if (!search.trim()) {
        return true;
      }
      const haystack = `${task.title} ${task.statement} ${task.language} ${task.prepType} ${task.companyTag}`.toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [tasks, category, company, modeFilter, search]);

  const groupedTasks = useMemo(() => {
    const groups = new Map<TaskCategory, InterviewPrepTask[]>();
    for (const task of filteredTasks) {
      const taskCategory = categoryForTask(task);
      const existing = groups.get(taskCategory) ?? [];
      existing.push(task);
      groups.set(taskCategory, existing);
    }
    return CATEGORY_ORDER
      .map((key) => ({ key, label: CATEGORY_LABELS[key], tasks: groups.get(key) ?? [] }))
      .filter((group) => group.tasks.length > 0);
  }, [filteredTasks]);

  const startTask = async (taskId: string) => {
    setError(null);
    setStartingTaskId(taskId);
    try {
      const session = await interviewPrepApi.startSession(taskId);
      navigate(`/interview-prep/${session.id}`);
    } catch (e: any) {
      console.error('Failed to start interview prep session:', e);
      setError(e.response?.data?.error || 'Не удалось начать сессию');
    } finally {
      setStartingTaskId(null);
    }
  };

  const handleRandomStart = async (pool: InterviewPrepTask[]) => {
    const activeTasks = pool.filter((task) => task.isActive);
    if (activeTasks.length === 0) {
      setError('Для выбранного фильтра пока нет активных задач.');
      return;
    }
    const picked = activeTasks[Math.floor(Math.random() * activeTasks.length)];
    await startTask(picked.id);
  };

  useEffect(() => {
    if (loading || randomLaunchTriggered.current || searchParams.get('pick') !== 'random') {
      return;
    }
    randomLaunchTriggered.current = true;
    void handleRandomStart(filteredTasks);
  }, [filteredTasks, loading, searchParams]);

  if (loading) {
    return <div className="empty-state compact">Загрузка interview prep...</div>;
  }

  return (
    <div className="code-rooms-page interview-prep-page">
      <section className="page-header code-rooms-hero interview-prep-hero">
        <div className="code-rooms-hero__copy">
          <span className="code-rooms-kicker">Trusted Only</span>
          <h1>Interview Prep Arena</h1>
          <p className="code-rooms-subtitle">
            Выбирай категорию, бери случайную executable-задачу или фильтруй каталог вручную. Coding можно решать на Go или Python, system design поддерживает AI review.
          </p>
          <div className="interview-prep-hero__actions">
            <button className="btn btn-primary" onClick={() => void handleRandomStart(filteredTasks)}>
              <Shuffle size={16} />
              <span>Случайная задача</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setCategory('all');
                setCompany('all');
                setModeFilter('executable');
                setSearch('');
              }}
            >
              <Filter size={16} />
              <span>Сбросить фильтры</span>
            </button>
          </div>
        </div>

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
      </section>

      <section className="interview-prep-category-strip">
        {categoryStats.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`card dashboard-card interview-prep-category-card ${category === item.key ? 'is-active' : ''} ${categoryAccentClass(item.key)}`}
            onClick={() => setCategory(item.key)}
          >
            <span className="interview-prep-category-card__label">{item.label}</span>
            <strong>{item.count}</strong>
          </button>
        ))}
      </section>

      <section className="card dashboard-card interview-prep-filter-card">
        <div className="dashboard-card__header">
          <div>
            <h2>Каталог задач</h2>
            <p className="interview-prep-muted">Фильтруй по категории, типу потока и тексту задачи.</p>
          </div>
        </div>

        <div className="interview-prep-filters">
          <div className="form-group">
            <label>Категория</label>
            <div className="pill-selector">
              <button type="button" className={`pill-selector__pill ${category === 'all' ? 'active' : ''}`} onClick={() => setCategory('all')}>
                Все
              </button>
              {CATEGORY_ORDER.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`pill-selector__pill ${category === item ? 'active' : ''}`}
                  onClick={() => setCategory(item)}
                >
                  {CATEGORY_LABELS[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Формат</label>
            <div className="pill-selector">
              <button type="button" className={`pill-selector__pill ${modeFilter === 'all' ? 'active' : ''}`} onClick={() => setModeFilter('all')}>
                Все
              </button>
              <button type="button" className={`pill-selector__pill ${modeFilter === 'executable' ? 'active' : ''}`} onClick={() => setModeFilter('executable')}>
                Live coding
              </button>
              <button type="button" className={`pill-selector__pill ${modeFilter === 'guided' ? 'active' : ''}`} onClick={() => setModeFilter('guided')}>
                Guided
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Компания / группа</label>
            <div className="pill-selector">
              {companyOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`pill-selector__pill ${company === item ? 'active' : ''}`}
                  onClick={() => setCompany(item || '')}
                >
                  {item === 'all' ? 'Все' : item}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Поиск</label>
            <input
              className="input"
              placeholder="worker pool, sql, url shortener..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </section>

      {error && (
        <section className="card dashboard-card">
          <div className="error-text">{error}</div>
        </section>
      )}

      {filteredTasks.length === 0 && !error ? (
        <section className="card dashboard-card">
          <div className="empty-state compact">Под текущий фильтр задач пока нет.</div>
        </section>
      ) : (
        <div className="interview-prep-groups">
          {groupedTasks.map((group) => (
            <section key={group.key} className="interview-prep-group">
              <div className="interview-prep-group__head">
                <div>
                  <h2>{group.label}</h2>
                  <p className="interview-prep-muted">{group.tasks.length} задач в текущем фильтре</p>
                </div>
                <button className="btn btn-secondary" onClick={() => void handleRandomStart(group.tasks)}>
                  <Shuffle size={16} />
                  <span>Рандом по категории</span>
                </button>
              </div>

              <section className="interview-prep-grid">
                {group.tasks.map((task) => {
                  const taskCategory = categoryForTask(task);
                  return (
                    <article key={task.id} className={`card dashboard-card interview-prep-card interview-prep-card--category ${categoryAccentClass(taskCategory)}`}>
                      <div className="interview-prep-card__head">
                        <div className="task-item__meta">
                          <span className="badge">{CATEGORY_LABELS[taskCategory]}</span>
                          <span className="badge">{PREP_TYPE_LABELS[task.prepType] ?? task.prepType}</span>
                          {task.companyTag && <span className="badge">{task.companyTag}</span>}
                          <span className="badge">{task.language}</span>
                          <span className="badge">
                            <Clock3 size={12} />
                            {Math.round(task.durationSeconds / 60)} мин
                          </span>
                        </div>
                        {!task.isActive && <span className="badge task-inactive">Неактивна</span>}
                      </div>

                      <h3 className="interview-prep-card__title">{task.title}</h3>
                      <p className="interview-prep-card__statement">{task.statement}</p>

                      <div className="interview-prep-card__footer">
                        <div className="interview-prep-card__hint">
                          {task.prepType === 'system_design'
                            ? 'AI review схемы + follow-up вопросы'
                            : task.isExecutable
                              ? 'Live coding с автопроверкой'
                              : 'Guided flow: решение + последовательные вопросы'}
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={() => void startTask(task.id)}
                          disabled={startingTaskId === task.id}
                        >
                          <span>{startingTaskId === task.id ? 'Запуск...' : 'Начать'}</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
