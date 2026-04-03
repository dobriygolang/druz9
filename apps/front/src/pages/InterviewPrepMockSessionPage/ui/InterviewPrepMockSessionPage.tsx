import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  CheckCircle2,
  Clock3,
  Mic,
  MicOff,
  Sparkles,
  TerminalSquare,
  Upload,
  Wand2,
  BrainCircuit,
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
import { displayLanguageLabel, monacoLanguageFor } from '@/shared/lib/codeEditorLanguage';
import { APP_MONACO_THEME, configureAppMonacoTheme } from '@/shared/lib/monacoTheme';

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

          {!isViewingCurrentStage && viewedStage && (
            <section className="card dashboard-card interview-prep-workstation interview-prep-workstation--readonly">
              <div className="workstation-toolbar">
                <div className="workstation-toolbar__title">
                  <CheckCircle2 size={16} />
                  <span>Просмотр пройденного этапа</span>
                </div>
                <span className="badge">{viewedStage.status === 'completed' ? 'Завершён' : 'В процессе'}</span>
              </div>
              <div className="workstation-archive">
                <p className="interview-prep-muted">
                  Здесь можно просматривать старые этапы, не теряя текущий прогресс справа и сверху.
                </p>
                {viewedStage.reviewSummary && (
                  <div className="interview-prep-result-row interview-prep-result-row--stacked">
                    <strong>Итог ревью</strong>
                    <span>{viewedStage.reviewScore ? `${viewedStage.reviewScore}/10` : 'Без числовой оценки'}</span>
                    <span>{viewedStage.reviewSummary}</span>
                  </div>
                )}
                {(viewedStage.questionResults ?? []).length > 0 && (
                  <div className="console-review-gaps">
                    <span className="gaps-label">Follow-up вопросы:</span>
                    <ul>
                      {(viewedStage.questionResults ?? []).map((result) => (
                        <li key={result.id}>
                          {result.position}. {result.prompt} {result.answeredAt ? `(${result.score}/10)` : '(без ответа)'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {session.status !== 'finished' && isViewingCurrentStage && currentStage.status === 'solving' && currentStage.kind !== 'system_design' && (
            <section className="card dashboard-card interview-prep-workstation">
              <div className="workstation-toolbar">
                <div className="workstation-toolbar__title">
                  <TerminalSquare size={16} />
                  <span>Решение задачи</span>
                </div>
                <span className="badge">{displayLanguageLabel(currentStage.solveLanguage || currentStage.task?.language)}</span>
              </div>
              <div className="workstation-editor">
                <Editor
                  beforeMount={configureAppMonacoTheme}
                  language={monacoLanguageFor(currentStage.solveLanguage || currentStage.task?.language)}
                  value={code}
                  onChange={(value) => setCode(value ?? '')}
                  height={480}
                  theme={APP_MONACO_THEME}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    automaticLayout: true,
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    padding: { top: 16, bottom: 16 }
                  }}
                />
              </div>
              <div className="workstation-footer">
                <div className="form-group workstation-notes">
                  <label>Пояснения (опционально)</label>
                  <textarea
                    className="form-control"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Коротко объясни логику или trade-offs..."
                    rows={2}
                  />
                </div>
                {submitErrorDetails && (
                  <div className="interview-prep-compile-error">
                    <strong>Ошибка проверки</strong>
                    <pre>{submitErrorDetails}</pre>
                  </div>
                )}
                <button className="btn btn-primary workstation-submit" disabled={submitting} onClick={() => void handleSubmitStage()}>
                  <Wand2 size={16} />
                  {currentStage.task?.isExecutable ? 'Проверить решение' : 'Отправить на AI ревью'}
                </button>
              </div>
            </section>
          )}

          {session.status !== 'finished' && isViewingCurrentStage && currentStage.status === 'solving' && currentStage.kind === 'system_design' && (
            <section className="card dashboard-card interview-prep-workstation">
              <div className="workstation-toolbar">
                <div className="workstation-toolbar__title">
                  <Sparkles size={16} />
                  <span>System Design Workspace</span>
                </div>
              </div>
              <div className="workstation-design-grid">
                <div className="form-group upload-stage">
                  <label>Архитектурная схема</label>
                  <input
                    id="mock-design-upload"
                    className="interview-prep-upload-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => setDesignImage(event.target.files?.[0] ?? null)}
                  />
                  <label htmlFor="mock-design-upload" className="interview-prep-upload-control">
                    <span className="upload-trigger">
                      <Upload size={16} />
                      {designImage ? 'Заменить файл' : 'Загрузить схему'}
                    </span>
                    {designImage && <span className="upload-name">{designImage.name}</span>}
                  </label>
                </div>
                <div className="design-notes-grid">
                  {[
                    ['notes', 'Заметки'],
                    ['components', 'Компоненты'],
                    ['apis', 'API и очереди'],
                    ['databaseSchema', 'База и схемы'],
                  ].map(([key, label]) => (
                    <div key={key} className="form-group">
                      <label>{label}</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={(designInput as any)[key]}
                        onChange={(event) => setDesignInput((prev) => ({ ...prev, [key]: event.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="workstation-footer">
                <button className="btn btn-primary workstation-submit" disabled={submitting || !designImage} onClick={() => void handleReviewSystemDesign()}>
                  <Sparkles size={16} />
                  Получить AI обзор архитектуры
                </button>
              </div>
            </section>
          )}

          {session.status !== 'finished' && isViewingCurrentStage && currentStage.status === 'questions' && currentStage.currentQuestion && (
            <section className="card dashboard-card interview-prep-workstation">
              <div className="workstation-toolbar">
                <div className="workstation-toolbar__title">
                  <BrainCircuit size={16} />
                  <span>Follow-up вопрос #{currentStage.currentQuestion.position}</span>
                </div>
              </div>
              <div className="workstation-question-box">
                <blockquote>{currentStage.currentQuestion.prompt}</blockquote>
                <div className="question-input-wrap">
                  <div className="question-input-toolbar">
                    <button
                      type="button"
                      className={`btn ${speechActive ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                      disabled={!speechSupported}
                      onClick={toggleSpeech}
                    >
                      {speechActive ? <MicOff size={14} /> : <Mic size={14} />}
                      {speechActive ? 'Остановить' : 'Голосовой ввод'}
                    </button>
                  </div>
                  <textarea
                    className="form-control workstation-textarea"
                    rows={6}
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Напиши свой ответ или надиктуй его..."
                  />
                </div>
              </div>
              <div className="workstation-footer">
                <button className="btn btn-primary workstation-submit" disabled={submitting || !answerText.trim()} onClick={() => void handleAnswerQuestion()}>
                  Отправить ответ
                </button>
              </div>
            </section>
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
