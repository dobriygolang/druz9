export const TASK_CATEGORIES = [
  { value: 'mock', label: 'Mock Interview', topicTag: 'category:mock' },
  { value: 'solo_practice', label: 'Solo Practice', topicTag: 'category:solo_practice' },
] as const

export type TaskCategory = typeof TASK_CATEGORIES[number]['value']

const CATEGORY_PREFIX = 'category:'

export function getCategoryFromTopics(topics: string[] | undefined): TaskCategory | null {
  if (!topics) return null
  for (const t of topics) {
    if (t.startsWith(CATEGORY_PREFIX)) {
      const val = t.slice(CATEGORY_PREFIX.length)
      if (TASK_CATEGORIES.some(c => c.value === val)) return val as TaskCategory
    }
  }
  return null
}

export function setCategoryInTopics(topics: string[], category: string | null): string[] {
  const cleaned = topics.filter(t => !t.startsWith(CATEGORY_PREFIX))
  if (category) cleaned.push(`${CATEGORY_PREFIX}${category}`)
  return cleaned
}

export function getDisplayTopics(topics: string[] | undefined): string[] {
  if (!topics) return []
  return topics.filter(t => !t.startsWith(CATEGORY_PREFIX))
}

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  TASK_CATEGORIES.map(c => [c.value, c.label]),
)
