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
  const [answerText, setAnswerText] = useState('');
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
    setDesignImage(null);
    setDesignInput(DESIGN_INITIAL_STATE);
  }, [session?.currentStage?.id]);

  useEffect(() => {
    return () => {
      if (speechRef.current) {
        speechRef.current.stop();
      }
    };
  }, []);

  const currentStage = session?.currentStage;
  const progress = useMemo(() => {
    const stages = session?.stages ?? [];
    const completed = stages.filter((stage) => stage.status === 'completed').length;
    return { completed, total: stages.length };
  }, [session]);

  const handleSubmitStage = async () => {
    if (!sessionId || !currentStage) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await interviewPrepApi.submitMockStage(sessionId, {
        code,
        language: currentStage.solveLanguage,
        notes,
      });
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
      <section className="card dashboard-card interview-prep-session-hero">
        <div>
          <div className="task-item__meta">
            <span className="badge">{session.companyTag}</span>
            <span className="badge">{STAGE_LABELS[currentStage.kind]}</span>
            {currentStage.task?.durationSeconds ? (
              <span className="badge">
                <Clock3 size={12} />
                {Math.round(currentStage.task.durationSeconds / 60)} мин
              </span>
            ) : null}
          </div>
          <h1>Mock interview</h1>
          <p className="code-rooms-subtitle">
            Один цельный сценарий по компании: code stage, follow-up вопросы и финальный system design.
          </p>
        </div>
        <div className="interview-prep-session-hero__aside">
          <div className="interview-prep-progress">
            <span>Этап</span>
            <strong>{progress.completed}/{progress.total}</strong>
          </div>
        </div>
      </section>

      {error && (
        <section className="card dashboard-card">
          <div className="error-text">{error}</div>
        </section>
      )}

      <section className="card dashboard-card interview-prep-filter-card">
        <div className="interview-prep-category-strip">
          {(session.stages ?? []).map((stage) => (
            <div
              key={stage.id}
              className={`interview-prep-category-card ${stage.stageIndex === session.currentStageIndex ? 'is-active' : ''} ${stage.status === 'completed' ? 'is-coding' : ''}`}
            >
              <span className="interview-prep-category-card__label">{STAGE_LABELS[stage.kind]}</span>
              <strong>{stage.status === 'completed' ? 'Done' : `#${stage.stageIndex + 1}`}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="interview-prep-session-grid">
        <article className="card dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <h2>{currentStage.task?.title ?? 'Текущий этап'}</h2>
              <p className="interview-prep-muted">
                {currentStage.kind === 'system_design'
                  ? 'Финальный этап: схема, пояснения и AI review.'
                  : 'Сдаёшь решение, затем отвечаешь на follow-up вопросы по этому же этапу.'}
              </p>
            </div>
          </div>
          <pre className="interview-prep-statement">{currentStage.task?.statement ?? ''}</pre>
        </article>

        <aside className="interview-prep-session-sidebar">
          <section className="card dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <h2>Статус этапа</h2>
                <p className="interview-prep-muted">{currentStage.status}</p>
              </div>
            </div>
            <div className="interview-prep-results">
              {(currentStage.questionResults ?? []).length === 0 ? (
                <div className="interview-prep-muted">Этот этап без follow-up вопросов.</div>
              ) : (
                currentStage.questionResults?.map((result) => (
                  <div key={result.id} className="interview-prep-result-row">
                    <span>Q{result.position}</span>
                    <strong>{result.answeredAt ? `${result.score}/10` : 'pending'}</strong>
                  </div>
                ))
              )}
            </div>
          </section>

          {(solutionReview || designReview) && (
            <section className="card dashboard-card">
              <div className="dashboard-card__header">
                <div>
                  <h2>AI review</h2>
                  <p className="interview-prep-muted">Короткая оценка текущего решения.</p>
                </div>
              </div>
              {'score' in (solutionReview || designReview || {}) && (
                <div className="interview-prep-design-review-score">
                  <span>Score</span>
                  <strong>{(solutionReview?.score ?? designReview?.score) || 0}/10</strong>
                </div>
              )}
              <p className="interview-prep-answer-preview">
                {solutionReview?.summary ?? designReview?.summary}
              </p>
            </section>
          )}

          {answerReview && (
            <section className="card dashboard-card">
              <div className="dashboard-card__header">
                <div>
                  <h2>Разбор ответа</h2>
                  <p className="interview-prep-muted">Ответ пользователя не сохраняется, только оценка.</p>
                </div>
              </div>
              <div className="interview-prep-design-review-score">
                <span>Score</span>
                <strong>{answerReview.score}/10</strong>
              </div>
              <p className="interview-prep-answer-preview">{answerReview.summary}</p>
            </section>
          )}
        </aside>
      </section>

      {session.status === 'finished' && (
        <section className="card dashboard-card interview-prep-finished">
          <CheckCircle2 size={18} />
          <div>
            <strong>Mock interview завершён</strong>
            <p className="interview-prep-muted">Все этапы пройдены. Можно запускать новый сценарий под другую компанию.</p>
          </div>
        </section>
      )}

      {session.status !== 'finished' && currentStage.status === 'solving' && currentStage.kind !== 'system_design' && (
        <section className="card dashboard-card interview-prep-live-card">
          <div className="interview-prep-live-toolbar">
            <div className="interview-prep-block-title">
              <TerminalSquare size={16} />
              <span>Рабочее окно</span>
            </div>
            <div className="task-item__meta">
              <span className="badge interview-prep-badge--language">{displayLanguageLabel(currentStage.solveLanguage || currentStage.task?.language)}</span>
            </div>
          </div>
          <div className="interview-prep-live-editor">
            <Editor
              language={monacoLanguageFor(currentStage.solveLanguage || currentStage.task?.language)}
              value={code}
              onChange={(value) => setCode(value ?? '')}
              height={520}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true,
              }}
            />
          </div>
          <div className="interview-prep-design-review-grid">
            <div className="form-group interview-prep-notes-field">
              <label>Пояснения к решению</label>
              <textarea
                className="form-control interview-prep-notes-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Коротко объясни trade-off, структуру данных, ограничения."
                rows={5}
              />
            </div>
          </div>
          <div className="interview-prep-live-actions interview-prep-live-actions--inline">
            <button className="btn btn-primary" disabled={submitting} onClick={() => void handleSubmitStage()}>
              <Wand2 size={16} />
              {currentStage.task?.isExecutable ? 'Проверить и перейти дальше' : 'Отправить на AI review'}
            </button>
          </div>
        </section>
      )}

      {session.status !== 'finished' && currentStage.status === 'solving' && currentStage.kind === 'system_design' && (
        <section className="card dashboard-card interview-prep-design-review-card">
          <div className="dashboard-card__header">
            <div>
              <h2>Система и схема</h2>
              <p className="interview-prep-muted">Загрузи скрин архитектуры и пояснения по блокам.</p>
            </div>
            <Sparkles size={18} />
          </div>
          <div className="interview-prep-design-review-grid">
            <div className="form-group interview-prep-upload-field">
              <label>Скриншот архитектуры</label>
              <input
                id="mock-design-upload"
                className="interview-prep-upload-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setDesignImage(event.target.files?.[0] ?? null)}
              />
              <label htmlFor="mock-design-upload" className="interview-prep-upload-control">
                <span className="interview-prep-upload-trigger">
                  <Upload size={16} />
                  Выбрать файл
                </span>
                <span className={`interview-prep-upload-filename ${designImage ? 'is-selected' : ''}`}>
                  <span className="interview-prep-upload-name">{designImage?.name ?? 'PNG / JPEG / WEBP до 6MB'}</span>
                </span>
              </label>
            </div>
            {[
              ['notes', 'Заметки'],
              ['components', 'Компоненты'],
              ['apis', 'API и очереди'],
              ['databaseSchema', 'База и схемы'],
              ['traffic', 'Нагрузка'],
              ['reliability', 'Надёжность'],
            ].map(([key, label]) => (
              <div key={key} className="form-group interview-prep-notes-field">
                <label>{label}</label>
                <textarea
                  className="form-control interview-prep-notes-input"
                  rows={4}
                  value={(designInput as any)[key]}
                  onChange={(event) => setDesignInput((prev) => ({ ...prev, [key]: event.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="interview-prep-live-actions interview-prep-live-actions--inline">
            <button className="btn btn-primary" disabled={submitting || !designImage} onClick={() => void handleReviewSystemDesign()}>
              <Sparkles size={16} />
              Отправить на AI review
            </button>
          </div>
        </section>
      )}

      {session.status !== 'finished' && currentStage.status === 'questions' && currentStage.currentQuestion && (
        <section className="card dashboard-card interview-prep-question-card">
          <div className="dashboard-card__header">
            <div>
              <h2>Follow-up вопрос #{currentStage.currentQuestion.position}</h2>
              <p className="interview-prep-muted">Можно надиктовать ответ голосом, проверить текст и только потом отправить.</p>
            </div>
          </div>
          <div className="interview-prep-question-review">
            <strong>{currentStage.currentQuestion.prompt}</strong>
          </div>
          <div className="interview-prep-question-toolbar">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!speechSupported}
              onClick={toggleSpeech}
            >
              {speechActive ? <MicOff size={16} /> : <Mic size={16} />}
              {speechActive ? 'Остановить запись' : 'Надиктовать ответ'}
            </button>
            {!speechSupported && <span className="interview-prep-muted">Speech API недоступен в этом браузере.</span>}
          </div>
          <div className="form-group interview-prep-notes-field">
            <label>Текст ответа перед отправкой</label>
            <textarea
              className="form-control interview-prep-notes-input"
              rows={7}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Текст не хранится на бэке: он только валидируется, отправляется в AI reviewer и сразу отбрасывается."
            />
          </div>
          <div className="interview-prep-question-actions">
            <button className="btn btn-primary" disabled={submitting || !answerText.trim()} onClick={() => void handleAnswerQuestion()}>
              Проверить ответ
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
