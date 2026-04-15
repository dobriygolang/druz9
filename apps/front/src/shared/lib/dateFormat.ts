import { i18n } from '@/shared/i18n'

function getLocale() {
  return i18n.resolvedLanguage?.startsWith('en') ? 'en-US' : 'ru-RU'
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  try {
    return new Date(iso).toLocaleDateString(getLocale(), opts ?? { month: 'long', day: 'numeric', year: 'numeric' })
  } catch { return iso }
}

export function formatDateShort(iso: string): string {
  return formatDate(iso, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function formatDateRu(dateStr: string): string {
  const d = dateStr ? new Date(dateStr) : new Date()
  if (i18n.resolvedLanguage?.startsWith('en')) {
    return `${EN_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  }
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}
