import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewPrepApi, InterviewPrepTask } from '@/features/InterviewPrep/api/interviewPrepApi';

export function InterviewPrepPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<InterviewPrepTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    interviewPrepApi.listTasks()
      .then(setTasks)
      .catch((e) => {
        console.error('Failed to load interview prep tasks:', e);
        setError('Не удалось загрузить задачи');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async (taskId: string) => {
    setError(null);
    try {
      const session = await interviewPrepApi.startSession(taskId);
      navigate(`/interview-prep/${session.id}`);
    } catch (e) {
      console.error('Failed to start interview prep session:', e);
      setError('Не удалось начать сессию');
    }
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div>
      <h1>Подготовка к Go собесам</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {tasks.length === 0 && !loading && !error && (
        <div>Нет доступных задач</div>
      )}
      {tasks.map((task) => (
        <div key={task.id}>
          <h3>{task.title}</h3>
          <div>{task.prepType}</div>
          <button onClick={() => handleStart(task.id)}>Начать</button>
        </div>
      ))}
    </div>
  );
}