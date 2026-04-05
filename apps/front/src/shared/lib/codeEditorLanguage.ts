export function getMonacoLanguage(language: string): string {
  const map: Record<string, string> = {
    python: 'python',
    python3: 'python',
    javascript: 'javascript',
    typescript: 'typescript',
    go: 'go',
    rust: 'rust',
    cpp: 'cpp',
    java: 'java',
    PROGRAMMING_LANGUAGE_PYTHON: 'python',
    PROGRAMMING_LANGUAGE_JAVASCRIPT: 'javascript',
    PROGRAMMING_LANGUAGE_TYPESCRIPT: 'typescript',
    PROGRAMMING_LANGUAGE_GO: 'go',
    PROGRAMMING_LANGUAGE_RUST: 'rust',
    PROGRAMMING_LANGUAGE_CPP: 'cpp',
    PROGRAMMING_LANGUAGE_JAVA: 'java',
  }
  return map[language] ?? 'plaintext'
}

export function getLanguageLabel(language: string): string {
  const labels: Record<string, string> = {
    python: 'Python 3',
    python3: 'Python 3',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    go: 'Go',
    rust: 'Rust',
    cpp: 'C++',
    java: 'Java',
    PROGRAMMING_LANGUAGE_PYTHON: 'Python 3',
    PROGRAMMING_LANGUAGE_JAVASCRIPT: 'JavaScript',
    PROGRAMMING_LANGUAGE_TYPESCRIPT: 'TypeScript',
    PROGRAMMING_LANGUAGE_GO: 'Go',
    PROGRAMMING_LANGUAGE_RUST: 'Rust',
    PROGRAMMING_LANGUAGE_CPP: 'C++',
    PROGRAMMING_LANGUAGE_JAVA: 'Java',
  }
  return labels[language] ?? language
}
