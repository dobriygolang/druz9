import { CodeTask, CodeTaskCase } from '@/entities/CodeRoom/model/types';
import { CreateTaskRequest } from '@/features/CodeRoom/api/codeRoomApi';

export const DUEL_TOPICS = [
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
] as const;

export const DIFFICULTIES = ['', 'easy', 'medium', 'hard'];
export const TASK_TYPE_OPTIONS = [
  { value: 'algorithm_practice', label: 'Algorithm practice' },
  { value: 'file_parsing', label: 'File parsing' },
  { value: 'api_json', label: 'API / JSON' },
  { value: 'interview_practice', label: 'Interview realistic' },
  { value: 'code_editor', label: 'Code editor' },
] as const;
export const EXECUTION_PROFILE_OPTIONS = [
  { value: 'pure', label: 'pure' },
  { value: 'file_io', label: 'file_io' },
  { value: 'http_client', label: 'http_client' },
  { value: 'interview_realistic', label: 'interview_realistic' },
] as const;
export const RUNNER_MODE_OPTIONS = [
  { value: 'program', label: 'program (main/stdin/stdout)' },
  { value: 'function_io', label: 'function_io (solve(input string) string)' },
] as const;
export const LANGUAGE_OPTIONS = [
  { value: 'go', label: 'Go' },
  { value: 'python', label: 'Python' },
  { value: 'sql', label: 'SQL' },
] as const;
export const POLICY_PRESET_BY_TASK_TYPE: Record<string, string> = {
  algorithm_practice: 'pure',
  arena_duel: 'pure',
  code_editor: 'pure',
  file_parsing: 'file_io',
  api_json: 'http_client',
  interview_practice: 'interview_realistic',
};
export const RUNNER_MODE_PRESET_BY_TASK_TYPE: Record<string, string> = {
  algorithm_practice: 'function_io',
  arena_duel: 'function_io',
  code_editor: 'program',
  file_parsing: 'program',
  api_json: 'program',
  interview_practice: 'program',
};
export const POLICY_HELP = {
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
export const POLICY_TEMPLATES = [
  {
    key: 'algorithm',
    label: 'Алгоритм',
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
    label: 'Файлы',
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
    label: 'API / JSON',
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
    label: 'Interview',
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

export type CodeTaskTemplateKey = 'algorithm' | 'file_io' | 'http_client' | 'interview_realistic';

export const CODE_TASK_TEMPLATES: { key: CodeTaskTemplateKey; label: string; description: string }[] = [
  { key: 'algorithm', label: 'Алгоритм / дуэль', description: 'Pure algorithmic task for duel and practice.' },
  { key: 'file_io', label: 'Файлы', description: 'Task with prepared fixtures and file reading.' },
  { key: 'http_client', label: 'API / JSON', description: 'Task with mock HTTP/API calls.' },
  { key: 'interview_realistic', label: 'Interview', description: 'Realistic mixed interview sandbox.' },
];

export const DEFAULT_STARTER_CODE = `package main

func solve(input string) string {
	_ = input
	// TODO: parse input and return the answer as a string.
	return "implement me"
}
`;

export const PROGRAM_STARTER_CODE = `package main

import "fmt"

func main() {
	// TODO: read stdin and write stdout.
	fmt.Println("implement me")
}
`;

export const starterCodeForRunnerMode = (runnerMode: string): string => (
  runnerMode === 'program' ? PROGRAM_STARTER_CODE : DEFAULT_STARTER_CODE
);

export const createEmptyCase = (isPublic: boolean, order: number): CodeTaskCase => ({
  id: '',
  input: '',
  expectedOutput: '',
  isPublic,
  weight: 1,
  order,
});

export type TaskFormState = {
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

export const createEmptyTaskForm = (): TaskFormState => ({
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
  durationSeconds: '900',
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

export const applyTaskTemplate = (form: TaskFormState, key: CodeTaskTemplateKey): TaskFormState => {
  const template = POLICY_TEMPLATES.find((item) => item.key === key);
  if (!template) {
    return form;
  }
  const next = template.apply(form);
  if (key === 'algorithm') {
    return {
      ...next,
      taskType: 'algorithm_practice',
      language: 'go',
      difficulty: next.difficulty || 'easy',
      topics: next.topics || 'arrays',
      durationSeconds: next.durationSeconds || '900',
    };
  }
  return next;
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const taskToForm = (task: CodeTask): TaskFormState => ({
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

export const buildTaskPayload = (form: TaskFormState): CreateTaskRequest => ({
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

export const normalizePolicyFields = (form: TaskFormState): TaskFormState => {
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

export const normalizeRunnerMode = (form: TaskFormState): TaskFormState => {
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
