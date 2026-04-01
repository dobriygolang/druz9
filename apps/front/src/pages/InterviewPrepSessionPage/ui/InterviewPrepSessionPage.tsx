import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { CheckCircle2, ChevronDown, ChevronUp, CircleDashed, Clock3, Play, RotateCcw, TerminalSquare, XCircle } from 'lucide-react';

import {
  interviewPrepApi,
  InterviewPrepQuestion,
  InterviewPrepSession,
  InterviewPrepSystemDesignReview,
  InterviewPrepSelfAssessment,
} from '@/features/InterviewPrep/api/interviewPrepApi';
import { displayLanguageLabel, monacoLanguageFor } from '@/shared/lib/codeEditorLanguage';

const DEFAULT_CODE_BY_LANGUAGE: Record<string, string> = {
  go: `package main

import "fmt"

func main() {
\tfmt.Println("implement me")
}
`,
  python: `def solve(input: str) -> str:
    return ""
`,
  sql: `-- Write a single SQL query.
SELECT 1;
`,
};

function starterForLanguage(taskLanguage: string | undefined, solveLanguage: string, starterCode: string | undefined) {
  if (starterCode && solveLanguage === taskLanguage) {
    return starterCode;
  }
  return DEFAULT_CODE_BY_LANGUAGE[solveLanguage] ?? starterCode ?? '';
}

const resultLabel: Record<InterviewPrepSelfAssessment, string> = {
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
  const [reviewingDesign, setReviewingDesign] = useState(false);
  const [designNotes, setDesignNotes] = useState('');
  const [designImage, setDesignImage] = useState<File | null>(null);
  const [designReview, setDesignReview] = useState<InterviewPrepSystemDesignReview | null>(null);
  const [editorHeight, setEditorHeight] = useState(560);
  const [solveLanguage, setSolveLanguage] = useState('go');
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(560);
  const [isResizingEditor, setIsResizingEditor] = useState(false);
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
      .then((res) => { setSession(res); })
      .catch((e: any) => {
        console.error('Failed to load session:', e);
        setError(e.response?.data?.error || 'Не удалось загрузить сессию');
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    const fallbackLanguage = session?.solveLanguage || session?.task?.supportedLanguages?.[0] || session?.task?.language || 'go';
    setSolveLanguage(fallbackLanguage);
  }, [session?.id, session?.solveLanguage, session?.task?.language, session?.task?.supportedLanguages]);

  useEffect(() => {
    const fallbackLanguage = session?.solveLanguage || session?.task?.supportedLanguages?.[0] || session?.task?.language || 'go';
    setCode(session?.code ?? starterForLanguage(session?.task?.language, fallbackLanguage, session?.task?.starterCode));
  }, [session?.id, session?.code, session?.solveLanguage, session?.task?.language, session?.task?.supportedLanguages, session?.task?.starterCode]);

  useEffect(() => {
    if (!isResizingEditor) {
      return undefined;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const delta = event.clientY - resizeStartYRef.current;
      setEditorHeight(Math.max(360, Math.min(1080, resizeStartHeightRef.current + delta)));
    };

    const handleMouseUp = () => {
      setIsResizingEditor(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingEditor]);

  const progress = useMemo(() => {
    const answeredCount = session?.results?.length ?? 0;
    return { answeredCount };
  }, [session]);

  const canShowQuestions = Boolean(
    session?.currentQuestion && (!session?.task?.isExecutable || session?.lastSubmissionPassed),
  );
  const showLiveCoding = Boolean(session?.task?.starterCode && session?.task?.isExecutable);
  const canSubmitExecutable = Boolean(session?.task?.isExecutable);
  const showSystemDesignReview = session?.task?.prepType === 'system_design';
  const solveLanguageOptions = session?.task?.supportedLanguages?.length
    ? session.task.supportedLanguages
    : (session?.task?.language ? [session.task.language] : []);

  const switchSolveLanguage = (nextLanguage: string) => {
    setSolveLanguage(nextLanguage);
    const nextStarter = starterForLanguage(session?.task?.language, nextLanguage, session?.task?.starterCode);
    const currentStarter = starterForLanguage(session?.task?.language, solveLanguage, session?.task?.starterCode);
    setCode((currentCode) => {
      if (!currentCode.trim() || currentCode === currentStarter) {
        return nextStarter;
      }
      return currentCode;
    });
    setSubmitResult(null);
  };

  const handleSubmitCode = async () => {
    if (!sessionId || !session?.task?.isExecutable) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await interviewPrepApi.submit(sessionId, code, solveLanguage);
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

  const handleReviewSystemDesign = async () => {
    if (!sessionId || !designImage) return;
    setReviewingDesign(true);
    setError(null);
    try {
      const result = await interviewPrepApi.reviewSystemDesign(sessionId, designImage, designNotes);
      setDesignReview(result);
    } catch (e: any) {
      console.error('Failed to review system design:', e);
      setError(e.response?.data?.error || 'Не удалось получить AI-ревью схемы');
    } finally {
      setReviewingDesign(false);
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

  const task = session.task;
  const starterCodePreview = task?.starterCode ?? '';

  return (
    <div className="interview-prep-session-page">
      <section className="card dashboard-card interview-prep-session-hero">
        <div>
          <div className="task-item__meta">
            <span className="badge">{task?.prepType}</span>
            <span className="badge">{displayLanguageLabel(task?.language)}</span>
            <span className="badge">
              <Clock3 size={12} />
              {task ? Math.round(task.durationSeconds / 60) : 0} мин
            </span>
          </div>
          <h1>{task?.title ?? 'Interview Prep'}</h1>
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
          <pre className="interview-prep-statement">{task?.statement ?? ''}</pre>
          {task?.starterCode && task?.language === 'sql' && (
            <>
              <div className="interview-prep-block-title">Схема БД и стартовый запрос</div>
              <div className="interview-prep-code-editor">
                <Editor
                  height="320px"
                  defaultLanguage={monacoLanguageFor(task.language)}
                  language={monacoLanguageFor(task.language)}
                  value={starterCodePreview}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    fontSize: 14,
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    tabSize: 2,
                    padding: { top: 16, bottom: 16 },
                    renderLineHighlight: 'none',
                  }}
                />
              </div>
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
                    <strong>{resultLabel[result.selfAssessment as InterviewPrepSelfAssessment]}</strong>
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

      {showLiveCoding && task && (
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
            <span className="badge interview-prep-badge interview-prep-badge--language">{displayLanguageLabel(task.language)}</span>
            {solveLanguageOptions.length > 1 && (
              <div className="interview-prep-language-switcher">
                {solveLanguageOptions.map((language) => (
                  <button
                    key={language}
                    type="button"
                    className={`pill-selector__pill ${solveLanguage === language ? 'active' : ''}`}
                    onClick={() => switchSolveLanguage(language)}
                  >
                    {displayLanguageLabel(language)}
                  </button>
                ))}
              </div>
            )}
            <span className={`badge interview-prep-badge ${session.lastSubmissionPassed ? 'badge-success' : 'badge-secondary'}`}>
              {canSubmitExecutable
                ? (session.lastSubmissionPassed ? 'Проверка пройдена' : 'Ожидается accepted')
                : 'Черновик для live-coding'}
            </span>
            <div className="interview-prep-live-spacer" />
            <div className="interview-prep-live-size-controls">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditorHeight((value) => Math.max(360, value - 120))}
              >
                <ChevronUp size={16} />
                <span>Компактнее</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditorHeight((value) => Math.min(1080, value + 120))}
              >
                <ChevronDown size={16} />
                <span>Выше</span>
              </button>
            </div>
          </div>
          <div className="interview-prep-live-editor" style={{ height: `${editorHeight}px` }}>
            <Editor
              height={`${editorHeight}px`}
              defaultLanguage={monacoLanguageFor(solveLanguage)}
              language={monacoLanguageFor(solveLanguage)}
              value={code}
              onChange={(value) => setCode(value ?? '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                tabSize: 2,
                padding: { top: 16, bottom: 20 },
              }}
            />
          </div>
          <div
            className={`interview-prep-live-resize-handle ${isResizingEditor ? 'is-active' : ''}`}
            onMouseDown={(event) => {
              resizeStartYRef.current = event.clientY;
              resizeStartHeightRef.current = editorHeight;
              setIsResizingEditor(true);
            }}
            role="separator"
            aria-orientation="horizontal"
            aria-label="Изменить высоту live coding editor"
          />
          <div className="interview-prep-live-actions">
            <button
              className="btn btn-primary"
              onClick={() => void handleSubmitCode()}
              disabled={submitting || !canSubmitExecutable}
            >
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

      {showSystemDesignReview && task && (
        <section className="card dashboard-card interview-prep-design-review-card">
          <div className="dashboard-card__header">
            <div>
              <h2>AI review схемы</h2>
              <p className="interview-prep-muted">
                Загрузи скриншот архитектуры. Файл не сохраняется у нас: backend отправляет его провайдеру и держит только текстовый review.
              </p>
            </div>
            <TerminalSquare size={18} />
          </div>

          <div className="interview-prep-design-review-grid">
            <label className="interview-prep-upload-field">
              <span className="interview-prep-block-title">Скриншот архитектуры</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setDesignImage(file);
                  setDesignReview(null);
                }}
              />
              <span className="interview-prep-muted">
                PNG, JPG или WEBP, до 5 MB. Подходит скриншот из Excalidraw, Figma или Miro.
              </span>
              {designImage && <strong className="interview-prep-upload-name">{designImage.name}</strong>}
            </label>

            <label className="interview-prep-notes-field">
              <span className="interview-prep-block-title">Контекст для модели</span>
              <textarea
                className="input interview-prep-notes-input"
                placeholder="Например: assumed 20k RPS, multi-region не делал, auth и billing опустил специально"
                value={designNotes}
                onChange={(event) => setDesignNotes(event.target.value)}
                rows={5}
              />
            </label>
          </div>

          <div className="interview-prep-live-actions">
            <button
              className="btn btn-primary"
              onClick={() => void handleReviewSystemDesign()}
              disabled={reviewingDesign || !designImage}
            >
              <Play size={16} />
              <span>{reviewingDesign ? 'Анализирую...' : 'Попросить AI оценить схему'}</span>
            </button>
          </div>

          {designReview && (
            <div className="interview-prep-design-review-result">
              <div className="interview-prep-design-review-score">
                <span className="interview-prep-muted">Оценка</span>
                <strong>{designReview.score}/10</strong>
                <span className="badge">
                  {designReview.provider}
                  {designReview.model ? ` · ${designReview.model}` : ''}
                </span>
              </div>

              <div className="interview-prep-live-result">
                <strong>Summary</strong>
                <span>{designReview.summary}</span>
              </div>

              {designReview.strengths?.length > 0 && (
                <div className="interview-prep-design-review-list">
                  <div className="interview-prep-block-title">Сильные стороны</div>
                  {designReview.strengths.map((item, index) => (
                    <div key={`strength-${index}`} className="interview-prep-result-row">
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}

              {designReview.issues?.length > 0 && (
                <div className="interview-prep-design-review-list">
                  <div className="interview-prep-block-title">Замечания</div>
                  {designReview.issues.map((item, index) => (
                    <div key={`issue-${index}`} className="interview-prep-result-row">
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}

              {designReview.missingTopics?.length > 0 && (
                <div className="interview-prep-design-review-list">
                  <div className="interview-prep-block-title">Что не покрыто</div>
                  {designReview.missingTopics.map((item, index) => (
                    <div key={`missing-${index}`} className="interview-prep-result-row">
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}

              {designReview.followUpQuestions?.length > 0 && (
                <div className="interview-prep-design-review-list">
                  <div className="interview-prep-block-title">Follow-up от AI</div>
                  {designReview.followUpQuestions.map((item, index) => (
                    <div key={`follow-up-${index}`} className="interview-prep-result-row">
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="interview-prep-muted">{designReview.disclaimer}</div>
            </div>
          )}
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
