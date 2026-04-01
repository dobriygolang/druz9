import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { codeRoomApi, CreateTaskRequest } from '@/features/CodeRoom/api/codeRoomApi';
import { CodeTask, CodeTaskCase } from '@/entities/CodeRoom/model/types';
import { FancySelect } from '@/shared/ui/FancySelect';
import { AxiosError } from '@/shared/api/base';

const DUEL_TOPICS = [
  { value: '', label: 'Любая тема' },
  { value: 'two-pointers', label: 'Two Pointers' },
  { value: 'linked-list', label: 'Linked List' },
  { value: 'arrays', label: 'Arrays' },
  { value: 'strings', label: 'Strings' },
  { value: 'hash-map', label: 'Hash Map' },
  { value: 'stack', label: 'Stack' },
  { value: 'queue', label: 'Queue' },
  { value: 'tree', label: 'Tree' },
  { value: 'graph', label: 'Graph' },
  { value: 'dp', label: 'DP' },
];

const DIFFICULTIES = ['', 'easy', 'medium', 'hard'];
const TASK_TYPE_OPTIONS = [
  { value: 'algorithm_practice', label: 'Algorithm practice' },
  { value: 'file_parsing', label: 'File parsing' },
  { value: 'api_json', label: 'API / JSON' },
  { value: 'interview_practice', label: 'Interview realistic' },
  { value: 'arena_duel', label: 'Arena duel' },
  { value: 'code_editor', label: 'Code editor' },
];
const EXECUTION_PROFILE_OPTIONS = [
  { value: 'pure', label: 'pure' },
  { value: 'file_io', label: 'file_io' },
  { value: 'http_client', label: 'http_client' },
  { value: 'interview_realistic', label: 'interview_realistic' },
];
const RUNNER_MODE_OPTIONS = [
  { value: 'program', label: 'program (main/stdin/stdout)' },
  { value: 'function_io', label: 'function_io (solve(input string) string)' },
];
const LANGUAGE_OPTIONS = [
  { value: 'go', label: 'Go' },
  { value: 'python', label: 'Python' },
  { value: 'sql', label: 'SQL' },
];
const POLICY_PRESET_BY_TASK_TYPE: Record<string, string> = {
  algorithm_practice: 'pure',
  arena_duel: 'pure',
  code_editor: 'pure',
  file_parsing: 'file_io',
  api_json: 'http_client',
  interview_practice: 'interview_realistic',
};
const RUNNER_MODE_PRESET_BY_TASK_TYPE: Record<string, string> = {
  algorithm_practice: 'function_io',
  arena_duel: 'function_io',
  code_editor: 'program',
  file_parsing: 'program',
  api_json: 'program',
  interview_practice: 'program',
};
const POLICY_HELP = {
  pure: {
    title: 'pure',
    summary: 'Только stdin/stdout. Без сети и без файловой системы.',
    allows: ['stdin/stdout', 'детерминированный запуск', 'arena и алгоритмы'],
    forbids: ['HTTP', 'fixture files', 'workspace paths', 'temp write'],
  },
  file_io: {
    title: 'file_io',
    summary: 'Чтение только заранее подготовленных файлов внутри workspace.',
    allows: ['fixture files', 'readable paths', 'опциональный temp write'],
    forbids: ['внешняя сеть', 'выход за workspace'],
  },
  http_client: {
    title: 'http_client',
    summary: 'HTTP только к allowlist host/port или mock endpoint.',
    allows: ['mock endpoints', 'allowlist hosts/ports'],
    forbids: ['внешний интернет', 'filesystem'],
  },
  interview_realistic: {
    title: 'interview_realistic',
    summary: 'Controlled file IO + mock HTTP без unrestricted access.',
    allows: ['fixture files', 'readable paths', 'mock endpoints', 'allowlist hosts/ports', 'temp write'],
    forbids: ['внешний интернет', 'выход за workspace'],
  },
} as const;
const POLICY_TEMPLATES = [
  {
    key: 'pure',
    label: 'Шаблон pure',
    apply: (form: TaskFormState): TaskFormState => ({
      ...form,
      taskType: 'algorithm_practice',
      executionProfile: 'pure',
      runnerMode: 'function_io',
      fixtureFiles: '',
      readablePaths: '',
      writablePaths: '',
      allowedHosts: '',
      allowedPorts: '',
      mockEndpoints: '',
      writableTempDir: false,
    }),
  },
  {
    key: 'file_io',
    label: 'Шаблон file_io',
    apply: (form: TaskFormState): TaskFormState => ({
      ...form,
      taskType: 'file_parsing',
      executionProfile: 'file_io',
      runnerMode: 'program',
      fixtureFiles: 'fixtures/input.txt',
      readablePaths: 'fixtures/input.txt',
      writablePaths: '',
      allowedHosts: '',
      allowedPorts: '',
      mockEndpoints: '',
      writableTempDir: true,
    }),
  },
  {
    key: 'http_client',
    label: 'Шаблон http_client',
    apply: (form: TaskFormState): TaskFormState => ({
      ...form,
      taskType: 'api_json',
      executionProfile: 'http_client',
      runnerMode: 'program',
      fixtureFiles: '',
      readablePaths: '',
      writablePaths: '',
      allowedHosts: 'mock.local',
      allowedPorts: '80',
      mockEndpoints: 'http://mock.local/ping',
      writableTempDir: false,
    }),
  },
  {
    key: 'interview_realistic',
    label: 'Шаблон interview',
    apply: (form: TaskFormState): TaskFormState => ({
      ...form,
      taskType: 'interview_practice',
      executionProfile: 'interview_realistic',
      runnerMode: 'program',
      fixtureFiles: 'fixtures/cases.json',
      readablePaths: 'fixtures/cases.json',
      writablePaths: '',
      allowedHosts: 'mock.local',
      allowedPorts: '80',
      mockEndpoints: 'http://mock.local/users',
      writableTempDir: true,
    }),
  },
] as const;

const DEFAULT_STARTER_CODE = `package main

func solve(input string) string {
	_ = input
	// TODO: parse input and return the answer as a string.
	return "implement me"
}
`;

const PROGRAM_STARTER_CODE = `package main

import "fmt"

func main() {
	// TODO: read stdin and write stdout.
	fmt.Println("implement me")
}
`;

const starterCodeForRunnerMode = (runnerMode: string): string => (
  runnerMode === 'program' ? PROGRAM_STARTER_CODE : DEFAULT_STARTER_CODE
);

const createEmptyCase = (isPublic: boolean, order: number): CodeTaskCase => ({
  id: '',
  input: '',
  expectedOutput: '',
  isPublic,
  weight: 1,
  order,
});

type TaskFormState = {
  id: string | null;
  title: string;
  slug: string;
  statement: string;
  difficulty: string;
  topics: string;
  starterCode: string;
  language: string;
  taskType: string;
  executionProfile: string;
  runnerMode: string;
  durationSeconds: string;
  fixtureFiles: string;
  readablePaths: string;
  writablePaths: string;
  allowedHosts: string;
  allowedPorts: string;
  mockEndpoints: string;
  writableTempDir: boolean;
  isActive: boolean;
  publicTestCases: CodeTaskCase[];
  hiddenTestCases: CodeTaskCase[];
};

const createEmptyTaskForm = (): TaskFormState => ({
  id: null,
  title: '',
  slug: '',
  statement: '',
  difficulty: 'easy',
  topics: '',
  starterCode: DEFAULT_STARTER_CODE,
  language: 'go',
  taskType: 'algorithm_practice',
  executionProfile: 'pure',
  runnerMode: 'function_io',
  durationSeconds: '900', // 15 minutes default
  fixtureFiles: '',
  readablePaths: '',
  writablePaths: '',
  allowedHosts: '',
  allowedPorts: '',
  mockEndpoints: '',
  writableTempDir: false,
  isActive: true,
  publicTestCases: [createEmptyCase(true, 1)],
  hiddenTestCases: [createEmptyCase(false, 1)],
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const taskToForm = (task: CodeTask): TaskFormState => ({
  id: task.id,
  title: task.title,
  slug: task.slug,
  statement: task.statement,
  difficulty: task.difficulty || 'easy',
  topics: task.topics.join(', '),
  starterCode: task.starterCode,
  language: task.language || 'go',
  taskType: task.taskType || 'algorithm_practice',
  executionProfile: task.executionProfile || 'pure',
  runnerMode: task.runnerMode || 'program',
  durationSeconds: task.durationSeconds ? String(task.durationSeconds) : '900',
  fixtureFiles: task.fixtureFiles.join(', '),
  readablePaths: task.readablePaths.join(', '),
  writablePaths: task.writablePaths.join(', '),
  allowedHosts: task.allowedHosts.join(', '),
  allowedPorts: task.allowedPorts.join(', '),
  mockEndpoints: task.mockEndpoints.join(', '),
  writableTempDir: task.writableTempDir,
  isActive: task.isActive,
  publicTestCases: task.publicTestCases.length > 0 ? task.publicTestCases : [createEmptyCase(true, 1)],
  hiddenTestCases: task.hiddenTestCases.length > 0 ? task.hiddenTestCases : [createEmptyCase(false, 1)],
});

const buildTaskPayload = (form: TaskFormState): CreateTaskRequest => ({
  title: form.title.trim(),
  slug: slugify(form.slug || form.title),
  statement: form.statement.trim(),
  difficulty: form.difficulty,
  topics: form.topics.split(',').map((item) => item.trim()).filter(Boolean),
  starterCode: form.starterCode,
  language: form.language,
  taskType: form.taskType,
  executionProfile: form.executionProfile,
  runnerMode: form.runnerMode,
  durationSeconds: Number(form.durationSeconds) || 900,
  fixtureFiles: form.fixtureFiles.split(',').map((item) => item.trim()).filter(Boolean),
  readablePaths: form.readablePaths.split(',').map((item) => item.trim()).filter(Boolean),
  writablePaths: form.writablePaths.split(',').map((item) => item.trim()).filter(Boolean),
  allowedHosts: form.allowedHosts.split(',').map((item) => item.trim()).filter(Boolean),
  allowedPorts: form.allowedPorts.split(',').map((item) => Number(item.trim())).filter((item) => Number.isFinite(item) && item > 0),
  mockEndpoints: form.mockEndpoints.split(',').map((item) => item.trim()).filter(Boolean),
  writableTempDir: form.writableTempDir,
  isActive: form.isActive,
  publicTestCases: form.publicTestCases
    .filter((item) => item.input.trim() || item.expectedOutput.trim())
    .map((item, index) => ({ ...item, isPublic: true, order: index + 1 })),
  hiddenTestCases: form.hiddenTestCases
    .filter((item) => item.input.trim() || item.expectedOutput.trim())
    .map((item, index) => ({ ...item, isPublic: false, order: index + 1 })),
});

const normalizePolicyFields = (form: TaskFormState): TaskFormState => {
  const next = { ...form };

  if (next.executionProfile === 'pure') {
    next.fixtureFiles = '';
    next.readablePaths = '';
    next.writablePaths = '';
    next.allowedHosts = '';
    next.allowedPorts = '';
    next.mockEndpoints = '';
    next.writableTempDir = false;
  } else if (next.executionProfile === 'file_io') {
    next.allowedHosts = '';
    next.allowedPorts = '';
    next.mockEndpoints = '';
  } else if (next.executionProfile === 'http_client') {
    next.fixtureFiles = '';
    next.readablePaths = '';
    next.writablePaths = '';
    next.writableTempDir = false;
  }

  return next;
};

const normalizeRunnerMode = (form: TaskFormState): TaskFormState => {
  const next = { ...form };

  const presetRunnerMode = RUNNER_MODE_PRESET_BY_TASK_TYPE[next.taskType];
  if (presetRunnerMode) {
    next.runnerMode = presetRunnerMode;
  }

  if (!next.starterCode.trim() || next.starterCode === DEFAULT_STARTER_CODE || next.starterCode === PROGRAM_STARTER_CODE) {
    next.starterCode = starterCodeForRunnerMode(next.runnerMode);
  }

  return next;
};

export const CodeTasksAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<CodeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showPolicyHelp, setShowPolicyHelp] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormState>(createEmptyTaskForm());
  const [savingTask, setSavingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const isAdmin = Boolean(user?.isAdmin);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await codeRoomApi.listTasks({
        topic: topicFilter,
        difficulty: difficultyFilter,
        includeInactive: true,
      });
      setTasks(data);
    } catch (e) {
      const axiosErr = e as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message || 'Не удалось загрузить задачи');
    } finally {
      setLoading(false);
    }
  }, [difficultyFilter, topicFilter]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return tasks;
    }
    return tasks.filter((task) =>
      task.title.toLowerCase().includes(query)
      || task.slug.toLowerCase().includes(query)
      || task.statement.toLowerCase().includes(query),
    );
  }, [search, tasks]);
  const activeTasksCount = useMemo(() => tasks.filter((task) => task.isActive).length, [tasks]);

  if (!isAdmin) {
    return <Navigate to="/code-rooms" replace />;
  }

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setShowPolicyHelp(false);
    setTaskForm(createEmptyTaskForm());
  };

  const openCreateTaskModal = (task?: CodeTask) => {
    setTaskForm(task ? taskToForm(task) : createEmptyTaskForm());
    setShowPolicyHelp(false);
    setShowTaskModal(true);
  };

  const updateTaskCase = (
    key: 'publicTestCases' | 'hiddenTestCases',
    index: number,
    field: keyof CodeTaskCase,
    value: string | number | boolean,
  ) => {
    setTaskForm((prev) => {
      const nextCases = [...prev[key]];
      nextCases[index] = { ...nextCases[index], [field]: value };
      return { ...prev, [key]: nextCases };
    });
  };

  const addTaskCase = (key: 'publicTestCases' | 'hiddenTestCases', isPublic: boolean) => {
    setTaskForm((prev) => ({
      ...prev,
      [key]: [...prev[key], createEmptyCase(isPublic, prev[key].length + 1)],
    }));
  };

  const removeTaskCase = (key: 'publicTestCases' | 'hiddenTestCases', index: number) => {
    setTaskForm((prev) => {
      const nextCases = prev[key].filter((_, currentIndex) => currentIndex !== index);
      return {
        ...prev,
        [key]: nextCases.length > 0 ? nextCases : [createEmptyCase(key === 'publicTestCases', 1)],
      };
    });
  };

  const handleSaveTask = async () => {
    const normalizedForm = normalizePolicyFields(taskForm);
    const payload = buildTaskPayload(normalizedForm);
    if (!payload.title || !payload.statement) {
      return;
    }
    if ((payload.executionProfile === 'http_client' || payload.executionProfile === 'interview_realistic')
      && payload.allowedHosts.length === 0
      && payload.mockEndpoints.length === 0) {
      return;
    }

    setSavingTask(true);
    try {
      setTaskForm(normalizedForm);
      if (taskForm.id) {
        await codeRoomApi.adminUpdateTask(taskForm.id, payload);
      } else {
        await codeRoomApi.adminCreateTask(payload);
      }
      closeTaskModal();
      await loadTasks();
    } catch (e) {
      console.error('Failed to save task:', e);
    } finally {
      setSavingTask(false);
    }
  };

  const policySummary = useMemo(() => {
    const parts = [taskForm.executionProfile];
    if (taskForm.fixtureFiles.trim()) {
      parts.push(`files ${taskForm.fixtureFiles.split(',').filter(Boolean).length}`);
    }
    if (taskForm.allowedHosts.trim() || taskForm.mockEndpoints.trim()) {
      parts.push('network restricted');
    }
    if (taskForm.writableTempDir) {
      parts.push('temp write');
    }
    return parts.join(' • ');
  }, [taskForm.allowedHosts, taskForm.executionProfile, taskForm.fixtureFiles, taskForm.mockEndpoints, taskForm.writableTempDir]);

  const showFilesystemPolicy = taskForm.executionProfile === 'file_io' || taskForm.executionProfile === 'interview_realistic';
  const showNetworkPolicy = taskForm.executionProfile === 'http_client' || taskForm.executionProfile === 'interview_realistic';
  const selectedPolicyHelp = POLICY_HELP[taskForm.executionProfile as keyof typeof POLICY_HELP];
  const policyWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (taskForm.executionProfile === 'pure' && (taskForm.fixtureFiles.trim() || taskForm.allowedHosts.trim() || taskForm.mockEndpoints.trim())) {
      warnings.push('`pure` не поддерживает файлы и сеть. Эти поля будут очищены при сохранении.');
    }
    if (taskForm.executionProfile === 'file_io' && (taskForm.allowedHosts.trim() || taskForm.mockEndpoints.trim())) {
      warnings.push('`file_io` не поддерживает сеть. Network-поля будут очищены при сохранении.');
    }
    if (taskForm.executionProfile === 'http_client' && (taskForm.fixtureFiles.trim() || taskForm.readablePaths.trim() || taskForm.writablePaths.trim())) {
      warnings.push('`http_client` не использует filesystem policy. File-поля будут очищены при сохранении.');
    }
    if (showNetworkPolicy && !taskForm.allowedHosts.trim() && !taskForm.mockEndpoints.trim()) {
      warnings.push('Для network profile укажи хотя бы один allowlist host или mock endpoint.');
    }
    if (taskForm.executionProfile === 'file_io' && !taskForm.fixtureFiles.trim()) {
      warnings.push('Для `file_io` укажи хотя бы один fixture file.');
    }
    return warnings;
  }, [showNetworkPolicy, taskForm.allowedHosts, taskForm.executionProfile, taskForm.fixtureFiles, taskForm.mockEndpoints, taskForm.readablePaths, taskForm.writablePaths]);

  const handleDeleteTask = async (taskId: string) => {
    setDeletingTaskId(taskId);
    try {
      await codeRoomApi.adminDeleteTask(taskId);
      await loadTasks();
    } catch (e) {
      console.error('Failed to delete task:', e);
    } finally {
      setDeletingTaskId(null);
    }
  };

  return (
    <>
      <div className="code-rooms-page code-admin-page">
        <div className="page-header code-rooms-hero">
          <div className="code-rooms-hero__copy">
            <span className="code-rooms-kicker">Admin</span>
            <h1>Задачи для дуэлей</h1>
            <p className="code-rooms-subtitle">
              Каталог задач, hidden/public тесты, включение в random duel и быстрые фильтры для ручного управления judge.
            </p>
            <p className="code-rooms-subtitle">
              Всего задач: {tasks.length}. Активных: {activeTasksCount}. Под текущими фильтрами: {filteredTasks.length}.
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
              aria-label="Поиск задач"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <FancySelect
              value={topicFilter}
              options={DUEL_TOPICS}
              placeholder="Любая тема"
              onChange={setTopicFilter}
            />
            <FancySelect
              value={difficultyFilter}
              options={[
                { value: '', label: 'Любая сложность' },
                ...DIFFICULTIES.filter(Boolean).map((difficulty) => ({ value: difficulty, label: difficulty })),
              ]}
              placeholder="Любая сложность"
              onChange={setDifficultyFilter}
            />
          </div>

          {loading ? (
            <div className="empty-state compact">Загрузка задач...</div>
          ) : error ? (
            <div className="error-text">{error}</div>
          ) : filteredTasks.length === 0 ? (
            <div className="empty-state compact">Под эти фильтры задач пока нет.</div>
          ) : (
            <div className="task-list">
              {filteredTasks.map((task) => (
                <div key={task.id} className="task-item">
                  <div className="task-item__header">
                    <div>
                      <div className="task-item__title">{task.title}</div>
                      <div className="task-item__meta">
                        <span className={`badge task-difficulty task-difficulty-${task.difficulty}`}>{task.difficulty}</span>
                        {task.topics.map((topic) => (
                          <span key={topic} className="topic-chip">{topic}</span>
                        ))}
                        <span className="badge task-policy-badge">{task.executionProfile}</span>
                        <span className="badge task-policy-badge task-policy-badge--muted">{task.taskType}</span>
                        {!task.isActive && <span className="badge task-inactive">Неактивна</span>}
                      </div>
                    </div>
                    <div className="task-item__actions">
                      <button className="btn-icon" onClick={() => openCreateTaskModal(task)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="btn-icon danger"
                        onClick={() => void handleDeleteTask(task.id)}
                        disabled={deletingTaskId === task.id}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="task-item__statement">{task.statement}</p>
                  <div className="task-item__footer">
                    <span>{task.publicTestCases.length} public</span>
                    <span>{task.hiddenTestCases.length} hidden</span>
                    <span>{task.language}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {showTaskModal && (
          <div className="modal-overlay" onClick={closeTaskModal}>
            <div className="modal modal-xl code-admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dashboard-card__header">
                <div>
                  <h2>{taskForm.id ? 'Редактировать задачу' : 'Новая задача'}</h2>
                  <p className="dashboard-card__subtitle">Statement, starter code, public/hidden tests и включение задачи в random duel.</p>
                </div>
                <ShieldCheck size={18} />
              </div>

              <div className="task-editor-grid">
                <div className="form-group">
                  <label>Название</label>
                  <input className="input" value={taskForm.title} onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Slug</label>
                  <input className="input" value={taskForm.slug} onChange={(e) => setTaskForm((prev) => ({ ...prev, slug: e.target.value }))} placeholder="Если пусто, соберется из title" />
                </div>
                <div className="form-group">
                  <label>Сложность</label>
                  <FancySelect
                    value={taskForm.difficulty}
                    options={DIFFICULTIES.filter(Boolean).map((difficulty) => ({ value: difficulty, label: difficulty }))}
                    onChange={(difficulty) => setTaskForm((prev) => ({ ...prev, difficulty }))}
                  />
                </div>
                <div className="form-group">
                  <label>Topics через запятую</label>
                  <input className="input" value={taskForm.topics} onChange={(e) => setTaskForm((prev) => ({ ...prev, topics: e.target.value }))} placeholder="two-pointers, linked-list" />
                </div>
                <div className="form-group">
                  <label>Language</label>
                  <FancySelect
                    value={taskForm.language}
                    options={LANGUAGE_OPTIONS}
                    onChange={(language) => setTaskForm((prev) => ({ ...prev, language }))}
                  />
                </div>
                <div className="form-group">
                  <label>Task type</label>
                  <FancySelect
                    value={taskForm.taskType}
                    options={TASK_TYPE_OPTIONS}
                    onChange={(taskType) => setTaskForm((prev) => ({
                      ...normalizeRunnerMode(normalizePolicyFields({
                        ...prev,
                        taskType,
                        executionProfile: POLICY_PRESET_BY_TASK_TYPE[taskType] || prev.executionProfile,
                      })),
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label>Execution profile</label>
                  <FancySelect
                    value={taskForm.executionProfile}
                    options={EXECUTION_PROFILE_OPTIONS}
                    onChange={(executionProfile) => setTaskForm((prev) => normalizeRunnerMode(normalizePolicyFields({ ...prev, executionProfile })))}
                  />
                </div>
                <div className="form-group">
                  <label>Runner mode</label>
                  <FancySelect
                    value={taskForm.runnerMode}
                    options={RUNNER_MODE_OPTIONS}
                    onChange={(runnerMode) => setTaskForm((prev) => normalizeRunnerMode({ ...prev, runnerMode }))}
                  />
                </div>
                <div className="form-group">
                  <label>Duration (seconds) for arena</label>
                  <input
                    className="input"
                    type="number"
                    min="60"
                    max="3600"
                    value={taskForm.durationSeconds}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, durationSeconds: e.target.value }))}
                    placeholder="900"
                  />
                </div>
                <div className="form-group">
                  <label>Runtime contract</label>
                  <div className="task-policy-empty">
                    {taskForm.runnerMode === 'function_io'
                      ? 'Пользователь пишет `func solve(input string) string`. Sandbox сам подставляет hidden main и передает stdin как строку.'
                      : 'Пользователь пишет обычный `func main()` и сам работает со stdin/stdout.'}
                  </div>
                </div>
              </div>

              <div className="task-policy-panel">
                <div className="task-policy-panel__header">
                  <div>
                    <strong>Policy layer</strong>
                    <div className="dashboard-card__subtitle">Явные capabilities задачи. Без скрытых эвристик по title или topics.</div>
                  </div>
                  <div className="task-policy-panel__header-actions">
                    <span className="badge task-policy-badge">{policySummary}</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPolicyHelp((current) => !current)}>
                      {showPolicyHelp ? 'Скрыть help' : 'Показать help'}
                    </button>
                  </div>
                </div>
                <div className="task-policy-templates">
                  {POLICY_TEMPLATES.map((template) => (
                    <button
                      key={template.key}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setTaskForm((prev) => normalizePolicyFields(template.apply(prev)))}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
                {showPolicyHelp && (
                  <div className="task-policy-help">
                    <div className="task-policy-help__summary">
                      <strong>{selectedPolicyHelp.title}</strong>
                      <span>{selectedPolicyHelp.summary}</span>
                    </div>
                    <div className="task-policy-help__grid">
                      <div className="task-policy-help__card">
                        <div className="task-policy-help__label">Разрешено</div>
                        {selectedPolicyHelp.allows.map((item) => (
                          <div key={item} className="task-policy-help__item">{item}</div>
                        ))}
                      </div>
                      <div className="task-policy-help__card">
                        <div className="task-policy-help__label">Запрещено</div>
                        {selectedPolicyHelp.forbids.map((item) => (
                          <div key={item} className="task-policy-help__item">{item}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {policyWarnings.length > 0 && (
                  <div className="task-policy-warning-list">
                    {policyWarnings.map((warning) => (
                      <div key={warning} className="task-policy-warning">{warning}</div>
                    ))}
                  </div>
                )}
                {(showFilesystemPolicy || showNetworkPolicy) ? (
                  <>
                    <div className="task-policy-grid">
                      {showFilesystemPolicy && (
                        <>
                          <div className="form-group">
                            <label>Fixture files</label>
                            <input className="input" value={taskForm.fixtureFiles} onChange={(e) => setTaskForm((prev) => ({ ...prev, fixtureFiles: e.target.value }))} placeholder="fixtures/input.txt, fixtures/cases.json" />
                          </div>
                          <div className="form-group">
                            <label>Readable paths</label>
                            <input className="input" value={taskForm.readablePaths} onChange={(e) => setTaskForm((prev) => ({ ...prev, readablePaths: e.target.value }))} placeholder="fixtures, data/sample.txt" />
                          </div>
                          <div className="form-group">
                            <label>Writable paths</label>
                            <input className="input" value={taskForm.writablePaths} onChange={(e) => setTaskForm((prev) => ({ ...prev, writablePaths: e.target.value }))} placeholder="tmp/output.txt" />
                          </div>
                        </>
                      )}
                      {showNetworkPolicy && (
                        <>
                          <div className="form-group">
                            <label>Allowed hosts</label>
                            <input className="input" value={taskForm.allowedHosts} onChange={(e) => setTaskForm((prev) => ({ ...prev, allowedHosts: e.target.value }))} placeholder="mock.local, api.internal" />
                          </div>
                          <div className="form-group">
                            <label>Allowed ports</label>
                            <input className="input" value={taskForm.allowedPorts} onChange={(e) => setTaskForm((prev) => ({ ...prev, allowedPorts: e.target.value }))} placeholder="80, 443, 8080" />
                          </div>
                          <div className="form-group">
                            <label>Mock endpoints</label>
                            <input className="input" value={taskForm.mockEndpoints} onChange={(e) => setTaskForm((prev) => ({ ...prev, mockEndpoints: e.target.value }))} placeholder="http://mock.local/users, http://mock.local/ping" />
                          </div>
                        </>
                      )}
                    </div>
                    {showFilesystemPolicy && (
                      <label className="toggle-field">
                        <input
                          type="checkbox"
                          checked={taskForm.writableTempDir}
                          onChange={(e) => setTaskForm((prev) => ({ ...prev, writableTempDir: e.target.checked }))}
                        />
                        Разрешить запись во временную директорию
                      </label>
                    )}
                  </>
                ) : (
                  <div className="task-policy-empty">
                    Для профиля <strong>{taskForm.executionProfile}</strong> дополнительные filesystem/network поля не нужны.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Условие</label>
                <textarea className="input textarea" value={taskForm.statement} onChange={(e) => setTaskForm((prev) => ({ ...prev, statement: e.target.value }))} />
              </div>

              <div className="form-group">
                <label>Starter code</label>
                <textarea className="input textarea code-textarea" value={taskForm.starterCode} onChange={(e) => setTaskForm((prev) => ({ ...prev, starterCode: e.target.value }))} />
              </div>

              <div className="task-cases-grid">
                {(['publicTestCases', 'hiddenTestCases'] as const).map((key) => {
                  const title = key === 'publicTestCases' ? 'Публичные тесты' : 'Скрытые тесты';
                  const isPublic = key === 'publicTestCases';
                  return (
                    <div key={key} className="task-cases-card">
                      <div className="dashboard-card__header">
                        <h3>{title}</h3>
                        <button className="btn btn-secondary btn-sm" onClick={() => addTaskCase(key, isPublic)}>
                          <Plus size={14} />
                          Тест
                        </button>
                      </div>
                      <div className="task-case-list">
                        {taskForm[key].map((testCase, index) => (
                          <div key={`${key}-${index}`} className="task-case-item">
                            <div className="task-case-item__header">
                              <span>Тест #{index + 1}</span>
                              <button className="btn-icon danger" onClick={() => removeTaskCase(key, index)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <textarea
                              className="input textarea"
                              placeholder="stdin"
                              value={testCase.input}
                              onChange={(e) => updateTaskCase(key, index, 'input', e.target.value)}
                            />
                            <textarea
                              className="input textarea"
                              placeholder="expected stdout"
                              value={testCase.expectedOutput}
                              onChange={(e) => updateTaskCase(key, index, 'expectedOutput', e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={taskForm.isActive}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Активна и может попадать в random duel
              </label>

              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={closeTaskModal}>Отмена</button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveTask}
                  disabled={savingTask || ((taskForm.executionProfile === 'http_client' || taskForm.executionProfile === 'interview_realistic') && !taskForm.allowedHosts.trim() && !taskForm.mockEndpoints.trim())}
                >
                  {savingTask ? 'Сохранение...' : taskForm.id ? 'Сохранить' : 'Создать задачу'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
