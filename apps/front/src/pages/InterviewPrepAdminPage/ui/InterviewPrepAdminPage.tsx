import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ListChecks, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import {
  interviewPrepApi,
  InterviewPrepMockCompanyPreset,
  InterviewPrepMockQuestionPoolItem,
  InterviewPrepMockStageKind,
  InterviewPrepQuestion,
  InterviewPrepTask,
  InterviewPrepType,
} from '@/features/InterviewPrep/api/interviewPrepApi';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { CodeTask } from '@/entities/CodeRoom/model/types';
import { FancySelect } from '@/shared/ui/FancySelect';

const PREP_TYPES: { value: InterviewPrepType; label: string }[] = [
  { value: 'coding', label: 'Coding' },
  { value: 'algorithm', label: 'Algorithm' },
  { value: 'system_design', label: 'System Design' },
  { value: 'sql', label: 'SQL' },
  { value: 'code_review', label: 'Code Review' },
];

const LANGUAGE_OPTIONS = [
  { value: 'go', label: 'Go' },
  { value: 'python', label: 'Python' },
  { value: 'sql', label: 'SQL' },
];

const MOCK_STAGE_OPTIONS: { value: InterviewPrepMockStageKind; label: string }[] = [
  { value: 'slices', label: 'Slices' },
  { value: 'concurrency', label: 'Concurrency' },
  { value: 'sql', label: 'SQL' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'system_design', label: 'System Design' },
];

const DEFAULT_STARTER_CODE = `package main

func solve(input string) string {
\t_ = input
\t// TODO: parse input and return the answer as a string.
\treturn "implement me"
}
`;

type TaskFormState = {
  id: string | null;
  slug: string;
  title: string;
  statement: string;
  prepType: InterviewPrepType;
  language: string;
  companyTag: string;
  supportedLanguages: string[];
  isExecutable: boolean;
  executionProfile: string;
  runnerMode: string;
  durationSeconds: number;
  starterCode: string;
  codeTaskId: string;
  referenceSolution: string;
  isActive: boolean;
};

type QuestionFormState = {
  id: string | null;
  position: number;
  prompt: string;
  answer: string;
};

type MockQuestionPoolFormState = {
  id: string | null;
  topic: string;
  companyTag: string;
  questionKey: string;
  prompt: string;
  referenceAnswer: string;
  position: number;
  alwaysAsk: boolean;
  isActive: boolean;
};

type MockCompanyPresetFormState = {
  id: string | null;
  companyTag: string;
  stageKind: InterviewPrepMockStageKind;
  position: number;
  taskSlugPattern: string;
  aiModelOverride: string;
  isActive: boolean;
};

const createEmptyTaskForm = (): TaskFormState => ({
  id: null,
  slug: '',
  title: '',
  statement: '',
  prepType: 'algorithm',
  language: 'go',
  companyTag: 'general',
  supportedLanguages: ['go'],
  isExecutable: false,
  executionProfile: 'pure',
  runnerMode: 'function_io',
  durationSeconds: 1800,
  starterCode: DEFAULT_STARTER_CODE,
  codeTaskId: '',
  referenceSolution: '',
  isActive: true,
});

const createEmptyQuestionForm = (position = 1): QuestionFormState => ({
  id: null,
  position,
  prompt: '',
  answer: '',
});

const createEmptyMockQuestionPoolForm = (): MockQuestionPoolFormState => ({
  id: null,
  topic: 'concurrency',
  companyTag: '',
  questionKey: '',
  prompt: '',
  referenceAnswer: '',
  position: 1,
  alwaysAsk: false,
  isActive: true,
});

const createEmptyMockCompanyPresetForm = (): MockCompanyPresetFormState => ({
  id: null,
  companyTag: 'ozon',
  stageKind: 'slices',
  position: 1,
  taskSlugPattern: '',
  aiModelOverride: '',
  isActive: true,
});

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const taskToForm = (task: InterviewPrepTask): TaskFormState => ({
  id: task.id,
  slug: task.slug,
  title: task.title,
  statement: task.statement,
  prepType: task.prepType,
  language: task.language,
  companyTag: task.companyTag || 'general',
  supportedLanguages: task.supportedLanguages?.length ? task.supportedLanguages : [task.language],
  isExecutable: task.isExecutable,
  executionProfile: task.executionProfile,
  runnerMode: task.runnerMode,
  durationSeconds: task.durationSeconds,
  starterCode: task.starterCode || DEFAULT_STARTER_CODE,
  codeTaskId: task.codeTaskId || '',
  referenceSolution: task.referenceSolution ?? '',
  isActive: task.isActive,
});

const questionToForm = (question: InterviewPrepQuestion): QuestionFormState => ({
  id: question.id,
  position: question.position,
  prompt: question.prompt,
  answer: question.answer,
});

const mockQuestionPoolToForm = (item: InterviewPrepMockQuestionPoolItem): MockQuestionPoolFormState => ({
  id: item.id,
  topic: item.topic,
  companyTag: item.companyTag,
  questionKey: item.questionKey,
  prompt: item.prompt,
  referenceAnswer: item.referenceAnswer,
  position: item.position,
  alwaysAsk: item.alwaysAsk,
  isActive: item.isActive,
});

const mockCompanyPresetToForm = (item: InterviewPrepMockCompanyPreset): MockCompanyPresetFormState => ({
  id: item.id,
  companyTag: item.companyTag,
  stageKind: item.stageKind,
  position: item.position,
  taskSlugPattern: item.taskSlugPattern,
  aiModelOverride: item.aiModelOverride,
  isActive: item.isActive,
});

export const InterviewPrepAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<InterviewPrepTask[]>([]);
  const [codeTasks, setCodeTasks] = useState<CodeTask[]>([]);
  const [questions, setQuestions] = useState<InterviewPrepQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mockQuestionPools, setMockQuestionPools] = useState<InterviewPrepMockQuestionPoolItem[]>([]);
  const [mockCompanyPresets, setMockCompanyPresets] = useState<InterviewPrepMockCompanyPreset[]>([]);
  const [search, setSearch] = useState('');
  const [prepTypeFilter, setPrepTypeFilter] = useState<'all' | InterviewPrepType>('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [taskForm, setTaskForm] = useState<TaskFormState>(createEmptyTaskForm());
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(createEmptyQuestionForm());
  const [mockQuestionPoolForm, setMockQuestionPoolForm] = useState<MockQuestionPoolFormState>(createEmptyMockQuestionPoolForm());
  const [mockCompanyPresetForm, setMockCompanyPresetForm] = useState<MockCompanyPresetFormState>(createEmptyMockCompanyPresetForm());

  const isAdmin = Boolean(user?.isAdmin);
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (prepTypeFilter !== 'all' && task.prepType !== prepTypeFilter) {
        return false;
      }
      if (companyFilter !== 'all' && (task.companyTag || 'general') !== companyFilter) {
        return false;
      }
      if (!query) return true;
      return [task.title, task.slug, task.statement, task.prepType, task.companyTag, ...(task.supportedLanguages || [])]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [companyFilter, prepTypeFilter, search, tasks]);

  const companyOptions = useMemo(() => ['all', ...Array.from(new Set(tasks.map((task) => task.companyTag || 'general'))).sort()], [tasks]);

  const sortedQuestions = useMemo(
    () => [...questions].sort((left, right) => left.position - right.position),
    [questions],
  );

  const loadTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await interviewPrepApi.adminListTasks();
      setTasks(data);
      const availableCodeTasks = await codeRoomApi.listTasks({ includeInactive: true });
      setCodeTasks(availableCodeTasks);
      const [questionPoolsData, companyPresetsData] = await Promise.all([
        interviewPrepApi.adminListMockQuestionPools(),
        interviewPrepApi.adminListMockCompanyPresets(),
      ]);
      setMockQuestionPools(questionPoolsData);
      setMockCompanyPresets(companyPresetsData);
    } catch (e: any) {
      console.error('Failed to load interview prep tasks:', e);
      setError(e.response?.data?.error || 'Не удалось загрузить задачи');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (taskId: string) => {
    try {
      const data = await interviewPrepApi.adminListQuestions(taskId);
      setQuestions(data);
      return data;
    } catch (e: any) {
      console.error('Failed to load interview prep questions:', e);
      setError(e.response?.data?.error || 'Не удалось загрузить вопросы');
      return [];
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  if (!isAdmin) {
    return <Navigate to="/feed" replace />;
  }

  const openCreateTaskModal = (task?: InterviewPrepTask) => {
    setStatus('');
    setError('');
    setTaskForm(task ? taskToForm(task) : createEmptyTaskForm());
    setTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setTaskModalOpen(false);
    setTaskForm(createEmptyTaskForm());
  };

  const openQuestionModal = async (task: InterviewPrepTask) => {
    setStatus('');
    setError('');
    setSelectedTaskId(task.id);
    const items = await loadQuestions(task.id);
    setQuestionForm(createEmptyQuestionForm(items.length + 1));
    setQuestionModalOpen(true);
  };

  const closeQuestionModal = () => {
    setQuestionModalOpen(false);
    setSelectedTaskId(null);
    setQuestions([]);
    setQuestionForm(createEmptyQuestionForm());
  };

  const handleTaskTitleChange = (title: string) => {
    setTaskForm((prev) => ({
      ...prev,
      title,
      slug: prev.id || prev.slug ? prev.slug : toSlug(title),
    }));
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim() || !taskForm.statement.trim()) {
      setError('Заполни название и условие задачи.');
      return;
    }

    setSaving(true);
    setError('');
    setStatus('');
    try {
      const payload = {
        ...taskForm,
        slug: toSlug(taskForm.slug || taskForm.title),
        companyTag: taskForm.companyTag || 'general',
        supportedLanguages: taskForm.supportedLanguages.length ? taskForm.supportedLanguages : [taskForm.language],
        executionProfile: taskForm.executionProfile || 'pure',
        runnerMode: taskForm.runnerMode || 'function_io',
        codeTaskId: taskForm.codeTaskId || undefined,
      };
      if (taskForm.id) {
        await interviewPrepApi.adminUpdateTask(taskForm.id, payload);
        setStatus('Задача обновлена.');
      } else {
        await interviewPrepApi.adminCreateTask(payload);
        setStatus('Задача создана.');
      }
      closeTaskModal();
      await loadTasks();
    } catch (e: any) {
      console.error('Failed to save interview prep task:', e);
      setError(e.response?.data?.error || 'Не удалось сохранить задачу');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeletingId(taskId);
    setError('');
    setStatus('');
    try {
      await interviewPrepApi.adminDeleteTask(taskId);
      setStatus('Задача удалена.');
      await loadTasks();
    } catch (e: any) {
      console.error('Failed to delete interview prep task:', e);
      setError(e.response?.data?.error || 'Не удалось удалить задачу');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveQuestion = async () => {
    if (!selectedTaskId) return;
    if (!questionForm.prompt.trim() || !questionForm.answer.trim()) {
      setError('Для вопроса нужны и prompt, и answer.');
      return;
    }
    if (questionForm.position < 1) {
      setError('Позиция вопроса должна быть больше нуля.');
      return;
    }

    setSaving(true);
    setError('');
    setStatus('');
    try {
      if (questionForm.id) {
        await interviewPrepApi.adminUpdateQuestion(selectedTaskId, questionForm.id, questionForm);
        setStatus('Вопрос обновлен.');
      } else {
        await interviewPrepApi.adminCreateQuestion(selectedTaskId, questionForm);
        setStatus('Вопрос добавлен.');
      }
      const data = await loadQuestions(selectedTaskId);
      setQuestionForm(createEmptyQuestionForm(data.length + 1));
    } catch (e: any) {
      console.error('Failed to save interview prep question:', e);
      setError(e.response?.data?.error || 'Не удалось сохранить вопрос');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedTaskId) return;
    setDeletingId(questionId);
    setError('');
    setStatus('');
    try {
      await interviewPrepApi.adminDeleteQuestion(selectedTaskId, questionId);
      setStatus('Вопрос удален.');
      const data = await loadQuestions(selectedTaskId);
      setQuestionForm(createEmptyQuestionForm(data.length + 1));
    } catch (e: any) {
      console.error('Failed to delete interview prep question:', e);
      setError(e.response?.data?.error || 'Не удалось удалить вопрос');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveMockQuestionPool = async () => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const payload = {
        topic: mockQuestionPoolForm.topic.trim(),
        companyTag: mockQuestionPoolForm.companyTag.trim().toLowerCase(),
        questionKey: mockQuestionPoolForm.questionKey.trim(),
        prompt: mockQuestionPoolForm.prompt.trim(),
        referenceAnswer: mockQuestionPoolForm.referenceAnswer.trim(),
        position: mockQuestionPoolForm.position,
        alwaysAsk: mockQuestionPoolForm.alwaysAsk,
        isActive: mockQuestionPoolForm.isActive,
      };
      if (mockQuestionPoolForm.id) {
        await interviewPrepApi.adminUpdateMockQuestionPool(mockQuestionPoolForm.id, payload);
        setStatus('Question pool обновлён.');
      } else {
        await interviewPrepApi.adminCreateMockQuestionPool(payload);
        setStatus('Question pool создан.');
      }
      setMockQuestionPoolForm(createEmptyMockQuestionPoolForm());
      await loadTasks();
    } catch (e: any) {
      console.error('Failed to save mock question pool:', e);
      setError(e.response?.data?.error || 'Не удалось сохранить question pool');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMockQuestionPool = async (id: string) => {
    setDeletingId(id);
    setError('');
    setStatus('');
    try {
      await interviewPrepApi.adminDeleteMockQuestionPool(id);
      setStatus('Question pool удалён.');
      await loadTasks();
    } catch (e: any) {
      console.error('Failed to delete mock question pool:', e);
      setError(e.response?.data?.error || 'Не удалось удалить question pool');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveMockCompanyPreset = async () => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const payload = {
        companyTag: mockCompanyPresetForm.companyTag.trim().toLowerCase(),
        stageKind: mockCompanyPresetForm.stageKind,
        position: mockCompanyPresetForm.position,
        taskSlugPattern: mockCompanyPresetForm.taskSlugPattern.trim(),
        aiModelOverride: mockCompanyPresetForm.aiModelOverride.trim(),
        isActive: mockCompanyPresetForm.isActive,
      };
      if (mockCompanyPresetForm.id) {
        await interviewPrepApi.adminUpdateMockCompanyPreset(mockCompanyPresetForm.id, payload);
        setStatus('Company preset обновлён.');
      } else {
        await interviewPrepApi.adminCreateMockCompanyPreset(payload);
        setStatus('Company preset создан.');
      }
      setMockCompanyPresetForm(createEmptyMockCompanyPresetForm());
      await loadTasks();
    } catch (e: any) {
      console.error('Failed to save mock company preset:', e);
      setError(e.response?.data?.error || 'Не удалось сохранить company preset');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMockCompanyPreset = async (id: string) => {
    setDeletingId(id);
    setError('');
    setStatus('');
    try {
      await interviewPrepApi.adminDeleteMockCompanyPreset(id);
      setStatus('Company preset удалён.');
      await loadTasks();
    } catch (e: any) {
      console.error('Failed to delete mock company preset:', e);
      setError(e.response?.data?.error || 'Не удалось удалить company preset');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="code-rooms-page code-admin-page">
        <div className="page-header code-rooms-hero">
          <div className="code-rooms-hero__copy">
            <span className="code-rooms-kicker">Admin</span>
            <h1>Interview Prep задачи</h1>
            <p className="code-rooms-subtitle">
              Управление сценариями подготовки: задача, attached questions, порядок и доступность для trusted-пользователей.
            </p>
          </div>
          <div className="code-rooms-hero__actions">
            <button className="btn btn-primary code-rooms-create-btn" onClick={() => openCreateTaskModal()}>
              <Plus size={16} />
              <span>Новая задача</span>
            </button>
          </div>
        </div>

        {(error || status) && (
          <section className="card dashboard-card">
            {error && <div className="error-text">{error}</div>}
            {!error && status && <div className="success-text">{status}</div>}
          </section>
        )}

        <section className="card dashboard-card">
          <div className="task-filters code-admin-filters">
            <input
              className="input"
              placeholder="Поиск по title / slug / type"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <FancySelect
              value={prepTypeFilter}
              options={[
                { value: 'all', label: 'Все типы' },
                ...PREP_TYPES,
              ]}
              onChange={(value) => setPrepTypeFilter(value as 'all' | InterviewPrepType)}
            />
            <FancySelect
              value={companyFilter}
              options={companyOptions.map((value) => ({ value, label: value === 'all' ? 'Все группы' : value }))}
              onChange={setCompanyFilter}
            />
          </div>

          {loading ? (
            <div className="empty-state compact">Загрузка...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="empty-state compact">Задач пока нет.</div>
          ) : (
            <div className="task-list">
              {filteredTasks.map((task) => (
                <div key={task.id} className="task-item interview-prep-admin-task">
                  <div className="task-item__header">
                    <div>
                      <div className="task-item__title">{task.title || task.slug || 'Без названия'}</div>
                      <div className="task-item__meta">
                        {task.prepType && <span className="badge">{task.prepType}</span>}
                        {task.language && <span className="badge">{task.language}</span>}
                        <span className="badge">{task.companyTag || 'general'}</span>
                        <span className="badge">{Math.round(task.durationSeconds / 60)} мин</span>
                        {!task.isActive && <span className="badge task-inactive">Неактивна</span>}
                      </div>
                    </div>
                    <div className="task-item__actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => void openQuestionModal(task)}>
                        <ListChecks size={16} />
                        <span>Вопросы</span>
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
                  <div className="interview-prep-admin-task__meta">
                    <span><strong>Slug:</strong> {task.slug || 'n/a'}</span>
                    <span><strong>Solve:</strong> {(task.supportedLanguages || []).join(', ') || task.language || 'n/a'}</span>
                    <span><strong>Profile:</strong> {task.executionProfile || 'n/a'}</span>
                    <span><strong>Runner:</strong> {task.runnerMode || 'n/a'}</span>
                  </div>
                  <p className="task-item__statement">{task.statement || 'Описание ещё не заполнено.'}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <h2>Mock Question Pools</h2>
              <p className="interview-prep-muted">Вопросы по темам и компаниям, без привязки к конкретной задаче.</p>
            </div>
          </div>
          <div className="task-editor-grid">
            <div className="form-group">
              <label>Topic</label>
              <FancySelect
                value={mockQuestionPoolForm.topic}
                options={MOCK_STAGE_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
                onChange={(value) => setMockQuestionPoolForm((prev) => ({ ...prev, topic: value }))}
              />
            </div>
            <div className="form-group">
              <label>Company</label>
              <input className="input" value={mockQuestionPoolForm.companyTag} onChange={(e) => setMockQuestionPoolForm((prev) => ({ ...prev, companyTag: e.target.value }))} placeholder="ozon / avito / empty for shared" />
            </div>
            <div className="form-group">
              <label>Question Key</label>
              <input className="input" value={mockQuestionPoolForm.questionKey} onChange={(e) => setMockQuestionPoolForm((prev) => ({ ...prev, questionKey: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Position</label>
              <input className="input" type="number" min={1} value={mockQuestionPoolForm.position} onChange={(e) => setMockQuestionPoolForm((prev) => ({ ...prev, position: Number(e.target.value) || 1 }))} />
            </div>
          </div>
          <div className="form-group">
            <label>Prompt</label>
            <textarea className="input textarea" value={mockQuestionPoolForm.prompt} onChange={(e) => setMockQuestionPoolForm((prev) => ({ ...prev, prompt: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Reference Answer</label>
            <textarea className="input textarea" value={mockQuestionPoolForm.referenceAnswer} onChange={(e) => setMockQuestionPoolForm((prev) => ({ ...prev, referenceAnswer: e.target.value }))} />
          </div>
          <div className="interview-prep-toggle-row">
            <label className="toggle-field">
              <input type="checkbox" checked={mockQuestionPoolForm.alwaysAsk} onChange={(e) => setMockQuestionPoolForm((prev) => ({ ...prev, alwaysAsk: e.target.checked }))} />
              Always ask
            </label>
            <label className="toggle-field">
              <input type="checkbox" checked={mockQuestionPoolForm.isActive} onChange={(e) => setMockQuestionPoolForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
              Активен
            </label>
          </div>
          <div className="interview-prep-question-toolbar">
            <button className="btn btn-primary" onClick={() => void handleSaveMockQuestionPool()} disabled={saving}>
              {mockQuestionPoolForm.id ? 'Сохранить pool' : 'Добавить pool'}
            </button>
            <button className="btn btn-secondary" onClick={() => setMockQuestionPoolForm(createEmptyMockQuestionPoolForm())}>Очистить форму</button>
          </div>
          <div className="task-list">
            {mockQuestionPools.map((item) => (
              <div key={item.id} className="task-item">
                <div className="task-item__header">
                  <div>
                    <div className="task-item__title">{item.topic} / {item.companyTag || 'shared'} / {item.questionKey}</div>
                    <div className="task-item__meta">
                      <span className="badge">#{item.position}</span>
                      {item.alwaysAsk && <span className="badge">always</span>}
                      {!item.isActive && <span className="badge task-inactive">inactive</span>}
                    </div>
                  </div>
                  <div className="task-item__actions">
                    <button className="btn-icon" onClick={() => setMockQuestionPoolForm(mockQuestionPoolToForm(item))}><Pencil size={16} /></button>
                    <button className="btn-icon danger" onClick={() => void handleDeleteMockQuestionPool(item.id)} disabled={deletingId === item.id}><Trash2 size={16} /></button>
                  </div>
                </div>
                <p className="task-item__statement">{item.prompt}</p>
                <div className="interview-prep-answer-preview">{item.referenceAnswer}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <h2>Mock Company Presets</h2>
              <p className="interview-prep-muted">Порядок этапов, task pattern и model override для конкретной компании.</p>
            </div>
          </div>
          <div className="task-editor-grid">
            <div className="form-group">
              <label>Company</label>
              <input className="input" value={mockCompanyPresetForm.companyTag} onChange={(e) => setMockCompanyPresetForm((prev) => ({ ...prev, companyTag: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Stage</label>
              <FancySelect
                value={mockCompanyPresetForm.stageKind}
                options={MOCK_STAGE_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
                onChange={(value) => setMockCompanyPresetForm((prev) => ({ ...prev, stageKind: value as InterviewPrepMockStageKind }))}
              />
            </div>
            <div className="form-group">
              <label>Position</label>
              <input className="input" type="number" min={1} value={mockCompanyPresetForm.position} onChange={(e) => setMockCompanyPresetForm((prev) => ({ ...prev, position: Number(e.target.value) || 1 }))} />
            </div>
            <div className="form-group">
              <label>Task Slug Pattern</label>
              <input className="input" value={mockCompanyPresetForm.taskSlugPattern} onChange={(e) => setMockCompanyPresetForm((prev) => ({ ...prev, taskSlugPattern: e.target.value }))} placeholder="slice / worker / url-shortener" />
            </div>
            <div className="form-group">
              <label>AI Model Override</label>
              <input className="input" value={mockCompanyPresetForm.aiModelOverride} onChange={(e) => setMockCompanyPresetForm((prev) => ({ ...prev, aiModelOverride: e.target.value }))} placeholder="openrouter model id" />
            </div>
          </div>
          <div className="interview-prep-toggle-row">
            <label className="toggle-field">
              <input type="checkbox" checked={mockCompanyPresetForm.isActive} onChange={(e) => setMockCompanyPresetForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
              Активен
            </label>
          </div>
          <div className="interview-prep-question-toolbar">
            <button className="btn btn-primary" onClick={() => void handleSaveMockCompanyPreset()} disabled={saving}>
              {mockCompanyPresetForm.id ? 'Сохранить preset' : 'Добавить preset'}
            </button>
            <button className="btn btn-secondary" onClick={() => setMockCompanyPresetForm(createEmptyMockCompanyPresetForm())}>Очистить форму</button>
          </div>
          <div className="task-list">
            {mockCompanyPresets.map((item) => (
              <div key={item.id} className="task-item">
                <div className="task-item__header">
                  <div>
                    <div className="task-item__title">{item.companyTag} / {item.stageKind}</div>
                    <div className="task-item__meta">
                      <span className="badge">#{item.position}</span>
                      {item.taskSlugPattern && <span className="badge">{item.taskSlugPattern}</span>}
                      {item.aiModelOverride && <span className="badge">model override</span>}
                      {!item.isActive && <span className="badge task-inactive">inactive</span>}
                    </div>
                  </div>
                  <div className="task-item__actions">
                    <button className="btn-icon" onClick={() => setMockCompanyPresetForm(mockCompanyPresetToForm(item))}><Pencil size={16} /></button>
                    <button className="btn-icon danger" onClick={() => void handleDeleteMockCompanyPreset(item.id)} disabled={deletingId === item.id}><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="interview-prep-answer-preview">{item.aiModelOverride || 'default model by stage'}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {taskModalOpen && (
        <div className="modal-overlay" onClick={closeTaskModal}>
          <div className="modal modal-xl interview-prep-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-card__header">
              <div>
                <h2>{taskForm.id ? 'Редактировать задачу' : 'Новая задача'}</h2>
                <p className="interview-prep-muted">
                  Один сценарий = задача + прикрепленная серия follow-up вопросов.
                </p>
              </div>
              <ShieldCheck size={18} />
            </div>

            <div className="modal-scroll-content">
              <div className="task-editor-grid">
                <div className="form-group">
                  <label>Название</label>
                  <input
                    className="input"
                    value={taskForm.title}
                    onChange={(e) => handleTaskTitleChange(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Slug</label>
                  <input
                    className="input"
                    value={taskForm.slug}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, slug: toSlug(e.target.value) }))}
                    placeholder="go-two-sum-hash-map"
                  />
                </div>
                <div className="form-group">
                  <label>Тип</label>
                  <select
                    className="input"
                    value={taskForm.prepType}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, prepType: e.target.value as InterviewPrepType }))}
                  >
                    {PREP_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Язык</label>
                  <FancySelect
                    value={taskForm.language}
                    options={LANGUAGE_OPTIONS}
                    onChange={(language) => setTaskForm((prev) => ({ ...prev, language }))}
                  />
                </div>
                <div className="form-group">
                  <label>Группа / компания</label>
                  <input
                    className="input"
                    value={taskForm.companyTag}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, companyTag: e.target.value.trim().toLowerCase() }))}
                    placeholder="ozon / avito / general"
                  />
                </div>
                <div className="form-group">
                  <label>Длительность, сек</label>
                  <input
                    className="input"
                    type="number"
                    min={300}
                    step={60}
                    value={taskForm.durationSeconds}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, durationSeconds: Number(e.target.value) || 0 }))}
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
                  <label>Code task для автопроверки</label>
                  <FancySelect
                    value={taskForm.codeTaskId || '__none__'}
                    options={[
                      { value: '__none__', label: 'Не привязано' },
                      ...codeTasks.map((task) => ({
                        value: task.id,
                        label: `${task.title} (${task.language})`,
                      })),
                    ]}
                    onChange={(codeTaskId) => setTaskForm((prev) => ({
                      ...prev,
                      codeTaskId: codeTaskId === '__none__' ? '' : codeTaskId,
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label>Языки решения</label>
                  <div className="pill-selector">
                    {LANGUAGE_OPTIONS.map((option) => {
                      const active = taskForm.supportedLanguages.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`pill-selector__pill ${active ? 'active' : ''}`}
                          onClick={() => setTaskForm((prev) => ({
                            ...prev,
                            supportedLanguages: active
                              ? prev.supportedLanguages.filter((value) => value !== option.value)
                              : [...prev.supportedLanguages, option.value],
                          }))}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
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

              <div className="interview-prep-toggle-row">
                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={taskForm.isExecutable}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, isExecutable: e.target.checked }))}
                  />
                  Executable
                </label>
                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={taskForm.isActive}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Активна
                </label>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={closeTaskModal}>Отмена</button>
              <button className="btn btn-primary" onClick={() => void handleSaveTask()} disabled={saving}>
                {saving ? 'Сохранение...' : taskForm.id ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {questionModalOpen && selectedTask && (
        <div className="modal-overlay" onClick={closeQuestionModal}>
          <div className="modal modal-xl interview-prep-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-card__header">
              <div>
                <h2>Вопросы: {selectedTask.title}</h2>
                <p className="interview-prep-muted">
                  Порядок важен: вопросы идут последовательно, а не рандомно.
                </p>
              </div>
            </div>

            <div className="modal-scroll-content">
              <div className="task-editor-grid">
                <div className="form-group">
                  <label>Позиция</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={questionForm.position}
                    onChange={(e) => setQuestionForm((prev) => ({ ...prev, position: Number(e.target.value) || 1 }))}
                  />
                </div>
                <div className="form-group">
                  <label>Режим</label>
                  <input
                    className="input"
                    value={questionForm.id ? 'Редактирование вопроса' : 'Добавление нового вопроса'}
                    readOnly
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Prompt</label>
                <textarea
                  className="input textarea"
                  value={questionForm.prompt}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, prompt: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Answer</label>
                <textarea
                  className="input textarea"
                  value={questionForm.answer}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, answer: e.target.value }))}
                />
              </div>

              <div className="interview-prep-question-toolbar">
                <button className="btn btn-primary" onClick={() => void handleSaveQuestion()} disabled={saving}>
                  {saving ? 'Сохранение...' : questionForm.id ? 'Сохранить вопрос' : 'Добавить вопрос'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setQuestionForm(createEmptyQuestionForm(sortedQuestions.length + 1))}
                >
                  Очистить форму
                </button>
              </div>

              <div className="interview-prep-question-list">
                {sortedQuestions.length === 0 ? (
                  <div className="empty-state compact">У этой задачи пока нет вопросов.</div>
                ) : (
                  sortedQuestions.map((question) => (
                    <div key={question.id} className="task-item">
                      <div className="task-item__header">
                        <div>
                          <div className="task-item__title">#{question.position}</div>
                          <div className="interview-prep-muted">Следующий вопрос откроется только после ответа на этот.</div>
                        </div>
                        <div className="task-item__actions">
                          <button className="btn-icon" onClick={() => setQuestionForm(questionToForm(question))}>
                            <Pencil size={16} />
                          </button>
                          <button
                            className="btn-icon danger"
                            onClick={() => void handleDeleteQuestion(question.id)}
                            disabled={deletingId === question.id}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="task-item__statement">{question.prompt}</p>
                      <div className="interview-prep-answer-preview">{question.answer}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={closeQuestionModal}>Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
