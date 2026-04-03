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
] as const;
export const LANGUAGE_OPTIONS = [
  { value: 'go', label: 'Go' },
] as const;
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
] as const;

export type CodeTaskTemplateKey = 'algorithm';

export const CODE_TASK_TEMPLATES: { key: CodeTaskTemplateKey; label: string; description: string }[] = [
  { key: 'algorithm', label: 'Алгоритм / дуэль', description: 'Pure algorithmic task for duel and practice.' },
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
  language: 'go',
  taskType: 'algorithm_practice',
  executionProfile: 'pure',
  runnerMode: 'function_io',
  durationSeconds: Number(form.durationSeconds) || 900,
  fixtureFiles: [],
  readablePaths: [],
  writablePaths: [],
  allowedHosts: [],
  allowedPorts: [],
  mockEndpoints: [],
  writableTempDir: false,
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
  next.taskType = 'algorithm_practice';
  next.executionProfile = 'pure';
  next.runnerMode = 'function_io';
  next.language = 'go';
  next.fixtureFiles = '';
  next.readablePaths = '';
  next.writablePaths = '';
  next.allowedHosts = '';
  next.allowedPorts = '';
  next.mockEndpoints = '';
  next.writableTempDir = false;
  return next;
};

export const normalizeRunnerMode = (form: TaskFormState): TaskFormState => {
  const next = { ...form };
  next.runnerMode = 'function_io';
  if (!next.starterCode.trim() || next.starterCode === DEFAULT_STARTER_CODE || next.starterCode === PROGRAM_STARTER_CODE) {
    next.starterCode = DEFAULT_STARTER_CODE;
  }
  return next;
};
