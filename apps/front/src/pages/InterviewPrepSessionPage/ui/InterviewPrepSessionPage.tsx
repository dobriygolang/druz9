import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  InterviewPrepAnswerReview,
  InterviewPrepCheckpoint,
  interviewPrepApi,
  InterviewPrepQuestion,
  InterviewPrepSession,
  InterviewPrepSystemDesignReview,
  InterviewPrepSystemDesignReviewInput,
} from '@/features/InterviewPrep/api/interviewPrepApi';
import {
  DesignReviewSection,
  FollowUpSection,
  LiveCodingSection,
  SessionHero,
  SessionSidebar,
} from './components/InterviewPrepSessionSections';
import {
  appendRevealedQuestion,
  parseSqlStarterSections,
  sanitizeLiveCodingDraft,
  SqlStarterTab,
  starterForLanguage,
} from './lib/interviewPrepSessionHelpers';

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

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const candidate = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return typeof candidate === 'function' ? candidate : null;
}

export function InterviewPrepSessionPage() {
  const { sessionId = '' } = useParams();
  const [session, setSession] = useState<InterviewPrepSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answering, setAnswering] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [answerReview, setAnswerReview] = useState<InterviewPrepAnswerReview | null>(null);
  const [checkpoint, setCheckpoint] = useState<InterviewPrepCheckpoint | null>(null);
  const [revealedQuestion, setRevealedQuestion] = useState<InterviewPrepQuestion | null>(null);
  const [revealedHistory, setRevealedHistory] = useState<InterviewPrepQuestion[]>([]);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewingDesign, setReviewingDesign] = useState(false);
  const [designReviewInput, setDesignReviewInput] = useState<InterviewPrepSystemDesignReviewInput>({
    notes: '',
    components: '',
    apis: '',
    databaseSchema: '',
    traffic: '',
    reliability: '',
  });
  const [designImage, setDesignImage] = useState<File | null>(null);
  const [designReview, setDesignReview] = useState<InterviewPrepSystemDesignReview | null>(null);
  const [editorHeight, setEditorHeight] = useState(560);
  const [solveLanguage, setSolveLanguage] = useState('go');
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [sqlStarterTab, setSqlStarterTab] = useState<SqlStarterTab>('schema');
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(560);
  const [isResizingEditor, setIsResizingEditor] = useState(false);
  const [speechSupported] = useState(Boolean(getSpeechRecognitionCtor()));
  const [speechActive, setSpeechActive] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const speechRef = useRef<any>(null);
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
    if (!sessionId) {
      setCheckpoint(null);
      return;
    }
    interviewPrepApi.getCheckpoint(sessionId)
      .then(setCheckpoint)
      .catch(() => setCheckpoint(null));
  }, [sessionId]);

  useEffect(() => {
    if (!checkpoint || checkpoint.status !== 'active') {
      return;
    }
    const id = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [checkpoint]);

  useEffect(() => {
    const fallbackLanguage = session?.solveLanguage || session?.task?.supportedLanguages?.[0] || session?.task?.language || 'go';
    setSolveLanguage(fallbackLanguage);
  }, [session?.id, session?.solveLanguage, session?.task?.language, session?.task?.supportedLanguages]);

  useEffect(() => {
    const fallbackLanguage = session?.solveLanguage || session?.task?.supportedLanguages?.[0] || session?.task?.language || 'go';
    const nextDraft = sanitizeLiveCodingDraft(
      session?.code,
      session?.task?.language,
      fallbackLanguage,
      session?.task?.starterCode,
      session?.task?.runnerMode,
    );
    setCodeDrafts({ [fallbackLanguage]: nextDraft });
    setCode(nextDraft);
  }, [session?.id, session?.code, session?.solveLanguage, session?.task?.language, session?.task?.supportedLanguages, session?.task?.starterCode, session?.task?.runnerMode]);

  useEffect(() => {
    setRevealedHistory([]);
    setRevealedQuestion(null);
    setAnswerText('');
    setAnswerReview(null);
  }, [session?.id]);

  useEffect(() => {
    setAnswerText('');
    setAnswerReview(null);
    if (speechRef.current) {
      speechRef.current.stop();
    }
    setSpeechActive(false);
  }, [session?.currentQuestion?.id]);

  useEffect(() => () => {
    if (speechRef.current) {
      speechRef.current.stop();
    }
  }, []);

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
  ) && !checkpoint;
  const showLiveCoding = Boolean(session?.task?.starterCode && session?.task?.isExecutable);
  const canSubmitExecutable = Boolean(session?.task?.isExecutable);
  const showSystemDesignReview = session?.task?.prepType === 'system_design';
  const solveLanguageOptions = session?.task?.supportedLanguages?.length
    ? session.task.supportedLanguages
    : (session?.task?.language ? [session.task.language] : []);
  const starterCodePreview = session?.task?.starterCode ?? '';
  const sqlStarterSections = useMemo(() => parseSqlStarterSections(starterCodePreview), [starterCodePreview]);
  const sqlStarterValue = sqlStarterTab === 'schema'
    ? sqlStarterSections.schema
    : sqlStarterSections.examples;

  const switchSolveLanguage = (nextLanguage: string) => {
    setSolveLanguage(nextLanguage);
    const nextDraft = codeDrafts[nextLanguage] ?? starterForLanguage(session?.task?.language, nextLanguage, session?.task?.starterCode, session?.task?.runnerMode);
    setCode(nextDraft);
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
      if (checkpoint) {
        try {
          const nextCheckpoint = await interviewPrepApi.getCheckpoint(sessionId);
          setCheckpoint(nextCheckpoint);
        } catch {
          setCheckpoint(null);
        }
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
      const response = await interviewPrepApi.answerQuestion(
        sessionId,
        session.currentQuestion.id,
        selfAssessment,
        selfAssessment === 'answered' ? answerText.trim() : undefined,
      );
      setRevealedQuestion(response.answeredQuestion ?? null);
      setRevealedHistory((prev) => appendRevealedQuestion(prev, response.answeredQuestion));
      setAnswerReview(response.review ?? null);
      setAnswerText('');
      setSession(response.session);
    } catch (e: any) {
      console.error('Failed to answer question:', e);
      setError(e.response?.data?.error || 'Не удалось сохранить ответ');
    } finally {
      setAnswering(false);
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

  const handleReviewSystemDesign = async () => {
    if (!sessionId || !designImage) return;
    setReviewingDesign(true);
    setError(null);
    try {
      const result = await interviewPrepApi.reviewSystemDesign(sessionId, designImage, designReviewInput);
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

  return (
    <div className="interview-prep-session-page">
      <SessionHero task={task} answeredCount={progress.answeredCount} checkpoint={checkpoint} nowTs={clockNow} />

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
        </article>

        <SessionSidebar session={session} revealedQuestion={revealedQuestion} revealedHistory={revealedHistory} />
      </section>

      <FollowUpSection
        session={session}
        checkpoint={checkpoint}
        canShowQuestions={canShowQuestions}
        answering={answering}
        answerText={answerText}
        answerReview={answerReview}
        speechSupported={speechSupported}
        speechActive={speechActive}
        onAnswerTextChange={setAnswerText}
        onToggleSpeech={toggleSpeech}
        onAnswer={(value) => void handleAnswer(value)}
      />

      {showLiveCoding && task && (
        <LiveCodingSection
          task={task}
          checkpoint={checkpoint}
          canSubmitExecutable={canSubmitExecutable}
          solveLanguage={solveLanguage}
          solveLanguageOptions={solveLanguageOptions}
          sqlStarterTab={sqlStarterTab}
          sqlStarterValue={sqlStarterValue}
          editorHeight={editorHeight}
          isResizingEditor={isResizingEditor}
          submitting={submitting}
          code={code}
          submitResult={submitResult}
          onLanguageChange={switchSolveLanguage}
          onSqlStarterTabChange={setSqlStarterTab}
          onEditorHeightChange={setEditorHeight}
          onResizeStart={(event) => {
            resizeStartYRef.current = event.clientY;
            resizeStartHeightRef.current = editorHeight;
            setIsResizingEditor(true);
          }}
          onCodeChange={(nextCode) => {
            setCode(nextCode);
            setCodeDrafts((prev) => ({ ...prev, [solveLanguage]: nextCode }));
          }}
          onSubmitCode={() => void handleSubmitCode()}
        />
      )}

      {showSystemDesignReview && task && (
        <DesignReviewSection
          reviewingDesign={reviewingDesign}
          designImage={designImage}
          designReviewInput={designReviewInput}
          designReview={designReview}
          onDesignImageChange={(file) => {
            setDesignImage(file);
            setDesignReview(null);
          }}
          onDesignReviewInputChange={setDesignReviewInput}
          onReview={() => void handleReviewSystemDesign()}
        />
      )}

    </div>
  );
}
