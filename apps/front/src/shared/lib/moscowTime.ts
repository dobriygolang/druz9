const DATETIME_MINUTE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
const DATETIME_SECOND_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/
const HAS_TIMEZONE_RE = /(Z|[+-]\d{2}:\d{2})$/

export function toMoscowApiDateTime(value?: string): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if (HAS_TIMEZONE_RE.test(trimmed)) return trimmed
  if (DATETIME_MINUTE_RE.test(trimmed)) return `${trimmed}:00+03:00`
  if (DATETIME_SECOND_RE.test(trimmed)) return `${trimmed}+03:00`
  return trimmed
}
