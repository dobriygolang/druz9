import { InterviewPrepTask, InterviewPrepType } from '@/features/InterviewPrep/api/interviewPrepApi';

export type TaskCategory = 'all' | 'coding' | 'sql' | 'system_design';
export type TaskModeFilter = 'all' | 'executable' | 'guided';

export const PREP_TYPE_LABELS: Record<InterviewPrepType, string> = {
  coding: 'Coding',
  algorithm: 'Algorithm',
  system_design: 'System Design',
  sql: 'SQL',
  code_review: 'Code Review',
};

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  all: 'Все категории',
  coding: 'Coding',
  sql: 'SQL',
  system_design: 'System Design',
};

export const CATEGORY_ORDER: TaskCategory[] = ['coding', 'sql', 'system_design'];

export function categoryForTask(task: InterviewPrepTask): TaskCategory {
  if (task.prepType === 'system_design') {
    return 'system_design';
  }
  if (task.language === 'sql') {
    return 'sql';
  }
  return 'coding';
}

export function categoryAccentClass(category: TaskCategory) {
  switch (category) {
    case 'coding':
      return 'is-coding';
    case 'sql':
      return 'is-sql';
    case 'system_design':
      return 'is-system-design';
    default:
      return '';
  }
}

export function pickRandomValue<T>(values: T[]): T | null {
  if (values.length === 0) {
    return null;
  }
  return values[Math.floor(Math.random() * values.length)];
}

export function shuffledValues<T>(values: T[]): T[] {
  return [...values].sort(() => Math.random() - 0.5);
}
