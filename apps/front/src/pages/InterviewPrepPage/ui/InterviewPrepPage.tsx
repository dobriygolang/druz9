import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock3, ShieldCheck, Sparkles } from 'lucide-react';

import { interviewPrepApi, InterviewPrepTask, InterviewPrepType } from '@/features/InterviewPrep/api/interviewPrepApi';

const PREP_TYPE_LABELS: Record<InterviewPrepType, string> = {
  coding: 'Coding',
  algorithm: 'Algorithm',
  system_design: 'System Design',
  sql: 'SQL',
  code_review: 'Code Review',
};

export function InterviewPrepPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<InterviewPrepTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);

  useEffect(() => {
    interviewPrepApi.listTasks()
      .then(setTasks)
      .catch((e) => {
        console.error('Failed to load interview prep tasks:', e);
        setError(e.response?.data?.error || 'Не удалось загрузить задачи');
      })
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const executableCount = tasks.filter((task) => task.isExecutable).length;
    return {
      total: tasks.length,
      executableCount,
      guidedCount: tasks.length - executableCount,
    };
  }, [tasks]);

  const handleStart = async (taskId: string) => {
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

  if (loading) {
    return <div className="empty-state compact">Загрузка interview prep...</div>;
  }

  return (
    <div className="code-rooms-page interview-prep-page">
      <div className="page-header code-rooms-hero">
        <div className="code-rooms-hero__copy">
          <span className="code-rooms-kicker">Trusted Only</span>
          <h1>Подготовка к Go собеседованиям</h1>
          <p className="code-rooms-subtitle">
            Выбираешь формат, решаешь задачу как в песочнице и проходишь прикрепленные follow-up вопросы по очереди.
          </p>
        </div>
        <div className="interview-prep-summary">
          <div className="interview-prep-summary__item">
            <Sparkles size={16} />
            <span>{summary.total} сценариев</span>
          </div>
          <div className="interview-prep-summary__item">
            <ShieldCheck size={16} />
            <span>{summary.guidedCount} guided flow</span>
          </div>
        </div>
      </div>

      {error && (
        <section className="card dashboard-card">
          <div className="error-text">{error}</div>
        </section>
      )}

      {tasks.length === 0 && !error ? (
        <section className="card dashboard-card">
          <div className="empty-state compact">Пока нет доступных задач interview prep.</div>
        </section>
      ) : (
        <section className="interview-prep-grid">
          {tasks.map((task) => (
            <article key={task.id} className="card dashboard-card interview-prep-card">
              <div className="interview-prep-card__head">
                <div className="task-item__meta">
                  <span className="badge">{PREP_TYPE_LABELS[task.prepType] ?? task.prepType}</span>
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
                  {task.isExecutable
                    ? 'Задача с код-раннером'
                    : 'Guided flow: решение + последовательные вопросы'}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => void handleStart(task.id)}
                  disabled={startingTaskId === task.id}
                >
                  <span>{startingTaskId === task.id ? 'Запуск...' : 'Начать'}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
