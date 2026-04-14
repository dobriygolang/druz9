export const DIFF_LABELS: Record<string, string> = {
  TASK_DIFFICULTY_EASY: 'Easy',
  TASK_DIFFICULTY_MEDIUM: 'Medium',
  TASK_DIFFICULTY_HARD: 'Hard',
  '1': 'Easy', '2': 'Medium', '3': 'Hard',
}

export const DIFF_VARIANTS: Record<string, 'success' | 'warning' | 'danger'> = {
  TASK_DIFFICULTY_EASY: 'success',
  TASK_DIFFICULTY_MEDIUM: 'warning',
  TASK_DIFFICULTY_HARD: 'danger',
  '1': 'success', '2': 'warning', '3': 'danger',
}

export const PREP_TYPE_LABELS: Record<string, string> = {
  coding: 'Coding',
  algorithm: 'Алгоритмы',
  sql: 'SQL',
  system_design: 'System Design',
  code_review: 'Code Review',
  behavioral: 'Behavioral',
}
