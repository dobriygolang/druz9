export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', opts ?? { month: 'long', day: 'numeric', year: 'numeric' })
  } catch { return iso }
}

export function formatDateShort(iso: string): string {
  return formatDate(iso, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

const RU_MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

export function formatDateRu(dateStr: string): string {
  const d = dateStr ? new Date(dateStr) : new Date()
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
