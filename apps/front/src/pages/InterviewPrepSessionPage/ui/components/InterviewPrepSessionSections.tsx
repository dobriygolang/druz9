import Editor from '@monaco-editor/react';
import { CheckCircle2, ChevronDown, ChevronUp, CircleDashed, Clock3, Play, TerminalSquare, Upload, XCircle } from 'lucide-react';

import {
  InterviewPrepQuestion,
  InterviewPrepSession,
  InterviewPrepSystemDesignReview,
  InterviewPrepSystemDesignReviewInput,
  InterviewPrepTask,
} from '@/features/InterviewPrep/api/interviewPrepApi';
import { displayLanguageLabel, monacoLanguageFor } from '@/shared/lib/codeEditorLanguage';
import { resultLabel, SqlStarterTab } from '../lib/interviewPrepSessionHelpers';

export function SessionHero({
  task,
  answeredCount,
}: {
  task: InterviewPrepTask | null | undefined;
  answeredCount: number;
}) {
  return (
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
          <strong>{answeredCount}</strong>
        </div>
      </div>
    </section>
  );
}

export function SessionSidebar({
  session,
  revealedQuestion,
  revealedHistory,
}: {
  session: InterviewPrepSession;
  revealedQuestion: InterviewPrepQuestion | null;
  revealedHistory: InterviewPrepQuestion[];
}) {
  return (
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
                <strong>{resultLabel[result.selfAssessment as keyof typeof resultLabel]}</strong>
              </div>
            ))
          )}
        </div>
      </section>

      {revealedQuestion && (
        <section className="card dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <h2>Последний раскрытый ответ</h2>
              <p className="interview-prep-muted">Можно быстро вернуться к последнему разобранному follow-up.</p>
            </div>
          </div>
          <div className="interview-prep-question-review">
            <strong>#{revealedQuestion.position} {revealedQuestion.prompt}</strong>
            <p>{revealedQuestion.answer}</p>
          </div>
        </section>
      )}

      {revealedHistory.length > 0 && (
        <section className="card dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <h2>История follow-up</h2>
              <p className="interview-prep-muted">Все вопросы, которые уже были раскрыты в этой сессии.</p>
            </div>
          </div>
          <div className="interview-prep-results">
            {revealedHistory.map((question) => (
              <div key={question.id} className="interview-prep-result-row interview-prep-result-row--stacked">
                <strong>#{question.position} {question.prompt}</strong>
                <span>{question.answer}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}

export function FollowUpSection({
  session,
  canShowQuestions,
  answering,
  onAnswer,
}: {
  session: InterviewPrepSession;
  canShowQuestions: boolean;
  answering: boolean;
  onAnswer: (selfAssessment: 'answered' | 'skipped') => void;
}) {
  if (session.status === 'finished') {
    return (
      <section className="card dashboard-card interview-prep-finished">
        <CheckCircle2 size={18} />
        <span>Сессия завершена. Можешь взять следующую задачу или пройти эту заново позже.</span>
      </section>
    );
  }

  if (canShowQuestions && session.currentQuestion) {
    return (
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
          <button className="btn btn-primary" onClick={() => onAnswer('answered')} disabled={answering}>
            <CheckCircle2 size={16} />
            <span>{answering ? 'Сохраняю...' : 'Ответил сам'}</span>
          </button>
          <button className="btn btn-secondary" onClick={() => onAnswer('skipped')} disabled={answering}>
            <XCircle size={16} />
            <span>{answering ? 'Сохраняю...' : 'Не ответил'}</span>
          </button>
        </div>
      </section>
    );
  }

  if (session.task?.isExecutable && !session.lastSubmissionPassed) {
    return (
      <section className="card dashboard-card interview-prep-question-card">
        <div className="dashboard-card__header">
          <div>
            <h2>Follow-up вопросы</h2>
            <p className="interview-prep-muted">Откроются сразу после `accepted` по live-coding части.</p>
          </div>
          <CircleDashed size={18} />
        </div>
        <div className="interview-prep-muted">
          Сейчас follow-up скрыты, потому что автопроверка ещё не пройдена.
        </div>
      </section>
    );
  }

  if (!session.currentQuestion) {
    return (
      <section className="card dashboard-card interview-prep-question-card">
        <div className="dashboard-card__header">
          <div>
            <h2>Follow-up вопросы</h2>
            <p className="interview-prep-muted">Для этой задачи пока не найдено ни одного привязанного follow-up вопроса.</p>
          </div>
          <CircleDashed size={18} />
        </div>
      </section>
    );
  }

  return null;
}

export function LiveCodingSection({
  task,
  canSubmitExecutable,
  solveLanguage,
  solveLanguageOptions,
  sqlStarterTab,
  sqlStarterValue,
  editorHeight,
  isResizingEditor,
  submitting,
  code,
  submitResult,
  onLanguageChange,
  onSqlStarterTabChange,
  onEditorHeightChange,
  onResizeStart,
  onCodeChange,
  onSubmitCode,
}: {
  task: InterviewPrepTask;
  canSubmitExecutable: boolean;
  solveLanguage: string;
  solveLanguageOptions: string[];
  sqlStarterTab: SqlStarterTab;
  sqlStarterValue: string;
  editorHeight: number;
  isResizingEditor: boolean;
  submitting: boolean;
  code: string;
  submitResult: {
    passed: boolean;
    lastError: string;
    passedCount: number;
    totalCount: number;
    failedTestIndex: number;
    failureKind: string;
  } | null;
  onLanguageChange: (value: string) => void;
  onSqlStarterTabChange: (value: SqlStarterTab) => void;
  onEditorHeightChange: (nextHeight: number) => void;
  onResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCodeChange: (value: string) => void;
  onSubmitCode: () => void;
}) {
  return (
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
        <span className="badge interview-prep-badge interview-prep-badge--language">{displayLanguageLabel(solveLanguage)}</span>
        {solveLanguageOptions.length > 1 && (
          <div className="interview-prep-language-switcher">
            {solveLanguageOptions.map((language) => (
              <button
                key={language}
                type="button"
                className={`pill-selector__pill ${solveLanguage === language ? 'active' : ''}`}
                onClick={() => onLanguageChange(language)}
              >
                {displayLanguageLabel(language)}
              </button>
            ))}
          </div>
        )}
        {task.language === 'sql' && task.starterCode && (
          <div className="interview-prep-language-switcher">
            <button
              type="button"
              className={`pill-selector__pill ${sqlStarterTab === 'schema' ? 'active' : ''}`}
              onClick={() => onSqlStarterTabChange('schema')}
            >
              Схема
            </button>
            <button
              type="button"
              className={`pill-selector__pill ${sqlStarterTab === 'examples' ? 'active' : ''}`}
              onClick={() => onSqlStarterTabChange('examples')}
            >
              Примеры
            </button>
          </div>
        )}
        <span className={`badge interview-prep-badge ${canSubmitExecutable && task ? '' : 'badge-secondary'}`}>
          {canSubmitExecutable
            ? 'Ожидается accepted'
            : 'Черновик для live-coding'}
        </span>
        <div className="interview-prep-live-spacer" />
        <div className="interview-prep-live-size-controls">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onEditorHeightChange(Math.max(360, editorHeight - 120))}
          >
            <ChevronUp size={16} />
            <span>Компактнее</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onEditorHeightChange(Math.min(1080, editorHeight + 120))}
          >
            <ChevronDown size={16} />
            <span>Выше</span>
          </button>
        </div>
      </div>
      <div className="interview-prep-live-editor" style={{ height: `${editorHeight}px` }}>
        {task.language === 'sql' && task.starterCode && (
          <div className="interview-prep-live-editor__context">
            <div className="interview-prep-live-editor__context-label">
              {sqlStarterTab === 'schema' ? 'Схема БД' : 'Примеры данных'}
            </div>
            <pre className="interview-prep-live-editor__context-text">{sqlStarterValue}</pre>
          </div>
        )}
        <Editor
          key={`${task.id}-${solveLanguage}`}
          height={`${editorHeight}px`}
          defaultLanguage={monacoLanguageFor(solveLanguage)}
          language={monacoLanguageFor(solveLanguage)}
          value={code}
          onChange={(value) => onCodeChange(value ?? '')}
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
        onMouseDown={onResizeStart}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Изменить высоту live coding editor"
      />
      <div className="interview-prep-live-actions interview-prep-live-actions--inline">
        <button className="btn btn-primary" onClick={onSubmitCode} disabled={submitting || !canSubmitExecutable}>
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
  );
}

export function DesignReviewSection({
  reviewingDesign,
  designImage,
  designReviewInput,
  designReview,
  onDesignImageChange,
  onDesignReviewInputChange,
  onReview,
}: {
  reviewingDesign: boolean;
  designImage: File | null;
  designReviewInput: InterviewPrepSystemDesignReviewInput;
  designReview: InterviewPrepSystemDesignReview | null;
  onDesignImageChange: (file: File | null) => void;
  onDesignReviewInputChange: (value: React.SetStateAction<InterviewPrepSystemDesignReviewInput>) => void;
  onReview: () => void;
}) {
  return (
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
            className="interview-prep-upload-input"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => onDesignImageChange(event.target.files?.[0] ?? null)}
          />
          <div className="interview-prep-upload-control">
            <span className="interview-prep-upload-trigger">
              <Upload size={16} />
              <span>{designImage ? 'Заменить файл' : 'Выбрать файл'}</span>
            </span>
            <span className={`interview-prep-upload-filename ${designImage ? 'is-selected' : ''}`}>
              {designImage?.name ?? 'PNG, JPG или WEBP до 5 MB'}
            </span>
          </div>
          <span className="interview-prep-muted">
            PNG, JPG или WEBP, до 5 MB. Подходит скриншот из Excalidraw, Figma или Miro.
          </span>
        </label>

        <label className="interview-prep-notes-field">
          <span className="interview-prep-block-title">Контекст для модели</span>
          <textarea
            className="input interview-prep-notes-input"
            placeholder={"Опиши задачу своими словами.\nЧто за сервис или продукт?\nКакие части на схеме намеренно упрощены?\nКакие trade-off ты выбрал сознательно?"}
            value={designReviewInput.notes}
            onChange={(event) => onDesignReviewInputChange((prev) => ({ ...prev, notes: event.target.value }))}
            rows={5}
          />
        </label>
      </div>

      <div className="interview-prep-design-review-grid">
        <label className="interview-prep-notes-field">
          <span className="interview-prep-block-title">Компоненты</span>
          <textarea
            className="input interview-prep-notes-input"
            placeholder={"Например:\n- API Gateway\n- Auth Service\n- Order Service\n- Worker pool\n- Redis cache\n- Kafka / queue"}
            value={designReviewInput.components}
            onChange={(event) => onDesignReviewInputChange((prev) => ({ ...prev, components: event.target.value }))}
            rows={4}
          />
        </label>

        <label className="interview-prep-notes-field">
          <span className="interview-prep-block-title">Ручки и контракты</span>
          <textarea
            className="input interview-prep-notes-input"
            placeholder={"Например:\nPOST /orders\nGET /feed\norder.created event\ngrpc UserService/GetProfile"}
            value={designReviewInput.apis}
            onChange={(event) => onDesignReviewInputChange((prev) => ({ ...prev, apis: event.target.value }))}
            rows={4}
          />
        </label>

        <label className="interview-prep-notes-field">
          <span className="interview-prep-block-title">Базы данных и таблицы</span>
          <textarea
            className="input interview-prep-notes-input"
            placeholder={"Например:\nusers(id, ...)\norders(id, user_id, status)\npayments(order_id, state)\nИндексы, shard key, Redis keys, TTL"}
            value={designReviewInput.databaseSchema}
            onChange={(event) => onDesignReviewInputChange((prev) => ({ ...prev, databaseSchema: event.target.value }))}
            rows={4}
          />
        </label>

        <label className="interview-prep-notes-field">
          <span className="interview-prep-block-title">Нагрузка</span>
          <textarea
            className="input interview-prep-notes-input"
            placeholder={"Например:\n20k RPS reads\n2k RPS writes\n5M DAU\np95 < 200ms\nпик в 5x во время акции"}
            value={designReviewInput.traffic}
            onChange={(event) => onDesignReviewInputChange((prev) => ({ ...prev, traffic: event.target.value }))}
            rows={4}
          />
        </label>

        <label className="interview-prep-notes-field">
          <span className="interview-prep-block-title">Надёжность и scaling</span>
          <textarea
            className="input interview-prep-notes-input"
            placeholder={"Например:\nretries + idempotency\nreplication/failover\nbackpressure\nrate limit\nSLO/alerts/tracing"}
            value={designReviewInput.reliability}
            onChange={(event) => onDesignReviewInputChange((prev) => ({ ...prev, reliability: event.target.value }))}
            rows={4}
          />
        </label>
      </div>

      <div className="interview-prep-live-actions">
        <button className="btn btn-primary" onClick={onReview} disabled={reviewingDesign || !designImage}>
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
  );
}
