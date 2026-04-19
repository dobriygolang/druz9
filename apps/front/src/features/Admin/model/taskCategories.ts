export const TASK_CATEGORIES = [
  { value: 'mock', label: 'Пробное интервью', topicTag: 'category:mock' },
  { value: 'solo_practice', label: 'Самостоятельная практика', topicTag: 'category:solo_practice' },
] as const

export type TaskCategory = typeof TASK_CATEGORIES[number]['value']

const CATEGORY_PREFIX = 'category:'

export function getCategoriesFromTopics(topics: string[] | undefined): TaskCategory[] {
  if (!topics) return []
  return topics
    .filter(t => t.startsWith(CATEGORY_PREFIX))
    .map(t => t.slice(CATEGORY_PREFIX.length))
    .filter((val): val is TaskCategory => TASK_CATEGORIES.some(c => c.value === val))
}

// Legacy single-value getter for backwards compat.
export function getCategoryFromTopics(topics: string[] | undefined): TaskCategory | null {
  return getCategoriesFromTopics(topics)[0] ?? null
}

export function toggleCategoryInTopics(topics: string[], category: TaskCategory): string[] {
  const tag = `${CATEGORY_PREFIX}${category}`
  return topics.includes(tag)
    ? topics.filter(t => t !== tag)
    : [...topics, tag]
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
