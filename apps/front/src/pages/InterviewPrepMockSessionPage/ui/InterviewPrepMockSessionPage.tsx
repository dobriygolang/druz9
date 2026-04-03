import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock3,
  Sparkles,
} from 'lucide-react';

import {
  interviewPrepApi,
  InterviewPrepAnswerReview,
  InterviewPrepMockSession,
  InterviewPrepMockStage,
  InterviewPrepMockStageKind,
  InterviewPrepSolutionReview,
  InterviewPrepSystemDesignReview,
  InterviewPrepSystemDesignReviewInput,
} from '@/features/InterviewPrep/api/interviewPrepApi';

const InterviewPrepMockWorkstation = lazy(() => import('./components/InterviewPrepMockWorkstation').then((m) => ({ default: m.InterviewPrepMockWorkstation })));

const WorkstationFallback = () => (
  <section className="card dashboard-card">
    <div className="empty-state compact">Загрузка workstation...</div>
  </section>
);

type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

const STAGE_LABELS: Record<InterviewPrepMockStageKind, string> = {
  slices: 'Slices',
  concurrency: 'Concurrency',
  sql: 'SQL',
  architecture: 'Architecture',
  system_design: 'System Design',
  unspecified: 'Unspecified',
};

const DESIGN_INITIAL_STATE: InterviewPrepSystemDesignReviewInput = {
  notes: '',
  components: '',
  apis: '',
  databaseSchema: '',
  traffic: '',
  reliability: '',
};

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const candidate = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return typeof candidate === 'function' ? candidate : null;
}

function defaultCode(stage: InterviewPrepMockStage | undefined) {
  if (!stage) return '';
  if (stage.code) return stage.code;
  switch (stage.solveLanguage) {
    case 'python':
      return 'def solve(input: str) -> str:\n    return ""\n';
    case 'sql':
      return '-- Write SQL here\nSELECT 1;\n';
    case 'go':
    default:
      return 'package main\n\nfunc solve(input string) string {\n\treturn ""\n}\n';
  }
}

export function InterviewPrepMockSessionPage() {
  const { sessionId = '' } = useParams();
  const [session, setSession] = useState<InterviewPrepMockSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [designImage, setDesignImage] = useState<File | null>(null);
  const [designInput, setDesignInput] = useState<InterviewPrepSystemDesignReviewInput>(DESIGN_INITIAL_STATE);
  const [designReview, setDesignReview] = useState<InterviewPrepSystemDesignReview | null>(null);
  const [solutionReview, setSolutionReview] = useState<InterviewPrepSolutionReview | null>(null);
  const [answerReview, setAnswerReview] = useState<InterviewPrepAnswerReview | null>(null);
  const [submitErrorDetails, setSubmitErrorDetails] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [speechSupported] = useState(Boolean(getSpeechRecognitionCtor()));
  const [speechActive, setSpeechActive] = useState(false);
  const speechRef = useRef<any>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    interviewPrepApi.getMockSession(sessionId)
      .then((res) => {
        setSession(res);
        setCode(defaultCode(res.currentStage));
      })
      .catch((e: any) => {
        console.error('Failed to load mock interview session:', e);
        setError(e.response?.data?.error || 'Не удалось загрузить mock interview');
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    setCode(defaultCode(session?.currentStage));
    setNotes('');
    setAnswerText('');
    setDesignReview(null);
    setSolutionReview(null);
    setAnswerReview(null);
    setSubmitErrorDetails(null);
    setDesignImage(null);
    setDesignInput(DESIGN_INITIAL_STATE);
  }, [session?.currentStage?.id]);

  useEffect(() => {
    if (!session?.currentStage?.id) return;
    setSelectedStageId((current) => current ?? session.currentStage!.id);
  }, [session?.currentStage?.id]);

  useEffect(() => {
    return () => {
      if (speechRef.current) {
        speechRef.current.stop();
      }
    };
  }, []);

  const currentStage = session?.currentStage;
  const viewedStage = useMemo(
    () => (session?.stages ?? []).find((stage) => stage.id === selectedStageId) ?? currentStage,
    [currentStage, selectedStageId, session?.stages],
  );
  const isViewingCurrentStage = viewedStage?.id === currentStage?.id;
  const completedStages = useMemo(
    () => (session?.stages ?? []).filter((stage) => stage.status === 'completed'),
    [session],
  );
  const progress = useMemo(() => {
    const stages = session?.stages ?? [];
    const completed = stages.filter((stage) => stage.status === 'completed').length;
    return { completed, total: stages.length };
  }, [session]);

  const handleSubmitStage = async () => {
    if (!sessionId || !currentStage) return;
    setSubmitting(true);
    setError(null);
    setSubmitErrorDetails(null);
    try {
      const result = await interviewPrepApi.submitMockStage(sessionId, {
        code,
        language: currentStage.solveLanguage,
        notes,
      });
      if (!result.passed && result.lastError) {
        setSubmitErrorDetails(result.lastError);
      }
      if (result.review) {
        setSolutionReview(result.review);
      }
      if (result.session) {
        setSession(result.session);
      }
    } catch (e: any) {
      console.error('Failed to submit mock stage:', e);
      setError(e.response?.data?.error || 'Не удалось отправить решение');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSystemDesign = async () => {
    if (!sessionId || !designImage) return;
    setSubmitting(true);
    setError(null);
    setSubmitErrorDetails(null);
    try {
      const result = await interviewPrepApi.reviewMockSystemDesign(sessionId, designImage, designInput);
      if (result.review) {
        setDesignReview(result.review);
      }
      if (result.session) {
        setSession(result.session);
      }
    } catch (e: any) {
      console.error('Failed to review mock system design:', e);
      setError(e.response?.data?.error || 'Не удалось получить ревью');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerQuestion = async () => {
    if (!sessionId || !answerText.trim()) return;
    setSubmitting(true);
    setError(null);
    setSubmitErrorDetails(null);
    try {
      const result = await interviewPrepApi.answerMockQuestion(sessionId, answerText.trim());
      if (result.review) {
        setAnswerReview(result.review);
      }
      if (result.session) {
        setSession(result.session);
      }
      setAnswerText('');
    } catch (e: any) {
      console.error('Failed to answer mock question:', e);
      setError(e.response?.data?.error || 'Не удалось проверить ответ');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSpeech = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    if (speechActive && speechRef.current) {
      speechRef.current.stop();
      setSpeechActive(false);
      return;
    }
    const recognition = new Ctor();
    recognition.lang = 'ru-RU';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      setAnswerText(transcript);
    };
    recognition.onerror = () => setSpeechActive(false);
    recognition.onend = () => setSpeechActive(false);
    speechRef.current = recognition;
    recognition.start();
    setSpeechActive(true);
  };

  if (loading) {
    return <div className="empty-state compact">Загрузка mock interview...</div>;
  }

  if (!session || !currentStage) {
    return (
      <section className="card dashboard-card">
        <div className="error-text">{error ?? 'Сессия не найдена'}</div>
      </section>
    );
  }

  return (
    <div className="interview-prep-session-page interview-prep-mock-page">
      <header className="interview-prep-mock-header">
        <div className="interview-prep-mock-header__content">
          <div className="interview-prep-mock-header__info">
            <span className="badge badge-secondary">{session.companyTag}</span>
            <h1>Mock interview</h1>
          </div>
          <div className="interview-prep-mock-header__stats">
            <div className="interview-prep-progress-summary">
              <span className="label">Прогресс интервью</span>
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: `${(progress.completed / progress.total) * 100}%` }} />
              </div>
              <span className="value">{progress.completed} / {progress.total} этапов</span>
            </div>
          </div>
        </div>
      </header>

      <div className="interview-prep-mock-layout">
        <aside className="interview-prep-mock-timeline">
          <div className="timeline-title">Этапы интервью</div>
          <div className="timeline-list">
              {(session.stages ?? []).map((stage, idx) => {
                const isActive = stage.stageIndex === session.currentStageIndex;
                const isCompleted = stage.status === 'completed';
                const isSelected = stage.id === viewedStage?.id;
                return (
                <button
                  type="button"
                  key={stage.id} 
                  className={`timeline-item ${isActive ? 'is-active' : ''} ${isCompleted ? 'is-completed' : ''} ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedStageId(stage.id)}
                >
                  <div className="timeline-item__node">
                    {isCompleted ? <CheckCircle2 size={14} /> : <span>{idx + 1}</span>}
                  </div>
                  <div className="timeline-item__content">
                    <span className="timeline-item__label">{STAGE_LABELS[stage.kind]}</span>
                    <span className="timeline-item__status">
                      {isActive ? 'Текущий этап' : isCompleted ? 'Пройдено' : 'Впереди'}
                    </span>
                  </div>
                  {isActive && <div className="timeline-item__active-indicator" />}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="interview-prep-mock-main">
          {error && (
            <div className="interview-prep-error-banner">
              <div className="error-text">{error}</div>
            </div>
          )}

          <section className="card dashboard-card task-statement-card">
            <div className="dashboard-card__header">
              <div>
                <span className="badge badge-secondary">{STAGE_LABELS[viewedStage?.kind ?? currentStage.kind]}</span>
                <h2>{viewedStage?.task?.title ?? 'Текущий этап'}</h2>
              </div>
              {viewedStage?.task?.durationSeconds ? (
                <div className="badge">
                  <Clock3 size={14} />
                  {Math.round(viewedStage.task.durationSeconds / 60)} мин
                </div>
              ) : null}
            </div>
            {!isViewingCurrentStage && (
              <div className="interview-prep-stage-banner">
                <span className="badge">Архив этапа</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedStageId(currentStage.id)}>
                  Вернуться к текущему этапу
                </button>
              </div>
            )}
            <pre className="interview-prep-statement">{viewedStage?.task?.statement ?? ''}</pre>
          </section>

          {completedStages.length > 0 && (
            <section className="card dashboard-card">
              <div className="dashboard-card__header">
                <div>
                  <h2>Пройденные этапы</h2>
                  <p className="interview-prep-muted">Краткая история секций, которые ты уже закрыл в этом mock interview.</p>
                </div>
              </div>
              <div className="interview-prep-results">
                {completedStages.map((stage) => (
                  <div key={stage.id} className="interview-prep-result-row interview-prep-result-row--stacked">
                    <strong>{STAGE_LABELS[stage.kind]}{stage.task?.title ? ` · ${stage.task.title}` : ''}</strong>
                    <span>
                      {stage.lastSubmissionPassed ? 'Автопроверка пройдена' : 'Этап завершён'}
                      {stage.reviewScore ? ` · ${stage.reviewScore}/10` : ''}
                    </span>
                    {stage.reviewSummary ? <span>{stage.reviewSummary}</span> : null}
                  </div>
                ))}
              </div>
            </section>
          )}

          {session.status === 'finished' && (
            <section className="card dashboard-card interview-prep-finished">
              <Sparkles size={24} className="sparkle-icon" />
              <div>
                <strong>Mock interview успешно завершён</strong>
                <p className="interview-prep-muted">Поздравляем! Ты прошёл все этапы сценария для {session.companyTag}.</p>
              </div>
            </section>
          )}

          {viewedStage && (
            <Suspense fallback={<WorkstationFallback />}>
              <InterviewPrepMockWorkstation
                session={session}
                currentStage={currentStage}
                viewedStage={viewedStage}
                isViewingCurrentStage={isViewingCurrentStage}
                code={code}
                notes={notes}
                submitting={submitting}
                designImage={designImage}
                designInput={designInput}
                designReview={designReview}
                solutionReview={solutionReview}
                answerReview={answerReview}
                submitErrorDetails={submitErrorDetails}
                answerText={answerText}
                speechSupported={speechSupported}
                speechActive={speechActive}
                onReturnToCurrentStage={() => setSelectedStageId(currentStage.id)}
                onCodeChange={setCode}
                onNotesChange={setNotes}
                onSubmitStage={() => void handleSubmitStage()}
                onDesignImageChange={(file) => setDesignImage(file)}
                onDesignInputChange={setDesignInput}
                onReviewSystemDesign={() => void handleReviewSystemDesign()}
                onAnswerTextChange={setAnswerText}
                onToggleSpeech={toggleSpeech}
                onAnswerQuestion={() => void handleAnswerQuestion()}
              />
            </Suspense>
          )}
        </main>

        <aside className="interview-prep-mock-console">
          <div className="console-title">Консоль интервьюера</div>
          
          <section className="console-card">
            <div className="console-card__header">Статус этапа</div>
            <div className="console-stats">
              {(currentStage.questionResults ?? []).length === 0 ? (
                <div className="console-empty">Follow-up вопросы появятся здесь.</div>
              ) : (
                currentStage.questionResults?.map((result) => (
                  <div key={result.id} className="console-stat-row">
                    <span>Вопрос {result.position}</span>
                    <strong className={result.score >= 7 ? 'text-success' : 'text-primary'}>
                      {result.answeredAt ? `${result.score}/10` : 'ожидание'}
                    </strong>
                  </div>
                ))
              )}
            </div>
          </section>

          {(solutionReview || designReview) && (
            <section className="console-card console-card--ai">
              <div className="console-card__header">
                <Sparkles size={14} />
                AI Ревью этапа
              </div>
              <div className="console-review-body">
                {'score' in (solutionReview || designReview || {}) && (
                  <div className="console-review-score">
                    <span className="label">Оценка</span>
                    <span className="value">{(solutionReview?.score ?? designReview?.score) || 0} / 10</span>
                  </div>
                )}
                <p className="console-review-text">{solutionReview?.summary ?? designReview?.summary}</p>
              </div>
            </section>
          )}

          {answerReview && (
            <section className="console-card console-card--ai">
              <div className="console-card__header">AI Валидация ответа</div>
              <div className="console-review-body">
                <div className="console-review-score">
                  <span className="label">Оценка</span>
                  <span className="value">{answerReview.score} / 10</span>
                </div>
                <p className="console-review-text">{answerReview.summary}</p>
                {answerReview.gaps?.length ? (
                  <div className="console-review-gaps">
                    <span className="gaps-label">Что стоит улучшить:</span>
                    <ul>
                      {answerReview.gaps.map((gap, i) => <li key={i}>{gap}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
