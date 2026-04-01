export type AppCodeLanguage = 'go' | 'python' | 'sql' | 'system_design';

export function normalizeAppLanguage(value?: string | null): AppCodeLanguage {
  switch ((value || '').trim().toLowerCase()) {
    case 'python':
      return 'python';
    case 'sql':
      return 'sql';
    case 'system_design':
      return 'system_design';
    case 'go':
    default:
      return 'go';
  }
}

export function monacoLanguageFor(value?: string | null): string {
  return normalizeAppLanguage(value);
}

export function displayLanguageLabel(value?: string | null): string {
  switch (normalizeAppLanguage(value)) {
    case 'python':
      return 'Python';
    case 'sql':
      return 'SQL';
    case 'system_design':
      return 'System Design';
    case 'go':
    default:
      return 'Go';
  }
}

export function inferLanguageFromSource(source?: string | null): AppCodeLanguage {
  const normalized = (source || '').trim().toLowerCase();
  if (normalized.startsWith('select ') || normalized.startsWith('with ') || normalized.includes('create table')) {
    return 'sql';
  }
  if (normalized.includes('def solve') || normalized.includes('import sys') || normalized.includes('print(')) {
    return 'python';
  }
  return 'go';
}
