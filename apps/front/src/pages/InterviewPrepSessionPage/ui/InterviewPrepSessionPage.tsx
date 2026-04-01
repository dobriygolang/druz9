import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { interviewPrepApi, InterviewPrepSession } from '@/features/InterviewPrep/api/interviewPrepApi';

export function InterviewPrepSessionPage() {
  const { sessionId = '' } = useParams();
  const [session, setSession] = useState<InterviewPrepSession | null>(null);

  // TODO: enable when test cases validation is implemented
  const canSubmitCode = false;

  useEffect(() => {
    if (!sessionId) return;
    interviewPrepApi.getSession(sessionId)
      .then(setSession)
      .catch((e) => {
        console.error('Failed to load session:', e);
      });
  }, [sessionId]);

  const handleAnswer = async (selfAssessment: 'answered' | 'skipped') => {
    if (!sessionId || !session?.currentQuestion) return;
    try {
      const next = await interviewPrepApi.answerQuestion(sessionId, session.currentQuestion.id, selfAssessment);
      setSession(next);
    } catch (e) {
      console.error('Failed to answer question:', e);
    }
  };

  if (!session) {
    return <div>Загрузка...</div>;
  }

  return (
    <div>
      <h1>{session.task?.title}</h1>
      <pre>{session.task?.statement}</pre>

      {canSubmitCode && (
        <div style={{ color: 'gray' }}>Code submission is temporarily disabled</div>
      )}

      {session.currentQuestion && (
        <div>
          <h3>Вопрос {session.currentQuestion.position}</h3>
          <div>{session.currentQuestion.prompt}</div>
          {session.currentQuestion.answer && (
            <details>
              <summary>Показать ответ</summary>
              <div>{session.currentQuestion.answer}</div>
            </details>
          )}
          <div>
            <button onClick={() => handleAnswer('answered')}>Я ответил сам</button>
            <button onClick={() => handleAnswer('skipped')}>Не ответил</button>
          </div>
        </div>
      )}

      {session.status === 'finished' && <div>Сессия завершена</div>}
    </div>
  );
}