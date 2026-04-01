import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, CircleDashed, Clock3, RotateCcw, XCircle } from 'lucide-react';

import {
  interviewPrepApi,
  InterviewPrepQuestion,
  InterviewPrepQuestionResult,
  InterviewPrepSession,
} from '@/features/InterviewPrep/api/interviewPrepApi';

const resultLabel: Record<InterviewPrepQuestionResult['selfAssessment'], string> = {
  answered: 'Ответил сам',
  skipped: 'Пропустил',
};

export function InterviewPrepSessionPage() {
  const { sessionId = '' } = useParams();
  const [session, setSession] = useState<InterviewPrepSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answering, setAnswering] = useState(false);
  const [revealedQuestion, setRevealedQuestion] = useState<InterviewPrepQuestion | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    interviewPrepApi.getSession(sessionId)
      .then(setSession)
      .catch((e: any) => {
        console.error('Failed to load session:', e);
        setError(e.response?.data?.error || 'Не удалось загрузить сессию');
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const progress = useMemo(() => {
    const answeredCount = session?.results?.length ?? 0;
    const currentPosition = session?.currentQuestion?.position ?? answeredCount;
    return { answeredCount, currentPosition };
  }, [session]);

  const handleAnswer = async (selfAssessment: 'answered' | 'skipped') => {
    if (!sessionId || !session?.currentQuestion) return;
    setAnswering(true);
    setError(null);
    try {
      const response = await interviewPrepApi.answerQuestion(sessionId, session.currentQuestion.id, selfAssessment);
      setRevealedQuestion(response.answeredQuestion ?? null);
      setSession(response.session);
    } catch (e: any) {
      console.error('Failed to answer question:', e);
      setError(e.response?.data?.error || 'Не удалось сохранить ответ');
    } finally {
      setAnswering(false);
    }
  };

  if (loading) {
    return <div className="empty-state compact">Загрузка interview prep session...</div>;
  }

  if (!session) {
    return (
      <section className="card dashboard-card">
        <div className="error-text">{error ?? 'Сессия не найдена'}</div>
      </section>
    );
  }

  return (
    <div className="interview-prep-session-page">
      <section className="card dashboard-card interview-prep-session-hero">
        <div>
          <div className="task-item__meta">
            <span className="badge">{session.task?.prepType}</span>
            <span className="badge">{session.task?.language}</span>
            <span className="badge">
              <Clock3 size={12} />
              {session.task ? Math.round(session.task.durationSeconds / 60) : 0} мин
            </span>
          </div>
          <h1>{session.task?.title ?? 'Interview Prep'}</h1>
          <p className="code-rooms-subtitle">
            Сначала решаешь задачу, затем честно отмечаешь, на какие follow-up вопросы смог ответить без подсказки.
          </p>
        </div>
        <div className="interview-prep-session-hero__aside">
          <div className="interview-prep-progress">
            <span>Пройдено вопросов</span>
            <strong>{progress.answeredCount}</strong>
          </div>
          <Link className="btn btn-secondary" to="/interview-prep">
            <RotateCcw size={16} />
            <span>К списку задач</span>
          </Link>
        </div>
      </section>

      {error && (
        <section className="card dashboard-card">
          <div className="error-text">{error}</div>
        </section>
      )}

      <section className="interview-prep-session-grid">
        <article className="card dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <h2>Задача</h2>
              <p className="interview-prep-muted">Базовый контекст, от которого идут follow-up вопросы.</p>
            </div>
          </div>
          <pre className="interview-prep-statement">{session.task?.statement ?? ''}</pre>
          {session.task?.starterCode && (
            <>
              <div className="interview-prep-block-title">Starter code</div>
              <pre className="interview-prep-code">{session.task.starterCode}</pre>
            </>
          )}
        </article>

        <aside className="interview-prep-session-sidebar">
          <section className="card dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <h2>Прогресс</h2>
                <p className="interview-prep-muted">
                  {session.status === 'finished'
                    ? 'Сессия завершена'
                    : session.currentQuestion
                      ? `Сейчас вопрос #${session.currentQuestion.position}`
                      : 'Ожидается следующий вопрос'}
                </p>
              </div>
            </div>
            <div className="interview-prep-results">
              {(session.results ?? []).length === 0 ? (
                <div className="interview-prep-muted">Пока нет отмеченных ответов.</div>
              ) : (
                session.results?.map((result, index) => (
                  <div key={result.id} className="interview-prep-result-row">
                    <span>Вопрос #{index + 1}</span>
                    <strong>{resultLabel[result.selfAssessment]}</strong>
                  </div>
                ))
              )}
            </div>
          </section>

          {revealedQuestion && (
            <section className="card dashboard-card">
              <div className="dashboard-card__header">
                <div>
                  <h2>Разбор предыдущего вопроса</h2>
                  <p className="interview-prep-muted">Ответ раскрывается после честной самооценки.</p>
                </div>
              </div>
              <div className="interview-prep-question-review">
                <strong>#{revealedQuestion.position} {revealedQuestion.prompt}</strong>
                <p>{revealedQuestion.answer}</p>
              </div>
            </section>
          )}
        </aside>
      </section>

      {session.status === 'finished' ? (
        <section className="card dashboard-card interview-prep-finished">
          <CheckCircle2 size={18} />
          <span>Сессия завершена. Можешь взять следующую задачу или пройти эту заново позже.</span>
        </section>
      ) : session.currentQuestion ? (
        <section className="card dashboard-card interview-prep-question-card">
          <div className="dashboard-card__header">
            <div>
              <h2>Follow-up вопрос #{session.currentQuestion.position}</h2>
              <p className="interview-prep-muted">Сначала ответь сам, потом зафиксируй результат.</p>
            </div>
            <CircleDashed size={18} />
          </div>
          <div className="interview-prep-question-prompt">{session.currentQuestion.prompt}</div>
          <div className="interview-prep-question-actions">
            <button
              className="btn btn-primary"
              onClick={() => void handleAnswer('answered')}
              disabled={answering}
            >
              <CheckCircle2 size={16} />
              <span>{answering ? 'Сохраняю...' : 'Ответил сам'}</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => void handleAnswer('skipped')}
              disabled={answering}
            >
              <XCircle size={16} />
              <span>{answering ? 'Сохраняю...' : 'Не ответил'}</span>
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
