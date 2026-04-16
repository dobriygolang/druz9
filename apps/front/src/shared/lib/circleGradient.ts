const CIRCLE_GRADIENTS = [
  { from: '#059669', to: '#0D9488' },
  { from: '#06b6d4', to: '#0ea5e9' },
  { from: '#10b981', to: '#059669' },
  { from: '#f97316', to: '#ef4444' },
  { from: '#ec4899', to: '#db2777' },
  { from: '#f59e0b', to: '#d97706' },
]

/** Deterministic gradient from a string via DJB2 hash */
export function getCircleGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return CIRCLE_GRADIENTS[Math.abs(hash) % CIRCLE_GRADIENTS.length]
}
