/**
 * XP → Level curve for DRUZ9.
 *
 * Classic RPG exponential: each level requires more XP than the last.
 * At level 1 you need 100 XP to reach level 2. By level 20 you need
 * roughly 2,300 XP. Prevents the "level 99 after one week" deflation
 * while still giving a level-up every couple of sessions in early game.
 */

/** XP needed to advance from level `n` to `n + 1`. */
export function xpToNext(level: number): number {
  if (level < 1) return 100
  return Math.round(100 * level * (1 + 0.15 * level))
}

/**
 * Total XP accumulated to *reach* level `n` from scratch. Sum of all
 * deltas from level 1 → n.
 */
export function xpAtLevel(level: number): number {
  let sum = 0
  for (let i = 1; i < level; i++) sum += xpToNext(i)
  return sum
}

/** From total XP, derive the current level + progress to next. */
export function deriveLevel(totalXp: number): {
  level: number
  xpIntoLevel: number
  xpToNext: number
  progress: number // 0..1
} {
  let level = 1
  let sum = 0
  while (sum + xpToNext(level) <= totalXp) {
    sum += xpToNext(level)
    level += 1
    if (level > 999) break // safety
  }
  const xpIntoLevel = totalXp - sum
  const xpNext = xpToNext(level)
  return {
    level,
    xpIntoLevel,
    xpToNext: xpNext,
    progress: xpNext > 0 ? Math.min(1, xpIntoLevel / xpNext) : 0,
  }
}
