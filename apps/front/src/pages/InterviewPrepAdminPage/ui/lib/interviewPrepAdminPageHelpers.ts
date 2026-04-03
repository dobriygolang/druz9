import {
  InterviewPrepMockCompanyPreset,
  InterviewPrepMockQuestionPoolItem,
  InterviewPrepMockStageKind,
  InterviewPrepQuestion,
  InterviewPrepTask,
  InterviewPrepType,
} from '@/features/InterviewPrep/api/interviewPrepApi';

export const PREP_TYPES: { value: InterviewPrepType; label: string }[] = [
  { value: 'coding', label: 'Coding' },
  { value: 'algorithm', label: 'Algorithm' },
  { value: 'system_design', label: 'System Design' },
  { value: 'sql', label: 'SQL' },
  { value: 'code_review', label: 'Code Review' },
];

export const LANGUAGE_OPTIONS = [
  { value: 'go', label: 'Go' },
  { value: 'python', label: 'Python' },
  { value: 'sql', label: 'SQL' },
  { value: 'system_design', label: 'System Design' },
];

export const MOCK_STAGE_OPTIONS: { value: InterviewPrepMockStageKind; label: string }[] = [
  { value: 'slices', label: 'Slices' },
  { value: 'concurrency', label: 'Concurrency' },
  { value: 'sql', label: 'SQL' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'system_design', label: 'System Design' },
];

export const DEFAULT_STARTER_CODE = `package main

func solve(input string) string {
\t_ = input
\t// TODO: parse input and return the answer as a string.
\treturn "implement me"
}
`;

export type InterviewPrepTemplateKey =
  | 'go_coding'
  | 'algorithm'
  | 'sql'
  | 'question_bank'
  | 'system_design';

export type TaskFormState = {
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

export const INTERVIEW_PREP_TEMPLATES: { key: InterviewPrepTemplateKey; label: string; description: string }[] = [
  { key: 'go_coding', label: 'Go coding', description: 'Executable Go task with live coding.' },
  { key: 'algorithm', label: 'Algorithm', description: 'Algorithmic Go task with live coding.' },
  { key: 'sql', label: 'SQL', description: 'SQL or database-oriented guided task.' },
  { key: 'question_bank', label: 'Questions', description: 'Theory or verbal interview question.' },
  { key: 'system_design', label: 'System design', description: 'Architecture or system design discussion.' },
];

export type QuestionFormState = {
  id: string | null;
  position: number;
  prompt: string;
  answer: string;
};

export type MockQuestionPoolFormState = {
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

export type MockCompanyPresetFormState = {
  id: string | null;
  companyTag: string;
  stageKind: InterviewPrepMockStageKind;
  position: number;
  taskSlugPattern: string;
  aiModelOverride: string;
  isActive: boolean;
};

export const createEmptyTaskForm = (): TaskFormState => ({
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

export const applyTaskTemplate = (form: TaskFormState, template: InterviewPrepTemplateKey): TaskFormState => {
  const base = {
    ...form,
    codeTaskId: '',
    companyTag: form.companyTag || 'general',
    isActive: form.isActive ?? true,
  };

  switch (template) {
    case 'go_coding':
      return {
        ...base,
        prepType: 'coding',
        language: 'go',
        supportedLanguages: ['go'],
        isExecutable: true,
        executionProfile: 'pure',
        runnerMode: 'function_io',
        durationSeconds: 2700,
        starterCode: DEFAULT_STARTER_CODE,
      };
    case 'algorithm':
      return {
        ...base,
        prepType: 'algorithm',
        language: 'go',
        supportedLanguages: ['go'],
        isExecutable: true,
        executionProfile: 'pure',
        runnerMode: 'function_io',
        durationSeconds: 2700,
        starterCode: DEFAULT_STARTER_CODE,
      };
    case 'sql':
      return {
        ...base,
        prepType: 'sql',
        language: 'sql',
        supportedLanguages: ['sql'],
        isExecutable: false,
        executionProfile: 'pure',
        runnerMode: 'function_io',
        durationSeconds: 1800,
        starterCode: '',
      };
    case 'question_bank':
      return {
        ...base,
        prepType: 'coding',
        language: 'go',
        supportedLanguages: ['go'],
        isExecutable: false,
        executionProfile: 'pure',
        runnerMode: 'function_io',
        durationSeconds: 1200,
        starterCode: '',
      };
    case 'system_design':
      return {
        ...base,
        prepType: 'system_design',
        language: 'system_design',
        supportedLanguages: [],
        isExecutable: false,
        executionProfile: 'pure',
        runnerMode: 'function_io',
        durationSeconds: 2400,
        starterCode: '',
      };
    default:
      return base;
  }
};

export const createEmptyQuestionForm = (position = 1): QuestionFormState => ({
  id: null,
  position,
  prompt: '',
  answer: '',
});

export const createEmptyMockQuestionPoolForm = (): MockQuestionPoolFormState => ({
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

export const createEmptyMockCompanyPresetForm = (): MockCompanyPresetFormState => ({
  id: null,
  companyTag: 'ozon',
  stageKind: 'slices',
  position: 1,
  taskSlugPattern: '',
  aiModelOverride: '',
  isActive: true,
});

export const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const taskToForm = (task: InterviewPrepTask): TaskFormState => ({
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

export const questionToForm = (question: InterviewPrepQuestion): QuestionFormState => ({
  id: question.id,
  position: question.position,
  prompt: question.prompt,
  answer: question.answer,
});

export const mockQuestionPoolToForm = (item: InterviewPrepMockQuestionPoolItem): MockQuestionPoolFormState => ({
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

export const mockCompanyPresetToForm = (item: InterviewPrepMockCompanyPreset): MockCompanyPresetFormState => ({
  id: item.id,
  companyTag: item.companyTag,
  stageKind: item.stageKind,
  position: item.position,
  taskSlugPattern: item.taskSlugPattern,
  aiModelOverride: item.aiModelOverride,
  isActive: item.isActive,
});
