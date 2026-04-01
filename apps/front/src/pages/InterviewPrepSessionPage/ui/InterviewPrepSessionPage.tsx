import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { CheckCircle2, CircleDashed, Clock3, Play, RotateCcw, TerminalSquare, XCircle } from 'lucide-react';

import {
  interviewPrepApi,
  InterviewPrepQuestion,
  InterviewPrepQuestionResult,
  InterviewPrepSession,
} from '@/features/InterviewPrep/api/interviewPrepApi';
import { displayLanguageLabel, monacoLanguageFor } from '@/shared/lib/codeEditorLanguage';

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
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    passed: boolean;
    lastError: string;
    passedCount: number;
    totalCount: number;
    failedTestIndex: number;
    failureKind: string;
  } | null>(null);

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

  useEffect(() => {
    setCode(session?.code ?? session?.task?.starterCode ?? '');
  }, [session?.id, session?.code, session?.task?.starterCode]);

  const progress = useMemo(() => {
    const answeredCount = session?.results?.length ?? 0;
    return { answeredCount };
  }, [session]);

  const canShowQuestions = Boolean(
    session?.currentQuestion && (!session?.task?.isExecutable || session?.lastSubmissionPassed),
  );

  const handleSubmitCode = async () => {
    if (!sessionId || !session?.task?.isExecutable) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await interviewPrepApi.submit(sessionId, code);
      setSubmitResult({
        passed: result.passed,
        lastError: result.lastError,
        passedCount: result.passedCount,
        totalCount: result.totalCount,
        failedTestIndex: result.failedTestIndex,
        failureKind: result.failureKind,
      });
      if (result.session) {
        setSession(result.session);
      }
    } catch (e: any) {
      console.error('Failed to submit code:', e);
      setError(e.response?.data?.error || 'Не удалось проверить решение');
    } finally {
      setSubmitting(false);
    }
  };

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
            <span className="badge">{displayLanguageLabel(session.task?.language)}</span>
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

      {session.task?.isExecutable && (
        <section className="card dashboard-card interview-prep-live-card">
          <div className="dashboard-card__header">
            <div>
              <h2>Live coding</h2>
              <p className="interview-prep-muted">
                У каждого пользователя свой editor и свой `session_id`, поэтому решения одной и той же задачи не пересекаются.
              </p>
            </div>
            <TerminalSquare size={18} />
          </div>
          <div className="interview-prep-live-toolbar">
            <span className="badge">{displayLanguageLabel(session.task.language)}</span>
            <span className={`badge ${session.lastSubmissionPassed ? 'badge-success' : 'badge-secondary'}`}>
              {session.lastSubmissionPassed ? 'Проверка пройдена' : 'Ожидается accepted'}
            </span>
          </div>
          <div className="interview-prep-live-editor">
            <Editor
              height="100%"
              defaultLanguage={monacoLanguageFor(session.task.language)}
              language={monacoLanguageFor(session.task.language)}
              value={code}
              onChange={(value) => setCode(value ?? '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                tabSize: 2,
              }}
            />
          </div>
          <div className="interview-prep-live-actions">
            <button className="btn btn-primary" onClick={() => void handleSubmitCode()} disabled={submitting}>
              <Play size={16} />
              <span>{submitting ? 'Проверяю...' : 'Отправить на проверку'}</span>
            </button>
            {submitResult && (
              <div className={`interview-prep-live-result ${submitResult.passed ? 'is-success' : 'is-error'}`}>
                <strong>{submitResult.passed ? 'Accepted' : `Тесты ${submitResult.passedCount}/${submitResult.totalCount}`}</strong>
                <span>
                  {submitResult.passed
                    ? 'Решение прошло автопроверку, можно переходить к follow-up.'
                    : submitResult.lastError || 'Решение не прошло автопроверку.'}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {session.status === 'finished' ? (
        <section className="card dashboard-card interview-prep-finished">
          <CheckCircle2 size={18} />
          <span>Сессия завершена. Можешь взять следующую задачу или пройти эту заново позже.</span>
        </section>
      ) : canShowQuestions && session.currentQuestion ? (
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
