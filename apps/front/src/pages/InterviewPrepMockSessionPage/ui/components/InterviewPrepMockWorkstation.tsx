import Editor from '@monaco-editor/react';
import {
  BrainCircuit,
  CheckCircle2,
  Mic,
  MicOff,
  Sparkles,
  TerminalSquare,
  Upload,
  Wand2,
} from 'lucide-react';

import {
  InterviewPrepAnswerReview,
  InterviewPrepMockSession,
  InterviewPrepMockStage,
  InterviewPrepSolutionReview,
  InterviewPrepSystemDesignReview,
  InterviewPrepSystemDesignReviewInput,
} from '@/features/InterviewPrep/api/interviewPrepApi';
import { displayLanguageLabel, monacoLanguageFor } from '@/shared/lib/codeEditorLanguage';
import { APP_MONACO_THEME, configureAppMonacoTheme } from '@/shared/lib/monacoTheme';

const DESIGN_FIELD_KEYS = [
  ['notes', 'Заметки'],
  ['components', 'Компоненты'],
  ['apis', 'API и очереди'],
  ['databaseSchema', 'База и схемы'],
] as const;

type MockWorkstationProps = {
  session: InterviewPrepMockSession;
  currentStage: InterviewPrepMockStage;
  viewedStage: InterviewPrepMockStage;
  isViewingCurrentStage: boolean;
  code: string;
  notes: string;
  submitting: boolean;
  designImage: File | null;
  designInput: InterviewPrepSystemDesignReviewInput;
  designReview: InterviewPrepSystemDesignReview | null;
  solutionReview: InterviewPrepSolutionReview | null;
  answerReview: InterviewPrepAnswerReview | null;
  submitErrorDetails: string | null;
  answerText: string;
  speechSupported: boolean;
  speechActive: boolean;
  onReturnToCurrentStage: () => void;
  onCodeChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSubmitStage: () => void;
  onDesignImageChange: (file: File | null) => void;
  onDesignInputChange: React.Dispatch<React.SetStateAction<InterviewPrepSystemDesignReviewInput>>;
  onReviewSystemDesign: () => void;
  onAnswerTextChange: (value: string) => void;
  onToggleSpeech: () => void;
  onAnswerQuestion: () => void;
};

export function InterviewPrepMockWorkstation({
  session,
  currentStage,
  viewedStage,
  isViewingCurrentStage,
  code,
  notes,
  submitting,
  designImage,
  designInput,
  designReview,
  solutionReview,
  answerReview,
  submitErrorDetails,
  answerText,
  speechSupported,
  speechActive,
  onReturnToCurrentStage,
  onCodeChange,
  onNotesChange,
  onSubmitStage,
  onDesignImageChange,
  onDesignInputChange,
  onReviewSystemDesign,
  onAnswerTextChange,
  onToggleSpeech,
  onAnswerQuestion,
}: MockWorkstationProps) {
  if (!isViewingCurrentStage) {
    return (
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
          <button type="button" className="btn btn-secondary btn-sm" onClick={onReturnToCurrentStage}>
            Вернуться к текущему этапу
          </button>
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
    );
  }

  if (session.status === 'finished') {
    return null;
  }

  if (currentStage.status === 'solving' && currentStage.kind !== 'system_design') {
    return (
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
            onChange={(value) => onCodeChange(value ?? '')}
            height={480}
            theme={APP_MONACO_THEME}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              automaticLayout: true,
              roundedSelection: false,
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
            }}
          />
        </div>
        <div className="workstation-footer">
          <div className="form-group workstation-notes">
            <label>Пояснения (опционально)</label>
            <textarea
              className="form-control"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
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
          <button className="btn btn-primary workstation-submit" disabled={submitting} onClick={onSubmitStage}>
            <Wand2 size={16} />
            {currentStage.task?.isExecutable ? 'Проверить решение' : 'Отправить на AI ревью'}
          </button>
        </div>
      </section>
    );
  }

  if (currentStage.status === 'solving' && currentStage.kind === 'system_design') {
    return (
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
              onChange={(event) => onDesignImageChange(event.target.files?.[0] ?? null)}
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
            {DESIGN_FIELD_KEYS.map(([key, label]) => (
              <div key={key} className="form-group">
                <label>{label}</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={designInput[key]}
                  onChange={(event) => onDesignInputChange((prev) => ({ ...prev, [key]: event.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="workstation-footer">
          <button className="btn btn-primary workstation-submit" disabled={submitting || !designImage} onClick={onReviewSystemDesign}>
            <Sparkles size={16} />
            Получить AI обзор архитектуры
          </button>
        </div>
      </section>
    );
  }

  if (currentStage.status === 'questions' && currentStage.currentQuestion) {
    return (
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
                onClick={onToggleSpeech}
              >
                {speechActive ? <MicOff size={14} /> : <Mic size={14} />}
                {speechActive ? 'Остановить' : 'Голосовой ввод'}
              </button>
            </div>
            <textarea
              className="form-control workstation-textarea"
              rows={6}
              value={answerText}
              onChange={(e) => onAnswerTextChange(e.target.value)}
              placeholder="Напиши свой ответ или надиктуй его..."
            />
          </div>
        </div>
        <div className="workstation-footer">
          <button className="btn btn-primary workstation-submit" disabled={submitting || !answerText.trim()} onClick={onAnswerQuestion}>
            Отправить ответ
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      {(solutionReview || designReview || answerReview) && (
        <section className="card dashboard-card console-card console-card--ai">
          <div className="console-card__header">
            <Sparkles size={14} />
            AI Ревью этапа
          </div>
          <div className="console-review-body">
            {'score' in (solutionReview || designReview || {}) && (
              <div className="console-review-score">
                <span className="label">Оценка</span>
                <span className="value">{(solutionReview?.score ?? designReview?.score) || answerReview?.score || 0} / 10</span>
              </div>
            )}
            <p className="console-review-text">{solutionReview?.summary ?? designReview?.summary ?? answerReview?.summary}</p>
          </div>
        </section>
      )}
    </>
  );
}
