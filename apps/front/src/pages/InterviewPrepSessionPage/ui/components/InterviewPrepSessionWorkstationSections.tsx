import Editor from '@monaco-editor/react';
import { ChevronDown, ChevronUp, Play, TerminalSquare, Upload } from 'lucide-react';

import {
  InterviewPrepCheckpoint,
  InterviewPrepSystemDesignReview,
  InterviewPrepSystemDesignReviewInput,
  InterviewPrepTask,
} from '@/features/InterviewPrep/api/interviewPrepApi';
import { displayLanguageLabel, monacoLanguageFor } from '@/shared/lib/codeEditorLanguage';
import { APP_MONACO_THEME, configureAppMonacoTheme } from '@/shared/lib/monacoTheme';
import { SqlStarterTab } from '../lib/interviewPrepSessionHelpers';

export function LiveCodingSection({
  task,
  checkpoint,
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
  checkpoint: InterviewPrepCheckpoint | null;
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
            {checkpoint
              ? 'Checkpoint mode: follow-up отключены, время ограничено, verified signal дается только за успешный timed submit.'
              : 'У каждого пользователя свой editor и свой `session_id`, поэтому решения одной и той же задачи не пересекаются.'}
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
          beforeMount={configureAppMonacoTheme}
          defaultLanguage={monacoLanguageFor(solveLanguage)}
          language={monacoLanguageFor(solveLanguage)}
          value={code}
          onChange={(value) => onCodeChange(value ?? '')}
          theme={APP_MONACO_THEME}
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
            </span>
          </div>
          <p>{designReview.summary}</p>
          {designReview.strengths?.length ? (
            <div className="console-review-gaps">
              <span className="gaps-label">Сильные стороны:</span>
              <ul>
                {designReview.strengths.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </div>
          ) : null}
          {designReview.issues?.length ? (
            <div className="console-review-gaps">
              <span className="gaps-label">Что улучшить:</span>
              <ul>
                {designReview.issues.map((item: string, index: number) => <li key={index}>{item}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
