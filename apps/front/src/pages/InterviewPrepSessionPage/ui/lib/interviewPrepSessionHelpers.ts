import {
  InterviewPrepQuestion,
  InterviewPrepSelfAssessment,
} from '@/features/InterviewPrep/api/interviewPrepApi';

export const DEFAULT_CODE_BY_LANGUAGE: Record<string, string> = {
  go: `func solve(input string) string {
\treturn ""
}
`,
  python: `def solve(input: str) -> str:
    return ""
`,
  sql: `-- Write a single SQL query.
SELECT 1;
`,
};

export const resultLabel: Record<InterviewPrepSelfAssessment, string> = {
  answered: 'Ответил сам',
  skipped: 'Пропустил',
};

export type SqlStarterTab = 'schema' | 'examples';

export function looksLikeGoProgramStarter(starterCode: string | undefined) {
  return Boolean(starterCode && starterCode.includes('func main()'));
}

export function starterForLanguage(
  taskLanguage: string | undefined,
  solveLanguage: string,
  starterCode: string | undefined,
  runnerMode?: string,
) {
  if (
    starterCode &&
    solveLanguage === taskLanguage &&
    !(solveLanguage === 'go' && runnerMode === 'function_io' && looksLikeGoProgramStarter(starterCode))
  ) {
    return starterCode;
  }
  return DEFAULT_CODE_BY_LANGUAGE[solveLanguage] ?? starterCode ?? '';
}

export function sanitizeLiveCodingDraft(
  draft: string | undefined,
  taskLanguage: string | undefined,
  solveLanguage: string,
  starterCode: string | undefined,
  runnerMode?: string,
) {
  const fallback = starterForLanguage(taskLanguage, solveLanguage, starterCode, runnerMode);
  const value = draft ?? '';
  if (!value.trim()) {
    return fallback;
  }
  if (
    solveLanguage === 'go' &&
    runnerMode === 'function_io' &&
    (looksLikeGoProgramStarter(value) || !value.includes('func solve('))
  ) {
    return fallback;
  }
  return value;
}

export function parseSqlStarterSections(source: string) {
  const lines = source.split('\n');
  const sections: Record<'schema' | 'examples' | 'query', string[]> = {
    schema: [],
    examples: [],
    query: [],
  };
  let current: SqlStarterTab = 'schema';

  for (const line of lines) {
    const normalized = line.trim().toLowerCase();
    if (normalized.includes('схема бд')) {
      current = 'schema';
      sections.schema.push(line);
      continue;
    }
    if (normalized.includes('пример данных')) {
      current = 'examples';
      sections.examples.push(line);
      continue;
    }
    if (normalized.includes('стартовый запрос')) {
      current = 'examples';
      sections.query.push(line);
      continue;
    }
    sections[current].push(line);
  }

  return {
    schema: sections.schema.join('\n').trim(),
    examples: sections.examples.join('\n').trim(),
  };
}

export function appendRevealedQuestion(
  prev: InterviewPrepQuestion[],
  answeredQuestion: InterviewPrepQuestion | null | undefined,
) {
  if (!answeredQuestion) {
    return prev;
  }

  return prev.some((question) => question.id === answeredQuestion.id)
    ? prev
    : [...prev, answeredQuestion];
}
