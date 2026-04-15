export const DIFF_LABELS: Record<string, string> = {
  TASK_DIFFICULTY_EASY: 'Easy',
  TASK_DIFFICULTY_MEDIUM: 'Medium',
  TASK_DIFFICULTY_HARD: 'Hard',
  DIFFICULTY_EASY: 'Easy',
  DIFFICULTY_MEDIUM: 'Medium',
  DIFFICULTY_HARD: 'Hard',
  '1': 'Easy', '2': 'Medium', '3': 'Hard',
  easy: 'Easy', medium: 'Medium', hard: 'Hard',
}

export const DIFF_VARIANTS: Record<string, 'success' | 'warning' | 'danger'> = {
  TASK_DIFFICULTY_EASY: 'success',
  TASK_DIFFICULTY_MEDIUM: 'warning',
  TASK_DIFFICULTY_HARD: 'danger',
  DIFFICULTY_EASY: 'success',
  DIFFICULTY_MEDIUM: 'warning',
  DIFFICULTY_HARD: 'danger',
  '1': 'success', '2': 'warning', '3': 'danger',
  easy: 'success', medium: 'warning', hard: 'danger',
}

export const LANG_LABELS: Record<string, string> = {
  PROGRAMMING_LANGUAGE_JAVASCRIPT: 'JavaScript',
  PROGRAMMING_LANGUAGE_TYPESCRIPT: 'TypeScript',
  PROGRAMMING_LANGUAGE_PYTHON: 'Python',
  PROGRAMMING_LANGUAGE_GO: 'Go',
  PROGRAMMING_LANGUAGE_RUST: 'Rust',
  PROGRAMMING_LANGUAGE_CPP: 'C++',
  PROGRAMMING_LANGUAGE_JAVA: 'Java',
  PROGRAMMING_LANGUAGE_SQL: 'SQL',
  javascript: 'JavaScript', typescript: 'TypeScript',
  python: 'Python', go: 'Go', rust: 'Rust',
  cpp: 'C++', java: 'Java', sql: 'SQL',
}

export const LANG_COLORS: Record<string, { bg: string; text: string }> = {
  PROGRAMMING_LANGUAGE_PYTHON: { bg: 'bg-[#fef3c7]', text: 'text-[#92400e]' },
  PROGRAMMING_LANGUAGE_GO: { bg: 'bg-[#dbeafe]', text: 'text-[#1e40af]' },
  PROGRAMMING_LANGUAGE_SQL: { bg: 'bg-[#fce7f3]', text: 'text-[#9d174d]' },
  PROGRAMMING_LANGUAGE_JAVASCRIPT: { bg: 'bg-[#fef9c3]', text: 'text-[#854d0e]' },
  PROGRAMMING_LANGUAGE_TYPESCRIPT: { bg: 'bg-[#dbeafe]', text: 'text-[#1e3a5f]' },
  PROGRAMMING_LANGUAGE_RUST: { bg: 'bg-[#fee2e2]', text: 'text-[#991b1b]' },
  PROGRAMMING_LANGUAGE_CPP: { bg: 'bg-[#ede9fe]', text: 'text-[#5b21b6]' },
  PROGRAMMING_LANGUAGE_JAVA: { bg: 'bg-[#ffedd5]', text: 'text-[#9a3412]' },
  python: { bg: 'bg-[#fef3c7]', text: 'text-[#92400e]' },
  go: { bg: 'bg-[#dbeafe]', text: 'text-[#1e40af]' },
  sql: { bg: 'bg-[#fce7f3]', text: 'text-[#9d174d]' },
  javascript: { bg: 'bg-[#fef9c3]', text: 'text-[#854d0e]' },
  typescript: { bg: 'bg-[#dbeafe]', text: 'text-[#1e3a5f]' },
  rust: { bg: 'bg-[#fee2e2]', text: 'text-[#991b1b]' },
  cpp: { bg: 'bg-[#ede9fe]', text: 'text-[#5b21b6]' },
  java: { bg: 'bg-[#ffedd5]', text: 'text-[#9a3412]' },
}

export const PREP_TYPE_LABELS: Record<string, string> = {
  coding: 'Coding',
  algorithm: 'Algorithms',
  sql: 'SQL',
  system_design: 'System Design',
  code_review: 'Code Review',
  behavioral: 'Behavioral',
}
