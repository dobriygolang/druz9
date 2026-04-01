import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { interviewPrepApi, InterviewPrepTask, InterviewPrepQuestion, InterviewPrepType } from '@/features/InterviewPrep/api/interviewPrepApi';

const PREP_TYPES: { value: InterviewPrepType; label: string }[] = [
  { value: 'coding', label: 'Coding' },
  { value: 'algorithm', label: 'Algorithm' },
  { value: 'system_design', label: 'System Design' },
  { value: 'sql', label: 'SQL' },
  { value: 'code_review', label: 'Code Review' },
];

const DEFAULT_STARTER_CODE = `package main

func solve(input string) string {
	_ = input
	// TODO: parse input and return the answer as a string.
	return "implement me"
}
`;

type TaskFormState = {
  id: string | null;
  slug: string;
  title: string;
  statement: string;
  prepType: InterviewPrepType;
  language: string;
  isExecutable: boolean;
  executionProfile: string;
  runnerMode: string;
  durationSeconds: number;
  starterCode: string;
  referenceSolution: string;
  isActive: boolean;
};

const createEmptyTaskForm = (): TaskFormState => ({
  id: null,
  slug: '',
  title: '',
  statement: '',
  prepType: 'algorithm',
  language: 'go',
  isExecutable: false,
  executionProfile: 'pure',
  runnerMode: 'function_io',
  durationSeconds: 1800,
  starterCode: DEFAULT_STARTER_CODE,
  referenceSolution: '',
  isActive: true,
});

const taskToForm = (task: InterviewPrepTask): TaskFormState => ({
  id: task.id,
  slug: task.slug,
  title: task.title,
  statement: task.statement,
  prepType: task.prepType,
  language: task.language,
  isExecutable: task.isExecutable,
  executionProfile: task.executionProfile,
  runnerMode: task.runnerMode,
  durationSeconds: task.durationSeconds,
  starterCode: task.starterCode,
  referenceSolution: '',
  isActive: task.isActive,
});

type QuestionFormState = {
  id: string | null;
  position: number;
  prompt: string;
  answer: string;
};

const createEmptyQuestionForm = (position: number): QuestionFormState => ({
  id: null,
  position,
  prompt: '',
  answer: '',
});

const questionToForm = (q: InterviewPrepQuestion): QuestionFormState => ({
  id: q.id,
  position: q.position,
  prompt: q.prompt,
  answer: q.answer,
});

export const InterviewPrepAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<InterviewPrepTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<InterviewPrepQuestion[]>([]);
  const [taskForm, setTaskForm] = useState<TaskFormState>(createEmptyTaskForm());
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(createEmptyQuestionForm(1));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = Boolean(user?.isAdmin);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await interviewPrepApi.adminListTasks();
      setTasks(data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Не удалось загрузить задачи');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const loadQuestions = useCallback(async (taskId: string) => {
    try {
      const data = await interviewPrepApi.adminListQuestions(taskId);
      setQuestions(data);
    } catch (e: any) {
      console.error('Failed to load questions:', e);
    }
  }, []);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tasks;
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        task.slug.toLowerCase().includes(query) ||
        task.statement.toLowerCase().includes(query),
    );
  }, [search, tasks]);

  if (!isAdmin) {
    return <Navigate to="/feed" replace />;
  }

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setTaskForm(createEmptyTaskForm());
  };

  const openCreateTaskModal = (task?: InterviewPrepTask) => {
    setTaskForm(task ? taskToForm(task) : createEmptyTaskForm());
    setShowTaskModal(true);
  };

  const openQuestionsModal = async (taskId: string) => {
    setSelectedTaskId(taskId);
    await loadQuestions(taskId);
    setShowQuestionModal(true);
  };

  const closeQuestionModal = () => {
    setShowQuestionModal(false);
    setSelectedTaskId(null);
    setQuestions([]);
    setQuestionForm(createEmptyQuestionForm(1));
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim() || !taskForm.statement.trim()) return;

    setSaving(true);
    try {
      if (taskForm.id) {
        await interviewPrepApi.adminUpdateTask(taskForm.id, taskForm);
      } else {
        await interviewPrepApi.adminCreateTask(taskForm);
      }
      closeTaskModal();
      await loadTasks();
    } catch (e) {
      console.error('Failed to save task:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeletingId(taskId);
    try {
      await interviewPrepApi.adminDeleteTask(taskId);
      await loadTasks();
    } catch (e) {
      console.error('Failed to delete task:', e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveQuestion = async () => {
    if (!selectedTaskId || !questionForm.prompt.trim()) return;

    setSaving(true);
    try {
      if (questionForm.id) {
        await interviewPrepApi.adminUpdateQuestion(selectedTaskId, questionForm.id, questionForm);
      } else {
        await interviewPrepApi.adminCreateQuestion(selectedTaskId, questionForm);
      }
      await loadQuestions(selectedTaskId);
      setQuestionForm(createEmptyQuestionForm(questions.length + 1));
    } catch (e) {
      console.error('Failed to save question:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedTaskId) return;
    setDeletingId(questionId);
    try {
      await interviewPrepApi.adminDeleteQuestion(selectedTaskId, questionId);
      await loadQuestions(selectedTaskId);
    } catch (e) {
      console.error('Failed to delete question:', e);
    } finally {
      setDeletingId(null);
    }
  };

  const openEditQuestion = (q: InterviewPrepQuestion) => {
    setQuestionForm(questionToForm(q));
  };

  return (
    <>
      <div className="code-rooms-page code-admin-page">
        <div className="page-header code-rooms-hero">
          <div className="code-rooms-hero__copy">
            <span className="code-rooms-kicker">Admin</span>
            <h1>Interview Prep задачи</h1>
            <p className="code-rooms-subtitle">
              Управление задачами для подготовки к интервью.
            </p>
          </div>
          <div className="code-rooms-hero__actions">
            <button className="btn btn-primary code-rooms-create-btn" onClick={() => openCreateTaskModal()}>
              <Plus size={16} />
              <span>Новая задача</span>
            </button>
          </div>
        </div>

        <section className="card dashboard-card">
          <div className="task-filters code-admin-filters">
            <input
              className="input"
              placeholder="Поиск по title / slug / statement"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="empty-state compact">Загрузка...</div>
          ) : error ? (
            <div className="error-text">{error}</div>
          ) : filteredTasks.length === 0 ? (
            <div className="empty-state compact">Задач пока нет.</div>
          ) : (
            <div className="task-list">
              {filteredTasks.map((task) => (
                <div key={task.id} className="task-item">
                  <div className="task-item__header">
                    <div>
                      <div className="task-item__title">{task.title}</div>
                      <div className="task-item__meta">
                        <span className="badge">{task.prepType}</span>
                        <span className="badge">{task.language}</span>
                        <span className="badge">{task.executionProfile}</span>
                        {!task.isActive && <span className="badge task-inactive">Неактивна</span>}
                      </div>
                    </div>
                    <div className="task-item__actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => openQuestionsModal(task.id)}>
                        Вопросы
                      </button>
                      <button className="btn-icon" onClick={() => openCreateTaskModal(task)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="btn-icon danger"
                        onClick={() => void handleDeleteTask(task.id)}
                        disabled={deletingId === task.id}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="task-item__statement">{task.statement}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={closeTaskModal}>
          <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-card__header">
              <div>
                <h2>{taskForm.id ? 'Редактировать задачу' : 'Новая задача'}</h2>
              </div>
              <ShieldCheck size={18} />
            </div>

            <div className="task-editor-grid">
              <div className="form-group">
                <label>Название</label>
                <input
                  className="input"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Slug</label>
                <input
                  className="input"
                  value={taskForm.slug}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="auto-generated from title"
                />
              </div>
              <div className="form-group">
                <label>Тип</label>
                <select
                  className="input"
                  value={taskForm.prepType}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, prepType: e.target.value as InterviewPrepType }))}
                >
                  {PREP_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Language</label>
                <input
                  className="input"
                  value={taskForm.language}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, language: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Execution Profile</label>
                <input
                  className="input"
                  value={taskForm.executionProfile}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, executionProfile: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Runner Mode</label>
                <input
                  className="input"
                  value={taskForm.runnerMode}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, runnerMode: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Duration (seconds)</label>
                <input
                  className="input"
                  type="number"
                  value={taskForm.durationSeconds}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, durationSeconds: Number(e.target.value) }))}
                />
              </div>
              <div className="form-group">
                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={taskForm.isExecutable}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, isExecutable: e.target.checked }))}
                  />
                  Executable
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Условие</label>
              <textarea
                className="input textarea"
                value={taskForm.statement}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, statement: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Starter Code</label>
              <textarea
                className="input textarea code-textarea"
                value={taskForm.starterCode}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, starterCode: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Reference Solution</label>
              <textarea
                className="input textarea code-textarea"
                value={taskForm.referenceSolution}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, referenceSolution: e.target.value }))}
              />
            </div>

            <label className="toggle-field">
              <input
                type="checkbox"
                checked={taskForm.isActive}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              Активна
            </label>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={closeTaskModal}>Отмена</button>
              <button
                className="btn btn-primary"
                onClick={handleSaveTask}
                disabled={saving || !taskForm.title.trim()}
              >
                {saving ? 'Сохранение...' : taskForm.id ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions Modal */}
      {showQuestionModal && (
        <div className="modal-overlay" onClick={closeQuestionModal}>
          <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-card__header">
              <div>
                <h2>Вопросы задачи</h2>
              </div>
            </div>

            <div className="form-group">
              <label>Позиция</label>
              <input
                className="input"
                type="number"
                value={questionForm.position}
                onChange={(e) => setQuestionForm((prev) => ({ ...prev, position: Number(e.target.value) }))}
              />
            </div>

            <div className="form-group">
              <label>Prompt (вопрос)</label>
              <textarea
                className="input textarea"
                value={questionForm.prompt}
                onChange={(e) => setQuestionForm((prev) => ({ ...prev, prompt: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Answer (ответ)</label>
              <textarea
                className="input textarea"
                value={questionForm.answer}
                onChange={(e) => setQuestionForm((prev) => ({ ...prev, answer: e.target.value }))}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSaveQuestion}
              disabled={saving || !questionForm.prompt.trim()}
            >
              {saving ? 'Сохранение...' : questionForm.id ? 'Сохранить вопрос' : 'Добавить вопрос'}
            </button>

            <h3 style={{ marginTop: '24px' }}>Список вопросов</h3>
            {questions.length === 0 ? (
              <div className="empty-state compact">Вопросов пока нет</div>
            ) : (
              <div className="task-list" style={{ marginTop: '12px' }}>
                {questions.map((q) => (
                  <div key={q.id} className="task-item">
                    <div className="task-item__header">
                      <div>
                        <div className="task-item__title">#{q.position}</div>
                      </div>
                      <div className="task-item__actions">
                        <button className="btn-icon" onClick={() => openEditQuestion(q)}>
                          <Pencil size={16} />
                        </button>
                        <button
                          className="btn-icon danger"
                          onClick={() => void handleDeleteQuestion(q.id)}
                          disabled={deletingId === q.id}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="task-item__statement">{q.prompt}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={closeQuestionModal}>Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};