import { ArrowLeft, BrainCircuit, CheckCircle2, CircleDashed, Clock3, Mic, MicOff, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  InterviewPrepAnswerReview,
  InterviewPrepCheckpoint,
  InterviewPrepQuestion,
  InterviewPrepSession,
  InterviewPrepTask,
} from '@/features/InterviewPrep/api/interviewPrepApi';
import { displayLanguageLabel } from '@/shared/lib/codeEditorLanguage';
import { resultLabel } from '../lib/interviewPrepSessionHelpers';

function ShieldBadge({ status }: { status: InterviewPrepCheckpoint['status'] }) {
  return (
    <span className={`badge interview-prep-checkpoint-badge interview-prep-checkpoint-badge--${status}`}>
      <ShieldCheck size={12} />
      {status}
    </span>
  );
}

export function SessionHero({
  task,
  answeredCount,
  checkpoint,
  nowTs,
}: {
  task: InterviewPrepTask | null | undefined;
  answeredCount: number;
  checkpoint: InterviewPrepCheckpoint | null;
  nowTs: number;
}) {
  const remainingSeconds = checkpoint
    ? Math.max(0, Math.floor((new Date(checkpoint.startedAt).getTime() + checkpoint.durationSeconds * 1000 - nowTs) / 1000))
    : 0;
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const remainingRemainder = remainingSeconds % 60;

  return (
    <section className="card dashboard-card interview-prep-session-hero">
      <div>
        <Link to="/growth/interview-prep" className="interview-prep-back-link">
          <ArrowLeft size={14} />
          <span>Назад к задачам</span>
        </Link>
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
          {checkpoint
            ? 'Checkpoint mode: ограниченное время, ограниченные попытки и сразу verified signal в профиле после успешной сдачи.'
            : 'Сначала решаешь задачу, затем честно отмечаешь, на какие follow-up вопросы смог ответить без подсказки.'}
        </p>
      </div>
      <div className="interview-prep-session-hero__aside">
        {checkpoint && (
          <div className={`interview-prep-progress interview-prep-progress--checkpoint interview-prep-progress--${checkpoint.status}`}>
            <span>Checkpoint</span>
            <strong>
              {checkpoint.status === 'active'
                ? `${remainingMinutes}:${String(remainingRemainder).padStart(2, '0')}`
                : checkpoint.status}
            </strong>
            <small>{checkpoint.attemptsUsed} / {checkpoint.maxAttempts} попыток</small>
          </div>
        )}
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
  checkpoint,
  canShowQuestions,
  answering,
  answerText,
  answerReview,
  speechSupported,
  speechActive,
  onAnswerTextChange,
  onToggleSpeech,
  onAnswer,
}: {
  session: InterviewPrepSession;
  checkpoint: InterviewPrepCheckpoint | null;
  canShowQuestions: boolean;
  answering: boolean;
  answerText: string;
  answerReview: InterviewPrepAnswerReview | null;
  speechSupported: boolean;
  speechActive: boolean;
  onAnswerTextChange: (value: string) => void;
  onToggleSpeech: () => void;
  onAnswer: (selfAssessment: 'answered' | 'skipped') => void;
}) {
  if (checkpoint) {
    return (
      <section className="card dashboard-card interview-prep-question-card">
        <div className="dashboard-card__header">
          <div>
            <h2>Checkpoint rules</h2>
            <p className="interview-prep-muted">В checkpoint follow-up отключены. Подтвержденный сигнал строится только по timed submit.</p>
          </div>
          <ShieldBadge status={checkpoint.status} />
        </div>
        <div className="interview-prep-muted">
          {checkpoint.status === 'active' && 'Сдай задачу вовремя. После accepted сессия завершится и результат уйдет в verified skill.'}
          {checkpoint.status === 'passed' && `Checkpoint passed. В профиль ушел verified score ${checkpoint.score}.`}
          {checkpoint.status === 'failed' && 'Checkpoint failed: попытки закончились.'}
          {checkpoint.status === 'expired' && 'Checkpoint expired: время закончилось.'}
        </div>
      </section>
    );
  }

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
            <p className="interview-prep-muted">Отвечай текстом или голосом, затем отправляй ответ на AI-проверку.</p>
          </div>
          <BrainCircuit size={18} />
        </div>
        <div className="interview-prep-question-prompt">{session.currentQuestion.prompt}</div>
        <div className="question-input-wrap">
          <div className="question-input-toolbar">
            <button
              type="button"
              className={`btn ${speechActive ? 'btn-danger' : 'btn-secondary'} btn-sm`}
              disabled={!speechSupported || answering}
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
            onChange={(event) => onAnswerTextChange(event.target.value)}
            placeholder="Напиши свой ответ или надиктуй его..."
          />
        </div>
        <div className="interview-prep-question-actions">
          <button className="btn btn-primary" onClick={() => onAnswer('answered')} disabled={answering || !answerText.trim()}>
            <Sparkles size={16} />
            <span>{answering ? 'Проверяю...' : 'Отправить на AI разбор'}</span>
          </button>
          <button className="btn btn-secondary" onClick={() => onAnswer('skipped')} disabled={answering}>
            <XCircle size={16} />
            <span>{answering ? 'Сохраняю...' : 'Не ответил'}</span>
          </button>
        </div>
        {answerReview && (
          <div className="console-card console-card--ai">
            <div className="console-card__header">
              <Sparkles size={14} />
              AI Валидация ответа
            </div>
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
                    {answerReview.gaps.map((gap, index) => <li key={index}>{gap}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        )}
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
